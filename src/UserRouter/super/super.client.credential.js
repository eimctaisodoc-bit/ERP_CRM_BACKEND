const express = require('express');
const { getAllClients ,editClients,RemoveClients,disableClient,sendPasswordResetEmail} = require('../../UserController/client/client.controller.recruitment');
const router = express.Router();

router.get("/getallclients", getAllClients);
router.patch("/editclients/:id", editClients);
router.delete("/deleteclients", RemoveClients);
router.patch("/disableclient/:id", disableClient);
router.post("/sendpasswordresetemail/:id", sendPasswordResetEmail);
router.get('/', (req, res) => {
    res.send("Running Super Admin Recruitment Route")
});


module.exports = router