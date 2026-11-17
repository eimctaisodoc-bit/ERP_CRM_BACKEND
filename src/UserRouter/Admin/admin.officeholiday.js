const express = require('express');
const {
    getHoliday,
    updateHoliday,
} = require('../../UserController/admin/admin.officeholida');
const router = express.Router();

router.get('/', getHoliday);
router.post('/', updateHoliday);

module.exports = router;