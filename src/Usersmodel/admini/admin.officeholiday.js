const mongoose = require("mongoose");

const HolidaySchema = new mongoose.Schema({
    isApprovebysuper: {
        type: Boolean,
        default: false,
    },

    holidays: {
        type: [mongoose.Schema.Types.Mixed],
        default: [],
    },

    authoritative: {
        type: [mongoose.Schema.Types.Mixed],
        default: [],
    },

    lastUpdated: {
        type: [mongoose.Schema.Types.Mixed],
        default: [],
    },

    history: {
        type: [{
            isApprovebysuper: mongoose.Schema.Types.Mixed,
            holidays: mongoose.Schema.Types.Mixed,
            authoritative: mongoose.Schema.Types.Mixed,
            lastUpdated: mongoose.Schema.Types.Mixed,
            updatedBy: mongoose.Schema.Types.Mixed,
            updatedAt: { type: Date, required: true },
            remarks: { type: String, default: "" },
        }],
        default: [],
    },
}, { timestamps: true, id: true, versionKey: false });

const HolidayModel = mongoose.model("OfficeHoliday", HolidaySchema);

module.exports = HolidayModel;