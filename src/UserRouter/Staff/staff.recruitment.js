const express = require('express');
const { Recruitment_ } = require('../../middleware/SalesEvidense');
const { createRecruitmentForm, getRecruitmentForm } = require('../../UserController/admin/AdminRecruitment.controller');
const { getAllLogedUsers } = require('../../UserController/admin/admin.createCredit');
const router = express.Router();


// router.post('/', upload.array('files', 5), recruitmentForm);
router.post('/', Recruitment_.array('files', 10), createRecruitmentForm);
router.get('/getallEmployees', getAllLogedUsers);

module.exports = router