const multer = require("multer");
const path = require("path");

const imageFilter = (req, file, cb) => {
  const allowedTypes = ["image/png", "image/jpeg", "image/jpg"];
  if (allowedTypes.includes(file.mimetype)) {
    return cb(null, true);
  }
  cb(new Error("Only PNG, JPG and JPEG files are allowed!"), false);
};

const recruitmentFileFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/png",
    "image/jpeg",
    "image/jpg",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];
  const allowedExtensions = [".png", ".jpg", ".jpeg", ".docx"];
  const extension = path.extname(file.originalname).toLowerCase();

  if (
    !allowedTypes.includes(file.mimetype) ||
    !allowedExtensions.includes(extension)
  ) {
    return cb(
      new Error("Only PNG, JPG, JPEG and DOCX files are allowed!"),
      false
    );
  }
  cb(null, true);
};

const proposalFileFilter = (req, file, cb) => {
  const allowedMimeType =
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  const extension = path.extname(file.originalname).toLowerCase();

  if (file.mimetype === allowedMimeType && extension === ".docx") {
    return cb(null, true);
  }
  cb(new Error("Only DOCX files are allowed!"), false);
};

const CustomNoteFileFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/png",
    "image/jpg",
    "image/jpeg",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/pdf",
  ];
  const allowedExtensions = [".png", ".jpg", ".jpeg", ".docx"];
  const extension = path.extname(file.originalname).toLowerCase();
  if (!allowedTypes.includes(file.mimetype) || !allowedExtensions.includes(extension)) {
    cb(new Error("Only PNG, JPG, JPEG and DOCX files are allowed!"), false);
    return;
  }
  cb(null, true);
};
// Keep files in memory (req.file.buffer) for uploading to S3 / R2 / GCS
const storage = multer.memoryStorage();

const ContractUpload = multer({
  storage,
  fileFilter: proposalFileFilter,
  limits: { fileSize: 50 * 1024 * 1024 },
});

const ProposalUpload = multer({
  storage,
  fileFilter: proposalFileFilter,
  limits: { fileSize: 50 * 1024 * 1024 },
});

const Note_ = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

const Meeting_ = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

const Message_ = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

const call_ = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

const Recruitment_ = multer({
  storage,
  fileFilter: recruitmentFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});
const CustomNote_=multer({
  storage,
  fileFilter: CustomNoteFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024
  }
})

module.exports = {
  ContractUpload,
  ProposalUpload,
  Note_,
  Meeting_,
  call_,
  Message_,
  Recruitment_,
  CustomNote_
};
