
const { execFile } = require("child_process");
const { promisify } = require("util");
const path = require("path");
const fs = require("fs");

const execFileAsync = promisify(execFile);

const convertDocxToPdf = async (docxPath) => {
    try {
        if (!fs.existsSync(docxPath)) {
            throw new Error("DOCX file not found!");
        }

        const outputDir = path.dirname(docxPath);
        const pdfName = `${path.basename(docxPath, path.extname(docxPath))}.pdf`;
        const pdfPath = path.join(outputDir, pdfName);

        await execFileAsync("libreoffice", [
            `-env:UserInstallation=file:///tmp/lo-profile-${process.pid}-${Date.now()}`,
            "--headless",
            "--convert-to",
            "pdf",
            "--outdir",
            outputDir,
            docxPath
        ]);

        if (!fs.existsSync(pdfPath)) {
            throw new Error("PDF conversion failed!");
        }

        return {
            pdfPath,
            pdfName
        };

    } catch (error) {
        console.error("DOCX to PDF conversion error:", error);
        throw error;
    }
};

module.exports = convertDocxToPdf;
