const express = require('express')
const router = express.Router()
router.get('/', (req, res, next) => {
    res.json({ message: 'from client dashboard ' ,user:req.user})
})
module.exports = router