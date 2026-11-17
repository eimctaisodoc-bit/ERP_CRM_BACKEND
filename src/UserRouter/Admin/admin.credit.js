const express = require('express');
const {
    AdminGenerated,
    DeleteUser,
    getAllLogedUsers,
    edituser,
    EditUser,
    EditStatus,
    findAccountById
} = require('../../UserController/admin/admin.createCredit');
const createSendCreditController = require('../../UserController/sendPasswordReset');
const { getcompanyOptions } = require('../../UserController/admin/admin.schedule');
const router = express.Router();

const SendCredit = createSendCreditController(async (req) => {
    const { user } = await findAccountById(req.params.id, req.query.role);
    return user;
});

router.post('/createstaff', AdminGenerated);
router.delete('/deletestaff', DeleteUser);

router.get('/getCredit', getAllLogedUsers);

router.get('/getCredit/:id', edituser);
router.patch('/edit/:id', EditUser);
router.patch('/editStatus/:id', EditStatus);
router.patch('/sendCredit/:id', SendCredit);


router.get('/getcompanyOptions', getcompanyOptions);


module.exports = router