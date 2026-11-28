
const mongoose = require("mongoose");

const staffSchema = new mongoose.Schema(
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

        // CRO Recruitment Reference
        recruitmentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "recruitments",
            required: true,
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
            default: "staff",
            enum: ["staff"],
        },

        // Location Details
        provinceName: {
            type: String,
            trim: true,
        },

        provinceIndex: {
            type: Number,
            min: 1,
            max: 7,
        },

        districtName: {
            type: String,
            trim: true,
        },
        localLevelName: {
            type: String,
            trim: true,
        },
        isoStandardCode: {
            type: String,
            trim: true,
            default: "",
        },

        wardNo: {
            type: String,
            trim: true,
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
        profileImage: {
            type: String,
            default: null,
        },

        isActive: {
            type: Boolean,
            default: false,
        },

        resetPasswordToken: {
            type: String,
            default: null
        },

        resetPasswordExpire: {
            type: Date,
            default: null
        },

        isOnline: {
            type: Boolean,
            default: false
        },

        lastSeen: {
            type: Date,
            default: null
        },

        socketId: {
            type: String,
            default: null
        }

    },
    {
        timestamps: true,
        id: true,
    }
);




const User = mongoose.models.User || mongoose.model("User", staffSchema, "staffs_");

module.exports = User;
