const Recruitment = require('../../Usersmodel/admini/AdminRecruitment.model.js');

// console.log("Recruitment model type:", typeof Recruitment);
// console.log("Collection:", Recruitment.collection.name);
const getAllRecruitment = async (req, res) => {
    try {
        const recruitmentData = await Recruitment.find().sort({ createdAt: -1 });
        // console.log("Recruitment data fetched successfully:", recruitmentData);
        res.status(200).json(recruitmentData);
    } catch (error) {
        console.error('Error fetching recruitment data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
// controller.getAll.js

module.exports = { getAllRecruitment };