const superDmsSchema = require("../Usersmodel/supper/super.dms.schema");

const USER_MODEL_MAP = {
    admin: "branches",
    staff: "staff_",
    super_admin: "Staffs",
    client: "clientscredits",
};

const createHttpError = (message, statusCode = 400) => {
    const err = new Error(message);
    err.statusCode = statusCode;
    return err;
};

const escapeDriveQueryValue = (value) =>
    String(value)
        .trim()
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'");

/* Check if a Drive folder exists and whether it is in Trash. */
const getDriveFolderStatus = async (drive, driveFolderId) => {
    if (!driveFolderId) {
        return { exists: false, trashed: false, meta: null };
    }

    try {
        const res = await drive.files.get({
            fileId: driveFolderId,
            fields: "id, name, mimeType, trashed, parents",
            supportsAllDrives: true,
        });
        return {
            exists: true,
            trashed: Boolean(res.data.trashed),
            meta: res.data,
        };
    } catch (err) {
        if (err.code === 404 || err?.response?.status === 404) {
            return { exists: false, trashed: false, meta: null };
        }
        throw err;
    }
};

/* Create a single folder inside a given parent folder on Google Drive. */
const createDriveFolder = async (drive, parentId, folderName) => {
    if (!parentId) {
        throw createHttpError("Parent Drive folder ID is required.", 400);
    }

    const cleanName = String(folderName || "").trim();
    if (!cleanName) {
        throw createHttpError("Folder name is required.", 400);
    }

    const response = await drive.files.create({
        requestBody: {
            name: cleanName,
            mimeType: "application/vnd.google-apps.folder",
            parents: [parentId],
        },
        fields: "id, name, mimeType, parents",
        supportsAllDrives: true,
    });

    return response.data;
};

/* Check if a subfolder already exists inside a parent Drive folder (non-trashed). */
const findExistingSubfolder = async (drive, parentId, folderName) => {
    const cleanName = String(folderName || "").trim();
    if (!parentId || !cleanName) return null;

    const safeParentId = escapeDriveQueryValue(parentId);
    const safeName = escapeDriveQueryValue(cleanName);

    const res = await drive.files.list({
        q: `'${safeParentId}' in parents and name = '${safeName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: "files(id, name, mimeType, parents)",
        includeItemsFromAllDrives: true,
        supportsAllDrives: true,
        pageSize: 1,
    });

    return (res.data.files && res.data.files[0]) || null;
};

/* List all non-trashed subfolders inside a parent Drive folder. */
const listSubfoldersInDrive = async (drive, parentId) => {
    if (!parentId) return [];

    const safeParentId = escapeDriveQueryValue(parentId);
    const folders = [];
    let pageToken = null;

    do {
        const res = await drive.files.list({
            q: `'${safeParentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
            fields: "nextPageToken, files(id, name, mimeType, parents)",
            includeItemsFromAllDrives: true,
            supportsAllDrives: true,
            pageSize: 100,
            ...(pageToken ? { pageToken } : {}),
        });

        if (Array.isArray(res.data.files)) {
            folders.push(...res.data.files);
        }
        pageToken = res.data.nextPageToken || null;
    } while (pageToken);

    return folders;
};

/* List all non-trashed items (folders + files) inside a parent Drive folder. */
const listItemsInDriveFolder = async (drive, parentId) => {
    if (!parentId) return [];

    const safeParentId = escapeDriveQueryValue(parentId);
    const items = [];
    let pageToken = null;

    do {
        const res = await drive.files.list({
            q: `'${safeParentId}' in parents and trashed = false`,
            orderBy: "folder,name",
            fields:
                "nextPageToken, files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink, parents)",
            includeItemsFromAllDrives: true,
            supportsAllDrives: true,
            pageSize: 1000,
            ...(pageToken ? { pageToken } : {}),
        });

        if (Array.isArray(res.data.files)) {
            items.push(...res.data.files);
        }
        pageToken = res.data.nextPageToken || null;
    } while (pageToken);

    return items;
};

