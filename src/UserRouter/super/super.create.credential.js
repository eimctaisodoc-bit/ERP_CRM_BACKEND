const express = require('express');
const { AdminGenerated, DeleteUser,getAllLogedUsers ,EditStatus,SendCredit} = require('../../UserController/super/controller.branch');
const router = express.Router();

// const upload= require('../../middleware/upload.js');
// const { upload } = require('../../middleware/');
// router.post('/', upload.array('files', 5), recruitmentForm);

router.post('/createadmin', AdminGenerated);
router.delete('/deleteadmin', DeleteUser);
router.get('/getCredit', getAllLogedUsers);

router.patch('/editStatus/:id', EditStatus);

router.patch('/sendCredit/:id', SendCredit);

router.get('/', (req, res) => {
    res.send("Running Super Admin Recruitment Route")
});
module.exports = router