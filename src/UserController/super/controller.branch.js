const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const UserSchema = require("../../Usersmodel/UserSchema");
const clientsregisters = require("../../Usersmodel/client/client.Register_schema");
const crypto = require("crypto");
const sendAccountCredentialsMail = require("../../middleware/Sendpw");
const Branch = require("../../Usersmodel/supper/model.branch");
const LoginSchema = require("../../Usersmodel/staff/userSchema.js");
const Recruitment = require("../../Usersmodel/admini/AdminRecruitment.model.js");
const { disconnectAccountSockets } = require("../../socket/socket");

const { error } = require("console");

const findAccountByResetToken = async (hashedToken) => {
    const client = await clientsregisters.findOne({ resetPasswordToken: hashedToken });
    if (client) {
        return client;
    }
    const user = await UserSchema.findOne({ resetPasswordToken: hashedToken });
    if (user) {
        return user;
    }
    const branch = await Branch.findOne({ resetPasswordToken: hashedToken });
    if (branch) {
        return branch;
    }
    return LoginSchema.findOne({ resetPasswordToken: hashedToken });
};

const getBranchManagementModel = async (role) => {
    if (typeof role !== "string" || !role.trim()) {
        return null;
    }

    const normalizedRole = role.trim().toLowerCase();
    if (normalizedRole === "admin") {
        return Branch;
    }
    if (normalizedRole === "staff") {
        return LoginSchema;
    }

    const { default: clientsRegisters } = await import("../../Usersmodel/client/client.Register_schema.js");
    return clientsRegisters;
};

const getTargetRole = (req) => req.body?.targetRole ?? req.body?.role;

const withoutPassword = (record) => {
    const data = record.toObject();
    delete data.password;
    return data;
};



// for branch only =======================================================================

const CreateBranch = async (req, res) => {
    const session = await mongoose.startSession();

    try {
        const payload = req.body;

        const plainPassword = payload.password;
        const hashedPassword = plainPassword
            ? await bcrypt.hash(plainPassword, 10)
            : undefined;

        const provinceIndex = Number(payload.provinceIndex);
        const provinceName =
            typeof payload.provinceName === "string"
                ? payload.provinceName.trim()
                : "";

        const district = payload.district?.trim();
        const localLevelName = payload.localLevelName?.trim();
        const recruitmentId = payload.recruitment ?? payload.recruitmentId;

        // 1. Validate required location
        if (
            !Number.isInteger(provinceIndex) ||
            provinceIndex < 1 ||
            provinceIndex > 7 ||
            !provinceName ||
            !district ||
            !localLevelName
        ) {
            return res.status(400).json({
                success: false,
                message: "Valid province, district and local level are required"
            });
        }

        // 2. Validate recruitment ID
        if (!recruitmentId || !mongoose.isValidObjectId(recruitmentId)) {
            return res.status(400).json({
                success: false,
                message: "A valid recruitment record is required"
            });
        }

        // 3. Check duplicate email
        const emailExists = await Branch.findOne({
            officeEmail: payload.officeEmail?.trim()
        });

        if (emailExists) {
            return res.status(409).json({
                success: false,
                message: "Office Email already exists"
            });
        }

        // 4. Check duplicate mobile
        const mobileExists = await Branch.findOne({
            officeMobile: payload.officeMobile?.trim()
        });

        if (mobileExists) {
            return res.status(409).json({
                success: false,
                message: "Office Mobile already exists"
            });
        }

        // 5. Check duplicate username
        const usernameExists = await Branch.findOne({
            username: payload.username?.trim()
        });

        if (usernameExists) {
            return res.status(409).json({
                success: false,
                message: "Username already exists"
            });
        }

        // 6. Check duplicate location
        const existingBranch = await Branch.findOne({
            provinceIndex,
            district: new RegExp(
                `^${district.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
                "i"
            ),
            localLevelName: new RegExp(
                `^${localLevelName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
                "i"
            )
        });

        if (existingBranch) {
            return res.status(409).json({
                success: false,
                message: `A branch already exists in ${localLevelName}, ${district}`
            });
        }

        const branchName = `${district}-${localLevelName}`;

        let newBranch;

        await session.withTransaction(async () => {

            // 7. Verify recruitment record inside transaction
            const recruitment = await Recruitment.findById(recruitmentId)
                .session(session);

            if (!recruitment) {
                const error = new Error(
                    "The selected recruitment record was not found"
                );
                error.statusCode = 404;
                throw error;
            }

            // 8. Create branch
            const [createdBranch] = await Branch.create([{
                fullName: payload.fullName,
                recruitment: recruitment._id,
                designation: payload.designation,
                jobRole: payload.jobRole,

                personalMobile: payload.personalMobile,
                personalEmail: payload.personalEmail,

                username: payload.username?.trim(),
                password: hashedPassword,
                role: payload.role,

                provinceIndex,
                provinceName,
                district,
                localLevelName,
                wardNo: payload.wardNo,
                toleName: payload.toleName,
                lat: payload.lat,
                lng: payload.lng,

                branchName,

                officeEmail: payload.officeEmail?.trim(),
                officeMobile: payload.officeMobile?.trim(),

                isActive: typeof payload.isActive === "boolean"
                    ? payload.isActive
                    : payload.status === "active"

            }], { session });

            // 9. Update recruitment isActive = true
            await Recruitment.updateOne(
                { _id: recruitment._id },
                {
                    $set: {
                        isActive: true
                    }
                },
                { session }
            );

            newBranch = createdBranch;
        });

        // 10. Send credentials email
        try {
            await sendAccountCredentialsMail({
                to: payload.officeEmail,
                userName: payload.fullName,
                username: payload.username,
                password: plainPassword,
                role: payload.role
            });
        } catch (mailError) {
            console.error("Email Error:", mailError.message);
        }

        return res.status(201).json({
            success: true,
            message: "Branch created and recruitment activated successfully",
            data: newBranch
        });

    } catch (error) {
        console.error("Create Branch Error:", error);

        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message
        });

    } finally {
        await session.endSession();
    }
};


