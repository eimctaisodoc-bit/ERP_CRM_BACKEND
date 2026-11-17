const express = require("express");
const {
  GetMeDetails,
} = require("../../UserController/staff/staff.controller.team");

const router = express.Router();

// console.log('this is running ', typeof CreateClientCredential);

router.get("/getMeDetails/:id", GetMeDetails);

module.exports = router;
