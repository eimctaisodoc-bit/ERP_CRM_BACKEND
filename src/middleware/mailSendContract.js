const transporter = require("./mailTransport");

const sendMailWithAttachments = async ({
  to,
  subject = "EIMCTA Official Documents", // Clean, single default
  message = "Please find the attached documents.",
  attachments = [],
}) => {
  if (!to || to.length === 0) {
    throw new Error("Receiver email is required");
  }

  const mailOptions = {
    from: `"${process.env.MAIL_FROM || "EIMCTA"}" <${process.env.MAIL_USER}>`,
    to: to, // Nodemailer natively accepts arrays or comma-separated strings
    subject: subject,
    html: `
      <div style="font-family: Arial, sans-serif; font-size: 14px; color: #1f2937; max-width: 600px; margin: auto; border: 1px solid #e5e7eb; padding: 20px; border-radius: 8px;">
        <h2 style="color:#4f46e5; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
          ${subject}
        </h2>

        <p>${message}</p>

        <p>Kindly review the attached files.</p>

        <br />

        <p style="margin:0;">Regards,</p>
        <p style="margin:0;"><strong>EIMCTA Team</strong></p>
      </div>
    `,
    attachments,
  };

  // The try/catch is handled by the controller that calls this function
  const info = await transporter.sendMail(mailOptions);

  return {
    success: true,
    messageId: info.messageId,
    accepted: info.accepted,
    rejected: info.rejected,
  };
};

module.exports = sendMailWithAttachments;