const ClientRecruitmentSchema = require('../../Usersmodel/client/Client_Recruit_Schema');
const NepaliDate = require("nepali-date-converter").default;

const getRecruitmentData = async (req, res) => {
  try {
    const respose = await ClientRecruitmentSchema.find({});
    res.status(201).json({ success: true, data: respose });

  } catch (error) {
    res.json({ success: false, error: error.message })

  }
}
// ---------------------------------------------------------------------------------

const { default: mongoose } = require('mongoose');
const staffSalesSchema = require('../../Usersmodel/client/staff.Sales.Schema');
const sendContactEmail = require('../../mail/allMail');
const sendMailWithAttachments = require('../../middleware/mailSendContract');
const { deleteFiles } = require('../../middleware/deleteLocalFile');



const getSalesData = async (req, res) => {
  console.log("getSalesData ", staffSalesSchema.collection.name);
  try {
    const respose = await staffSalesSchema.find();
    // console.log(respose)
    res.status(201).json({ success: true, data: respose });

  } catch (error) {
    res.status(404).json({ error: true, error: error.message })

  }
}

const getStages = async (req, res) => {
  try {

    const getstages = await staffSalesSchema.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId("69bf456b0aecdf8a4bc05678") } },
      { $unwind: "$details" },
      { $unwind: "$details.stages.Stage1" },

      {
        $match: {
          "details.stages.Stage1._id": new mongoose.Types.ObjectId("69bf457b0aecdf8a4bc05679")
        }

      },
      {
        $replaceRoot: {
          newRoot: "$details.stages.Stage1"
        }
      }
      // { $project: { _id: 0, details: 1 } }
    ])

    res.status(201).json({ success: true, data: getstages });
  }
  catch (error) {
    res.status(404).json({ error: true, error: error.message })
  }
  // console.log("postSalesData ", req.body);
}



// new Meetings 
const Meetings_ = async (req, res) => {
  const { MainID } = req.params;

  const filePaths = req.files ? req.files.map(file => file.path) : [];

  let rawData = req.body;
  let extractedItems = rawData.items || (rawData.meetings && rawData.meetings.items) || rawData.meetings || rawData;

  let meetings = [];

  if (typeof extractedItems === 'string') {
    try {
      meetings = JSON.parse(extractedItems);
    } catch (e) {
      return res.status(400).json({ error: true, message: "Invalid JSON format in payload" });
    }
  } else if (Array.isArray(extractedItems)) {
    meetings = extractedItems;
  } else if (typeof extractedItems === 'object') {
    meetings = [extractedItems];
  }

  meetings = meetings.filter(m => m && Object.keys(m).length > 0 && m.type);

  if (!MainID) {
    return res.status(400).json({ error: true, message: "MainID is required in params" });
  }

  if (meetings.length === 0) {
    return res.status(400).json({ error: true, message: "No meetings provided in request body." });
  }

  try {
    const updatePushOperations = {};

    // Updated Helper: Smart extraction for Date Ranges
    const safeExtractDateStr = (dateField, isEndDate = false) => {
      if (!dateField) return "";
      if (typeof dateField === 'string') return dateField;
      if (Array.isArray(dateField) && dateField.length > 0) {
        if (isEndDate && dateField.length > 1) {
          return dateField[1]?.value || dateField[0]?.value || "";
        }
        return dateField[0]?.value || "";
      }
      return "";
    };

    const extractTimes = (item) => {
      if (item.C_time && item.C_time.includes('/')) {
        const parts = item.C_time.split('/');
        return { from: parts[0], to: parts[1] };
      }
      return { from: item.fromTime || "", to: item.toTime || "" };
    };

    const mapMeetingData = (item, type) => {
      const times = extractTimes(item);

      // Pass 'true' to safely extract the second date in the array for the End Date
      const baseDateStr = safeExtractDateStr(item.Sdate) || safeExtractDateStr(item.Fdate) || safeExtractDateStr(item.fromDate) || safeExtractDateStr(item.date);
      const toDateStr = safeExtractDateStr(item.Edate, true) || safeExtractDateStr(item.toDate, true) || baseDateStr;

      const baseObj = {
        _id: new mongoose.Types.ObjectId(),
        meetingType: type,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      if (item.title) baseObj.title = item.title;
      if (filePaths.length > 0) baseObj.attachments = filePaths;

      if (baseDateStr) {
        baseObj.Sdate = baseDateStr;
        baseObj.Fdate = baseDateStr;
        baseObj.fromDate = baseDateStr;
      }
      if (toDateStr) {
        baseObj.Edate = toDateStr;
        baseObj.toDate = toDateStr;
      }

      if (times.from) baseObj.fromTime = times.from;
      if (times.to) baseObj.toTime = times.to;

      if (item.C_time) {
        baseObj.C_time = item.C_time;
      } else if (times.from && times.to) {
        baseObj.C_time = `${times.from}/${times.to}`;
      }

      if (item.content || item.agenda) baseObj.agenda = item.content || item.agenda;
      if (item.by) baseObj.by = item.by;

      if (type === "virtual" && item.link) {
        baseObj.link = Array.isArray(item.link) ? item.link : [item.link];
      } else if (type === "physical" && item.location) {
        baseObj.location = item.location;
      }

      return baseObj;
    };

    // FILTER AND PUSH BASED ON TYPE
    const virtualMeetings = meetings.filter(item => item.type === "virtual");
    if (virtualMeetings.length > 0) {
      updatePushOperations["details.$[det].stages.Stage1.$[stg1].virtualMeetingSchema"] = {
        $each: virtualMeetings.map(item => mapMeetingData(item, "virtual"))
      };
    }

    const physicalMeetings = meetings.filter(item => item.type === "physical");
    if (physicalMeetings.length > 0) {
      updatePushOperations["details.$[det].stages.Stage1.$[stg1].physicalMeetingSchema"] = {
        $each: physicalMeetings.map(item => mapMeetingData(item, "physical"))
      };
    }

    if (Object.keys(updatePushOperations).length === 0) {
      return res.status(400).json({ error: true, message: "No valid virtual or physical meetings identified" });
    }

    const update = await staffSalesSchema.findOneAndUpdate(
      { _id: MainID },
      { $push: updatePushOperations },
      {
        arrayFilters: [
          { "det._id": { $exists: true } },
          { "stg1._id": { $exists: true } }
        ],
        new: true,
        strict: false
      }
    );

    if (!update) return res.status(404).json({ error: true, message: "Document not found" });

    return res.status(200).json({ success: true, data: update });

  } catch (err) {
    return res.status(500).json({ error: true, message: err.message });
  }
};

const EditMeeting = async (req, res) => {
  const { MainID, id } = req.params;
  const { payload } = req.body;

  if (!MainID || !id) {
    return res.status(400).json({ error: true, message: "MainID and id are required" });
  }

  try {
    // Determine the target array based on the meetingType sent from the frontend
    const isVirtual = payload.meetingType === 'virtual' || payload.meetingType === 'virtual_meeting';
    const targetSchema = isVirtual ? "virtualMeetingSchema" : "physicalMeetingSchema";

    const updateFields = {};

    // 1. Basic Field Mapping
    if (payload.title !== undefined) updateFields[`details.$[det].stages.Stage1.$[stg1].${targetSchema}.$[item].title`] = payload.title;
    if (payload.content !== undefined) updateFields[`details.$[det].stages.Stage1.$[stg1].${targetSchema}.$[item].agenda`] = payload.content;
    if (payload.attachments !== undefined) updateFields[`details.$[det].stages.Stage1.$[stg1].${targetSchema}.$[item].attachments`] = payload.attachments;
    if (payload.by !== undefined) updateFields[`details.$[det].stages.Stage1.$[stg1].${targetSchema}.$[item].by`] = payload.by;

    // 2. Type-Specific Mapping
    if (isVirtual && payload.link !== undefined) {
      updateFields[`details.$[det].stages.Stage1.$[stg1].${targetSchema}.$[item].link`] = payload.link;
    }
    if (!isVirtual && payload.location !== undefined) {
      updateFields[`details.$[det].stages.Stage1.$[stg1].${targetSchema}.$[item].location`] = payload.location;
    }

    // 3. Date & Time Mapping (Preventing CastErrors)
    if (payload.fromDate) {
      const fDate = new Date(payload.fromDate);
      if (!isNaN(fDate.getTime())) {
        updateFields[`details.$[det].stages.Stage1.$[stg1].${targetSchema}.$[item].Fdate`] = fDate;
      }
    }

    if (payload.toDate) {
      const eDate = new Date(payload.toDate);
      if (!isNaN(eDate.getTime())) {
        updateFields[`details.$[det].stages.Stage1.$[stg1].${targetSchema}.$[item].Edate`] = eDate;
      }
    }

    // Map "C_time" string ("18:01/19:01") into independent fromTime and toTime valid JS Date Objects
    if (payload.C_time && payload.fromDate) {
      const timeParts = payload.C_time.split('/');

      if (timeParts[0]) {
        const fromTimeObj = new Date(`${payload.fromDate}T${timeParts[0]}:00`);
        if (!isNaN(fromTimeObj.getTime())) {
          updateFields[`details.$[det].stages.Stage1.$[stg1].${targetSchema}.$[item].fromTime`] = fromTimeObj;
        }
      }

      if (timeParts[1]) {
        const baseToDate = payload.toDate || payload.fromDate;
        const toTimeObj = new Date(`${baseToDate}T${timeParts[1]}:00`);
        if (!isNaN(toTimeObj.getTime())) {
          updateFields[`details.$[det].stages.Stage1.$[stg1].${targetSchema}.$[item].toTime`] = toTimeObj;
        }
      }
    }

    // Automatically generate the update timestamp manually
    updateFields[`details.$[det].stages.Stage1.$[stg1].${targetSchema}.$[item].updatedAt`] = new Date();

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ error: true, message: "No valid fields provided for update" });
    }

    // 4. Database Execution
    const result = await staffSalesSchema.findOneAndUpdate(
      { _id: MainID },
      { $set: updateFields },
      {
        arrayFilters: [
          { "det._id": { $exists: true } },
          { "stg1._id": { $exists: true } },
          { "item._id": id }
        ],
        new: true,
        strict: false // CRITICAL: Allows deep array injection
      }
    );

    if (!result) {
      return res.status(404).json({ error: true, message: "Document or item not found" });
    }

    return res.status(200).json({ success: true, message: "Meeting updated successfully" });
  } catch (err) {
    console.error("Meeting Edit Error:", err);
    return res.status(500).json({ error: true, message: err.message });
  }
};

