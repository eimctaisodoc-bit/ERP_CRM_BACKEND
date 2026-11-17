const express = require('express');
const { DeleteUser, getAllLogedUsers, GetAdminUserById, EditStatus, EditAdmin } = require('../../UserController/super/controller.branch');
const UserSchema = require('../../Usersmodel/UserSchema');
const createSendCreditController = require('../../UserController/sendPasswordReset');
const router = express.Router();

const SendCredit = createSendCreditController((req) => UserSchema.findById(req.params.id));

// const upload= require('../../middleware/upload.js');
// const { upload } = require('../../middleware/');
// router.post('/', upload.array('files', 5), recruitmentForm);

// router.post('/createadmin', AdminGenerated);

router.delete('/deleteadmin', DeleteUser);

router.get('/getCredit', getAllLogedUsers);

router.get('/:id', GetAdminUserById);

router.patch('/editStatus/:id', EditStatus);

router.patch('/edit/:id', EditAdmin);

router.patch('/sendCredit/:id', SendCredit);

router.get('/', (req, res) => {
    res.send("Running Super Admin Recruitment Route")
});
module.exports = router