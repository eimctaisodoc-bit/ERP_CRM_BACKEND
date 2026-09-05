const express=require('express');
const { getSalesData } = require('../../../UserController/client/client.controller.sales');
const router=express.Router()

router.get('/sales',getSalesData)
router.post('/sales',postSalesData)


module.exports=router
