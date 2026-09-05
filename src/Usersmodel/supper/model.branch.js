
const mongoose = require("mongoose");
const branchSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      trim: true,
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

    province: {
      type: String,
      
    },

    provinceName: {
      type: String,
      
    },

    district: {
      type: String,
      
    },

    districtName: {
      type: String,
      
    },

    districts: {
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

    officeEmail: {
      type: String,
      lowercase: true,
      trim: true,
    },

    officeMobile: {
      type: String,
      trim: true,
    },

    status: {
      type: String,
      enum: ["active", "inactive", "Active", "Inactive"],
      default: "active",
    },

  },
  {
    timestamps: true,
    id: true,
  }
);
const Branch = mongoose.model("Branch", branchSchema);

module.exports = Branch;