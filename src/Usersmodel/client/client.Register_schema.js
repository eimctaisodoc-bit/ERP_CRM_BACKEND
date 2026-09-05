import mongoose from "mongoose";

const clientRegisterSchema = new mongoose.Schema({

  recruitId: {
    type: String,
    required: true,
    unique: true
  },

  username: {
    type: String,
    required: true,
    unique: true
  },

  password: {
    type: String,
    required: true
  },

  organizationName: {
    type: String,
    required: true
  },

  address: {
    street: String,
    city: String,
    province: String,
    country: String
  },

  contact: {
    officialEmail: String,
    officialPhone: String
  },

  clientRepresentative: {
    name: String,
    position: String,
    phone: String,
    email: String
  },

  handledBranch: {
    type: String
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

  otherInformation: {
    notes: String,
    remarks: String
  },

  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending"
  },

  registerDate: {
    type: Date,
    default: Date.now
  }

}, { timestamps: true });

export default mongoose.model("ClientRegister", clientRegisterSchema);