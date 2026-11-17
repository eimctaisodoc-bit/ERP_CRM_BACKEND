const express = require('express');
const { getcompanyOptions, getEachRecruitmentDetails } = require('../../UserController/admin/admin.schedule');

const router = express.Router();

router.get('/getcompanyOptions', getcompanyOptions);

router.get('/getRoleOnly/:id', getEachRecruitmentDetails);


module.exports = router