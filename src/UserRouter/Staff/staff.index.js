const express=require('express')
const router=express.Router()

// router.use((req, res, next) => {
//     console.log("Staff reached",req.user);
//     // res.redirect('/admin/dashboard')
//     next();

// });

router.use('/sales',require('./staff.sales.js'));

router.use('/sales/clientCredit',require('./staff.creteCredit.js'));

module.exports=router