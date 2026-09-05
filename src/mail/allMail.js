const emailjs = require('@emailjs/nodejs');
const fs = require('fs');

async function sendContactEmail({ subject, message, filePath }) {
    console.log('EmailJS Config:',process.env.privateKey, process.env.publicKey, process.env.serviceID, process.env.templateID);
    
    // try {
    //     let attachmentBase64 = '';

    //     if (filePath) {
    //         const file = fs.readFileSync(filePath);
    //         attachmentBase64 = file.toString('base64');
    //     }

    //     const response = await emailjs.send(
    //         process.env.EMAILJS_SERVICE_ID,
    //         process.env.EMAILJS_TEMPLATE_ID,
    //         {
    //             subject: subject || 'No Subject',
    //             message: message || 'No Message',
    //             attachment: attachmentBase64, // 👈 base64 file
    //         },
    //         {
    //             publicKey: process.env.EMAILJS_PUBLIC_KEY,
    //             privateKey: process.env.EMAILJS_PRIVATE_KEY,
    //         }
    //     );

    //     return {
    //         success: true,
    //         status: response.status,
    //     };

    // } catch (error) {
    //     return {
    //         success: false,
    //         error: error.message,
    //     };
    // }
}

module.exports = sendContactEmail;