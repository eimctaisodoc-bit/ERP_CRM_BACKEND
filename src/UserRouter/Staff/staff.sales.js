const express = require('express');
const {
  getSalesData,
  getStages,
  updateMessageCallScheduleCancelDetails,
  getDetailsData,
  addBasicInfo,
  getOnlyOrgDetails,

  addMess_Call,
  addOrgLeadDetails,
  AddScheduleOnly,
  getRecruitmentData,
  getScheduleOnly,
  testEmail,
  updateOnlyOrgDetails,
  DeleteStage1ScheduleOnly,

  AddVmeetingOnly,

  AddVmeetingScheduleOnly,
  AddPmeetingOnly,
  DeleteVmeetingScheduleOnly,
  AddPmeetingScheduleOnly,
  AddProposalInfoOnly,
  DeletePmeetingScheduleOnly,
  updateVMeetingOnly,
  UpdateVmeetingScheduleOnly,


  uploadContractPdfs,


  // SendMailOnly,

  getOnlyStage2Data,
  getOnlyStage3Data,
  getOnlyStage1Data,

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
  UpdateProposal

} = require('../../UserController/staff/staff.controller.sales');
const { Salesupload } = require('../../middleware/SalesEvidense');
const { upload } = require('../../middleware/contractUpload');
const { getSalesEvidenceFiles } = require('../../middleware/getLocalStoragefiles');
const router = express.Router()

router.get('/getSalesData', getSalesData);

router.get('/getStages', getStages);

router.get('/getdetails', getDetailsData);

router.put('/update_mcsc', updateMessageCallScheduleCancelDetails);

// new new newn new new new new new new new new new new
router.patch('/vMeetKC/:MainID', Salesupload.array('file', 5), Meetings_)
router.patch('/editMeet/:MainID/:id', EditMeeting)
router.patch('/deleteMeet/:MainID/:id', DeleteMeeting)
// router.patch('/deleteMeet',DeleteMeeting )

// router.patch('/getmeetings/:MainID', getMeetings)

router.patch('/nOtes/:MainID', Salesupload.array('file', 5), (err, req, res, next) => {
  if (err instanceof multer.MulterError || err) {
    return res.status(400).json({ error: err.message });
  }
  next();
}, Notes);

router.patch(
  '/editNote/:MainID/:id',
  Salesupload.array('file', 5),
  EditNote
);
router.patch('/deleteNote/:MainID/:id', DeleteNote)


router.get('/notes/:MainID', getNotes)


router.patch('/cAlls/:MainID', Salesupload.array('file', 5), Calls)
router.patch('/editCall/:MainID/:id', EditCall)
// router.patch('/editCall', EditCall)
router.patch('/deleteCall/:MainID/:id', DeleteCall)

router.patch('/messages/:MainID', Salesupload.array('file', 5), msg)
// router.patch('/messages', msg)
router.patch('/editMsg/:MainID/:id', EditMessage)
router.patch('/deleteMsg/:MainID/:id', DeleteMessage)
// router.patch('/deleteMsg', DeleteMessage)


router.patch('/proposal/:MainID', Salesupload.array('file', 5), Proposal)
router.patch('/deleteproposal/:MainID/:id', DeleteProposal)
router.patch('/getproposal/:MainID', GetProposals)
router.patch('/updateproposal/:MainID/:id', UpdateProposal)
router.patch('/contract/:MainID', UpdateProposal);

router.get('/getFiles', getSalesEvidenceFiles)
router.get('/orgdetails', getOnlyOrgDetails);

router.patch("/uploadContract/:MainID", upload.array("file", 2), uploadContractPdfs)

// end new new newn ewn 

// below are may or may not be use
// router.post('/addbasicInfo', addBasicInfo);

// router.patch('/add_mcsc/:MainID/:DetailsID/:Stage1', addMess_Call);

// router.patch('/add_scheduleonly/:MainID/:DetailsID/:Stage1', AddScheduleOnly);


// router.get("/get_scheduleonly/:MainID/:DetailsID/:Stage1", getScheduleOnly);

// router.get('/test', testEmail);

router.post('/orgdetails', addOrgLeadDetails);

router.patch('/update_org_details_only/:_id/:organizationId', updateOnlyOrgDetails);
// // router.patch('/update_org_details_only', updateOnlyOrgDetails);

// router.patch('/delete_stage1_scheduleOnly/:MainID/:DetailsID/:Stage1/:ScheduleID', DeleteStage1ScheduleOnly);




// =======================For stage2 only=================================================

// // router.patch('/addVmeet_only/:_id/:organizationId', AddVmeetingOnly);
// router.patch('/addVmeet_only', AddVmeetingOnly);
// router.patch('/updateVmeet_only', updateVMeetingOnly);

// router.patch('/addVmeet_schedule_only', AddVmeetingScheduleOnly);
// router.patch('/updateVmeet_schedule_only', UpdateVmeetingScheduleOnly);
// router.patch('/deleteVmeet_schedule_only', DeleteVmeetingScheduleOnly);

//  =============================================================================

// router.patch("/uploadContract/:MainID/:DetailsID", upload.array("contractPdf", 2), uploadContractPdfs)
// router.patch("/uploadContract/:MainID",  uploadContractPdfs)
// staff/sales/uploadContract
// router.patch("/uploadContract", upload.array("contractPdf", 2), uploadContractPdfs)

// router.post("/sendMail", SendMailOnly)
// router.get("/onlyStage1/:_id", getOnlyStage1Data)
// router.get("/onlyStage2/:_id", getOnlyStage2Data)
// router.get("/onlyStage3/:_id", getOnlyStage3Data)


// For holiday 
// router.post('/addHoliday/:MainID/:Stage7', HolidayOnly)
router.patch('/addHoliday', HolidayOnly)

module.exports = router;