const DeleteMeeting = async (req, res) => {
  const { MainID, id } = req.params;

  if (!MainID || !id) {
    return res.status(400).json({ error: true, message: "MainID and id are required" });
  }

  try {
    const doc = await staffSalesSchema.findById(MainID);

    if (!doc) {
      return res.status(404).json({ error: true, message: "Document not found" });
    }

    let matchedMeeting = null;

    for (const detail of doc.details || []) {
      for (const stage of detail.stages?.Stage1 || []) {
        let found = (stage.virtualMeetingSchema || []).find((m) => m._id.toString() === id);

        if (!found) {
          found = (stage.physicalMeetingSchema || []).find((m) => m._id.toString() === id);
        }

        if (found) {
          matchedMeeting = found;
          break;
        }
      }
      if (matchedMeeting) break;
    }

    if (!matchedMeeting) {
      return res.status(404).json({ error: true, message: "Meeting record not found in database" });
    }

    const attachmentsToDelete = matchedMeeting.attachments || [];

    const result = await staffSalesSchema.findOneAndUpdate(
      { _id: MainID },
      {
        $pull: {
          "details.$[].stages.Stage1.$[].virtualMeetingSchema": { _id: id },
          "details.$[].stages.Stage1.$[].physicalMeetingSchema": { _id: id }
        }
      },
      {
        new: true,
        strict: false
      }
    );

    if (!result) {
      return res.status(404).json({ error: true, message: "Document matching MainID not found during update" });
    }

    if (attachmentsToDelete.length > 0) {
      await deleteFiles(attachmentsToDelete);
    }

    return res.status(200).json({ success: true, message: "Meeting deleted successfully" });

  } catch (err) {
    console.error("Meeting Delete Error:", err);
    return res.status(500).json({ error: true, message: err.message });
  }
};


const Notes = async (req, res) => {
  const { MainID } = req.params;


  const { content } = req.body;

  const filePaths = req.files ? req.files.map(file => file.path) : [];
  if (!MainID) return res.status(400).json({ error: "MainID is required" });
  if (!content) return res.status(400).json({ error: "Content is required" });

  try {
    const currentTime = new Date();

    const result = await staffSalesSchema.findOneAndUpdate(
      { _id: MainID },
      {
        $push: {
          "details.$[det].stages.Stage1.$[stg1].noteSchema": {
            note: content,
            attachments: filePaths, // Saved paths from Multer
            createdAt: currentTime,
            updatedAt: currentTime
          }
        }
      },
      {
        arrayFilters: [{ "det._id": { $exists: true } }, { "stg1._id": { $exists: true } }],
        new: true,
        runValidators: true
      }
    );

    if (!result) {
      return res.status(404).json({ error: "Record not found" });
    }

    return res.status(200).json({ success: true, message: "Note added successfully", attachments: filePaths });

  } catch (err) {
    console.error("Error adding note:", err);
    return res.status(500).json({ error: err.message });
  }
};

const EditNote = async (req, res) => {
  const { MainID, id } = req.params;
  const { content, retainedAttachments } = req.body;

  if (!MainID || !id) {
    return res.status(400).json({ error: true, message: "MainID and Note ID are required" });
  }

  try {
    const doc = await staffSalesSchema.findById(MainID);
    if (!doc) {
      return res.status(404).json({ error: true, message: "Document not found" });
    }

    let matchedNote = null;
    let targetDetailId = null;
    let targetStageId = null;

    // Find the note and capture its exact parent path IDs
    for (const detail of doc.details || []) {
      for (const stage of detail.stages?.Stage1 || []) {
        const found = stage.noteSchema?.find((note) => note._id.toString() === id);
        if (found) {
          matchedNote = found;
          targetDetailId = detail._id;
          targetStageId = stage._id;
          break;
        }
      }
      if (matchedNote) break;
    }

    if (!matchedNote) {
      return res.status(404).json({ error: true, message: "Note not found" });
    }

    // --- 1. SAFELY PROCESS OLD FILES ---
    let keptFiles = [];
    if (retainedAttachments) {
      if (Array.isArray(retainedAttachments)) {
        // If 2+ old files are sent, Express correctly parses them as an array
        keptFiles = retainedAttachments;
      } else if (typeof retainedAttachments === 'string') {
        // If only 1 old file is sent, it comes as a string. We must check if it's a JSON array or a raw path.
        try {
          let parsed = JSON.parse(retainedAttachments);
          keptFiles = Array.isArray(parsed) ? parsed : [parsed];
        } catch (e) {
          // If JSON.parse fails, it is a raw path string (e.g. "uploads/image.png"). Wrap it in an array safely.
          keptFiles = [retainedAttachments];
        }
      }
    }

    // --- 2. GET NEW FILES FROM MULTER ---
    const newFiles = req.files ? req.files.map(file => file.path) : [];

    // --- 3. COMBINE AND CLEAN UP ---
    const oldAttachments = matchedNote.attachments || [];
    const filesToDelete = oldAttachments.filter(oldPath => !keptFiles.includes(oldPath));

    // Merge the safely extracted old files with the new ones
    const finalAttachments = [...keptFiles, ...newFiles];

    // --- 4. UPDATE DATABASE ---
    const updateQuery = { $set: {} };
    updateQuery.$set["details.$[det].stages.Stage1.$[stg1].noteSchema.$[item].updatedAt"] = new Date();
    updateQuery.$set["details.$[det].stages.Stage1.$[stg1].noteSchema.$[item].attachments"] = finalAttachments;

    if (content !== undefined) {
      updateQuery.$set["details.$[det].stages.Stage1.$[stg1].noteSchema.$[item].note"] = content;
    }

    await staffSalesSchema.findOneAndUpdate(
      { _id: MainID },
      updateQuery,
      {
        arrayFilters: [
          { "det._id": targetDetailId },
          { "stg1._id": targetStageId },
          { "item._id": id }
        ],
        new: true,
        runValidators: true
      }
    );

    // Clean up local disk storage by deleting removed files
    if (filesToDelete.length > 0) {
      await deleteFiles(filesToDelete);
    }

    return res.status(200).json({
      success: true,
      message: "Note updated successfully",
      attachments: finalAttachments
    });

  } catch (err) {
    console.error("Edit Note Error:", err);
    return res.status(500).json({ error: true, message: err.message });
  }
};
const DeleteNote = async (req, res) => {
  const { MainID, id } = req.params;


  try {
    const doc = await staffSalesSchema.findById(MainID);

    if (!doc) {
      return res.status(404).json({ error: true, message: "Document not found" });
    }

    const matchedNote = doc.details?.[0]?.stages?.Stage1?.[0]?.noteSchema?.find(
      (note) => note._id.toString() === id
    );
    console.log(matchedNote?.attachments)
    const result = await staffSalesSchema.findOneAndUpdate(
      { _id: MainID },
      {
        $pull: {
          "details.$[det].stages.Stage1.$[stg1].noteSchema": { _id: id }
        }
      },
      {
        arrayFilters: [
          { "det._id": { $exists: true } },
          { "stg1._id": { $exists: true } }
        ],
        new: true
      }
    );

    const response = await deleteFiles(matchedNote.attachments || []);
    return res.status(200).json({ success: true, message: "Note deleted successfully" });
  } catch (err) {
    return res.status(500).json({ error: true, message: err.message });
  }
}

