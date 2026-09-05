const transporter = require("./mailTransport");

const sendPasswordResetMail = async ({
    to,
    userName = "User",
    resetLink
}) => {

    const mailOptions = {
        from: `"${process.env.MAIL_FROM || "EIMCTA"}" <${process.env.MAIL_USER}>`,
        to,
        subject: "Reset Your Password",
        html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;border:1px solid #e5e7eb;border-radius:8px">

            <h2 style="color:#f27013">
                Password Reset Request
            </h2>

            <p>Hello ${userName},</p>

            <p>
                We received a request to reset your account password.
            </p>

            <p>
                Click the button below to create a new password:
            </p>

            <div style="margin:30px 0">
                <a
                    href="${resetLink}"
                    style="
                        background:#f27013;
                        color:#ffffff;
                        text-decoration:none;
                        padding:12px 24px;
                        border-radius:6px;
                        display:inline-block;
                    "
                >
                    Reset Password
                </a>
            </div>

            <p>
                This link will expire in <strong>15 minutes</strong>.
            </p>

            <p>
                If you did not request a password reset, please ignore this email.
            </p>

            <br/>

            <p>Regards,</p>
            <p><strong>EIMCTA Team</strong></p>

        </div>
        `
    };

    const info = await transporter.sendMail(mailOptions);

    return {
        success: true,
        messageId: info.messageId
    };
};

module.exports = sendPasswordResetMail;