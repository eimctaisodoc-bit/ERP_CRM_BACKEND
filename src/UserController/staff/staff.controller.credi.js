const User = require('../../Usersmodel/UserSchema.js'); // Renamed to capital 'User' (Standard practice for models)
const sendAccountCredentialsMail = require('../../middleware/Sendpw');

const CreateClientCredential = async (req, res) => {
    const payload = req.body
    try {
        // 1. Create the user in the database

        const newUser = await User.create({
            // officeEmail: email,
            username: payload.userName,
            password: payload.password,
            // confirmPassword: 'b#hKhh$BrZ',
            role: 'client',
            officeEmail: payload.orgEmail,
            officeMobile: payload.orgTelephone,

            personalEmail: payload.contactPersonEmail,
            personalMobile: payload.contactPersonNumber,
            contactPersonName: payload.contactPersonName,
            refIds: payload.refID,
        });

        let emailSent = true;
        let message = "Client credentials created successfully and email sent.";

        try {
            await sendAccountCredentialsMail({
                to: payload.email,
                userName: payload.contactPersonName || payload.userName,
                username: payload.userName,
                password: payload.password,
                role: 'client'
            });
        } catch (mailError) {
            emailSent = false;
            message = "Client credentials were created, but the credentials email could not be sent.";
            console.error("Error sending client credentials email:", mailError);
        }

        return res.status(201).json({
            success: true,
            emailSent,
            message,
            data: newUser
        });

    } catch (error) {
        console.error("Error creating client credential:", error);

        // 3. Return a consistent error structure for your catch block on the frontend
        return res.status(500).json({
            error: true,
            message: error.message || "Failed to create client credentials."
        });
    }
}

module.exports = CreateClientCredential;