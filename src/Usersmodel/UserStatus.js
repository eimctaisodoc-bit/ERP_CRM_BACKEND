const mongoose = require("mongoose");

const UserStatusSchema = new mongoose.Schema(
  {
    sessionRef: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    role: {
      type: String,
      required: true,
      index: true,
    },
    email: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
    },
    loginAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    logoutAt: {
      type: Date,
      default: null,
    },
    durationSeconds: {
      type: Number,
      default: null,
    },
    logoutReason: {
      type: String,
      enum: ["active", "logout", "tab_closed_or_disconnected", "token_expired"],
      default: "active",
    },
  },
  { timestamps: true, collection: "UserStatus" }
);

module.exports = mongoose.model("UserStatus", UserStatusSchema);