const EditBranch = async (req, res) => {
    try {
        const { id } = req.params;
        const payload = req.body;
        const role = getTargetRole(req);
        const model = await getBranchManagementModel(role);

        if (!model) {
            return res.status(400).json({ success: false, message: "A valid target role is required" });
        }

        const record = await model.findById(id);
        if (!record) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        if (model === Branch) {
            if (payload.role && (typeof payload.role !== "string" ||
                payload.role.trim().toLowerCase() !== role.trim().toLowerCase())) {
                return res.status(400).json({ success: false, message: "Changing a user's role is not supported" });
            }

            const provinceIndex = payload.provinceIndex === undefined
                ? record.provinceIndex
                : Number(payload.provinceIndex);
            const provinceName = payload.provinceName ?? record.provinceName;
            const districtValue = payload.district ?? record.district;
            const district = typeof districtValue === "string" ? districtValue.trim() : "";
            if (!Number.isInteger(provinceIndex) || provinceIndex < 1 || provinceIndex > 7 ||
                !district || typeof provinceName !== "string" || !provinceName.trim()) {
                return res.status(400).json({
                    success: false,
                    message: "A valid province index, province name, and district are required"
                });
            }

            const localLevelName = (payload.localLevelName ?? record.localLevelName ?? "").trim();
            if (!localLevelName) {
                return res.status(400).json({
                    success: false,
                    message: "A valid local level is required"
                });
            }
            const duplicateConditions = [{
                provinceIndex,
                district: new RegExp(`^${district.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
                localLevelName: new RegExp(`^${localLevelName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i")
            }];
            const officeEmail = payload.officeEmail ?? record.officeEmail;
            const officeMobile = payload.officeMobile ?? record.officeMobile;
            if (officeEmail) duplicateConditions.push({ officeEmail });
            if (officeMobile) duplicateConditions.push({ officeMobile });

            const duplicate = await Branch.findOne({
                _id: { $ne: id },
                $or: duplicateConditions
            });
            if (duplicate) {
                return res.status(400).json({
                    success: false,
                    message: duplicate.localLevelName === localLevelName
                        ? `A branch already exists in ${localLevelName}, ${district}`
                        : duplicate.officeEmail === officeEmail
                            ? "Office Email already exists"
                            : "Office Mobile already exists"
                });
            }

            const branchName = `${localLevelName}, ${district}, ${provinceName.trim()}`;

            const permittedFields = [
                "fullName", "designation", "jobRole", "personalMobile", "personalEmail",
                "username", "provinceName", "district", "localLevelName", "wardNo",
                "toleName", "lat", "lng", "officeEmail", "officeMobile"
            ];
            for (const field of permittedFields) {
                if (Object.prototype.hasOwnProperty.call(payload, field)) {
                    record[field] = payload[field];
                }
            }
            record.provinceIndex = provinceIndex;
            record.provinceName = provinceName;
            record.district = district;
            record.branchName = branchName;
            if (payload.isActive !== undefined) {
                if (typeof payload.isActive !== "boolean") {
                    return res.status(400).json({ success: false, message: "isActive must be true or false" });
                }
                record.isActive = payload.isActive;
            } else if (payload.status !== undefined) {
                if (!["active", "inactive"].includes(payload.status)) {
                    return res.status(400).json({ success: false, message: "A valid account status is required" });
                }
                record.isActive = payload.status === "active";
            }
        } else if (model === LoginSchema) {
            const permittedFields = [
                "staffId", "Fname", "Lname", "position", "email", "phone"
            ];
            for (const field of permittedFields) {
                if (Object.prototype.hasOwnProperty.call(payload, field)) {
                    record[field] = payload[field];
                }
            }
        } else {
            const permittedFields = [
                "username", "province", "district", "officeEmail", "officaPhone", "handledBranches"
            ];
            for (const field of permittedFields) {
                if (Object.prototype.hasOwnProperty.call(payload, field)) {
                    record[field] = payload[field];
                }
            }
        }

        if (payload.password) {
            record.password = await bcrypt.hash(payload.password, 10);
        }

        await record.save();
        if (record.isActive === false) {
            disconnectAccountSockets(record._id, record.role || getTargetRole(req));
        }
        return res.status(200).json({
            success: true,
            message: "User updated successfully",
            data: withoutPassword(record)
        });
    } catch (err) {
        console.error("Edit Branch Error:", err);
        if (err.name === "ValidationError" || err.name === "CastError" || err.code === 11000) {
            return res.status(400).json({ success: false, message: err.message });
        }
        return res.status(500).json({ success: false, message: err.message });
    }
};


const DeleteBranch = async (req, res) => {
    const session = await mongoose.startSession();

    try {
        const { id } = req.params;

        const model = await getBranchManagementModel(getTargetRole(req));

        if (!model) {
            return res.status(400).json({
                success: false,
                message: "A valid target role is required"
            });
        }

        let deletedRecord;

        await session.withTransaction(async () => {

            // 1. Find branch
            const record = await model.findById(id).session(session);

            if (!record) {
                const error = new Error("User not found");
                error.statusCode = 404;
                throw error;
            }

            // 2. Get associated recruitment ID
            const recruitmentId = record.recruitment;

            // 3. Delete branch
            await record.deleteOne({ session });

            // 4. Activate associated recruitment
            if (recruitmentId) {
                const recruitment = await Recruitment.findByIdAndUpdate(
                    recruitmentId,
                    {
                        $set: { isActive: false }
                    },
                    {
                        new: true,
                        session
                    }
                );

                if (!recruitment) {
                    const error = new Error(
                        "Branch deleted but associated recruitment record was not found"
                    );
                    error.statusCode = 404;
                    throw error;
                }
            }

            deletedRecord = record;
        });

        return res.status(200).json({
            success: true,
            message: "Branch deleted and recruitment activated successfully",
            data: deletedRecord
        });

    } catch (error) {
        console.error("Delete Branch Error:", error);

        if (error.name === "CastError") {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID"
            });
        }

        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message
        });

    } finally {
        await session.endSession();
    }
};


