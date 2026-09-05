const express = require('express');
const { createRecruitmentForm, getRecruitmentForm } = require('../../../UserController/client/client.controller.recruitment');
const router = express.Router();

// const upload= require('../../middleware/upload.js');
// const { upload } = require('../../middleware/upload.js');
// router.post('/', upload.array('files', 5), recruitmentForm);

router.post('/', createRecruitmentForm);
router.get('/', getRecruitmentForm);
module.exports = router