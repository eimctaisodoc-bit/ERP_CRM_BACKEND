const staffSalesSchema = require("../../Usersmodel/client/staff.Sales.Schema")

const Branch = require("../../Usersmodel/supper/model.branch.js");
const staffs_ = require("../../../src/Usersmodel/UserSchema.js");

const getcompanyOptions = async (req, res) => {
    try {
        const sales = await staffSalesSchema
            .find({ "organizationDetails.0": { $exists: true } })
            .select("organizationDetails._id organizationDetails.organizationName")
            .lean();

        const companyOptions = sales.flatMap(({ organizationDetails = [] }) =>
            organizationDetails.map(({ _id, organizationName }) => ({
                _id,
                organizationName,
            }))
        );

        return res.status(200).json(companyOptions);
    } catch (error) {
        console.error("Failed to load company options:", error);
        return res.status(500).json({ message: "Failed to load company options" });
    }
}




const getEachRecruitmentDetails = async (req, res) => {
    const { id } = req.params;

    try {
        const [branches, staffs] = await Promise.all([
            Branch.find({ _id: id }).select("_id jobRole").lean(),
            staffs_.find({ _id: id }).select("_id jobRole").lean(),
        ]);

        res.status(200).json({
            branches,
            staffs,
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to load recruitment details",
        });
    }
};


const scheduleUsers = async (req, res) => {

    try {
        const users = await staffs_.find({}).select("_id  fullname jobRole officeEmail province provinceName districtName localLevel wardNo  toleName role").lean();
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({
            message: "Failed to load schedule users",
        });
    }
}


module.exports = { getcompanyOptions, getEachRecruitmentDetails, scheduleUsers };