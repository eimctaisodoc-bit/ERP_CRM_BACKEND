const express=require('express')
const router = express.Router();
router.get('/',(req,res,next)=>{
   res.json({message:"response from dashboard "})
   console.log("admin dashboard accessed by ",req.user);
})
module.exports=router