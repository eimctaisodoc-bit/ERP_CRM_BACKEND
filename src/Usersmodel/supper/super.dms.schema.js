const mongoose = require("mongoose");

const DmsSchema = new mongoose.Schema({
    userID: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: "userModel",
    },

    userModel: {
        type: String,
        required: true,
        enum: ["branches", "staff_", "clientscredits","Staffs"],
    },

    driveFolderId: {
        type: String,
        required: true,
    },

    driveFolderName: {
        type: String,
        required: true,
    },
}, { timestamps: true });

module.exports = mongoose.model("Dms", DmsSchema);