const getNotes = async (req, res) => {
  const { MainID } = req.params;

  if (!MainID) return res.status(400).json({ error: "MainID is required" });

  try {
    const result = await staffSalesSchema.findById(MainID)
      .select("details.stages.Stage1");

    // Returns just the nested structural data containing your notes
    return res.status(200).json({
      success: true,
      data: result.details
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};




const msg = async (req, res) => {
  const { MainID } = req.params;

  const filePaths = req.files ? req.files.map(file => file.path) : [];

  let items = req.body.items || req.body;
  if (typeof items === 'string') {
    try {
      items = JSON.parse(items);
    } catch (e) {
      if (filePaths.length > 0) deleteFiles(filePaths);
      return res.status(400).json({ error: "Invalid JSON format in payload" });
    }
  } else if (!Array.isArray(items)) {
    items = [items];
  }

  if (!MainID) {
    if (filePaths.length > 0) deleteFiles(filePaths);
    return res.status(400).json({ error: "MainID is required" });
  }

  if (!Array.isArray(items) || items.length === 0) {
    if (filePaths.length > 0) deleteFiles(filePaths);
    return res.status(400).json({ error: "Array cannot be empty" });
  }

  try {
    const emails = items.filter(i => i?.type === "email");
    const messages = items.filter(i => i?.type === "direct" || i?.type === "message");

    const updatePush = {};

    if (emails.length) {
      const normalizedEmails = emails.map(e => ({
        _id: new mongoose.Types.ObjectId(),
        type: "email",
        to: e.to || [],
        subject: e.subject || "",
        message: e.note || e.content || "",
        attachments: filePaths.length > 0 ? filePaths : (Array.isArray(e.attachments) ? e.attachments : []),
        createdAt: new Date()
      }));
      updatePush["details.$[det].stages.Stage1.$[stg1].emailSchema"] = { $each: normalizedEmails };
    }

    if (messages.length) {
      const normalizedMessages = messages.map(m => ({
        _id: new mongoose.Types.ObjectId(),
        type: "message",
        note: m.note || m.content || "",
        attachments: filePaths.length > 0 ? filePaths : (Array.isArray(m.attachments) ? m.attachments : []),
        Sdate: m.Sdate,
        Edate: m.Edate,
        time: m.time,
        createdAt: new Date()
      }));
      updatePush["details.$[det].stages.Stage1.$[stg1].message"] = { $each: normalizedMessages };
    }

    if (Object.keys(updatePush).length === 0) {
      if (filePaths.length > 0) await deleteFiles(filePaths);
      return res.status(400).json({
        error: "Payload format mismatch. Ensure objects include type: 'email' or type: 'message'."
      });
    }

    const result = await staffSalesSchema.findOneAndUpdate(
      { _id: MainID },
      { $push: updatePush },
      {
        arrayFilters: [{ "det._id": { $exists: true } }, { "stg1._id": { $exists: true } }],
        new: true,
        strict: false
      }
    );

    if (!result) {
      if (filePaths.length > 0) await deleteFiles(filePaths);
      return res.status(404).json({ error: "Document matching MainID not found" });
    }

    return res.status(200).json({
      success: true,
      data: result,
      attachments: filePaths
    });

  } catch (err) {
    if (filePaths.length > 0) await deleteFiles(filePaths);
    console.error("Message Processing Error:", err);
    return res.status(500).json({ error: err.message });
  }
};

const EditMessage = async (req, res) => {
  const { MainID, id } = req.params;
  const { payload } = req.body;

  // Look for type in either the body payload or the URL query string
  const type = req.query.type || payload?.type;

  if (!type) {
    return res.status(400).json({ error: true, message: "Type ('email', 'message', or 'direct') is required" });
  }

  try {
    // Determine the target array based on the type provided
    const isEmail = type === 'email';
    const targetSchema = isEmail ? "emailSchema" : "messageSchema";

    const updateFields = {};

    // 1. Text Content Mapping ('message' for emails, 'note' for messages/direct)
    if (payload.content !== undefined) {
      updateFields[`details.$[det].stages.Stage1.$[stg1].${targetSchema}.$[item].${isEmail ? 'message' : 'note'}`] = payload.content;
    }

    // 2. Attachments
    if (payload.attachments !== undefined) {
      updateFields[`details.$[det].stages.Stage1.$[stg1].${targetSchema}.$[item].attachments`] = payload.attachments;
    }

    // 3. Date & Time Mapping
    // Only apply date/time parsing if this is a message/direct activity
    if (!isEmail) {
      if (payload.fromDate) {
        updateFields[`details.$[det].stages.Stage1.$[stg1].${targetSchema}.$[item].date`] = new Date(payload.fromDate);
      }
      if (payload.fromDate && payload.time) {
        // Prevent Mongoose CastError by converting "HH:mm" string to a valid Date object
        updateFields[`details.$[det].stages.Stage1.$[stg1].${targetSchema}.$[item].time`] = new Date(`${payload.fromDate}T${payload.time}:00`);
      }
    }

    // 4. Email-specific fields
    if (isEmail && payload.to !== undefined) {
      updateFields[`details.$[det].stages.Stage1.$[stg1].${targetSchema}.$[item].to`] = payload.to;
    }
    if (isEmail && payload.subject !== undefined) {
      updateFields[`details.$[det].stages.Stage1.$[stg1].${targetSchema}.$[item].subject`] = payload.subject;
    }

    // Guard against empty updates
    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ error: true, message: "No valid fields provided for update" });
    }

    // 5. Execute the update
    const result = await staffSalesSchema.findOneAndUpdate(
      { _id: MainID },
      { $set: updateFields },
      {
        arrayFilters: [
          { "det._id": { $exists: true } },
          { "stg1._id": { $exists: true } },
          { "item._id": id }
        ],
        new: true
      }
    );

    if (!result) {
      return res.status(404).json({ error: true, message: "Document or item not found" });
    }

    return res.status(200).json({ success: true, message: `${isEmail ? 'Email' : 'Message'} updated successfully` });
  } catch (err) {
    console.error("Edit Error:", err);
    return res.status(500).json({ error: true, message: err.message });
  }
};

const DeleteMessage = async (req, res) => {
  const { MainID, id } = req.params;

  const type = req.query.type || req.body.type || req.params.type;

  console.log('Running DeleteMessage with:', MainID, id, type);

  if (!type) return res.status(400).json({ error: true, message: "Type is required" });
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: true, message: "Invalid message ID format" });

  try {
    const doc = await staffSalesSchema.findById(MainID);
    if (!doc) {
      return res.status(404).json({ error: true, message: "Document not found" });
    }

    let matchedItem = null;

    for (const detail of doc.details || []) {
      for (const stage of detail.stages?.Stage1 || []) {
        const arrayToSearch = type === "email" ? stage.emailSchema : stage.message;

        const found = (arrayToSearch || []).find((item) => item._id.toString() === id);
        if (found) {
          matchedItem = found;
          break;
        }
      }
      if (matchedItem) break;
    }

    if (!matchedItem) {
      return res.status(404).json({ error: true, message: `${type} record not found in database` });
    }

    const attachmentsToDelete = matchedItem.attachments || [];

    let targetArray = "";
    if (type === "email") {
      targetArray = "details.$[].stages.Stage1.$[].emailSchema";
    } else if (type === "message" || type === "direct") {
      targetArray = "details.$[].stages.Stage1.$[].message";
    } else {
      return res.status(400).json({ error: true, message: "Invalid type provided" });
    }

    const result = await staffSalesSchema.findOneAndUpdate(
      { _id: MainID },
      {
        $pull: {
          [targetArray]: { _id: id }
        }
      },
      {
        new: true,
        strict: false
      }
    );

    if (!result) {
      return res.status(404).json({ error: true, message: "Document matching MainID not found during update" });
    }

    if (attachmentsToDelete.length > 0) {
      await deleteFiles(attachmentsToDelete);
    }

    return res.status(200).json({
      success: true,
      message: `${type} deleted successfully`,
      data: result
    });

  } catch (err) {
    console.error("Delete Error:", err);
    return res.status(500).json({ error: true, message: err.message });
  }
};



