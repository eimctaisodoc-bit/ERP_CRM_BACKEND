
const mongoose = require("mongoose");



const scheduleSchema = new mongoose.Schema(
    {

        label: {
            type: String,
            default: "",
        },
        bsDate: {
            type: String,
            default: null,
        },
        time: {
            type: String,
            default: "00:00:00",
        },


    },
    { _id: true, timestamps: true }
);

const noteSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",

        },
        userName: {
            type: String,
            default: "",

        },
        title: {
            type: String,
            required: true,
            trim: true,
        },

        content: {
            type: String,
            default: "",
        },

        attachments: {
            type: Array,
            default: [],
        },

        // Scheduling
        isScheduled: {
            type: Boolean,
            default: false,
        },

      
        // Additional schedules
        schedules: {
            type: [scheduleSchema],
            default: [],
        },
    },
    {
        timestamps: true,
    }
);

noteSchema.index({ title: "text", content: "text" });
noteSchema.index({ isScheduled: 1 });

module.exports = mongoose.model("CNote", noteSchema);
