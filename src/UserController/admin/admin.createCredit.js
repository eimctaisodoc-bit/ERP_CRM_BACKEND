const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const UserSchema = require("../../Usersmodel/UserSchema");
const clientsregisters = require("../../Usersmodel/client/client.Register_schema");
const sendAccountCredentialsMail = require("../../middleware/Sendpw");

console.log("UserSchema model type:", UserSchema.collection.name);


const normalizeClient = (client) => {
    const data = typeof client.toObject === "function" ? client.toObject() : client;
    const safeData = { ...data };
    delete safeData.password;
    delete safeData.resetPasswordToken;
    delete safeData.resetPasswordExpire;
    return {
        ...safeData,
        fullname: data.username,
        provinceName: data.province,
        districtName: data.district,
        officeMobile: data.officaPhone,
        isActive: data.isActive !== false,
        role: "client"
    };
};

const findAccountById = async (id, requestedRole) => {
    const role = typeof requestedRole === "string" ? requestedRole.trim().toLowerCase() : "";
    if (role === "client") {
        const user = await clientsregisters.findById(id);
        return { user, isClient: true };
    }
    if (role) {
        const user = await UserSchema.findById(id);
        return { user, isClient: false };
    }

    const user = await UserSchema.findById(id);
    if (user && user.role !== "client") {
        return { user, isClient: false };
    }
    const client = await clientsregisters.findById(id);
    return { user: client, isClient: Boolean(client) };
};

