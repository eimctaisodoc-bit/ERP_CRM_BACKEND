const express = require('express');
const { GetMeDetails } = require('../../UserController/staff/staff.controller.team');
const router=express.Router();

router.get('/getMeDetails/:id', GetMeDetails);


module.exports = router;