const express=require('express')
const router=express.Router()

router.use((req, res, next) => {
    console.log("clientRoute reached",req.user);
    // res.redirect('/admin/dashboard')
    router.use('/recruitment', require('./client.recruit.js'))
    router.use('/sales', require('./sales/client.sales.js'));
    router.use('/dashboard', require('./sales/client.sales.js'));
    next();

});
module.exports=router