const getAllBranches = async (req, res) => {
    try {
        const branches = await Branch.find({}).lean();
        return res.status(200).json({
            success: true,
            message: "Branches fetched successfully",
            data: branches
        });
    }
    catch (err) {
        return res.status(500).json({
            success: false,
            message: "Unable to fetch branches",
            error: err.message
        });
    }
}

const EditBranchStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { isActive, status: requestedStatus } = req.body;
        const model = await getBranchManagementModel(getTargetRole(req));
        if (!model) {
            return res.status(400).json({ success: false, message: "A valid target role is required" });
        }
        const record = await model.findById(id);
        if (!record) return res.status(404).json({ success: false, message: "User not found" });

        const statusPath = model.schema.path("status");
        const activePath = model.schema.path("isActive");
        if (typeof isActive === "boolean" && activePath?.instance === "Boolean") {
            record.isActive = isActive;
        } else if (statusPath) {
            let status = requestedStatus;
            if (typeof isActive === "boolean") {
                const allowedStatuses = statusPath.options.enum || [];
                const desired = isActive ? "active" : "inactive";
                status = allowedStatuses.find(value => String(value).toLowerCase() === desired) || desired;
            }
            const allowedStatuses = statusPath.options.enum || [];
            if (typeof status !== "string" || !status.trim() ||
                (allowedStatuses.length && !allowedStatuses.includes(status))) {
                return res.status(400).json({ success: false, message: "A valid status is required" });
            }
            record.status = status;
        } else {
            return res.status(400).json({ success: false, message: "Status updates are not supported for this role" });
        }

        await record.save();
        if (record.isActive === false) {
            disconnectAccountSockets(record._id, record.role || getTargetRole(req));
        }
        return res.status(200).json({
            success: true,
            message: "User status updated successfully",
            data: withoutPassword(record)
        });
    } catch (error) {
        if (error.name === "ValidationError" || error.name === "CastError") {
            return res.status(400).json({ success: false, message: error.message });
        }
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ====================================================================================


// const AdminGenerated = async (req, res) => {
//     try {
//         const payload = req.body;
//         /* console.log("Payload received:", payload); */

//         const provinceIndex = Number(payload.provinceIndex);
//         const district = payload.district?.trim();
//         if (!Number.isInteger(provinceIndex) || provinceIndex < 1 || provinceIndex > 7 || !district) {
//             return res.status(400).json({
//                 success: false,
//                 message: "A valid province index and district are required"
//             });
//         }

//         if (payload.password !== payload.confirmPassword) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Password and Confirm Password do not match"
//             });
//         }

//         const duplicate = await UserSchema.findOne({
//             $or: [
//                 { officeEmail: payload.officeEmail },
//                 { officeMobile: payload.officeMobile },
//                 { username: payload.username }
//             ]
//         });

//         if (duplicate) {
//             return res.status(400).json({
//                 success: false,
//                 message:
//                     duplicate.officeEmail === payload.officeEmail
//                         ? "Office Email already exists"
//                         : duplicate.officeMobile === payload.officeMobile
//                             ? "Office Mobile already exists"
//                             : "Username already exists"
//             });
//         }

//         if (payload.role === "admin") {

//             const totalAdmins = await UserSchema.countDocuments({
//                 role: "admin"
//             });

//             if (totalAdmins >= 7) {
//                 return res.status(400).json({
//                     success: false,
//                     message: "Maximum 7 admin accounts allowed"
//                 });
//             }

//             const provinceExists = await UserSchema.findOne({
//                 role: "admin",
//                 provinceName: payload.provinceName
//             });

//             if (provinceExists) {
//                 return res.status(400).json({
//                     success: false,
//                     message: `Admin already assigned to ${payload.provinceName}`
//                 });
//             }
//         }


//         const plainPassword = payload.password;


//         const hashedPassword = await bcrypt.hash(plainPassword, 10);

//         const newUser = await Branch.create({
//             fullName: payload.fullName,
//             designation: payload.designation,
//             jobRole: payload.jobRole,

//             personalMobile: payload.personalMobile,
//             personalEmail: payload.personalEmail,

//             province: provinceIndex,
//             provinceName: payload.provinceName,
//             districtName: district,
//             localLevel: payload.localLevelName,

//             officeEmail: payload.officeEmail,
//             officeMobile: payload.officeMobile,

//             username: payload.username,
//             password: hashedPassword,

//             isActive: typeof payload.isActive === "boolean"
//                 ? payload.isActive
//                 : payload.status === "active",
//             role: payload.role,

//             latitude: payload.lat,
//             longitude: payload.lng
//         });

//         try {
//             await sendAccountCredentialsMail({
//                 to: payload.officeEmail,
//                 userName: payload.fullName,
//                 username: payload.username,
//                 password: plainPassword,
//                 role: payload.role
//             });

//             /* console.log("Credentials email sent"); */
//         } catch (mailError) {
//             console.error("Email Error:", mailError.message);
//         }

//         return res.status(201).json({
//             success: true,
//             message: "Admin created successfully",
//             data: newUser
//         });

//     } catch (error) {
//         console.error(error);

//         return res.status(500).json({
//             success: false,
//             message: error.message
//         });
//     }
// };

const EditAdmin = async (req, res) => {
    try {
        const { id } = req.params;
        const payload = req.body;
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ success: false, message: "Invalid user ID" });
        }
        const user = await UserSchema.findById(id);

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        if (payload.role !== undefined && payload.role !== user.role) {
            return res.status(400).json({ success: false, message: "Changing a user's role is not supported" });
        }
        if (payload.password && payload.confirmPassword !== payload.password) {
            return res.status(400).json({ success: false, message: "Password and Confirm Password do not match" });
        }

        const duplicateFields = ["username", "officeEmail", "officeMobile"]
            .filter(field => payload[field] !== undefined)
            .map(field => ({ [field]: payload[field] }));
        const duplicate = duplicateFields.length
            ? await UserSchema.findOne({
                _id: { $ne: id },
                $or: duplicateFields
            })
            : null;
        if (duplicate) {
            return res.status(400).json({
                success: false,
                message: duplicate.username === payload.username
                    ? "Username already exists"
                    : duplicate.officeEmail === payload.officeEmail
                        ? "Office Email already exists"
                        : "Office Mobile already exists"
            });
        }

        const editableFields = {
            fullName: "fullname",
            designation: "designation",
            jobRole: "jobRole",
            personalMobile: "personalMobile",
            personalEmail: "personalEmail",
            username: "username",
            officeEmail: "officeEmail",
            officeMobile: "officeMobile",
            provinceName: "provinceName",
            districtName: "districtName",
            isoStandardCode: "isoStandardCode",
            localLevelName: "localLevel"
        };
        for (const [payloadField, schemaField] of Object.entries(editableFields)) {
            if (Object.prototype.hasOwnProperty.call(payload, payloadField)) {
                user[schemaField] = payload[payloadField];
            }
        }
        if (payload.provinceIndex !== undefined) {
            const province = Number(payload.provinceIndex);
            if (!Number.isInteger(province) || province < 1 || province > 7) {
                return res.status(400).json({ success: false, message: "A valid province number is required" });
            }
            user.province = province;
        }
        if (payload.lat !== undefined && payload.lat !== null && payload.lat !== "") {
            const latitude = Number(payload.lat);
            if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
                return res.status(400).json({ success: false, message: "A valid latitude is required" });
            }
            user.latitude = latitude;
        }
        if (payload.lng !== undefined && payload.lng !== null && payload.lng !== "") {
            const longitude = Number(payload.lng);
            if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
                return res.status(400).json({ success: false, message: "A valid longitude is required" });
            }
            user.longitude = longitude;
        }
        if (payload.isActive !== undefined && typeof payload.isActive !== "boolean") {
            return res.status(400).json({ success: false, message: "isActive must be true or false" });
        }
        if (payload.isActive === undefined && payload.status !== undefined) {
            if (!["active", "inactive"].includes(payload.status)) {
                return res.status(400).json({ success: false, message: "A valid account status is required" });
            }
        }
        if (payload.isActive !== undefined || payload.status !== undefined) {
            user.isActive = typeof payload.isActive === "boolean"
                ? payload.isActive
                : payload.status === "active";
        }
        if (payload.password) {
            user.password = await bcrypt.hash(payload.password, 10);
        }

        await user.save();
        const result = user.toObject();
        delete result.password;
        delete result.resetPasswordToken;
        delete result.resetPasswordExpire;
        return res.status(200).json({
            success: true,
            message: "User updated successfully",
            data: result
        });
    } catch (err) {
        console.error("Edit User Error:", err);
        if (err.name === "ValidationError" || err.name === "CastError" || err.code === 11000) {
            return res.status(400).json({ success: false, message: err.message });
        }
        return res.status(500).json({ success: false, message: err.message });
    }
};

