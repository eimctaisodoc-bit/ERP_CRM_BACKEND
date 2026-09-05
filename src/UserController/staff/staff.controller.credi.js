const User = require('../../Usersmodel/UserSchema.js'); // Renamed to capital 'User' (Standard practice for models)

const CreateClientCredential = async (req, res) => {
    const payload = req.body
    try {
        console.log(req.body)
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

        // 2. Return a consistent structure with a clean message for SuccessNotify
        return res.status(201).json({
            success: true,
            message: "Client credentials created successfully!",
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