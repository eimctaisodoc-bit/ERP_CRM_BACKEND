const express = require('express')
const router = express.Router();
// const upload= require('../../middleware/upload.js');
// const { upload } = require('../../middleware/upload.js');
const { getAllRecruitment } = require('../../UserController/super/controller.getAll.js');
// router.post('/', upload.array('files', 5), recruitmentForm);
router.post('/', () => {
    console.log("Running super admin")
});
router.get('/', getAllRecruitment);
module.exports = router