const mongoose = require('mongoose');

const LoginSchema = new mongoose.Schema({
    fullname: String,

    username: String,
    password: String,
    role: {
        type: String,
        enum: ["admin", "staff", "client"],
        default: "admin"
    },
    designation: {
        type: String,
        default: ""
    },

    jobRole: {
        type: String,
        default: ""
    },

    orgName: String,

    officeEmail: String,
    officeMobile: String,

    personalEmail: String,
    personalMobile: String,

    contactPersonName: String,

    province: Number,
    provinceName: String,

    districtName: String,

    localLevel: String,

    latitude: Number,
    longitude: Number,

    type: {
        type: String,

    },
    
    resetPasswordToken: {
        type: String,
        default: null
    },

    resetPasswordExpire: {
        type: Date,
        default: null
    },
    isActive: {
        type: Boolean,
        default: true
    },

    refIds: {
        type: String,
        ref: ""
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

}, { id: true, timestamps: true });

module.exports = mongoose.model('logins', LoginSchema);
