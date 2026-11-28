const express = require('express')
const router = express.Router();
// const upload= require('../../middleware/upload.js');
// const { upload } = require('../../middleware/upload.js');
// const {  } = require('../../UserController/super/controller.getAll.js');
const {
  createRecruitmentForm,
  getRecruitmentForm,
  deleteRecruitment,
  editRecruitment,
} = require('../../UserController/admin/AdminRecruitment.controller.js');
const { Recruitment_ } = require('../../middleware/SalesEvidense.js');
// router.post('/', upload.array('files', 5), recruitmentForm);
router.post('/', Recruitment_.array('files', 10), createRecruitmentForm);
router.get('/getallEmployees', getRecruitmentForm);
router.delete('/:id', deleteRecruitment);
router.patch('/:id',Recruitment_.array('files', 10), editRecruitment);
module.exports = router