const DeleteUser = async (req, res) => {
    const { ids } = req.body;
    try {
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({
                success: false,
                msg: "No user IDs provided."
            });
        }
        if (ids.some(id => !mongoose.isValidObjectId(id))) {
            return res.status(400).json({
                success: false,
                msg: "One or more user IDs are invalid."
            });
        }

        const result = await UserSchema.deleteMany({
            _id: { $in: ids }
        });

        return res.status(200).json({
            success: true,
            deletedCount: result.deletedCount,
            msg: `${result.deletedCount} user(s) deleted successfully.`
        });

    } catch (err) {
        return res.status(500).json({
            success: false,
            msg: err.message
        });
    }
};


const getAllLogedUsers = async (req, res) => {
    try {
        const users = await UserSchema.find({})
            .select(
                "_id fullName fullname username role designation jobRole personalEmail personalMobile officeEmail officeMobile province provinceName provinceIndex district districtName localLevelName localLevel recruitmentId latitude longitude isActive profileImage"
            )
            .lean();

        return res.status(200).json({
            success: true,
            data: users
        });

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};




const GetAdminUserById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ success: false, message: "Invalid user ID" });
        }

        const user = await UserSchema.findById(id)
            .select("_id fullname username role designation jobRole orgName officeEmail officeMobile personalEmail personalMobile province provinceName districtName isoStandardCode localLevel latitude longitude isActive")
            .lean();
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        return res.status(200).json({ success: true, data: user });
    } catch (err) {
        console.error("Fetch user by ID error:", err);
        return res.status(500).json({ success: false, message: "Unable to fetch user" });
    }
};

