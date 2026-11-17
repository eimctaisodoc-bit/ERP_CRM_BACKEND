const crypto = require("crypto");
const sendPasswordResetMail = require("../middleware/pwResetLinkmail");

const createSendCreditController = (findAccount) => async (req, res) => {
    try {
        const account = await findAccount(req);
        if (!account) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const email = account.officeEmail || account.email;
        if (typeof email !== "string" || !email.trim()) {
            return res.status(400).json({
                success: false,
                message: "The account does not have an email address"
            });
        }

        const resetToken = crypto.randomBytes(32).toString("hex");
        account.resetPasswordToken = crypto
            .createHash("sha256")
            .update(resetToken)
            .digest("hex");
        account.resetPasswordExpire = new Date(Date.now() + 15 * 60 * 1000);
        await account.save();

        const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
        await sendPasswordResetMail({
            to: email.trim(),
            userName:
                account.fullName ||
                account.fullname ||
                [account.Fname, account.Lname].filter(Boolean).join(" ") ||
                account.username ||
                account.staffId ||
                email.trim(),
            resetLink
        });

        return res.status(200).json({
            success: true,
            message: "Password reset link sent",
            email: email.trim()
        });
    } catch (error) {
        console.error("Send password reset link error:", error);
        return res.status(error.statusCode || (error.name === "CastError" ? 400 : 500)).json({
            success: false,
            message: error.statusCode ? error.message : "Unable to send password reset link"
        });
    }
};

module.exports = createSendCreditController;
