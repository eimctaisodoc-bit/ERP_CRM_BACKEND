const express = require('express');
const { AdminGenerated, DeleteUser, getAllLogedUsers, EditStatus } = require('../../UserController/admin/admin.createCredit');
const router = express.Router();

router.post('/createstaff', AdminGenerated);
router.delete('/deletestaff', DeleteUser);
router.get('/getCredit', getAllLogedUsers);

router.patch('/editStatus/:id', EditStatus);


module.exports = router