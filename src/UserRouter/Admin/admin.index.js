const express = require('express')
const router = express.Router();
// router.use((req, res, next) => {
//     console.log("adminRoutes reached",req.user);
//     next();
    
// });
router.use('/report',require('./admin.dashboard'))
router.use('/recruitment',require('./admin.recruitment'))
router.use('/credit',require('./admin.credit'))

// router.use('/sales',require('./admin.sales'))

module.exports = router