const Calls = async (req, res) => {
  const { MainID } = req.params;

  const filePaths = req.files ? req.files.map(file => file.path) : [];

  let calls = req.body.items || req.body;
  if (typeof calls === 'string') {
    try {
      calls = JSON.parse(calls);
    } catch (e) {
      return res.status(400).json({ error: "Invalid JSON format in payload" });
    }
  } else if (!Array.isArray(calls)) {
    calls = [calls];
  }

  if (!MainID) {
    return res.status(400).json({ error: "MainID is required" });
  }

  if (!Array.isArray(calls) || calls.length === 0 || Object.keys(calls[0]).length === 0) {
    return res.status(400).json({ error: "Array cannot be empty" });
  }

  try {
    const formattedCalls = calls.map(call => {
      let safeFromDate = "";
      if (Array.isArray(call.fromDate)) {
        safeFromDate = call.fromDate[0]?.value || "";
      } else if (typeof call.fromDate === "string") {
        safeFromDate = call.fromDate;
      }
      
      let safeToDate = "";
      if (Array.isArray(call.toDate)) {
        safeToDate = call.toDate[1]?.value || call.toDate[0]?.value || safeFromDate;
      } else if (typeof call.toDate === "string") {
        safeToDate = call.toDate;
      }
      
      return {
        _id: new mongoose.Types.ObjectId(),
        connected: call.contact || call.connected || "",
        outCome: call.outcome || call.outCome || "",
        note: call.content || call.note || "",
        attachments: filePaths.length > 0 ? filePaths : [],
        fromDate: safeFromDate,
        toDate: safeToDate,
        fromTime: call.fromTime || "",
        toTime: call.toTime || "",
        time: call.time || `${call.fromTime}/${call.toTime}`,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    });
    
    console.log("formattedCalls ===================", formattedCalls);
    const result = await staffSalesSchema.findOneAndUpdate(
      { _id: MainID },
      {
        $push: {
          "details.$[det].stages.Stage1.$[stg1].callsSchema": { $each: formattedCalls }
        }
      },
      {
        arrayFilters: [{ "det._id": { $exists: true } }, { "stg1._id": { $exists: true } }],
        new: true,
        strict: false
      }
    );

    if (!result) {
      return res.status(404).json({ error: "Record not found" });
    }

    return res.status(200).json({ success: true, data: result, attachments: filePaths });

  } catch (err) {
    console.error("Call Controller Error:", err);
    return res.status(500).json({ error: err.message });
  }
};

const EditCall = async (req, res) => {
  const { MainID, id } = req.params;
  const callPayload = req.body;
  console.log(callPayload)

  if (!MainID || !id) return res.status(400).json({ error: "MainID and Call ID are required" });

  try {
    const setOptions = {};
    const basePath = "details.$[det].stages.Stage1.$[stg1].callsSchema.$[call]";

    // Standard fields
    if (callPayload.contact !== undefined) setOptions[`${basePath}.connected`] = callPayload.contact;
    if (callPayload.outcome !== undefined) setOptions[`${basePath}.outCome`] = callPayload.outcome;
    if (callPayload.content !== undefined) setOptions[`${basePath}.note`] = callPayload.content;
    if (callPayload.attachments !== undefined) setOptions[`${basePath}.attachments`] = callPayload.attachments;
    if (callPayload.fromTime !== undefined) setOptions[`${basePath}.fromTime`] = callPayload.fromTime;
    if (callPayload.toTime !== undefined) setOptions[`${basePath}.toTime`] = callPayload.toTime;

    // Direct apply for dates as requested
    // Note: Added `?.` before `[0]` to prevent a server crash if the key is missing entirely
    setOptions[`${basePath}.fromDate`] = callPayload.fromDate?.[0]?.value || [];
    setOptions[`${basePath}.toDate`] = callPayload.toDate?.[0]?.value || [];

    // Always update the timestamp
    setOptions[`${basePath}.updatedAt`] = new Date();

    const result = await staffSalesSchema.findOneAndUpdate(
      { _id: MainID },
      {
        $set: setOptions
      },
      {
        arrayFilters: [
          { "det._id": { $exists: true } },
          { "stg1._id": { $exists: true } },
          { "call._id": id }
        ],
        new: true,
        strict: false
      }
    );

    if (!result) return res.status(404).json({ error: "Main record or Call not found" });

    return res.status(200).json({ success: true, data: result });

  } catch (err) {
    console.error("Edit Call Controller Error:", err);
    return res.status(500).json({ error: err.message });
  }
};

const DeleteCall = async (req, res) => {
  const { MainID, id } = req.params;

  if (!MainID || !id) {
    return res.status(400).json({ error: true, message: "MainID and Call ID required" });
  }

  try {
    const doc = await staffSalesSchema.findById(MainID);

    if (!doc) {
      return res.status(404).json({ error: true, message: "Document not found" });
    }

    let matchedCall = null;

    for (const detail of doc.details || []) {
      for (const stage of detail.stages?.Stage1 || []) {
        const found = (stage.callsSchema || []).find((call) => call._id.toString() === id);
        if (found) {
          matchedCall = found;
          break;
        }
      }
      if (matchedCall) break;
    }

    if (!matchedCall) {
      return res.status(404).json({ error: true, message: "Call record not found in database" });
    }

    const attachmentsToDelete = matchedCall.attachments || [];

    const result = await staffSalesSchema.findOneAndUpdate(
      { _id: MainID },
      {
        $pull: {
          "details.$[].stages.Stage1.$[].callsSchema": { _id: id }
        }
      },
      {
        new: true,
        strict: false
      }
    );

    if (!result) {
      return res.status(404).json({ error: true, message: "Record not found during update" });
    }

    if (attachmentsToDelete.length > 0) {
      await deleteFiles(attachmentsToDelete);
    }

    return res.status(200).json({ success: true, message: "Call deleted successfully" });

  } catch (err) {
    console.error("DeleteCall Error:", err);
    return res.status(500).json({ error: true, message: err.message });
  }
};

// const MainModel = require('../models/MainModel'); // Replace with your actual Model


const Proposal = async (req, res) => {
  const { MainID } = req.params;
  const payload = req.body;
  const files = req.files;

  if (!MainID) {
    return res.status(400).json({ error: true, message: "Invalid MainID" });
  }

  try {
    // 1. Extract data
    let data;
    if (Array.isArray(payload) && payload.length > 0) {
      data = payload[0];
    } else if (typeof payload === 'string') {
      data = JSON.parse(payload);
    } else {
      data = payload;
    }

    // 2. Handle Attachments
    let attachmentsList = [];
    if (files && files.length > 0) {
      attachmentsList = files.map(f => f.filename || f.path);
    } else if (data.attachments && Array.isArray(data.attachments)) {
      attachmentsList = data.attachments;
    }

    // 3. Construct the record with auto-generated ID (matching your msg controller style)
    const newRecord = {
      _id: new mongoose.Types.ObjectId(),
      sendto: data.sendto || [],
      subject: data.subject ? data.subject.trim() : '',
      body: data.body ? data.body.trim() : '',
      termsAndConditions: Array.isArray(data.termsAndConditions) ? data.termsAndConditions : [],
      installments: Array.isArray(data.installments) ? data.installments : [],
      attachments: [],
      timestamp: new Date().toISOString()
    };


    const updatedDocument = await staffSalesSchema.findOneAndUpdate(
      { _id: MainID },
      {
        $push: {
          "details.$[det].stages.Stage2.$[stg1].proposalInfo": newRecord
        }
      },
      {
        new: true,
        strict: false, // Ensures insertion even if schema strictly doesn't define it
        arrayFilters: [
          { "det._id": { $exists: true } },
          { "stg1._id": { $exists: true } }
        ]
      }
    );

    if (!updatedDocument) {
      return res.status(404).json({ error: true, message: "Document matching MainID not found." });
    }

    // 5. Send Success Response
    return res.status(201).json({
      success: true,
      message: "Proposal added successfully"
    });

  } catch (error) {
    console.error("Error in Proposal Controller:", error);
    return res.status(500).json({
      error: true,
      message: "An internal server error occurred while processing the proposal.",
      details: error.message
    });
  }
};

const GetProposals = async (req, res) => {
  const { MainID } = req.params;

  if (!MainID) {
    return res.status(400).json({ error: true, message: "Invalid MainID" });
  }

  try {
    // 1. Fetch the document, selecting ONLY the nested proposalInfo path
    const document = await staffSalesSchema.findById(MainID)
      .select("details.stages.Stage2.proposalInfo")
      .lean(); // .lean() strips heavy Mongoose wrappers for faster processing

    if (!document) {
      return res.status(404).json({ error: true, message: "Document not found." });
    }

    // 2. Extract and flatten the deeply nested proposalInfo arrays
    let allProposals = [];

    if (document.details && Array.isArray(document.details)) {
      document.details.forEach(det => {
        if (det.stages && det.stages.Stage2 && Array.isArray(det.stages.Stage2)) {
          det.stages.Stage2.forEach(stg => {
            if (stg.proposalInfo && Array.isArray(stg.proposalInfo)) {
              allProposals.push(...stg.proposalInfo);
            }
          });
        }
      });
    }

    return res.status(200).json({
      success: true,
      count: allProposals.length,
      data: allProposals
    });

  } catch (error) {
    console.error("Error in GetProposals:", error);
    return res.status(500).json({
      error: true,
      message: "Server error while fetching proposals.",
      details: error.message
    });
  }
};

const DeleteProposal = async (req, res) => {
  const { MainID, id } = req.params;
  // console.log(mainID,id)
  console.log(MainID, id)
  if (!MainID || !id) {
    return res.status(400).json({ error: true, message: "MainID and proposalId are required." });
  }

  try {
    const updatedDocument = await staffSalesSchema.findOneAndUpdate(
      { _id: MainID },
      {
        // $pull removes items from an array that match a condition
        $pull: {
          "details.$[].stages.Stage2.$[].proposalInfo": { _id: id }
        }
      },
      { new: true }
    );

    if (!updatedDocument) {
      return res.status(404).json({ error: true, message: "Document not found." });
    }

    return res.status(200).json({
      success: true,
      message: "Proposal deleted successfully."
    });

  } catch (error) {
    console.error("Error in DeleteProposal:", error);
    return res.status(500).json({
      error: true,
      message: "Server error while deleting proposal.",
      details: error.message
    });
  }
};

const UpdateProposal = async (req, res) => {
  const { MainID, proposalId } = req.params;
  const payload = req.body;

  if (!MainID || !proposalId) {
    return res.status(400).json({ error: true, message: "MainID and proposalId are required." });
  }

  try {
    // 1. Dynamically construct the $set object based on provided payload
    const updateFields = {};
    for (const key in payload) {
      // Prevent accidental overwrites of locked fields like _id
      if (key !== "_id" && key !== "timestamp") {
        updateFields[`details.$[det].stages.Stage2.$[stg].proposalInfo.$[prop].${key}`] = payload[key];
      }
    }

    // If no valid fields to update were sent
    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ error: true, message: "No valid fields provided for update." });
    }

    // 2. Perform the update using arrayFilters
    const updatedDocument = await staffSalesSchema.findOneAndUpdate(
      { _id: MainID },
      { $set: updateFields },
      {
        new: true,
        arrayFilters: [
          { "det.stages": { $exists: true } },       // Matches details that have stages
          { "stg.proposalInfo": { $exists: true } }, // Matches Stage2s that have proposalInfo
          { "prop._id": proposalId }                 // Matches the specific proposal ID
        ]
      }
    );

    if (!updatedDocument) {
      return res.status(404).json({ error: true, message: "Document or Proposal not found." });
    }

    return res.status(200).json({
      success: true,
      message: "Proposal updated successfully."
    });

  } catch (error) {
    console.error("Error in UpdateProposal:", error);
    return res.status(500).json({
      error: true,
      message: "Server error while updating proposal.",
      details: error.message
    });
  }
};








