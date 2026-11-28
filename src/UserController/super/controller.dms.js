
// const { listAllFiles } = require("../../driveAPI/config");<--- can delete this page to , 
const { getOrCreateDmsFolders,listItemsInDriveFolder } = require("../../middleware/CreateDmsFolder");



const listTrashedItems = async (drive, queryExtra = "") => {
    const q = ["trashed = true", queryExtra].filter(Boolean).join(" and ");
    const res = await drive.files.list({
        q,
        fields: "files(id, name, mimeType, trashed, parents)",
        includeItemsFromAllDrives: true,
        supportsAllDrives: true,
    });
    return res.data.files || [];
};

const getFolder = async (req, res) => {
    try {
        const { drive, driveFolderId: parentDriveFolderId } = req;
        const { id: userID, role, fullName } = req.user.decoded;

        const { folder, subFolders, isCreated } = await getOrCreateDmsFolders({ drive, parentDriveFolderId, userID, role, fullName, subFolders: ['sample', 'JobCard'] });
        const files = await listItemsInDriveFolder(drive, folder.driveFolderId);
        const trashedFiles = await listTrashedItems(
            drive,
            `'${folder.driveFolderId}' in parents`
        );

        return res.status(200).json({
            success: true,
            isCreated,
            message: isCreated
                ? "DMS folder created successfully."
                : "Existing DMS folder retrieved successfully.",
            total: files.length,
            trashedCount: trashedFiles.length,
            folder,
            subFolders,
            data: files,
            trashedData: trashedFiles,
        });
    } catch (error) {
        console.error("DMS Controller Error:", error.message);

        if (error.statusCode === 400) {
            return res.status(400).json({
                success: false,
                message: error.message,
            });
        }

        const googleError = error?.response?.data?.error;
        const googleDescription = error?.response?.data?.error_description;

        const isGoogleAuthError =
            googleError === "invalid_grant" ||
            googleDescription?.includes("expired or revoked") ||
            error?.message?.includes("invalid_grant");

        if (req.user?.decoded?.role === "super_admin") {
            if (isGoogleAuthError) {
                return res.status(401).json({
                    success: false,
                    error: "GOOGLE_AUTH_EXPIRED",
                    code: "GOOGLE_AUTH_EXPIRED",
                    message: "Google Drive authorization has expired or been revoked.",
                    action: "REAUTHORIZE_GOOGLE_DRIVE",
                    data: null,
                    ReAuth: true,
                });
            }
        } else if (isGoogleAuthError) {
            return res.status(401).json({
                success: false,
                error: "GOOGLE_AUTH_EXPIRED",
                message:
                    "Token expired or revoked. Please Contact with administrator to reauthorize Google Drive.",
                action: "REAUTHORIZE_GOOGLE_DRIVE",
                data: null,
            });
        }

        return res.status(500).json({
            success: false,
            error: "DMS_ERROR",
            message: "Something went wrong while processing DMS.",
            data: null,
        });
    }
};

module.exports = getFolder;