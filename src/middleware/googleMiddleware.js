
// const { google, getGoogleClient, db } = require("../config");


const { google } = require("googleapis");
const { getGoogleClient, db } = require("../driveAPI/config");


const ROLE_FOLDERS = Object.freeze({
    CLIENT: process.env.CLIENT_FOLDER_ID,
    STAFF: process.env.STAFF_FOLDER_ID,
    ADMIN: process.env.ADMIN_FOLDER_ID,
    SUPER_ADMIN: process.env.SUPER_FOLDER_ID,
});

const googleMiddleware = async (req, res, next) => {
    try {
        // 1. Get authenticated user details
        const userId = req?.user?.decoded?.id;
        const role = req?.user?.decoded?.role?.toUpperCase();
        console.log(`Google Middleware: User ID: ${userId}, Role: ${role}`);

        if (!userId || !role) {
            return res.status(401).json({
                success: false,
                message: "User authentication required.",
            });
        }

        // 2. Get role-based folder
        const folderId = ROLE_FOLDERS[role];
        // console.log(`User: ${userId}, Role: ${role}, Folder ID: ${folderId}`);

        if (!folderId) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized Google Drive access.",
            });
        }

        // 3. Verify Google token
        const userTokens = await db.getTokens(userId);

        if (!userTokens?.refresh_token) {
            return res.status(401).json({
                success: false,
                code: "AUTH_REQUIRED",
                message:
                    role === "SUPER_ADMIN"
                        ? "Google authentication required."
                        : "Your Google Drive token has expired. Please contact the MD to generate a new login session.",
            });
        }

        // 4. Initialize Google OAuth client
        const client = getGoogleClient(userId);
        client.setCredentials(userTokens);

        // 5. Initialize Google Drive
        const drive = google.drive({
            version: "v3",
            auth: client,
        });

        // 6. Attach data to request
        req.drive = drive;
        req.driveClient = client;
        req.driveUserId = userId;
        req.driveRole = role;
        req.driveFolderId = folderId;

        next();

    } catch (error) {
        next(error);
    }
};

module.exports = googleMiddleware;
