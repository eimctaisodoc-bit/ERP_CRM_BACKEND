
const express = require("express");
const { googleAuth ,    googleCallback,
} = require("../driveAPI/googleAuth.controller");
const router = express.Router();

router.get("/google-auth", googleAuth);
router.get("/google-callback", googleCallback);
    
module.exports = router;
