const express = require('express')
const router = express.Router();
const { createRecruitmentForm,getRecruitmentForm } = require('../../UserController/admin/AdminRecruitment.controller.js');
// const upload= require('../../middleware/upload.js');
const { upload } = require('../../middleware/Recruitmentupload.js');
// router.post('/', upload.array('files', 5), recruitmentForm);
router.post('/', createRecruitmentForm);
router.get('/', getRecruitmentForm);
module.exports = router