const mongoose = require("mongoose");

const clientRecruitSchema = new mongoose.Schema({
  clientId: {
    type: String,
    required: true,
    unique: true
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

  address: {
    street: String,
    city: String,
    province: String,
    country: String
  },

  handledBranch: {
    type: String
  },

  clientRepresentative: {
    name: String,
    position: String
  },

  standards: [
    {
      type: String
    }
  ],

  services: [
    {
      type: String
    }
  ],

  status: {
    type: String,
    enum: ["active", "inactive", "pending"],
    default: "active"
  },

  startDate: {
    type: Date,
    default: Date.now
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
        type: Date,
        default: Date.now
      },
      read: {
        type: Boolean,
        default: false
      }
    }
  ],

  // 👨‍💼 ISO Team
  handleTeamFromIso: [
    {
      name: String,
      position: String,
      email: String,
      phone: String
    }
  ],

  // 👨‍💼 Client Team
  handleTeamToClient: [
    {
      name: String,
      position: String,
      email: String,
      phone: String
    }
  ],

  // 📁 Project Details
  projectDetails: [
    {
      projectName: String,
      description: String,
      startDate: Date,
      endDate: Date,
      status: String
    }
  ],

  // 💰 Payment
  payment: [
    {
      amount: Number,
      paymentDate: Date,
      paymentMethod: String,
      referenceNumber: String,
      status: String
    }
  ],

  // 📋 Tasks
  task: [
    {
      title: String,
      description: String,
      assignedTo: String,
      dueDate: Date,
      status: {
        type: String,
        enum: ["pending", "in-progress", "completed"],
        default: "pending"
      }
    }
  ]

}, { timestamps: true });

module.exports = mongoose.model("clientrecruits", clientRecruitSchema);