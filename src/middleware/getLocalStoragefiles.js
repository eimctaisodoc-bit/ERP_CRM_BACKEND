const fs = require("fs/promises");
const path = require("path");

const getSalesEvidenceFiles = async (req, res) => {
  try {
    const basePath = path.join(__dirname, "../../public/salesEvidence");

    const folders = [
      "proposal",
      "contract",
      "note",
      "meeting",
      "message",
      "call",
    ];

    const result = {};

    for (const folder of folders) {
      const folderPath = path.join(basePath, folder);

      try {
        const files = await fs.readdir(folderPath, {
          withFileTypes: true,
        });

        result[folder] = files
          .filter((file) => file.isFile())
          .map((file) => ({
            name: file.name,
            url: `/salesEvidence/${folder}/${encodeURIComponent(file.name)}`,
            extension: path.extname(file.name),
          }));
      } catch (error) {
        if (error.code === "ENOENT") {
          result[folder] = [];
        } else {
          throw error;
        }
      }
    }

    const count = Object.values(result).reduce(
      (total, files) => total + files.length,
      0,
    );

    return res.status(200).json({
      success: true,
      count,
      files: result,
    });
  } catch (error) {
    console.error("Error reading files:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getSalesEvidenceFiles,
};
