
const mongoose = require("mongoose");

// =========================================================
// PREVIOUS EXPERIENCE SCHEMA
// =========================================================

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
      type: String,
    },
    endDate: {
      type: String,
    },
    level: {
      type: String,
      enum: ["Entry Level", "Mid Level", "Senior Level"],
      default: "Entry Level",
    },
    tenure: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

// =========================================================
// RECRUITMENT SCHEMA
// =========================================================

const recruitmentSchema = new mongoose.Schema(
  {
    // =====================================================
    // PERSONAL INFORMATION
    // =====================================================

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
        enum: ["Male", "Female"],
      },

      dob: {
        type: String,
      },

      maritalStatus: {
        type: String,
        enum: ["Single", "Married"],
      },

      nationality: {
        type: String,
        enum: ["Nepali", "Indian"],
        default: "Nepali",
      },

      services: {
        type: [String],
        default: [],
      },

      citizenshipId: {
        type: String,
        trim: true,
      },

      profilePhoto: {
        type: Array,
        default: [],
      },
    },

    // =====================================================
    // CONTACT INFORMATION
    // =====================================================

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

    // =====================================================
    // EMPLOYMENT & ORGANIZATION
    // =====================================================

    employment: {
      department: {
        type: String,
        enum: [
          "Corporate HR",
          "Corporate CRO",
          "Corporate Sales",
          "Corporate Operations",
          "Corporate Reception",
          "Corporate Document Control",
          "Corporate IT Support",
          "Corporate ERP & IT",
          "Consultancy",
        ],
      },

      isoStandardCode: {
        type: String,
        trim: true,
        default: null,
      },

      jobPosition: {
        type: String,
        enum: [
          "HR",
          "CRO",
          "sales",
          "Receptionist",
          "Document Controller",
          "Consultant",
          "Operation Manager",
          "Document Writer",
          "ERP Support",
          "Digital Marketing",
          "IT Support",
          "Digital Market",
        ],
      },

      employmentType: {
        type: String,
        enum: [
          "Permanent",
          "Contract",
          "Intern",
          "Part-Time",
        ],
      },

      dateOfJoining: {
        type: String,
      },

      province: {
        type: String,
        default: null,
        trim: true,
      },

      provinceIndex: {
        type: Number,
        min: 1,
        max: 7,
      },

      district: {
        type: String,
        trim: true,
        default: null,
      },

      localLevel: {
        type: String,
        trim: true,
        default: null,
      },
    },

    // =====================================================
    // EXPERIENCE & DOCUMENT ATTACHMENTS
    // =====================================================

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

      // Previous employment history
      previousExperience: {
        type: [previousExperienceSchema],
        default: [],
      },

      fresherDocuments: {
        type: Array,
        default: [],
      },

      experienceDocuments: {
        type: Array,
        default: [],
      },

    },

    // =====================================================
    // RECRUITMENT STATUS
    // =====================================================

    recruitmentStatus: {
      type: String,
      enum: ["admin", "super_admin", "staff"],
      required: true,
    },

    // =====================================================
    // SYSTEM INFORMATION
    // =====================================================

    createdBySuper: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "staffs_",
     
    },

    createdBystaff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "staffs_",
     
    },
    isActive: {
      type: Boolean,
      default: false,
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

// Personal Email
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
