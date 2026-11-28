const express = require("express");
const router = express.Router();

// router.use((req, res, next) => {
//     console.log("Staff reached",req.user);
//     // res.redirect('/admin/dashboard')
//     next();

// });

router.use("/sales", require("./staff.sales.js"));
router.use("/team", require("./staff.teams.js"));
router.use("/getcroSales", require("./staff.croSales.js"));

router.use("/sales/clientCredit", require("./staff.createCredit.js"));
router.use("/schedule", require("./staff.schedule.js"));
router.use('/recruitment', require('./staff.recruitment.js'));
router.use('/note', require('./staff.cnote.js'));

module.exports = router;
