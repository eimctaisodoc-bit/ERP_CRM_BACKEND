const express = require("express");
const { getCROSales } = require("../../UserController/staff/staff.controller.crosales");
// const { getCROSales } = require("../../UserController/staff/staff.controller.crosales");

const router = express.Router();

router.get("/", getCROSales);

module.exports = router;
