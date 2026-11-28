const express = require('express')
const router = express.Router();

router.use((req, res, next) => {
    // console.log("Super ADmin  reached", req.user);
    next();
});
// router.use('/report', require('./super.admin.recruitment'))
// router.use('/recruitment',require('./super.admin.recruitment'))
router.use('/credit', require('./super.create.credential'))
router.use('/', require('./route.branch'))

router.use('/clientsOp', require('./super.client.credential'))

router.use('/recruitment', require('./super.admin.recruitment'))
router.use('/dms', require('./super.dms'))

router.use('/note',require('./super.cNote'))


module.exports = router
