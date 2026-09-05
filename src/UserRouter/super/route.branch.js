const express = require('express');
const { CreateBranch ,DeleteBranch, getAllLogedUsers,getAllBranches,EditBranchStatus,SendBranchCredit} = require('../../UserController/super/controller.branch');
const router = express.Router();

router.post('/createbranch', CreateBranch);
router.delete('/deletebranch/:id', DeleteBranch);
router.get('/getallbranches', getAllBranches);
router.patch('/branch/status/:id', EditBranchStatus);
router.patch('/branch/sendCredit/:id', SendBranchCredit);

// router.post('/branch/createadmin', CreateBranch);
// router.delete('/branch/deleteadmin', DeleteUser);
router.get('/branch/getCredit', getAllLogedUsers);

router.get('/', (req, res) => {
    res.send("Running Super Admin Recruitment Route")
});
module.exports = router