const fs = require("fs/promises");

const deleteFiles = async (files = []) => {
    console.log('from delete file fn ',files)
    try {
        if (!Array.isArray(files) || files.length === 0) {
            return {
                success: true,
                deletedCount: 0,
                message: "No files to delete"
            };
        }

        const results = await Promise.allSettled(
            files.map(async (file) => {
                const filePath = typeof file === "string" ? file : file?.path;

                if (!filePath) {
                    throw new Error("Invalid file path");
                }

                await fs.unlink(filePath);
                return filePath.split(/[/\\]/).pop();
            })
        );

        const deleted = results
            .filter(r => r.status === "fulfilled")
            .map(r => r.value);

        const failed = results
            .filter(r => r.status === "rejected")
            .map(r => r.reason?.message);

        return {
            success: failed.length === 0,
            deletedCount: deleted.length,
            failedCount: failed.length,
            deleted,
            failed
        };

    } catch (error) {
        return {
            success: false,
            message: error.message
        };
    }
};

module.exports = {deleteFiles};