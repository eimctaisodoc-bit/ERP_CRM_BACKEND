const express = require('express');
const { CreateBranch, DeleteBranch, getAllLogedUsers, getAllBranches, EditBranchStatus, EditBranch, getBranchManagementModel, getTargetRole } = require('../../UserController/super/controller.branch');
const createSendCreditController = require('../../UserController/sendPasswordReset');
const router = express.Router();

const SendCredit = createSendCreditController(async (req) => {
    const model = await getBranchManagementModel(getTargetRole(req));
    if (!model) {
        const error = new Error("A valid target role is required");
        error.statusCode = 400;
        throw error;
    }
    return model.findById(req.params.id);
});

router.post('/createbranch', CreateBranch);

router.delete('/deletebranch/:id', DeleteBranch);

router.get('/getallbranches', getAllBranches);

router.patch('/branch/:id', EditBranch);

router.patch('/branch/status/:id', EditBranchStatus);

router.patch('/branch/sendCredit/:id', SendCredit);

router.get('/branch/getCredit', getAllLogedUsers);

router.get('/', (req, res) => {
    res.send("Running Super Admin Recruitment Route")
});
module.exports = router