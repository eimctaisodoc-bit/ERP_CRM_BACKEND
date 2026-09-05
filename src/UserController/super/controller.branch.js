const bcrypt = require("bcrypt");
const UserSchema = require("../../Usersmodel/UserSchema");
const crypto = require("crypto");
const sendPasswordResetMail = require('../../middleware/pwResetLinkmail')
const sendAccountCredentialsMail = require("../../middleware/Sendpw");
const Branch = require("../../Usersmodel/supper/model.branch");
const { error } = require("console");




// for branch only =======================================================================
const CreateBranch = async (req, res) => {
    try {
        const payload = req.body;
        const plainPassword = payload.password;
        const hashedPassword = plainPassword
            ? await bcrypt.hash(plainPassword, 10)
            : undefined;
        const province = payload.province ?? payload.Prvince;
        const districtName = payload.districtName ?? payload.districts ?? payload.district;
        const district = payload.district ?? districtName;

        const districtExists = await Branch.findOne({
            district
        });

        console.log("District Exists:", districtExists);
        if (districtExists) {
            return res.status(400).json({
                success: false,
                message: `Branch already exists in ${districtName}`
            });
        }

        const emailExists = await Branch.findOne({
            officeEmail: payload.officeEmail
        });

        if (emailExists) {
            return res.status(400).json({
                success: false,
                message: "Office Email already exists"
            });
        }

        const mobileExists = await Branch.findOne({
            officeMobile: payload.officeMobile
        });

        if (mobileExists) {
            return res.status(400).json({
                success: false,
                message: "Office Mobile already exists"
            });
        }


        const provinceCode = payload.provinceName
            ?.trim()
            .substring(0, 3)
            .toUpperCase();

        const districtCode = districtName
            ?.trim()
            .substring(0, 3)
            .toUpperCase();

        const branchName = provinceCode && districtCode
            ? `${provinceCode}-${districtCode}`
            : undefined;

        const branchNameExists = await Branch.findOne({
            branchName
        });

        if (branchNameExists) {
            return res.status(400).json({
                success: false,
                message: "Branch name already exists"
            });
        }

        const newBranch = await Branch.create({
            UserfullName: payload.fullName,
            designation: payload.designation,
            jobRole: payload.jobRole,
            personalMobile: payload.personalMobile,
            personalEmail: payload.personalEmail,
            username: payload.username,
            password: hashedPassword,
            role: payload.role,

            province,
            provinceName: payload.provinceName,

            district,
            districtName,
            districts: payload.districts ?? districtName,

            localLevelName: payload.localLevelName,
            wardNo: payload.wardNo,
            toleName: payload.toleName,
            lat: payload.lat,
            lng: payload.lng,

            branchName,

            officeEmail: payload.officeEmail,
            officeMobile: payload.officeMobile,

            status: payload.status
        });
        console.log("New Branch Created:", newBranch);
        try {
            await sendAccountCredentialsMail({
                to: payload.officeEmail,
                userName: payload.fullName,
                username: payload.username,
                password: plainPassword,
                role: payload.role
            });

            console.log("Credentials email sent");
        } catch (mailError) {
            console.error("Email Error:", mailError.message);
        }

        return res.status(201).json({
            success: true,
            message: "Branch created successfully",
            data: newBranch
        });

    } catch (error) {
        console.error("Create Branch Error:", error);

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const DeleteBranch = async (req, res) => {
    try {
        const { id } = req.params;

        const branch = await Branch.findById(id);

        if (!branch) {
            return res.status(404).json({
                success: false,
                message: "Branch not found"
            });
        }

        await Branch.findByIdAndDelete(id);

        return res.status(200).json({
            success: true,
            message: "Branch deleted successfully"
        });

    } catch (error) {
        console.error("Delete Branch Error:", error);

        return res.status(500).json({
            success: false,
            message: error.message
        });
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
        const { isActive } = req.body;
        const status = isActive ? "active" : "inactive";
        const branch = await Branch.findByIdAndUpdate(id, { status }, { new: true });

        if (!branch) return res.status(404).json({ success: false, message: "Branch not found" });
        return res.status(200).json({ success: true, message: "Branch status updated successfully", data: branch });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const SendBranchCredit = async (req, res) => {
    try {
        const branch = await Branch.findById(req.params.id);
        if (!branch) return res.status(404).json({ success: false, message: "Branch not found" });

        const newPassword = crypto.randomBytes(6).toString("base64url");
        branch.password = await bcrypt.hash(newPassword, 10);
        await branch.save();

        await sendAccountCredentialsMail({
            to: branch.officeEmail,
            userName: branch.fullName || branch.username,
            username: branch.username,
            password: newPassword,
            role: branch.role || "branch"
        });

        return res.status(200).json({ success: true, message: "Branch credentials sent successfully" });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ====================================================================================


const AdminGenerated = async (req, res) => {
    try {
        const payload = req.body;

        if (payload.password !== payload.confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "Password and Confirm Password do not match"
            });
        }

        const duplicate = await UserSchema.findOne({
            $or: [
                { officeEmail: payload.officeEmail },
                { officeMobile: payload.officeMobile },
                { username: payload.username }
            ]
        });

        if (duplicate) {
            return res.status(400).json({
                success: false,
                message:
                    duplicate.officeEmail === payload.officeEmail
                        ? "Office Email already exists"
                        : duplicate.officeMobile === payload.officeMobile
                            ? "Office Mobile already exists"
                            : "Username already exists"
            });
        }

        if (payload.role === "admin") {

            const totalAdmins = await UserSchema.countDocuments({
                role: "admin"
            });

            if (totalAdmins >= 7) {
                return res.status(400).json({
                    success: false,
                    message: "Maximum 7 admin accounts allowed"
                });
            }

            const provinceExists = await UserSchema.findOne({
                role: "admin",
                provinceName: payload.provinceName
            });

            if (provinceExists) {
                return res.status(400).json({
                    success: false,
                    message: `Admin already assigned to ${payload.provinceName}`
                });
            }
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

            status: payload.status,
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

            console.log("Credentials email sent");
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
    const { ids } = req.body;
    console.log(ids)
    try {
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({
                success: false,
                msg: "No user IDs provided."
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
                "username role designation jobRole officeEmail officeMobile province provinceName districtName localLevel isActive"
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

const EditStatus = async (req, res) => {
    const { id } = req.params;
    const { isActive } = req.body;

    console.log(req.body, isActive)
    try {
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

        return res.status(200).json({
            success: true,
            msg: "Status updated successfully",
            data: user
        });

    } catch (err) {
        return res.status(500).json({
            success: false,
            msg: err.message
        });
    }
};

const SendCredit = async (req, res) => {
    try {

        const { id } = req.params;

        const user = await UserSchema.findById(id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const resetToken = crypto
            .randomBytes(32)
            .toString("hex");

        user.resetPasswordToken = crypto
            .createHash("sha256")
            .update(resetToken)
            .digest("hex");

        user.resetPasswordExpire =
            Date.now() + 15 * 60 * 1000;

        await user.save();

        const resetLink =
            `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

        await sendPasswordResetMail({
            to: user.officeEmail,
            userName: user.fullName || user.username,
            resetLink
        });

        res.status(200).json({
            success: true,
            message: "Password reset link sent",
            email: user.officeEmail
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }
};


const VerifyResetToken = async (req, res) => {
    try {

        const { token } = req.params;

        const hashedToken = crypto
            .createHash("sha256")
            .update(token)
            .digest("hex");

        const user = await UserSchema.findOne({
            resetPasswordToken: hashedToken
        });

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

        const { token } = req.params;
        const { password, confirmPassword } = req.body;
        console.log(password, confirmPassword)

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

        const user = await UserSchema.findOne({
            resetPasswordToken: hashedToken
        });

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
            to: user.officeEmail,
            userName: user.fullName || user.username,
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


module.exports = { AdminGenerated, DeleteUser, getAllLogedUsers, SendCredit, EditStatus, VerifyResetToken, ResetPassword,CreateBranch,DeleteBranch,getAllBranches,EditBranchStatus,SendBranchCredit };