const EditStatus = async (req, res) => {
    const { id } = req.params;
    const { isActive } = req.body;

    try {
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                msg: "Invalid user ID"
            });
        }
        if (typeof isActive !== "boolean") {
            return res.status(400).json({
                success: false,
                msg: "isActive must be true or false"
            });
        }

        const user = await UserSchema.findByIdAndUpdate(
            id,
            { isActive },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                msg: "User not found"
            });
        }

        if (!isActive) {
            disconnectAccountSockets(user._id, user.role);
        }

        const result = user.toObject();
        delete result.password;
        delete result.resetPasswordToken;
        delete result.resetPasswordExpire;
        return res.status(200).json({
            success: true,
            msg: "Status updated successfully",
            data: result
        });

    } catch (err) {
        if (err.name === "CastError") {
            return res.status(400).json({ success: false, msg: "Invalid user ID" });
        }
        return res.status(500).json({
            success: false,
            msg: err.message
        });
    }
};

const VerifyResetToken = async (req, res) => {
    try {

        const { token } = req.params;
        if (typeof token !== "string" || !token) {
            return res.status(400).json({
                success: false,
                valid: false,
                message: "Invalid reset link."
            });
        }

        const hashedToken = crypto
            .createHash("sha256")
            .update(token)
            .digest("hex");

        const user = await findAccountByResetToken(hashedToken);

        if (!user) {
            return res.status(400).json({
                success: false,
                valid: false,
                message: "Invalid reset link."
            });
        }

        if (
            !user.resetPasswordToken ||
            !user.resetPasswordExpire
        ) {
            return res.status(400).json({
                success: false,
                valid: false,
                message: "This reset link has already been used."
            });
        }

        if (user.resetPasswordExpire < new Date()) {
            return res.status(400).json({
                success: false,
                valid: false,
                message: "Reset link expired."
            });
        }

        return res.status(200).json({
            success: true,
            valid: true,
            message: "Reset link is valid."
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            valid: false,
            message: error.message
        });

    }
};

