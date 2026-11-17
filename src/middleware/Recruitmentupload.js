const multer = require("multer");
const path = require("path");
const fs = require("fs");

const dir="./uploads/recruitments/";
const checkDir = () => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, checkDir() || dir),
    filename: (req, file, cb) => {
      const uniqueName = file.originalname;
      cb(null, uniqueName);
    }
  });

  // Word file filter
  const wordFilter = (req, file, cb) => {
    const allowed = [
      'image/png',
      'image/jpg',
      'image/jpeg',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only Word, PDF, and png,jpeg,jpg files are allowed'));
  };

  const upload = multer({ storage, fileFilter: wordFilter, limits: { fileSize: 10 * 1024 * 1024 } });

  module.exports = { upload };
