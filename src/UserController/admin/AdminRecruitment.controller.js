const adminFormRecruitmentSchema = require('../../Usersmodel/admini/AdminRecruitment.model.js');

const createRecruitmentForm = async (req, res) => {
  console.log(req.body)
  console.log(req.files)
  // res.json({body:req.files})
  try {
    // Validate that body exists and is an object
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ success: false, error: 'Invalid form data' });
    }

    // Create new document in MongoDB
    const newRecruitment = await adminFormRecruitmentSchema.create(req.body);

    // Respond with success
    res.status(201).json({ success: true, data: newRecruitment });

  } catch (error) {
    console.error('Error saving recruitment form:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const getRecruitmentForm = async (req, res) => {
  try {
    const respose = await adminFormRecruitmentSchema.find({});
    res.status(201).json({ success: true, data: respose });

  } catch (error) {
    res.json({ success: false, error: error.message })

  }
}

module.exports = {
  createRecruitmentForm, getRecruitmentForm
};