//  End new new new new new new new new new new new 





const updateMessageCallScheduleCancelDetails = async (req, res) => {
  let pushFields = {}
  let setFields = {}
  const { salesId, stageId, detailsId } = req.query;
  const {
    GeneralDetails,
    _id,
    GeneralDetails: { schedules = [] } = {},
    cancelDetails: { status, cancelNote } = {},
  } = req.body;
  console.log(GeneralDetails?.callDetails)
  try {

    const doc = await staffSalesSchema.findOne(
      { _id: salesId },
      { "details": 1 }
    )
    const stage = doc.details
      .find(d => d._id.equals(detailsId))
      ?.stages.Stage1
      .find(s => s._id.equals(stageId));

    const callDetailsEmpty = stage.GeneralDetails.callDetails.length === 0;
    const messageDetailsEmpty = stage.GeneralDetails.messageDetails.length === 0;
    const cancelDetailsEmpty = stage.cancelDetails.cancelNote === "";
    const schedulesEmpty = stage.schedules.length === 0;

    if (callDetailsEmpty) {

      pushFields["details.$[detail].stages.Stage1.$[stage].GeneralDetails.callDetails"] = GeneralDetails?.callDetails;
      pushFields["details.$[detail].stages.Stage1.$[stage].GeneralDetails.status"] = GeneralDetails?.status;
    } else {
      // update existing last element  or push new one
      setFields["details.$[detail].stages.Stage1.$[stage].GeneralDetails.callDetails.$[last]"] = GeneralDetails?.callDetails;
    }
    if (messageDetailsEmpty) {
      pushFields["details.$[details].stages.Stage1.$[stage]..GeneralDetails.callDetails"] = ""
    }
    let updteObject = {};

    if (Object.keys(pushFields).length > 0) updteObject.$push = pushFields;
    if (Object.keys(setFields).length > 0) updteObject.$set = setFields;
    try {
      const final_ = await staffSalesSchema.updateOne({ _id: new mongoose.Types.ObjectId(salesId) },
        updteObject,
        {
          arrayFilters: [
            { "detail._id": new mongoose.Types.ObjectId(detailsId) },
            { "stage._id": new mongoose.Types.ObjectId(stageId) }
          ]
        })
      res.status(200).json({ final_, success: true, message: "Update Completed " })
    } catch (err) {
      res.status(500).json({ error: true, message: err.message })
    }
    res.status(200).json({ updteObject, messageDetailsEmpty, cancelDetailsEmpty });
  } catch (err) {
    res.status(500).json({
      error: true,
      message: err.message || "Internal Server Error",
      error: err
    })
  }

};



const addBasicInfo = async (req, res) => {
  const {
    branch,
    province,
    salesManager,
    salesManagerId,
    date,
    time
  } = req.body;
  try {
    // await staffSalesSchema.validate({ province });
    const uniqueProvince = await staffSalesSchema.findOne({ province })
    if (uniqueProvince) {
      return res.status(400).json({ error: true, message: "Province already exists" });
    }
    const BI = await mongoose.connection.db.aggregate([
      {
        $documents: [
          {
            branch,
            province,
            salesManager,
            salesManagerId,
            date: new Date(date),
            time
          }
        ]
      },
      {
        $merge: {
          into: "salespipelines",
          whenMatched: "fail",
          whenNotMatched: "insert"
        }
      }
    ]).toArray();
    res.status(201).json({ message: "Basic Info added successfully", success: true, data: BI });
  } catch (error) {
    res.status(404).json({ error: true, message: error.message })
  }
}




const getDetailsData = async (req, res) => {
  // const id="289323ou98u3289u82"
  const { _id } = req.query
  console.log('something is requesting', req.query)
  try {
    const fd = await staffSalesSchema.findById({ _id: _id }).select('details');
    if (fd) {
      res.status(200).json(fd)
    } else {
      res.status(400).json({ error: true, message: "Data not available" })
    }
  } catch (err) {
    res.status(404).json(err)

  }
}

const addMess_Call = async (req, res) => {
  const { MainID, DetailsID, Stage1 } = req.params;
  const { GeneralDetails, schedules, cancelDetails } = req.body;
  // console.log(GeneralDetails, schedules, cancelDetails)
  console.log("MainID , detailsID, stage1ID -->", req.body);

  try {
    // Validate IDs
    if (!MainID || !DetailsID || !Stage1) {
      return res.status(400).json({ error: true, message: "MainID, DetailsID, Stage1 are required in params" });
    }

    // Check data
    const hasCallDetails = GeneralDetails?.callDetails?.length > 0;
    const hasMessageDetails = GeneralDetails?.messageDetails?.length > 0;
    const hasSchedules = schedules?.length > 0;
    const hasCancelDetails = cancelDetails?.length > 0;

    // Nothing to push
    const hasAnyData = hasCallDetails || hasMessageDetails || hasSchedules || hasCancelDetails;
    if (!hasAnyData) {
      return res.status(400).json({ error: true, message: "No data provided to update" });
    }

    // Build single $push object
    const pushData = {
      ...(hasCallDetails && {
        "details.$[detail].stages.Stage1.$[stage].GeneralDetails.callDetails": {
          $each: GeneralDetails.callDetails
        }

      }),
      ...(hasMessageDetails && {
        "details.$[detail].stages.Stage1.$[stage].GeneralDetails.messageDetails": {
          $each: GeneralDetails.messageDetails
        }
      }),
      // ...(hasSchedules && {
      //   "details.$[detail].stages.Stage1.$[stage].schedules": {
      //     $each: schedules
      //   }
      // }),
      ...(hasCancelDetails && {
        "details.$[detail].stages.Stage1.$[stage].cancelDetails": {
          $each: cancelDetails
        }
      })

    };

    const validate = await staffSalesSchema.findOne({ _id: MainID }).select('details.stages.Stage1').lean();
    const isFilled = validate?.details?.[0]?.stages?.Stage1?.[0].isFilled;
    // console.log("Validate. details  →", typeof isFilled);
    if (isFilled) {
      return res.status(400).json({ warn: true, message: "Restric for Double entry." })
    }

    const result = await staffSalesSchema.updateOne(
      { _id: MainID },
      {
        $push: pushData,
        $set: {
          "details.$[detail].stages.Stage1.$[stage].isFilled": true
        }
      },
      {
        arrayFilters: [
          { "detail._id": new mongoose.Types.ObjectId(DetailsID) },
          { "stage._id": new mongoose.Types.ObjectId(Stage1) }
        ]
      }
    );
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: true, message: "Document not found" });
    }

    if (result.modifiedCount === 0) {
      return res.status(400).json({ error: true, message: "Nothing was updated" });
    }

    res.status(200).json({
      success: true,
      message: "Stage1 updated successfully",
      data: result
    });

  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
};

