const express = require('express')
const router = express.Router();
const { createRecruitmentForm, getRecruitmentForm } = require('../../UserController/admin/AdminRecruitment.controller.js');
// const upload= require('../../middleware/upload.js');
const { upload } = require('../../middleware/Recruitmentupload.js');
const { Recruitment_ } = require('../../middleware/SalesEvidense.js');

// router.post('/', upload.array('files', 5), recruitmentForm);
router.post('/', Recruitment_.array('files', 10), createRecruitmentForm);
router.get('/getallEmployees', getRecruitmentForm);

module.exports = router