/* Recursively fetch child folders AND files into `children`. */
const fetchDriveFolderTree = async (drive, parentId) => {
    const driveItems = await listItemsInDriveFolder(drive, parentId);
    const tree = [];

    for (const item of driveItems) {
        const isFolder = item.mimeType === "application/vnd.google-apps.folder";

        if (isFolder) {
            const nestedChildren = await fetchDriveFolderTree(drive, item.id);
            tree.push({
                id: item.id,
                name: item.name,
                type: "folder",
                mimeType: item.mimeType,
                created: false,
                children: nestedChildren,
            });
        } else {
            tree.push({
                id: item.id,
                name: item.name,
                type: "file",
                mimeType: item.mimeType,
                size: item.size || null,
                createdTime: item.createdTime || null,
                modifiedTime: item.modifiedTime || null,
                webViewLink: item.webViewLink || null,
            });
        }
    }

    return tree;
};

/* Recursively ensure folder hierarchy exists on Google Drive and include children data. */
const ensureMultipleDriveFolders = async (
    drive,
    rootFolderId,
    folderSpecs = [],
    { fetchExistingChildren = true } = {}
) => {
    if (!Array.isArray(folderSpecs) || folderSpecs.length === 0) {
        return [];
    }

    const results = [];

    for (const spec of folderSpecs) {
        const isObject = typeof spec === "object" && spec !== null;
        const rawName = isObject ? spec.name : spec;
        const name = String(rawName || "").trim();
        const children = isObject && Array.isArray(spec.children) ? spec.children : [];

        if (!name) continue;

        let folder = await findExistingSubfolder(drive, rootFolderId, name);
        let created = false;

        if (!folder) {
            folder = await createDriveFolder(drive, rootFolderId, name);
            created = true;
        }

        const nestedChildren =
            children.length > 0
                ? await ensureMultipleDriveFolders(drive, folder.id, children, {
                      fetchExistingChildren,
                  })
                : fetchExistingChildren
                ? await fetchDriveFolderTree(drive, folder.id)
                : [];

        results.push({
            id: folder.id,
            name: folder.name,
            type: "folder",
            created,
            children: nestedChildren,
        });
    }

    return results;
};

/* Count how many subfolders (including nested children) were newly created. */
const countCreatedSubFolders = (folders = []) => {
    if (!Array.isArray(folders)) return 0;

    let count = 0;
    for (const folder of folders) {
        if (!folder || folder.type === "file") continue;
        if (folder.created) count += 1;
        if (Array.isArray(folder.children) && folder.children.length > 0) {
            count += countCreatedSubFolders(folder.children);
        }
    }
    return count;
};

/* Extract newly created folders while preserving nested children that were created. */
const extractCreatedSubFolders = (folders = []) => {
    if (!Array.isArray(folders)) return [];

    const result = [];
    for (const folder of folders) {
        if (!folder || folder.type === "file") continue;

        const createdChildren = Array.isArray(folder.children)
            ? extractCreatedSubFolders(folder.children)
            : [];

        if (folder.created || createdChildren.length > 0) {
            result.push({
                id: folder.id,
                name: folder.name,
                type: "folder",
                created: Boolean(folder.created),
                children: createdChildren,
            });
        }
    }
    return result;
};

/* Create DB records for newly created folders (only where created === true) with full path. */
const saveCreatedSubFoldersToDb = async ({
    userID,
    userModel,
    basePath,
    createdSubFolders = [],
}) => {
    if (!Array.isArray(createdSubFolders) || createdSubFolders.length === 0) {
        return [];
    }

    const savedRecords = [];
    const cleanBase = String(basePath || "").trim();

    const createRecordsRecursively = async (folders, currentPath) => {
        for (const folder of folders) {
            if (!folder || !folder.id || !folder.name || folder.type === "file") continue;

            const fullFolderPath = currentPath
                ? `${currentPath}/${folder.name}`
                : folder.name;

            if (folder.created) {
                const existingRecord = await superDmsSchema.findOne({
                    userID,
                    userModel,
                    driveFolderId: folder.id,
                });

                if (!existingRecord) {
                    const createdRecord = await superDmsSchema.create({
                        userID,
                        userModel,
                        driveFolderId: folder.id,
                        driveFolderName: fullFolderPath,
                    });
                    savedRecords.push(createdRecord);
                }
            }

            if (Array.isArray(folder.children) && folder.children.length > 0) {
                await createRecordsRecursively(folder.children, fullFolderPath);
            }
        }
    };

    await createRecordsRecursively(createdSubFolders, cleanBase);
    return savedRecords;
};

