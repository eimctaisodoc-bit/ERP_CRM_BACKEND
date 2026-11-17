
const mongoose = require("mongoose");
const branchSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      trim: true,
    },
    recruitment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "recruitments",
    },
    designation: {
      type: String,
      trim: true,
    },

    jobRole: {
      type: String,
      trim: true,
    },

    personalMobile: {
      type: String,
      trim: true,
    },

    personalEmail: {
      type: String,
      lowercase: true,
      trim: true,
    },

    username: {
      type: String,
      trim: true,
    },

    password: {
      type: String,
    },

    role: {
      type: String,
      trim: true,
    },

    provinceName: {
      type: String,

    },

    provinceIndex: {
      type: Number,
      min: 1,
      max: 7
    },

    district: {
      type: String,
    },

    localLevelName: {
      type: String,

    },

    wardNo: {
      type: String,

    },

    toleName: {
      type: String,
      trim: true,
    },

    lat: {
      type: Number,
    },

    lng: {
      type: Number,
    },

    branchName: {
      type: String,

      trim: true,
    },
    profileImage: {
      type: String,
      default: null,
    },
    isoStandardCode: {
      type: String,
      trim: true,
      deafult: null
    },

    officeEmail: {
      type: String,
      lowercase: true,
      trim: true,
    },

    officeMobile: {
      type: String,
      trim: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
    resetPasswordToken: {
      type: String,
      default: null,
    },
    resetPasswordExpire: {
      type: Date,
      default: null,
    }
  },
  {
    timestamps: true,
    id: true,
  }
);
const Branch = mongoose.model("Branch", branchSchema);

module.exports = Branch;