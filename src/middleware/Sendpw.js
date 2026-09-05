const transporter = require("./mailTransport");

const sendAccountCredentialsMail = async ({
    to,
    userName = "User",
    username,
    password,
    role,
    update = false
}) => {

    const subject = update
        ? "Password Reset Successful"
        : "Your Account Login Credentials";

    const html = update
        ? `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;border:1px solid #e5e7eb;border-radius:8px">

            <h2 style="color:#16a34a">
                Password Reset Successful
            </h2>

            <p>Hello ${userName},</p>

            <p>
                Your password has been successfully updated.
            </p>

            <div style="
                background:#f8fafc;
                padding:15px;
                border-radius:8px;
                margin:20px 0;
            ">
                <p><strong>Username:</strong> ${username}</p>
                <p><strong>New Password:</strong> ${password}</p>
            </div>

            <p style="color:#2563eb;">
                Please keep your password secure and remember it for future logins.
            </p>

            <p style="color:#dc2626;">
                If you did not perform this password reset, please contact the administrator immediately.
            </p>

            <br/>

            <p>Regards,</p>
            <p><strong>EIMCTA Team</strong></p>

        </div>
        `
        : `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;border:1px solid #e5e7eb;border-radius:8px">

            <h2 style="color:#f27013">
                Welcome to EIMCTA ERP
            </h2>

            <p>Hello ${userName},</p>

            <p>
                Your account has been successfully created.
            </p>

            <div style="
                background:#f8fafc;
                padding:15px;
                border-radius:8px;
                margin:20px 0;
            ">
                <p><strong>Username:</strong> ${username}</p>
                <p><strong>Password:</strong> ${password}</p>
                <p><strong>Role:</strong> ${role}</p>
            </div>

            <p style="color:red;">
                For security reasons, please change your password after your first login.
            </p>

            <br/>

            <p>Regards,</p>
            <p><strong>EIMCTA Team</strong></p>

        </div>
        `;

    const info = await transporter.sendMail({
        from: `"${process.env.MAIL_FROM || "EIMCTA"}" <${process.env.MAIL_USER}>`,
        to,
        subject,
        html
    });
    console.log("Message ID:", info.messageId);
    console.log("Accepted:", info.accepted);
    console.log("Rejected:", info.rejected);
    return {
        success: true,
        messageId: info.messageId
    };
};

module.exports = sendAccountCredentialsMail;