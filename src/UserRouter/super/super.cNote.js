

const express=require('express');
const { createNote, getNotes, updateNote, deleteNote } = require('../../UserController/super/controller.cNote');
const router = express.Router();
const {CustomNote_}= require('../.././middleware/SalesEvidense')

router.post("/", CustomNote_.array('files',10),createNote);

router.get("/:id", getNotes);
router.put("/:id", CustomNote_.array('files',10),updateNote);
router.delete("/", deleteNote);


module.exports=router;