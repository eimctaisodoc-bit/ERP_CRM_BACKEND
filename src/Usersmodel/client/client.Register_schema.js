const mongoose = require("mongoose");

const clientsRegisters = new mongoose.Schema(
  {
    organizationID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "organizations",

    },
    role: {
      type: String,
      default: "client",
    },
    username: {
      type: String,
    },

    password: {
      type: String,
    },

    province: {
      type: String,
    },

    district: {
      type: String,
    },
    isoStandardCode: {
      type: String,
      trim: true,
      deafult: null
    },


    officeEmail: {
      type: String,
      default: "",
    },

    officaPhone: {
      type: String,
      default: "",
    },

    handledBranches: {
      type: Array,
      default: [],
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
    },
    isConvertedToBusiness: {
      type: Boolean,
      default: false
    },
    lastseen: {
      type: [String],
      default: []
    },
    isActive:{
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model("clientsCredit", clientsRegisters);