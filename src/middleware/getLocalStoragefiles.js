const fs = require("fs/promises");
const path = require("path");

const getSalesEvidenceFiles = async (req, res) => {
    // console.log('pathname',path.join(__dirname))
    try {
        const folderPath = path.join(
            __dirname,
            "../../uploads/SalesEvidense"
        );

        const files = await fs.readdir(folderPath);

        const fileList = files.map(file => ({
            name: file,
            url: `/uploads/SalesEvidense/${file}`,
            extension: path.extname(file),
        }));

        return res.status(200).json({
            success: true,
            count: fileList.length,
            files: fileList
        });

    } catch (error) {
        console.error("Error reading files:", error);

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    getSalesEvidenceFiles
};