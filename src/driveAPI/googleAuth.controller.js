
const { getGoogleClient, db } = require("./config");

// ==================================
// GOOGLE AUTH
// ==================================

const googleAuth = async (req, res, next) => {
    try {
        const userId = req.user.decoded.id;

        const client = getGoogleClient(userId);

        const url = client.generateAuthUrl({
            access_type: "offline",
            prompt: "consent",
            scope: [
                "https://www.googleapis.com/auth/drive",
            ],
            state: userId,
        });

        return res.redirect(url);

    } catch (error) {
        next(error);
    }
};

// ==================================
// GOOGLE CALLBACK
// ==================================

const googleCallback = async (req, res, next) => {
    try {
        const { code, state: userId, error } = req.query;

        if (error) {
            return res.status(400).json({
                success: false,
                message: "Google authentication cancelled.",
            });
        }

        if (!code || !userId) {
            return res.status(400).json({
                success: false,
                message: "Missing authorization code or user ID.",
            });
        }

        const client = getGoogleClient(userId);

        const { tokens } = await client.getToken(code);

        // Preserve existing refresh token
        const oldTokens = await db.getTokens(userId);

        await db.saveTokens(userId, {
            ...oldTokens,
            ...tokens,
            refresh_token:
                tokens.refresh_token || oldTokens?.refresh_token,
        });

        return res.status(200).json({
            success: true,
            message: "Google Drive connected successfully.",
        });

    } catch (error) {
        next(error);
    }
};

module.exports = {
    googleAuth,
    googleCallback,
};
