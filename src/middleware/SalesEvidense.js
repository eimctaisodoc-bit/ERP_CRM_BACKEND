const multer = require("multer");
const path = require("path");
const fs = require("fs");

const dir = "./uploads/SalesEvidense/";
// const dir = path.join(__dirname, "../uploads/SalesEvidense"); <-----for production

if (!fs.existsSync(dir)) { 
  fs.mkdirSync(dir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext).replace(/\s+/g, '_');
    const finalName = `${baseName}-${Date.now()}${ext}`;
    
    cb(null, finalName);
  }
});

const imageFilter = (req, file, cb) => {
  const allowedTypes = ['image/png', 'image/jpg', 'image/jpeg'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only .png, .jpeg, and .jpg files are allowed!'), false);
  }
};

const Salesupload = multer({ 
  storage, 
  fileFilter: imageFilter, 
  limits: { fileSize: 10 * 1024 * 1024 } 
});

module.exports = { Salesupload };