const getOrCreateDmsFolders = async ({
    drive,
    parentDriveFolderId,
    userID,
    role,
    fullName,
    subFolders = [],
    fetchExistingChildren = true,
}) => {
    if (!drive) {
        throw createHttpError("Google Drive client is required.", 400);
    }
    if (!userID) {
        throw createHttpError("User ID is missing.", 400);
    }

    const normalizedRole = String(role || "").toLowerCase().trim();
    const userModel = USER_MODEL_MAP[normalizedRole];
    if (!userModel) {
        throw createHttpError("Invalid user role.", 400);
    }

    const cleanFullName = String(fullName || "").trim();

    let rootFolderRecord = await superDmsSchema.findOne({
        userID,
        userModel,
        driveFolderName: { $not: /\// },
    });

    let isCreated = false;

    if (rootFolderRecord) {
        const driveStatus = await getDriveFolderStatus(drive, rootFolderRecord.driveFolderId);

        if (!driveStatus.exists || driveStatus.trashed) {
            if (!parentDriveFolderId) {
                throw createHttpError(
                    "Existing Drive folder is missing or in trash, and parent driveFolderId is missing to recreate it.",
                    400
                );
            }
            const folderTitle = cleanFullName || rootFolderRecord.driveFolderName;
            if (!folderTitle) {
                throw createHttpError("fullName is required to recreate the Drive folder.", 400);
            }

            const newDriveFolder = await createDriveFolder(drive, parentDriveFolderId, folderTitle);
            rootFolderRecord.driveFolderId = newDriveFolder.id;
            rootFolderRecord.driveFolderName = newDriveFolder.name;
            await rootFolderRecord.save();
            isCreated = true;
        }
    } else {
        if (!parentDriveFolderId) {
            throw createHttpError("Parent driveFolderId is required to create a new folder.", 400);
        }
        if (!cleanFullName) {
            throw createHttpError("fullName is required to create a new folder.", 400);
        }

        const newDriveFolder = await createDriveFolder(drive, parentDriveFolderId, cleanFullName);
        rootFolderRecord = await superDmsSchema.create({
            userID,
            userModel,
            driveFolderId: newDriveFolder.id,
            driveFolderName: newDriveFolder.name,
        });
        isCreated = true;
    }

    const ensuredSubFolders = await ensureMultipleDriveFolders(
        drive,
        rootFolderRecord.driveFolderId,
        subFolders,
        { fetchExistingChildren }
    );

    const rootPathName = cleanFullName || rootFolderRecord.driveFolderName;

    if (ensuredSubFolders.length > 0) {
        await saveCreatedSubFoldersToDb({
            userID,
            userModel,
            basePath: rootPathName,
            createdSubFolders: ensuredSubFolders,
        });
    }

    const newlyCreatedSubFolders = extractCreatedSubFolders(ensuredSubFolders);
    const createdSubFolderCount = countCreatedSubFolders(ensuredSubFolders);

    return {
        isCreated,
        folder: rootFolderRecord,
        subFolders: ensuredSubFolders,
        createdSubFolderCount,
        newlyCreatedSubFolders,
    };
};

module.exports = {
    USER_MODEL_MAP,
    getDriveFolderStatus,
    createDriveFolder,
    findExistingSubfolder,
    listSubfoldersInDrive,
    listItemsInDriveFolder,
    fetchDriveFolderTree,
    ensureMultipleDriveFolders,
    countCreatedSubFolders,
    extractCreatedSubFolders,
    saveCreatedSubFoldersToDb,
    getOrCreateDmsFolders,
};