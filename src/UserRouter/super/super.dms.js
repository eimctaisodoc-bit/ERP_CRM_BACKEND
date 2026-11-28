const express = require('express');
const { googleAuth } = require('../../driveAPI/googleAuth.controller');
const getFolder = require('../../UserController/super/controller.dms');
const googleMiddleware = require('../../middleware/googleMiddleware');
const router = express.Router();


router.get("/auth", googleAuth);
router.use(googleMiddleware);

router.get('/getdriveFolder',getFolder);
// router.post("/createFolder", createFolder);

module.exports = router;