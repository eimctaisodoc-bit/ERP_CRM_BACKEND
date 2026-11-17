const express = require('express');
const CreateClientCredential = require('../../UserController/staff/staff.controller.credi');
const router = express.Router();


// console.log('this is running ', typeof CreateClientCredential);

router.post('/', CreateClientCredential);


module.exports = router;