const AddScheduleOnly = async (req, res) => {
  const { MainID, Stage1, DetailsID } = req.params;
  const { scheduleDetails } = req.body;

  // console.log("query:", req.query);
  console.log("body:", req.body);

  if (!MainID || !DetailsID || !Stage1) {
    return res.status(400).json({
      error: true,
      message: "MainID, DetailsID and Stage1 are required",
    });
  }

  if (
    !mongoose.Types.ObjectId.isValid(MainID) ||
    !mongoose.Types.ObjectId.isValid(DetailsID) ||
    !mongoose.Types.ObjectId.isValid(Stage1)
  ) {
    return res.status(400).json({
      error: true,
      message: "Invalid MongoDB ID format",
    });
  }

  if (!Array.isArray(scheduleDetails) || scheduleDetails.length === 0) {
    return res.status(400).json({
      error: true,
      message: "scheduleDetails must be a non-empty array",
    });
  }

  try {
    const ScheduleOnly = await staffSalesSchema.updateOne(
      {
        _id: new mongoose.Types.ObjectId(MainID),
        "details._id": new mongoose.Types.ObjectId(DetailsID),
        "details.stages.Stage1._id": new mongoose.Types.ObjectId(Stage1),
      },
      {
        $push: {
          "details.$[detail].stages.Stage1.$[stage].schedules": {
            $each: scheduleDetails,
          },
        },
      },
      {
        arrayFilters: [
          { "detail._id": new mongoose.Types.ObjectId(DetailsID) },
          { "stage._id": new mongoose.Types.ObjectId(Stage1) },
        ],
      }
    );

    if (ScheduleOnly.matchedCount === 0) {
      return res.status(404).json({
        error: true,
        message: "Main, Details, or Stage not found",
      });
    }

    if (ScheduleOnly.modifiedCount === 0) {
      return res.status(200).json({
        success: true,
        message: "Matched but schedule not modified",
        ScheduleOnly,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Schedule added successfully",
      ScheduleOnly,
    });
  } catch (err) {
    return res.status(500).json({
      error: true,
      message: err.message,
    });
  }
};

const getScheduleOnly = async (req, res) => {
  const { MainID, DetailsID, Stage1 } = req.params;
  console.log('get only schedule', req.params)
  try {
    const sales = await staffSalesSchema.findOne(
      {
        _id: MainID,
        "details._id": DetailsID,
        "details.stages.Stage1._id": Stage1,
      },
      {
        details: 1,
      }
    ).lean();

    if (!sales) {
      return res.status(404).json({
        error: true,
        message: "Data not found",
      });
    }

    const detail = sales.details.find(
      (d) => d._id.toString() === DetailsID
    );

    const stage = detail?.stages?.Stage1?.find(
      (s) => s._id.toString() === Stage1
    );

    return res.status(200).json({
      success: true,
      message: "Schedule fetched successfully",
      data: {
        mainId: sales._id,
        detailsId: detail?._id,
        stageId: stage?._id,
        schedules: stage?.schedules || [],
      },
    });
  } catch (err) {
    return res.status(400).json({
      error: true,
      message: err.message,
    });
  }
};



const addOrgLeadDetails = async (req, res) => {
  try {
    const {
      lead,
      organization
    } = req.body;

console.log('Received organization and lead details:', { organization, lead });
    const {
      organizationName, organizationType, industyType, registrationNumber,
      vatPan, provinceNumber: orgProvinceNumber, province: orgProvince,
      district: orgDistrict, localLevel: orgLocalLevel, totalEmp_learners, employeeRange,
      totalEducator, contactPersonName, GradeFrom, GradeTo, role, standard,
      contactPersonNumber, contactPersonEmail, orgEmail, orgTelephone,
      alternativeContacts = []
    } = organization;

    const addOrg = await staffSalesSchema.create({
      organizationDetails: [
        {
          organizationName,
          organizationType,
          industyType,
          registrationNumber,
          vatPan,
          totalEmp_learners,
          employeeRange,
          totalEducator,
          orgEmail,
          orgTelephone,
          GradeFrom,
          GradeTo,
          provinceNumber: orgProvinceNumber,
          province: orgProvince,
          district: orgDistrict,
          localLevel: orgLocalLevel,
          contactPersonName,
          role,
          contactPersonNumber,
          contactPersonEmail,
          standard,
          alternativeContacts
        }
      ],

      leadDetails: [
        {
          ...lead,
          provinceNumber: lead.provinceNumber || orgProvinceNumber,
          district: lead.district || orgDistrict,
          localLevel: lead.localLevel || orgLocalLevel,
          province: lead.province || orgProvince,
        }
      ],

      details: [
        {
          _id: new mongoose.Types.ObjectId(),
          stages: {
            Stage1: [{ isFilled: false, currentStage: 1, nextStage: 2, active: true, stageName: "Lead Generation", _id: new mongoose.Types.ObjectId() }],
            Stage2: [{ isFilled: false, currentStage: 2, nextStage: 3, active: true, stageName: "VMeeting", _id: new mongoose.Types.ObjectId() }],
            Stage3: [{ isFilled: false, currentStage: 3, nextStage: 4, active: true, stageName: "Contract", _id: new mongoose.Types.ObjectId() }],
            Stage4: [{ isFilled: false, currentStage: 4, nextStage: 5, active: true, stageName: "scheduling", _id: new mongoose.Types.ObjectId(), holidayItems: [], jobAssignItems: [] }]
          }
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: "Organization Details added successfully",
      data: addOrg
    });
  } catch (error) {
    console.error("Error saving lead details:", error);
    res.status(500).json({
      error: true,
      message: error.message || "Internal Server Error"
    });
  }
};

const getOnlyOrgDetails = async (req, res) => {
  const { _id } = req.query;
  console.log('get only org details', req.query);
  try {

    const orgDetails = await staffSalesSchema.findById(_id, { organizationDetails: 1 }).lean();
    if (!orgDetails) {
      return res.status(404).json({ error: true, message: "Organization details not found" });
    }
    res.status(200).json({ success: true, data: orgDetails });
  } catch (err) {
    res.status(400).json({ error: true, message: err.message });
  }
}






const updateOnlyOrgDetails = async (req, res) => {
  const { _id, organizationId } = req.params;
  console.log("Update Only Org Details called with params:", req.params);

  // Safely handle if the frontend sends the wrapped 'organization' object or a flat body
  const orgData = req.body.organizationDetails;
  console.log(orgData)

  // Map fields exactly to match your schema from office_erp.salespipelines.json
  const mappedData = {
    organizationName: orgData.organizationName,
    organizationType: orgData.organizationType,
    industyType: Array.isArray(orgData.industyType) ? orgData.industyType : [],
    registrationNumber: orgData.registrationNumber,
    vatPan: orgData.vatPan,
    date: orgData.date || "",
    address: orgData.address,
    orgTelephone: orgData.orgTelephone,
    orgEmail: orgData.orgEmail,
    contactPersonName: orgData.contactPersonName,
    role: orgData.role,
    contactPersonEmail: orgData.contactPersonEmail,
    contactPersonNumber: orgData.contactPersonNumber,
    totalEducator: !isNaN(orgData.totalEducator) ? Number(orgData.totalEducator) : null,
    totalEmp_learners: !isNaN(orgData.totalEmp_learners) ? Number(orgData.totalEmp_learners) : null,
    employeeRange: orgData.employeeRange || "",
    discounted: !isNaN(orgData.discounted) ? Number(orgData.discounted) : 0,
    alternativeContacts: Array.isArray(orgData.alternativeContacts) ? orgData.alternativeContacts : []
  };

  // Construct the update object using the standard positional operator ($)
  const updateSet = {};
  for (const key in mappedData) {
    updateSet[`organizationDetails.$.${key}`] = mappedData[key];
  }
  updateSet["organizationDetails.$.updatedAt"] = new Date();

  try {
    const updatedDoc = await staffSalesSchema.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(_id),
        "organizationDetails._id": new mongoose.Types.ObjectId(organizationId)
      },
      {
        $set: updateSet
      },
      {
        new: true,
        strict: false
      }
    );

    if (!updatedDoc) {
      return res.status(404).json({ success: false, message: "Pipeline document or organization entry not found." });
    }

    res.status(200).json({ success: true, data: updatedDoc });
    console.log(updatedDoc)
  } catch (err) {
    console.error("Error updating organization details:", err);
    res.status(500).json({
      error: true,
      message: err.message || "Internal server error during save.",
    });
  }
};


const testEmail = async (req, res) => {
  try {
    const mailRes = await sendContactEmail("", "", "");
    res.status(200).json({ success: true, message: "Email sent successfully", data: mailRes });
  }
  catch (err) {
    console.log("Email sending failed:", err);
    res.status(400).json({ success: false, message: "Failed to send email" });
  }
}

const DeleteStage1ScheduleOnly = async (req, res) => {
  console.log("DeleteStage1ScheduleOnly called with params:");
  const { MainID, DetailsID, Stage1, ScheduleID } = req.params;
  console.log("Delete Schedule Params:", req.params);
  console.log(MainID, DetailsID, Stage1, ScheduleID)
  if (!MainID || !DetailsID || !Stage1 || !ScheduleID) {
    return res.status(400).json({
      error: true,
      message: "MainID, DetailsID, Stage1 and ScheduleID are required",
    });
  }

  try {

    const DeleteOnlySchedule = await staffSalesSchema.updateOne(
      { _id: new mongoose.Types.ObjectId(MainID) },
      {
        $pull: {
          'details.$[detail].stages.Stage1.$[stage].schedules': { _id: new mongoose.Types.ObjectId(ScheduleID) }

        }
      },
      {
        arrayFilters: [
          { "detail._id": new mongoose.Types.ObjectId(DetailsID) },
          { "stage._id": new mongoose.Types.ObjectId(Stage1) },
        ]
      }
    );
    res.status(200).json({ success: true, message: "Schedule deleted successfully", data: DeleteOnlySchedule });
  }
  catch (err) {
    res.status(400).json({ error: true, message: err.message, });
  }
}


//=========================================================================================
// StartV.Meeting 
const AddVmeetingOnly = async (req, res) => {
  const { MainID, Stage2, DetailsID } = req.query;
  const { Vmeetinginfo } = req.body;

  // console.log("AddVmeetingOnly called with params:",Vmeetinginfo);
  if (!MainID || !DetailsID || !Stage2) {
    return res.status(400).json({
      error: true,
      message: "MainID, DetailsID and Stage2 are required",
    });
  }
  if (Vmeetinginfo?.length === 0) {
    return res.status(400).json({
      error: true,
      message: "Vmeetinginfo is required",
    });
  }

  try {
    const validate = await staffSalesSchema.findOne({ _id: MainID }).select('details.stages.Stage2').lean();
    const meetingInfo =
      validate?.details?.[0]?.stages?.Stage2?.[0]?.Vmeetinginfo;

    if (meetingInfo?.length) {
      return res.status(400).json({
        warn: true,
        message: "Restrict for Double entry.",
      });
    }

    const addonly = await staffSalesSchema.updateOne({ _id: new mongoose.Types.ObjectId(MainID) },
      {
        $push: { "details.$[detail].stages.Stage2.$[stage].Vmeetinginfo": Vmeetinginfo }
      },
      {
        arrayFilters: [
          { "detail._id": new mongoose.Types.ObjectId(DetailsID) },
          { "stage._id": new mongoose.Types.ObjectId(Stage2) }
        ]
      }
    );
    res.status(200).json({ success: true, message: "V.Meeting info added successfully", data: addonly });
  } catch (err) {
    res.status(400).json({ error: true, message: err.message });
  }
};
const updateVMeetingOnly = async (req, res) => { }


const AddVmeetingScheduleOnly = async (req, res) => {
  const { MainID, Stage2, DetailsID } = req.query;
  const { schedules } = req.body;

  // console.log("AddVmeetingOnly called with params:",Vmeetinginfo);
  if (!MainID || !DetailsID || !Stage2) {
    return res.status(400).json({
      error: true,
      message: "MainID, DetailsID and Stage2 are required",
    });
  }
  if (schedules?.length === 0) {
    return res.status(400).json({
      error: true,
      message: "Schedules are required",
    });
  }

  try {

    const addonly = await staffSalesSchema.updateOne({ _id: new mongoose.Types.ObjectId(MainID) },
      {
        $push: { "details.$[detail].stages.Stage2.$[stage].schedules": schedules }
      },
      {
        arrayFilters: [
          { "detail._id": new mongoose.Types.ObjectId(DetailsID) },
          { "stage._id": new mongoose.Types.ObjectId(Stage2) }
        ]
      }
    );
    res.status(200).json({ success: true, message: "V.Meeting info added successfully", data: addonly });
  } catch (err) {
    res.status(400).json({ error: true, message: err.message });
  }

}
const UpdateVmeetingScheduleOnly = () => { }

const DeleteVmeetingScheduleOnly = async (req, res) => {
  const { MainID, Stage2, DetailsID, ScheduleID } = req.query;

  console.log("DeleteVmeetingScheduleOnly called with params:", MainID, Stage2, DetailsID, ScheduleID);
  // console.log("AddVmeetingOnly called with params:",Vmeetinginfo);
  if (!MainID || !DetailsID || !Stage2 || !ScheduleID) {
    return res.status(400).json({
      error: true,
      message: "MainID, DetailsID, Stage2 and ScheduleID are required",
    });
  }


  try {

    const addonly = await staffSalesSchema.updateOne({ _id: new mongoose.Types.ObjectId(MainID) },
      {
        $pull: { "details.$[detail].stages.Stage2.$[stage].schedules": { _id: new mongoose.Types.ObjectId(ScheduleID) } }
      },
      {
        arrayFilters: [
          { "detail._id": new mongoose.Types.ObjectId(DetailsID) },
          { "stage._id": new mongoose.Types.ObjectId(Stage2) }
        ]
      }
    );
    res.status(200).json({ success: true, message: "Schedule deleted successfully", data: addonly });
  } catch (err) {
    res.status(400).json({ error: true, message: err.message });
  }

}
// End V.Meeting 
//=========================================================================================



//=========================================================================================
// Start P.Meeting 


const AddPmeetingOnly = async (req, res) => {
  const { MainID, Stage3, DetailsID } = req.query;
  const { PmeetingInfo } = req.body;

  // console.log("AddVmeetingOnly called with params:",Vmeetinginfo);
  if (!MainID || !DetailsID || !Stage3) {
    return res.status(400).json({
      error: true,
      message: "MainID, DetailsID and Stage3 are required",
    });
  }
  if (PmeetingInfo?.length === 0) {
    return res.status(400).json({
      error: true,
      message: "PmeetingInfo is required",
    });
  }

  try {
    const validate = await staffSalesSchema.findOne({ _id: MainID }).select('details.stages.Stage3').lean();
    const meetingInfo =
      validate?.details?.[0]?.stages?.Stage3?.[0]?.PmeetingInfo;

    if (meetingInfo?.length) {
      return res.status(400).json({
        warn: true,
        message: "Restrict for Double entry.",
      });
    }

    const addonly = await staffSalesSchema.updateOne({ _id: new mongoose.Types.ObjectId(MainID) },
      {
        $push: { "details.$[detail].stages.Stage3.$[stage].PmeetingInfo": PmeetingInfo }
      },
      {
        arrayFilters: [
          { "detail._id": new mongoose.Types.ObjectId(DetailsID) },
          { "stage._id": new mongoose.Types.ObjectId(Stage3) }
        ]
      }
    );
    res.status(200).json({ success: true, message: "P.Meeting info added successfully", data: addonly });
  } catch (err) {
    res.status(400).json({ error: true, message: err.message });
  }

}
const AddPmeetingScheduleOnly = async (req, res) => {

  const { MainID, Stage3, DetailsID } = req.query;
  const { schedules } = req.body;

  // console.log("AddVmeetingOnly called with params:",Vmeetinginfo);
  if (!MainID || !DetailsID || !Stage3) {
    return res.status(400).json({
      error: true,
      message: "MainID, DetailsID and Stage3 are required",
    });
  }
  if (schedules?.length === 0) {
    return res.status(400).json({
      error: true,
      message: "Schedules are required",
    });
  }

  try {

    const addonly = await staffSalesSchema.updateOne({ _id: new mongoose.Types.ObjectId(MainID) },
      {
        $push: { "details.$[detail].stages.Stage3.$[stage].schedules": schedules }
      },
      {
        arrayFilters: [
          { "detail._id": new mongoose.Types.ObjectId(DetailsID) },
          { "stage._id": new mongoose.Types.ObjectId(Stage3) }
        ]
      }
    );
    res.status(200).json({ success: true, message: "Schedule added successfully", data: addonly });
  } catch (err) {
    res.status(400).json({ error: true, message: err.message });
  }

}

const UpdatePmeetingScheduleOnly = () => { }
const DeletePmeetingScheduleOnly = async () => {
  const { MainID, Stage3, DetailsID, ScheduleID } = req.query;

  console.log("DeletePmeetingScheduleOnly called with params:", MainID, Stage3, DetailsID, ScheduleID);
  // console.log("AddPmeetingOnly called with params:",Pmeetinginfo);
  if (!MainID || !DetailsID || !Stage3 || !ScheduleID) {
    return res.status(400).json({
      error: true,
      message: "MainID, DetailsID, Stage3 and ScheduleID are required",
    });
  }


  try {

    const addonly = await staffSalesSchema.updateOne({ _id: new mongoose.Types.ObjectId(MainID) },
      {
        $pull: { "details.$[detail].stages.Stage3.$[stage].schedules": { _id: new mongoose.Types.ObjectId(ScheduleID) } }
      },
      {
        arrayFilters: [
          { "detail._id": new mongoose.Types.ObjectId(DetailsID) },
          { "stage._id": new mongoose.Types.ObjectId(Stage3) }
        ]
      }
    );
    res.status(200).json({ success: true, message: "Schedule deleted successfully", data: addonly });
  } catch (err) {
    res.status(400).json({ error: true, message: err.message });
  }
}
// End P.Meeting 
//=========================================================================================


//=========================================================================================
// Start Proposal
const AddProposalInfoOnly = async (req, res) => {

  const { MainID, Stage4, DetailsID } = req.query;
  const { proposalInfo } = req.body;

  // console.log("AddVmeetingOnly called with params:",Vmeetinginfo);
  if (!MainID || !DetailsID || !Stage4) {
    return res.status(400).json({
      error: true,
      message: "MainID, DetailsID and Stage4 are required",
    });
  }
  if (proposalInfo?.length === 0) {
    return res.status(400).json({
      error: true,
      message: "Proposal info is required",
    });
  }

  try {
    const validate = await staffSalesSchema.findOne({ _id: MainID }).select('details.stages.Stage4').lean();
    const meetingInfo =
      validate?.details?.[0]?.stages?.Stage4?.[0]?.proposalInfo;

    if (meetingInfo?.length) {
      return res.status(400).json({
        warn: true,
        message: "Restrict for Double entry.",
      });
    }

    const addonly = await staffSalesSchema.updateOne({ _id: new mongoose.Types.ObjectId(MainID) },
      {
        $push: { "details.$[detail].stages.Stage4.$[stage].proposalInfo": proposalInfo }
      },
      {
        arrayFilters: [
          { "detail._id": new mongoose.Types.ObjectId(DetailsID) },
          { "stage._id": new mongoose.Types.ObjectId(Stage4) }
        ]
      }
    );
    res.status(200).json({ success: true, message: "Proposal info added successfully", data: addonly });
  } catch (err) {
    res.status(400).json({ error: true, message: err.message });
  }




}
//  const UpdatePmeetingScheduleOnly=()=>{}
//  const DeletePmeetingScheduleOnly=()=>{}
// End  Proposal
//=========================================================================================

// ========================================================================================
const getOnlyStage1Data = async (req, res) => {
  try {
    const res_ = await staffSalesSchema
      .find({ _id: "69e9f378d350a606553a29fa" })
      .select("details.stages.Stage1")
      .lean();
    res.status(200).json({ success: true, data: res_ })
  } catch (err) {
    res.status(400).json({ error: true, message: err.message })
  }
}
const getOnlyStage2Data = async (req, res) => {
  try {
    const res_ = await staffSalesSchema
      .find({ _id: "69e9f378d350a606553a29fa" })
      .select("details.stages.Stage2")
      .lean();
    res.status(200).json({ success: true, data: res_ })
  } catch (err) {
    res.status(400).json({ error: true, message: err.message })
  }
}
const getOnlyStage3Data = async (req, res) => {
  try {
    const res_ = await staffSalesSchema
      .find({ _id: "69e9f378d350a606553a29fa" })
      .select("details.stages.Stage3")
      .lean();
    res.status(200).json({ success: true, data: res_ })
  } catch (err) {
    res.status(400).json({ error: true, message: err.message })
  }
}




//=========================================================================================
// new contract 

const uploadContractPdfs = async (req, res) => {
  try {
    // Extracted DetailsID here as well since it's required for the arrayFilter
    const { MainID, DetailsID } = req.params;
    const subject = req.body.subject || "";
    const message = req.body.message || req.body.note || ""; // Fallback to note if message isn't provided

    // 1. Normalize attachment to handle both single (req.file) and multiple (req.files)
    const rawAttachments = req.files || req.file;

    if (!rawAttachments) {
      return res.status(400).json({
        success: false,
        message: "No contract PDF uploaded",
      });
    }

    // Convert to array to handle uniformly
    const attachmentsArray = Array.isArray(rawAttachments) ? rawAttachments : [rawAttachments];

    if (attachmentsArray.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No contract PDF uploaded",
      });
    }

    // 2. Extract, format, and completely clean recipients
    const rawTo = req.body.emilto || req.body["emailTo[]"] || req.body.to || [];

    const recipients = (Array.isArray(rawTo) ? rawTo : [rawTo])
      .filter(Boolean)
      .map(email => {
        // Removes stray brackets and quotes, then completely removes spaces before and after
        return email.replace(/[\[\]"']/g, '').trim();
      });

    if (recipients.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one recipient email is required",
      });
    }

    // Prepare attachments array for Email and DB Schema
    const formattedAttachments = attachmentsArray.map((file) => ({
      filename: file.originalname,
      path: file.path,
      mimetype: file.mimetype,
      size: file.size
    }));

    // 3. Send Emails FIRST
    try {
      // Promise.all will reject immediately if any of the emails fail
      await Promise.all(
        recipients.map((recipient) =>
          sendMailWithAttachments({
            to: recipient,
            subject: subject,
            message: message,
            attachments: formattedAttachments.map(f => ({
              filename: f.filename,
              path: f.path
            })),
          })
        )
      );
    } catch (emailError) {
      // Return immediately if email fails
      return res.status(500).json({
        success: false,
        message: `Email error: ${emailError.message}`,
      });
    }

    // 4. Update Database (Only executes if emails succeed)

    // Map strictly to the requested ContractPdfInfoSchema
    const contractPayload = {
      attachments: formattedAttachments,
      uploadedAt: new Date(),
      to: recipients,
      subject: subject,
      message: message
    };

    const updateResult = await staffSalesSchema.updateOne(
      {
        _id: new mongoose.Types.ObjectId(MainID),
      },
      {
        $push: {
          "details.$[detail].stages.Stage3.$.ContractPdfInfoSchema": contractPayload
        },
      },
      {
        arrayFilters: [
          { "detail._id": new mongoose.Types.ObjectId(DetailsID) },
        ],
      }
    );

    // 5. Final Success Print & Return
    console.log("Final Success: Contract uploaded and emails sent successfully.");

    return res.status(200).json({
      success: true,
      message: "Contract PDFs uploaded and emails sent successfully",
      data: updateResult,
      contractInfo: contractPayload,
    });

  } catch (err) {
    console.error("Upload contract error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

//=========================================================================================
// End new  contract 




// For holiday section 
// ==========================================================================================

const HolidayOnly = async (req, res) => {
  const { holidays } = req.body;
  const { MainID, DetailsID } = req.query;

  if (!MainID || !DetailsID) {
    return res.status(400).json({ error: true, message: "MainID and DetailsID are required" });
  }
  if (!holidays?.length) {
    return res.status(400).json({ error: true, message: "Holidays array cannot be empty" });
  }

  try {
    // Step 1: Fetch the current document to inspect existing holidayItems
    const doc = await staffSalesSchema.findOne(
      {
        _id: new mongoose.Types.ObjectId(MainID),
        "details._id": new mongoose.Types.ObjectId(DetailsID)
      },
      { "details.$": 1 }
    );

    if (!doc) {
      return res.status(404).json({ error: true, message: "Document not found" });
    }

    const detail = doc.details[0];
    const existingHolidays = detail?.stages?.Stage7?.[0]?.holidayItems || [];

    const toUpdate = []; // holidays that conflict (overwrite)
    const toInsert = []; // holidays that are new (push)

    for (const holiday of holidays) {
      const conflict = existingHolidays.find(
        (h) =>
          h.fromDateBs === holiday.fromDateBs ||
          h.toDateBs === holiday.toDateBs
      );

      if (conflict) {
        toUpdate.push({ ...holiday, existingId: conflict._id });
      } else {
        toInsert.push(holiday);
      }
    }

    // Step 2: Overwrite conflicting holidays (set each field individually)
    for (const holiday of toUpdate) {
      await staffSalesSchema.updateOne(
        {
          _id: new mongoose.Types.ObjectId(MainID),
          "details._id": new mongoose.Types.ObjectId(DetailsID)
        },
        {
          $set: {
            "details.$[detail].stages.Stage7.$[].holidayItems.$[holiday].holidayTitle": holiday.holidayTitle,
            "details.$[detail].stages.Stage7.$[].holidayItems.$[holiday].fromDateBs": holiday.fromDateBs,
            "details.$[detail].stages.Stage7.$[].holidayItems.$[holiday].toDateBs": holiday.toDateBs,
            "details.$[detail].stages.Stage7.$[].holidayItems.$[holiday].sn": holiday.sn,
          }
        },
        {
          arrayFilters: [
            { "detail._id": new mongoose.Types.ObjectId(DetailsID) },
            { "holiday._id": holiday.existingId }
          ]
        }
      );
    }

    // Step 3: Push non-conflicting holidays
    if (toInsert.length > 0) {
      await staffSalesSchema.updateOne(
        { _id: new mongoose.Types.ObjectId(MainID) },
        {
          $push: {
            "details.$[detail].stages.Stage7.$[].holidayItems": {
              $each: toInsert
            }
          }
        },
        {
          arrayFilters: [
            { "detail._id": new mongoose.Types.ObjectId(DetailsID) }
          ]
        }
      );
    }

    return res.status(200).json({
      success: true,
      message: "Holidays processed successfully",
      data: {
        overwritten: toUpdate.length,
        inserted: toInsert.length
      }
    });

  } catch (err) {
    return res.status(500).json({
      error: true,
      message: "Error occurred while processing holidays",
      errorDetails: err.message
    });
  }
};

// ==========================================================================================
// End holiday section



module.exports = {
  getSalesData,
  getStages,
  addMess_Call,
  updateMessageCallScheduleCancelDetails,
  getDetailsData,
  addBasicInfo,
  addOrgLeadDetails,

  AddScheduleOnly,
  getRecruitmentData,
  getScheduleOnly,
  testEmail,
  getOnlyOrgDetails,
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


};

// 69e1e50021a886c29e61ea5d