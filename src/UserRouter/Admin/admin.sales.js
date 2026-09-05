const express=require('express')
const router=express.Router();
const { createSalesReport, getSalesReport } = require('../../UserController/admin/AdminSales.controller.js');
// router.post('/', createSalesReport);
// router.get('/', getSalesReport);
module.exports=router