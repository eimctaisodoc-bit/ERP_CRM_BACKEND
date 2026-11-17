const HolidayModel = require("../../Usersmodel/admini/admin.officeholiday");

const getHoliday = async (_req, res) => {
    try {
        const holiday = await HolidayModel.findOne().sort({ updatedAt: -1 });

        return res.status(200).json({
            success: true,
            message: holiday ? "Holiday record retrieved successfully" : "No holiday record found",
            data: holiday,
        });
    } catch (error) {
        console.error("Error retrieving holiday:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to retrieve holiday record",
            error: error.message,
        });
    }
};

const updateHoliday = async (req, res) => {
    try {
        const {
            _id,
            holidays,
            isApprovebysuper,
            authoritative,
            lastUpdated,
            updatedBy,
            remarks,
        } = req.body || {};

        if (
            holidays === undefined &&
            isApprovebysuper === undefined &&
            authoritative === undefined &&
            lastUpdated === undefined
        ) {
            return res.status(400).json({
                success: false,
                message: "At least one holiday field must be provided",
            });
        }

        if (holidays !== undefined && !Array.isArray(holidays)) {
            return res.status(400).json({
                success: false,
                message: "Holidays must be provided as an array",
            });
        }

        if (authoritative !== undefined && !Array.isArray(authoritative)) {
            return res.status(400).json({
                success: false,
                message: "Authoritative users must be provided as an array",
            });
        }

        if (lastUpdated !== undefined && !Array.isArray(lastUpdated)) {
            return res.status(400).json({
                success: false,
                message: "Last updated must be provided as an array",
            });
        }

        if (_id && !HolidayModel.base.Types.ObjectId.isValid(_id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid holiday record ID",
            });
        }

        let holiday = _id
            ? await HolidayModel.findById(_id)
            : await HolidayModel.findOne().sort({ updatedAt: -1 });

        if (_id && !holiday) {
            return res.status(404).json({
                success: false,
                message: "Holiday record not found",
            });
        }

        const isExistingRecord = Boolean(holiday);
        if (!holiday) holiday = new HolidayModel();

        if (isExistingRecord) {
            holiday.history = holiday.history || [];
            holiday.history.push({
                isApprovebysuper: holiday.isApprovebysuper,
                holidays: holiday.holidays,
                authoritative: holiday.authoritative,
                lastUpdated: holiday.lastUpdated,
                updatedBy: updatedBy ?? null,
                updatedAt: new Date(),
                remarks: remarks || "Holiday calendar updated",
            });
        }

        if (holidays !== undefined) holiday.holidays = holidays;
        if (isApprovebysuper !== undefined) holiday.isApprovebysuper = isApprovebysuper;
        if (authoritative !== undefined) holiday.authoritative = authoritative;
        if (lastUpdated !== undefined) holiday.lastUpdated = lastUpdated;

        await holiday.save();

        return res.status(200).json({
            success: true,
            message: "Holiday record saved successfully",
            data: holiday,
        });
    } catch (error) {
        console.error("Error saving holiday:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to save holiday record",
            error: error.message,
        });
    }
};

module.exports = { getHoliday, updateHoliday };
