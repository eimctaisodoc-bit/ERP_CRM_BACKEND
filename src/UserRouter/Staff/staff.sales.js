const express = require("express");
const {
  getSalesData,

  getDetailsData,
  getOnlyOrgDetails,

  addOrgLeadDetails,
  testEmail,
  updateOnlyOrgDetails,
  updateSalesLead,
  deleteSalesLead,

  HolidayOnly,

  // new // new// new // new // new
  Meetings_,
  EditMeeting,
  DeleteMeeting,

  Notes,
  EditNote,
  DeleteNote,

  getNotes,

  Calls,
  EditCall,
  DeleteCall,

  msg,
  EditMessage,
  DeleteMessage,

  Proposal,
  GetProposals,
  DeleteProposal,

  Contract,
  UpdateInstallment,
    UpdateTermsAndConditions,
    getOnlyInstallmentTerms
  // UpdateProposal,
} = require("../../UserController/staff/staff.controller.sales");
const {
  ProposalUpload,
  Note_,
  Meeting_,
  call_,
  Message_,
  ContractUpload,
} = require("../../middleware/SalesEvidense");
const { upload } = require("../../middleware/contractUpload");
const {
  getSalesEvidenceFiles,
} = require("../../middleware/getLocalStoragefiles");
const router = express.Router();

router.get("/getSalesData", getSalesData);

router.get("/getdetails", getDetailsData);

// router.put("/update_mcsc", );

// new new newn new new new new new new new new new new
router.patch("/vMeetKC/:MainID", Meeting_.array("file", 5), Meetings_);
router.patch("/editMeet/:MainID/:id", Meeting_.array("file", 5), EditMeeting);
router.patch("/deleteMeet/:MainID/:id", DeleteMeeting);

// router.patch('/getmeetings/:MainID', getMeetings)

router.patch(
  "/nOtes/:MainID",
  Note_.array("file", 5),
  (err, req, res, next) => {
    if (err instanceof multer.MulterError || err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  },
  Notes,
);

router.patch("/editNote/:MainID/:id", Note_.array("file", 5), EditNote);
router.patch("/deleteNote/:MainID/:id", DeleteNote);

router.get("/notes/:MainID", getNotes);

router.patch("/cAlls/:MainID", call_.array("file", 5), Calls);
router.patch("/editCall/:MainID/:id", call_.array("file", 5), EditCall);
// router.patch('/editCall', EditCall)
router.patch("/deleteCall/:MainID/:id", DeleteCall);

router.patch("/messages/:MainID", Message_.array("file", 5), msg);
// router.patch('/messages', msg)
router.patch("/editMsg/:MainID/:id", Message_.array("file", 5), EditMessage);
router.patch("/deleteMsg/:MainID/:id", DeleteMessage);
// router.patch('/deleteMsg', DeleteMessage)

router.patch("/proposal/:MainID", ProposalUpload.array("file", 1), Proposal);

router.patch("/deleteproposal/:MainID/:id", DeleteProposal);
router.patch("/getproposal/:MainID", GetProposals);

// router.patch("/updateproposal/:MainID/:id", UpdateProposal);// temp may be removed later

router.patch("/uploadContract/:MainID", ContractUpload.array("file", 5), Contract);

router.patch("/updateInstallment/:MainID", UpdateInstallment);
router.patch("/updateTermsAndConditions/:MainID", UpdateTermsAndConditions);
router.get("/getInstallmentTerms/:MainID", getOnlyInstallmentTerms);

router.get("/getFiles", getSalesEvidenceFiles);

router.get("/orgdetails", getOnlyOrgDetails);

// end new new newn ewn

// below are may or may not be use
// router.get('/test', testEmail);

router.post("/orgdetails", addOrgLeadDetails);

router.patch(
  "/update_org_details_only/:_id/:organizationId",
  updateOnlyOrgDetails,
);

router.patch("/edit/:id", updateSalesLead);

router.delete("/delete/:id", deleteSalesLead);

// router.post('/addHoliday/:MainID/:Stage7', HolidayOnly)
router.patch("/addHoliday", HolidayOnly);

module.exports = router;
