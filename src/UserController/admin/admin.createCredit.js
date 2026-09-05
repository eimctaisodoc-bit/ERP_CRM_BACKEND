const bcrypt = require("bcrypt");
const UserSchema = require("../../Usersmodel/UserSchema");
const sendAccountCredentialsMail = require("../../middleware/Sendpw");
const sendPasswordResetMail = require("../../middleware/pwResetLinkmail");

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
                role:payload.role
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
        const users = await UserSchema.find({
            role: { $in: ["staff", "client"] }
        })
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



module.exports = { AdminGenerated, DeleteUser, getAllLogedUsers, EditStatus };
