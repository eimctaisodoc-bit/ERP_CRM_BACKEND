const mongoose = require("mongoose");

const clientRecruitSchema = new mongoose.Schema({
  LeadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Lead",
    default: null
  },
  organizationName: {
    type: String,
    required: true
  },

  contact: {
    officialEmail: {
      type: String,
      required: true,
      unique: true
    },
    officialPhone: {
      type: String,
      required: true,
      unique: true
    }
  },
  isoStandardCode: {
    type: String,
    trim: true,
    default: null
  },
  isConvertedToBusiness: {

    type: Boolean,
    default: false
  },

  alternativeContact: [
    {
      name: {
        type: String,
        required: true
      },
      phoneNo: {
        type: String,
        default: null
      },
      email: {
        type: String,
        default: null
      },
      position: {
        type: String,
        default: null
      }
    }
  ],


  address: {
    street: String,
    city: String,
    province: String,
    country: String
  },

  handledBranch: {
    type: String
  },
  leadBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "LeadBy"
  },

  isStandard: {
    type: String,
    default: null

  },


  status: {
    type: String,
    enum: ["active", "inactive"],
    default: "active"
  },

  startDate: {
    type: String,
    default: ""
  },

  expectedEndDate: {
    type: Date,
    default: null
  },

  // 🔔 Notifications
  notifications: [
    {
      title: String,
      message: String,
      date: {
        type: String,
        default: ""
      },
      read: {
        type: Boolean,
        default: false
      }
    }
  ],

  payment: [
    {
      amount: Number,
      paymentDate: String,
      paymentMethod: String,
      referenceNumber: String,
      status: String
    }
  ],

  // 📋 Tasks
  Task: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "task",
  },

}, { timestamps: true, _id: true });

module.exports = mongoose.model("clientrecruits", clientRecruitSchema);