const AdminGenerated = async (req, res) => {
    try {
        const payload = req.body;

        if (payload.password !== payload.confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "Password and Confirm Password do not match"
            });
        }

        const existingUser = await UserSchema.findOne({
            $or: [
                { officeEmail: payload.officeEmail },
                { officeMobile: payload.officeMobile },
                { username: payload.username }
            ]
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message:
                    existingUser.officeEmail === payload.officeEmail
                        ? "Office Email already exists"
                        : existingUser.officeMobile === payload.officeMobile
                            ? "Office Mobile already exists"
                            : "Username already exists"
            });
        }



        const plainPassword = payload.password;


        const hashedPassword = await bcrypt.hash(plainPassword, 10);

        const newUser = await UserSchema.create({
            fullName: payload.fullName,
            designation: payload.designation,
            jobRole: payload.jobRole,

            personalMobile: payload.personalMobile,
            personalEmail: payload.personalEmail,

            Prvince: payload.Prvince,
            provinceName: payload.provinceName,
            districts: payload.districts,
            localLevelName: payload.localLevelName,

            officeEmail: payload.officeEmail,
            officeMobile: payload.officeMobile,

            username: payload.username,
            password: hashedPassword,

            isActive: typeof payload.isActive === "boolean"
                ? payload.isActive
                : payload.status === "active",
            role: payload.role,

            lat: payload.lat,
            lng: payload.lng
        });

        try {
            await sendAccountCredentialsMail({
                to: payload.officeEmail,
                userName: payload.fullName,
                username: payload.username,
                password: plainPassword,
                role: payload.role
            });

            /* console.log("Credentials email sent"); */
        } catch (mailError) {
            console.error("Email Error:", mailError.message);
        }

        return res.status(201).json({
            success: true,
            message: "Admin created successfully",
            data: newUser
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


const DeleteUser = async (req, res) => {
    try {
        const { ids, roles } = req.body || {};
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

        let clientIds;
        if (roles && typeof roles === "object" && !Array.isArray(roles)) {
            clientIds = ids.filter(id => String(roles[id]).toLowerCase() === "client");
        } else {
            const clients = await clientsregisters.find({ _id: { $in: ids } }).select("_id").lean();
            const clientIdSet = new Set(clients.map(client => String(client._id)));
            clientIds = ids.filter(id => clientIdSet.has(String(id)));
        }
        const staffIds = ids.filter(id => !clientIds.includes(id));

        const results = await Promise.all([
            clientIds.length ? clientsregisters.deleteMany({ _id: { $in: clientIds } }) : null,
            staffIds.length
                ? UserSchema.deleteMany({ _id: { $in: staffIds }, role: { $ne: "client" } })
                : null
        ]);
        const deletedCount = results.reduce((count, result) => count + (result?.deletedCount || 0), 0);
        return res.status(200).json({
            success: true,
            deletedCount,
            msg: `${deletedCount} user(s) deleted successfully.`
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
        const [staffUsers, clients] = await Promise.all([
            UserSchema.find({ role: "staff" })
                .select("username role fullname designation jobRole officeEmail officeMobile province provinceName districtName localLevel isActive")
                .lean(),
            clientsregisters.find({ role: "client" })
                .select("organizationID role username province district officeEmail officaPhone handledBranches isActive")
                .lean()
        ]);
        const users = [...staffUsers, ...clients.map(normalizeClient)];

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

const edituser = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ success: false, message: "Invalid user ID" });
        }

        const { user, isClient } = await findAccountById(id, req.query.role);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const data = isClient
            ? normalizeClient(user)
            : user.toObject();
        if (!isClient) {
            delete data.password;
            delete data.resetPasswordToken;
            delete data.resetPasswordExpire;
        }
        return res.status(200).json({ success: true, data });
    } catch (err) {
        console.error("Fetch staff by ID error:", err);
        return res.status(500).json({ success: false, message: "Unable to fetch staff details" });
    }
};

const EditUser = async (req, res) => {
    try {
        const { id } = req.params;
        const payload = req.body || {};

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ success: false, message: "Invalid user ID" });
        }

        const { user, isClient } = await findAccountById(id, payload.role);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        if (payload.role !== undefined && payload.role !== user.role) {
            return res.status(400).json({ success: false, message: "Changing a user's role is not supported" });
        }
        if (
            (payload.password !== undefined && typeof payload.password !== "string") ||
            (payload.confirmPassword !== undefined && typeof payload.confirmPassword !== "string")
        ) {
            return res.status(400).json({ success: false, message: "Password and Confirm Password must be text" });
        }
        const password = typeof payload.password === "string" ? payload.password : "";
        const confirmPassword = typeof payload.confirmPassword === "string" ? payload.confirmPassword : "";
        const passwordChanged = Boolean(password || confirmPassword);
        if (passwordChanged && (!password || password !== confirmPassword)) {
            return res.status(400).json({ success: false, message: "Password and Confirm Password do not match" });
        }
        if (payload.isActive !== undefined && typeof payload.isActive !== "boolean") {
            return res.status(400).json({ success: false, message: "isActive must be true or false" });
        }
        if (payload.status !== undefined && !["active", "inactive"].includes(payload.status)) {
            return res.status(400).json({ success: false, message: "A valid account status is required" });
        }

        const duplicateValues = isClient
            ? [
                ["username", payload.username],
                ["officeEmail", payload.officeEmail],
                ["officaPhone", payload.officaPhone ?? payload.officeMobile]
            ]
            : [
                ["username", payload.username],
                ["officeEmail", payload.officeEmail],
                ["officeMobile", payload.officeMobile]
            ];
        const duplicateFields = duplicateValues
            .filter(([, value]) => value !== undefined && value !== "")
            .map(([field, value]) => ({ [field]: value }));
        const existingDuplicate = duplicateFields.length
            ? isClient
                ? await Promise.all([
                    clientsregisters.findOne({ _id: { $ne: id }, $or: duplicateFields }),
                    UserSchema.findOne({
                        _id: { $ne: id },
                        $or: duplicateValues
                            .filter(([, value]) => value !== undefined && value !== "")
                            .map(([field, value]) => ({
                                [field === "officaPhone" ? "officeMobile" : field]: value
                            }))
                    })
                ]).then(matches => matches.find(Boolean))
                : await UserSchema.findOne({ _id: { $ne: id }, $or: duplicateFields })
            : null;
        if (existingDuplicate) {
            const payloadPhone = isClient
                ? payload.officaPhone ?? payload.officeMobile
                : payload.officeMobile;
            const duplicatePhone = isClient
                ? existingDuplicate.officaPhone ?? existingDuplicate.officeMobile
                : existingDuplicate.officeMobile;
            const message = payload.username !== undefined && existingDuplicate.username === payload.username
                ? "Username already exists"
                : payload.officeEmail !== undefined && existingDuplicate.officeEmail === payload.officeEmail
                    ? "Office Email already exists"
                    : payloadPhone !== undefined && duplicatePhone === payloadPhone
                        ? (isClient ? "Office Phone already exists" : "Office Mobile already exists")
                        : "An account with these details already exists";
            return res.status(400).json({
                success: false,
                message
            });
        }

        if (isClient) {
            const username = String(payload.username ?? user.username ?? "").trim();
            const officeMobile = String(payload.officaPhone ?? payload.officeMobile ?? user.officaPhone ?? "").trim();
            const officeEmail = payload.officeEmail === undefined
                ? user.officeEmail
                : String(payload.officeEmail ?? "").trim().toLowerCase();
            if (!username) {
                return res.status(400).json({ success: false, message: "Username is required" });
            }
            if (!officeMobile) {
                return res.status(400).json({ success: false, message: "Office Mobile is required" });
            }
            if (passwordChanged && !officeEmail) {
                return res.status(400).json({ success: false, message: "Office Email is required when changing the password" });
            }
            const statusValue = payload.isActive !== undefined
                ? payload.isActive
                : payload.status !== undefined
                    ? payload.status === "active"
                    : user.isActive;
            if (typeof statusValue !== "boolean") {
                return res.status(400).json({ success: false, message: "A valid account status is required" });
            }

            const clientDuplicateFields = [
                { username },
                ...(officeEmail ? [{ officeEmail }] : []),
                { officaPhone: officeMobile }
            ];
            const accountDuplicateFields = [
                { username },
                ...(officeEmail ? [{ officeEmail }] : []),
                { officeMobile }
            ];
            const normalizedDuplicates = await Promise.all([
                clientsregisters.findOne({ _id: { $ne: id }, $or: clientDuplicateFields }),
                UserSchema.findOne({ _id: { $ne: id }, $or: accountDuplicateFields })
            ]);
            const normalizedDuplicate = normalizedDuplicates.find(Boolean);
            if (normalizedDuplicate) {
                const message = normalizedDuplicate.username === username
                    ? "Username already exists"
                    : officeEmail && normalizedDuplicate.officeEmail === officeEmail
                        ? "Office Email already exists"
                        : "Office Mobile already exists";
                return res.status(400).json({ success: false, message });
            }

            user.username = username;
            user.officeEmail = officeEmail;
            user.officaPhone = officeMobile;
            user.isActive = statusValue;
            if (passwordChanged) {
                const plainPassword = password;
                const hashedPassword = await bcrypt.hash(plainPassword, 10);
                user.password = hashedPassword;
            }

            await user.save();
            if (passwordChanged) {
                try {
                    await sendAccountCredentialsMail({
                        to: user.officeEmail,
                        userName: user.username,
                        username: user.username,
                        password,
                        role: user.role,
                        update: true
                    });
                } catch (mailError) {
                    console.error("Password update notification email error:", mailError.message);
                    return res.status(200).json({
                        success: true,
                        emailSent: false,
                        message: "Client account updated successfully, but the password notification email could not be sent"
                    });
                }
            }
            return res.status(200).json({
                success: true,
                emailSent: passwordChanged,
                message: "Client account updated successfully"
            });
        }

        const username = String(payload.username ?? user.username ?? "").trim();
        const wardNo = String(payload.wardNo ?? user.wardNo ?? "").trim();
        const officeMobile = String(payload.officeMobile ?? user.officeMobile ?? "").trim();
        const officeEmail = payload.officeEmail === undefined
            ? user.officeEmail
            : String(payload.officeEmail ?? "").trim().toLowerCase();
        const statusValue = payload.isActive !== undefined
            ? payload.isActive
            : payload.status !== undefined
                ? payload.status === "active"
                : user.isActive;

        if (!wardNo) {
            return res.status(400).json({ success: false, message: "Ward No is required" });
        }
        if (!officeMobile) {
            return res.status(400).json({ success: false, message: "Office Mobile is required" });
        }
        if (!username) {
            return res.status(400).json({ success: false, message: "Username is required" });
        }
        if (typeof statusValue !== "boolean") {
            return res.status(400).json({ success: false, message: "A valid account status is required" });
        }
        if (passwordChanged && !officeEmail) {
            return res.status(400).json({ success: false, message: "Office Email is required when changing the password" });
        }

        const staffDuplicate = await UserSchema.findOne({
            _id: { $ne: id },
            $or: [
                { username },
                ...(officeEmail ? [{ officeEmail }] : []),
                { officeMobile }
            ]
        });
        if (staffDuplicate) {
            const message = staffDuplicate.username === username
                ? "Username already exists"
                : officeEmail && staffDuplicate.officeEmail === officeEmail
                    ? "Office Email already exists"
                    : "Office Mobile already exists";
            return res.status(400).json({ success: false, message });
        }

        user.username = username;
        user.wardNo = wardNo;
        user.toleName = payload.toleName === undefined ? user.toleName : String(payload.toleName).trim();
        user.officeEmail = officeEmail;
        user.officeMobile = officeMobile;
        user.isActive = statusValue;
        if (passwordChanged) {
            const plainPassword = password;
            const hashedPassword = await bcrypt.hash(plainPassword, 10);
            user.password = hashedPassword;
        }

        await user.save();
        if (passwordChanged) {
            try {
                await sendAccountCredentialsMail({
                    to: user.officeEmail,
                    userName: user.fullName || user.fullname || user.username,
                    username: user.username,
                    password,
                    role: user.role,
                    update: true
                });
            } catch (mailError) {
                console.error("Password update notification email error:", mailError.message);
                return res.status(200).json({
                    success: true,
                    emailSent: false,
                    message: "Staff account updated successfully, but the password notification email could not be sent"
                });
            }
        }
        return res.status(200).json({
            success: true,
            emailSent: passwordChanged,
            message: "Staff account updated successfully"
        });
    } catch (err) {
        console.error("Edit staff error:", err);
        return res.status(500).json({ success: false, message: "Unable to update staff account" });
    }
};

const EditStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { isActive, role } = req.body || {};
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ success: false, msg: "Invalid user ID" });
        }
        if (typeof isActive !== "boolean") {
            return res.status(400).json({
                success: false,
                msg: "isActive must be true or false"
            });
        }

        const normalizedRole = typeof role === "string" ? role.trim().toLowerCase() : "";
        let isClient = normalizedRole === "client";
        const model = normalizedRole ? (isClient ? clientsregisters : UserSchema) : null;
        let user;
        if (model) {
            user = await model.findByIdAndUpdate(id, { isActive }, { new: true });
        } else {
            const account = await findAccountById(id);
            user = account.user;
            isClient = account.isClient;
            if (user) {
                user.isActive = isActive;
                await user.save();
            }
        }

        if (!user) {
            return res.status(404).json({
                success: false,
                msg: "User not found"
            });
        }

        return res.status(200).json({
            success: true,
            msg: "Status updated successfully",
            data: isClient ? normalizeClient(user) : (() => {
                const safeUser = user.toObject();
                delete safeUser.password;
                delete safeUser.resetPasswordToken;
                delete safeUser.resetPasswordExpire;
                return safeUser;
            })()
        });

    } catch (err) {
        return res.status(500).json({
            success: false,
            msg: err.message
        });
    }
};



module.exports = {
    AdminGenerated,
    DeleteUser,
    getAllLogedUsers,
    edituser,
    EditUser,
    EditStatus,
    findAccountById
};
