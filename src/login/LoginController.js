const express = require('express');
const { addUsers,getUserById,VerifyLoginUser } = require('../UserController/users/user');
const { VerifyResetToken,ResetPassword } = require('../UserController/super/controller.branch');
const router = express.Router();
 
router.post('/createaccount',addUsers)


router.get('/users/:id',getUserById)
router.get('/verify-reset-token/:token',VerifyResetToken)
router.post("/reset-password/:token",ResetPassword);



module.exports=router;