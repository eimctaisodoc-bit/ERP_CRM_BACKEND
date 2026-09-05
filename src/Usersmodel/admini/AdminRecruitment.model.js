const mongoose = require("mongoose");

const previousExperienceSchema = new mongoose.Schema(
  {
    organization: {
      type: String,
      trim: true,
    },
    position: {
      type: String,
      trim: true,
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
    tenure: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const recruitmentSchema = new mongoose.Schema(
  {
    // =========================================================
    // PERSONAL INFORMATION
    // =========================================================
    personal: {
      firstName: {
        type: String,
        required: true,
        trim: true,
      },

      middleName: {
        type: String,
        trim: true,
        default: "",
      },

      lastName: {
        type: String,
        required: true,
        trim: true,
      },

      gender: {
        type: String,
        enum: ["Male", "Female", "Other"],
      },

      dob: {
        type: Date,
      },

      maritalStatus: {
        type: String,
        enum: ["Single", "Married", "Divorced", "Widowed"],
      },

      nationality: {
        type: String,
        enum: ["Nepali", "Indian", "Other"],
        default: "Nepali",
      },

      citizenshipId: {
        type: String,
        trim: true,
      },

      profilePhoto: {
        type: String,
      },
    },

    // =========================================================
    // CONTACT INFORMATION
    // =========================================================
    contact: {
      officeEmail: {
        type: String,
        trim: true,
        lowercase: true,
      },

      personalEmail: {
        type: String,
        trim: true,
        lowercase: true,
      },

      officeMobile: {
        type: String,
        trim: true,
      },

      personalMobile: {
        type: String,
        trim: true,
      },

      permanentAddress: {
        type: String,
        trim: true,
      },

      currentAddress: {
        type: String,
        trim: true,
      },
    },

    // =========================================================
    // EMPLOYMENT & ORGANIZATION
    // =========================================================
    employment: {
      department: {
        type: String,
        enum: [
          "Corporate HR",
          "Corporate Finance",
          "Corporate CRO",
          "Corporate Reception",
          "Corporate Document Control",
          "Corporate ERP & IT",
          "Consultancy",
        ],
      },

      jobPosition: {
        type: String,
        enum: [
          "HR Officer",
          "Finance Officer",
          "CRO",
          "Receptionist",
          "Document Controller",
          "ERP Developer",
          "ERP Maintenance",
          "Consultant",
        ],
      },

      employmentType: {
        type: String,
        enum: [
          "Permanent",
          "Contract",
          "Intern",
          "Trainee",
          "Part-Time",
        ],
      },

      dateOfJoining: {
        type: Date,
      },

      officeType: {
        type: String,
        enum: ["Main Office", "Branch Office"],
      },

      province: {
        type: String,
        enum: [
          "koshi",
          "madhesh",
          "bagmati",
          "gandaki",
          "lumbini",
          "karnali",
          "sudurpashchim",
        ],
      },

      district: {
        type: String,
        trim: true,
      },

      office: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Office",
      },

      reportingManager: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Employee",
      },
    },

    // =========================================================
    // EXPERIENCE & DOCUMENTS
    // =========================================================
    documents: {
      experienceType: {
        type: String,
        enum: ["fresher", "experienced"],
        default: "fresher",
      },

      totalExperience: {
        type: Number,
        min: 0,
        default: 0,
      },

      previousExperience: {
        type: [previousExperienceSchema],
        default: [],
      },

      resume: {
        type: String,
      },

      offerLetter: {
        type: String,
      },

      citizenDoc: {
        type: String,
      },

      qualification: {
        type: String,
      },

      training: {
        type: String,
      },

      experience: {
        type: String,
      },
    },

    // =========================================================
    // RECRUITMENT STATUS
    // =========================================================
    recruitmentStatus: {
      type: String,
      enum: [
        "Applied",
        "Screening",
        "Shortlisted",
        "Interview",
        "Selected",
        "Rejected",
        "Hired",
        "Withdrawn",
      ],
      default: "Applied",
    },

    // =========================================================
    // SYSTEM INFORMATION
    // =========================================================
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    id: true,
  }
);


// =========================================================
// INDEXES
// =========================================================




recruitmentSchema.index(
  { "contact.personalEmail": 1 },
  { unique: true, sparse: true }
);

// Office Email
recruitmentSchema.index(
  { "contact.officeEmail": 1 },
  { unique: true, sparse: true }
);

// Office Mobile
recruitmentSchema.index(
  { "contact.officeMobile": 1 },
  { unique: true, sparse: true }
);




// =========================================================
// MODEL
// =========================================================

const Recruitment = mongoose.model(
  "recruitments",
  recruitmentSchema
);

module.exports = Recruitment;