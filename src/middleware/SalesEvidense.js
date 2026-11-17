
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Base upload directory
const baseDir = path.join(__dirname, "../../public");

// Create separate directories
const proposalDir = path.join(baseDir, "salesEvidence/proposal");
const contractDir = path.join(baseDir, "salesEvidence/contract");

const Note = path.join(baseDir, "salesEvidence/note");
const Meeting = path.join(baseDir, "salesEvidence/meeting");
const Message = path.join(baseDir, "salesEvidence/message");
const call = path.join(baseDir, "salesEvidence/call");

[proposalDir, contractDir, Note, Meeting, Message, call].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Reusable storage function
const createStorage = (destination) =>
  multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, destination);
    },

    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);

      const baseName = path
        .basename(file.originalname, ext)
        .replace(/\s+/g, "_");

      cb(null, `${baseName}-${Date.now()}${ext}`);
    }
  });

// Image filter for contracts
const imageFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/png",
    "image/jpg",
    "image/jpeg"
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only PNG, JPG and JPEG files are allowed!"), false);
  }
};

// DOCX filter for proposals
const proposalFileFilter = (req, file, cb) => {
  if (
    file.mimetype ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    cb(null, true);
  } else {
    cb(new Error("Only DOCX proposal files are allowed!"), false);
  }
};

// Contract uploads
const Salesupload = multer({
  storage: createStorage(contractDir),
  fileFilter: imageFilter,
  limits: {
    fileSize: 50 * 1024 * 1024
  }
});

// Proposal uploads
const ProposalUpload = multer({
  storage: createStorage(proposalDir),
  fileFilter: proposalFileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024
  }
});


const Note_ = multer({
  storage: createStorage(Note),
  fileFilter: imageFilter,
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

const Meeting_ = multer({
  storage: createStorage(Meeting),
  fileFilter: imageFilter,
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

const Message_ = multer({
  storage: createStorage(Message),
  fileFilter: imageFilter,
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

const call_ = multer({
  storage: createStorage(call),
  fileFilter: imageFilter,
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});





module.exports = {
  Salesupload,
  ProposalUpload,
  Note_,
  Meeting_,
  call_,
  Message_
};
