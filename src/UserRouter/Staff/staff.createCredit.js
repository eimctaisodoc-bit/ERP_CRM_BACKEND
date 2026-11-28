const express = require('express');
const { CreateClientCredential } = require('../../UserController/client/client.controller.recruitment');

const router = express.Router();


// console.log('this is running ', typeof CreateClientCredential);

router.post('/', CreateClientCredential);


module.exports = router;