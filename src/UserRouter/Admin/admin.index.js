const express = require('express')
const router = express.Router();
// router.use((req, res, next) => {
//     console.log("adminRoutes reached",req.user);
//     next();

// });
router.use('/report', require('./admin.dashboard'))
router.use('/recruitment', require('./admin.recruitment'))
router.use('/credit', require('./admin.credit'))
router.use('/schedule', require('./admin.schedule'))
router.use('/officeholiday', require('./admin.officeholiday'))
router.use('/team', require('./admin.team'))
router.use('/note', require('./admin.cnote'))

// Schedule endpoints: /admin/schedule/getcompanyOptions and /admin/schedule/getRoleOnly/:id
// router.use('/sales',require('./admin.sales'))

module.exports = router