const ResetPassword = async (req, res) => {
    try {
        console.log("Reset Password Request Body:", req.body);

        const { token } = req.params;
        const { password, confirmPassword } = req.body || {};

        if (typeof token !== "string" || !token) {
            return res.status(400).json({
                success: false,
                message: "Invalid reset link."
            });
        }
        if (typeof password !== "string" || !password) {
            return res.status(400).json({
                success: false,
                message: "A new password is required"
            });
        }
        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 8 characters long."
            });
        }
        if (password !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "Password and Confirm Password do not match"
            });
        }

        const hashedToken = crypto
            .createHash("sha256")
            .update(token)
            .digest("hex");

        const user = await findAccountByResetToken(hashedToken);

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "You may have shared the link or used an invalid link."
            });
        }

        if (
            !user.resetPasswordToken ||
            !user.resetPasswordExpire
        ) {
            return res.status(400).json({
                success: false,
                message: "This reset link has already been used."
            });
        }

        if (user.resetPasswordExpire < new Date()) {
            return res.status(400).json({
                success: false,
                message: "Reset link has expired."
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        user.password = hashedPassword;

        // clear token after use
        user.resetPasswordToken = null;
        user.resetPasswordExpire = null;

        await user.save();

        // optional email
        await sendAccountCredentialsMail({
            to: user.officeEmail || user.email,
            userName: user.role === "client"
                ? user.username
                : (user.fullName ||
                    user.fullname ||
                    [user.Fname, user.Lname].filter(Boolean).join(" ") ||
                    user.username ||
                    user.staffId),
            role: user.role,
            update: true,
        });

        return res.status(200).json({
            success: true,
            message: "Password updated successfully."
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }
};


module.exports = {
    EditAdmin,
    DeleteUser,
    getAllLogedUsers,
    GetAdminUserById,
    EditStatus,
    VerifyResetToken,
    ResetPassword,
    CreateBranch,
    EditBranch,
    DeleteBranch,
    getAllBranches,
    EditBranchStatus,
    getBranchManagementModel,
    getTargetRole,
};

// /media/ranjan/New Volume2/EIMCTA_ERP/backend/src/UserRouter/super/super.create.credential.js --> AdminGenerated used here but not exported, so it is ignored in the module.exports.
