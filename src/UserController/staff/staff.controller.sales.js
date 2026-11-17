const NepaliDate = require("nepali-date-converter").default;
const path = require("path");
// ---------------------------------------------------------------------------------

const { default: mongoose } = require("mongoose");

const staffSalesSchema = require("../../Usersmodel/client/staff.Sales.Schema");

const sendContactEmail = require("../../mail/allMail");
const sendMailWithAttachments = require("../../middleware/mailSendContract");
const { deleteFiles } = require("../../middleware/deleteLocalFile");
const convertDocxToPdf = require("../../docxToPDF/conversion");

const hasPersistedActivityItems = (document, itemsByField) => {
  const pendingIds = new Map(
    Object.entries(itemsByField).map(([field, ids]) => [
      field,
      new Set(ids.map((id) => id.toString())),
    ]),
  );

  for (const detail of document?.details || []) {
    for (const stage of detail.stages?.Stage1 || []) {
      for (const [field, ids] of pendingIds) {
        for (const item of stage[field] || []) {
          ids.delete(item._id?.toString());
        }
      }
    }
  }

  return [...pendingIds.values()].every((ids) => ids.size === 0);
};

const findStageActivity = (document, field, id) => {
  for (const detail of document?.details || []) {
    for (const stage of detail.stages?.Stage1 || []) {
      const items = stage[field] || [];
      const index = items.findIndex(
        (item) => item._id?.toString() === id.toString(),
      );
      if (index !== -1) return { items, index, item: items[index] };
    }
  }
  return null;
};

const parseArrayField = (value) => {
  const values = value == null ? [] : Array.isArray(value) ? value : [value];
  return values.flatMap((item) => {
    if (typeof item !== "string") return [item];
    try {
      const parsed = JSON.parse(item);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return [item];
    }
  });
};

const generateLeadID = async () => {
  const today = new NepaliDate(new Date());

  const year = String(today.getYear()).slice(-3);
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  const dateKey = `${year}/${month}/${day}`;

  // Count leads already created on this Nepali date
  const count = await staffSalesSchema.countDocuments({
    "leadDetails.leadID": {
      $regex: `^${dateKey}/`,
    },
  });

  // Continue sequence from the existing count
  const sequence = count + 1;

  return `${dateKey}/${String(sequence).padStart(8, "0")}`;
};

const getSalesData = async (req, res) => {
  // console.log("getSalesData ", staffSalesSchema.collection.name);
  try {
    const response = await staffSalesSchema.find();
    // console.log(response)
    res.status(201).json({ success: true, data: response });
  } catch (error) {
    res.status(404).json({ error: true, error: error.message });
  }
};

// new Meetings
const Meetings_ = async (req, res) => {
  const { MainID } = req.params;

  const filePaths = req.files ? req.files.map((file) => file.path) : [];

  let rawData = req.body;
  let extractedItems =
    rawData.items ||
    (rawData.meetings && rawData.meetings.items) ||
    rawData.meetings ||
    rawData;

  let meetings = [];

  if (typeof extractedItems === "string") {
    try {
      meetings = JSON.parse(extractedItems);
    } catch (e) {
      return res
        .status(400)
        .json({ error: true, message: "Invalid JSON format in payload" });
    }
  } else if (Array.isArray(extractedItems)) {
    meetings = extractedItems;
  } else if (typeof extractedItems === "object") {
    meetings = [extractedItems];
  }

  meetings = meetings.filter((m) => m && Object.keys(m).length > 0 && m.type);

  if (!MainID) {
    return res
      .status(400)
      .json({ error: true, message: "MainID is required in params" });
  }

  if (meetings.length === 0) {
    return res
      .status(400)
      .json({ error: true, message: "No meetings provided in request body." });
  }

  try {
    const updatePushOperations = {};

    // Updated Helper: Smart extraction for Date Ranges
    const safeExtractDateStr = (dateField, isEndDate = false) => {
      if (!dateField) return "";
      if (typeof dateField === "string") return dateField;
      if (Array.isArray(dateField) && dateField.length > 0) {
        if (isEndDate && dateField.length > 1) {
          return dateField[1]?.value || dateField[0]?.value || "";
        }
        return dateField[0]?.value || "";
      }
      return "";
    };

    const extractTimes = (item) => {
      if (item.C_time && item.C_time.includes("/")) {
        const parts = item.C_time.split("/");
        return { from: parts[0], to: parts[1] };
      }
      return { from: item.fromTime || "", to: item.toTime || "" };
    };

    const mapMeetingData = (item, type) => {
      const times = extractTimes(item);

      // Pass 'true' to safely extract the second date in the array for the End Date
      const baseDateStr =
        safeExtractDateStr(item.Sdate) ||
        safeExtractDateStr(item.Fdate) ||
        safeExtractDateStr(item.fromDate) ||
        safeExtractDateStr(item.date);
      const toDateStr =
        safeExtractDateStr(item.Edate, true) ||
        safeExtractDateStr(item.toDate, true) ||
        baseDateStr;

      const baseObj = {
        _id: new mongoose.Types.ObjectId(),
        meetingType: type,
        createdAt: new Date(),
        updatedAt: new Date(),
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

      if (item.content || item.agenda)
        baseObj.agenda = item.content || item.agenda;
      if (item.by) baseObj.by = item.by;

      if (type === "virtual" && item.link) {
        baseObj.link = Array.isArray(item.link) ? item.link : [item.link];
      } else if (type === "physical" && item.location) {
        baseObj.location = item.location;
      }

      return baseObj;
    };

    // FILTER AND PUSH BASED ON TYPE
    const virtualMeetings = meetings.filter((item) => item.type === "virtual");
    const virtualMeetingItems = virtualMeetings.map((item) =>
      mapMeetingData(item, "virtual"),
    );
    if (virtualMeetings.length > 0) {
      updatePushOperations[
        "details.$[].stages.Stage1.$[].virtualMeetingSchema"
      ] = {
        $each: virtualMeetingItems,
      };
    }

    const physicalMeetings = meetings.filter(
      (item) => item.type === "physical",
    );
    const physicalMeetingItems = physicalMeetings.map((item) =>
      mapMeetingData(item, "physical"),
    );
    if (physicalMeetings.length > 0) {
      updatePushOperations[
        "details.$[].stages.Stage1.$[].physicalMeetingSchema"
      ] = {
        $each: physicalMeetingItems,
      };
    }

    if (Object.keys(updatePushOperations).length === 0) {
      return res.status(400).json({
        error: true,
        message: "No valid virtual or physical meetings identified",
      });
    }

    const update = await staffSalesSchema.findOneAndUpdate(
      { _id: MainID },
      { $push: updatePushOperations },
      {
        new: true,
        strict: false,
      },
    );

    if (!update)
      return res
        .status(404)
        .json({ error: true, message: "Document not found" });

    const meetingsPersisted =
      (virtualMeetingItems.length === 0 ||
        hasPersistedActivityItems(update, {
          virtualMeetingSchema: virtualMeetingItems.map((item) => item._id),
        })) &&
      (physicalMeetingItems.length === 0 ||
        hasPersistedActivityItems(update, {
          physicalMeetingSchema: physicalMeetingItems.map((item) => item._id),
        }));
    if (!meetingsPersisted) {
      return res.status(409).json({
        error: true,
        message: "No Stage1 meeting record was updated; meeting was not saved.",
      });
    }

    return res.status(200).json({ success: true, data: update });
  } catch (err) {
    return res.status(500).json({ error: true, message: err.message });
  }
};

const EditMeeting = async (req, res) => {
  const { MainID, id } = req.params;
  const payload = req.body || {};

  const filePaths = Array.isArray(req.files)
    ? req.files.map((file) => file.path)
    : [];

  if (!MainID || !id) {
    return res.status(400).json({
      error: true,
      message: "MainID and id are required",
    });
  }

  try {
    const doc = await staffSalesSchema.findById(MainID);

    if (!doc) {
      return res.status(404).json({
        error: true,
        message: "Document not found",
      });
    }

    // Search both schemas using the actual meeting ID.
    const targetSchemas = ["physicalMeetingSchema", "virtualMeetingSchema"];

    let targetSchema = null;
    let match = null;

    for (const schema of targetSchemas) {
      const found = findStageActivity(doc, schema, id);

      if (found) {
        targetSchema = schema;
        match = found;
        break;
      }
    }

    if (!match) {
      return res.status(404).json({
        error: true,
        message: "Meeting record not found",
      });
    }

    const meeting = match.item;

    const feedback =
      payload.feedback !== undefined ? String(payload.feedback) : undefined;
    if (feedback !== undefined && feedback.length > 500) {
      return res.status(400).json({
        error: true,
        message: "Feedback cannot exceed 500 characters",
      });
    }

    const oldAttachments = [...(meeting.attachments || [])];

    // ------------------------------------------
    // 1. UPDATE ATTACHMENTS
    // ------------------------------------------

    if (payload.retainedAttachments !== undefined || filePaths.length > 0) {
      const retainedAttachments =
        payload.retainedAttachments !== undefined
          ? parseArrayField(payload.retainedAttachments)
          : oldAttachments;

      meeting.attachments = [...retainedAttachments, ...filePaths];
    }

    // ------------------------------------------
    // 2. UPDATE FEEDBACK
    // ------------------------------------------

    if (feedback !== undefined) meeting.set("feedback", feedback);

    // ------------------------------------------
    // 3. UPDATE COMMON MEETING INFORMATION
    // ------------------------------------------

    if (payload.title !== undefined) {
      meeting.title = payload.title;
    }

    if (payload.content !== undefined) {
      meeting.agenda = payload.content;
    }

    if (payload.fromDate !== undefined) {
      meeting.Sdate = payload.fromDate;
    }

    if (payload.toDate !== undefined) {
      meeting.Edate = payload.toDate;
    }

    // ------------------------------------------
    // 4. UPDATE VIRTUAL MEETING LINK
    // ------------------------------------------

    if (
      targetSchema === "virtualMeetingSchema" &&
      (payload["link[]"] !== undefined || payload.link !== undefined)
    ) {
      meeting.link = parseArrayField(payload["link[]"] ?? payload.link);
    }

    // ------------------------------------------
    // 5. UPDATE PHYSICAL MEETING LOCATION
    // ------------------------------------------

    if (
      targetSchema === "physicalMeetingSchema" &&
      payload.location !== undefined
    ) {
      meeting.location = payload.location;
    }

    // ------------------------------------------
    // 6. UPDATE MEETING TIME
    // ------------------------------------------

    const times =
      typeof payload.C_time === "string" ? payload.C_time.split("/") : [];

    if (payload.fromTime !== undefined || times[0] !== undefined) {
      meeting.fromTime = payload.fromTime ?? times[0] ?? "";
    }

    if (payload.toTime !== undefined || times[1] !== undefined) {
      meeting.toTime = payload.toTime ?? times[1] ?? "";
    }

    meeting.updatedAt = new Date();

    // ------------------------------------------
    // 7. SAVE DOCUMENT
    // ------------------------------------------

    const saved = await doc.save();

    if (
      !hasPersistedActivityItems(saved, {
        [targetSchema]: [meeting._id],
      })
    ) {
      return res.status(500).json({
        error: true,
        message: "Meeting update was not persisted",
      });
    }

    // ------------------------------------------
    // 8. DELETE REMOVED ATTACHMENTS
    // ------------------------------------------

    const removedAttachments = oldAttachments.filter(
      (attachment) => !meeting.attachments.includes(attachment),
    );

    if (removedAttachments.length > 0) {
      await deleteFiles(removedAttachments);
    }

    return res.status(200).json({
      success: true,
      message:
        payload.feedback !== undefined
          ? "Meeting feedback updated successfully"
          : "Meeting updated successfully",
      data: {
        meetingId: meeting._id,
        meetingType: targetSchema,
        feedback: meeting.feedback || "",
        attachments: meeting.attachments || [],
      },
    });
  } catch (err) {
    console.error("Meeting Edit Error:", err);

    return res.status(500).json({
      error: true,
      message: err.message,
    });
  }
};

const DeleteMeeting = async (req, res) => {
  const { MainID, id } = req.params;

  if (!MainID || !id) {
    return res
      .status(400)
      .json({ error: true, message: "MainID and id are required" });
  }

  try {
    const doc = await staffSalesSchema.findById(MainID);

    if (!doc) {
      return res
        .status(404)
        .json({ error: true, message: "Document not found" });
    }

    const match =
      findStageActivity(doc, "virtualMeetingSchema", id) ||
      findStageActivity(doc, "physicalMeetingSchema", id);
    if (!match) {
      return res
        .status(404)
        .json({ error: true, message: "Meeting record not found in database" });
    }

    const attachmentsToDelete = [...(match.item.attachments || [])];
    match.items.splice(match.index, 1);
    const saved = await doc.save();
    if (
      findStageActivity(saved, "virtualMeetingSchema", id) ||
      findStageActivity(saved, "physicalMeetingSchema", id)
    ) {
      return res.status(500).json({
        error: true,
        message: "Meeting deletion was not persisted",
      });
    }

    if (attachmentsToDelete.length > 0) {
      await deleteFiles(attachmentsToDelete);
    }

    return res
      .status(200)
      .json({ success: true, message: "Meeting deleted successfully" });
  } catch (err) {
    console.error("Meeting Delete Error:", err);
    return res.status(500).json({ error: true, message: err.message });
  }
};

const Notes = async (req, res) => {
  const { MainID } = req.params;

  const { content } = req.body;
  console.log(MainID, content);
  const filePaths = req.files ? req.files.map((file) => file.path) : [];
  if (!MainID) return res.status(400).json({ error: "MainID is required" });
  if (!content) return res.status(400).json({ error: "Content is required" });

  try {
    const currentTime = new Date();
    const noteId = new mongoose.Types.ObjectId();

    const result = await staffSalesSchema.findOneAndUpdate(
      { _id: MainID },
      {
        $push: {
          "details.$[].stages.Stage1.$[].noteSchema": {
            _id: noteId,
            note: content,
            attachments: filePaths,
            createdAt: currentTime,
            updatedAt: currentTime,
          },
        },
      },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!result) {
      return res.status(404).json({ error: "Record not found" });
    }

    if (
      !hasPersistedActivityItems(result, {
        noteSchema: [noteId],
      })
    ) {
      return res.status(409).json({
        error: true,
        message: "No Stage1 note record was updated; note was not saved.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Note added successfully",
      attachments: filePaths,
    });
  } catch (err) {
    console.error("Error adding note:", err);
    return res.status(500).json({ error: err.message });
  }
};

const EditNote = async (req, res) => {
  const { MainID, id } = req.params;
  const { content, retainedAttachments } = req.body;

  if (!MainID || !id) {
    return res.status(400).json({
      error: true,
      message: "MainID and Note ID are required",
    });
  }

  try {
    const doc = await staffSalesSchema.findById(MainID);
    if (!doc) {
      return res.status(404).json({
        error: true,
        message: "Document not found",
      });
    }

    const match = findStageActivity(doc, "noteSchema", id);
    if (!match) {
      return res.status(404).json({
        error: true,
        message: "Note not found",
      });
    }

    const note = match.item;
    const oldFiles = note.attachments || [];
    const keptFiles = parseArrayField(retainedAttachments);
    const newFiles = (req.files || []).map((file) => file.path);

    // Identify removed files
    const filesToDelete = oldFiles.filter((file) => !keptFiles.includes(file));

    // Update note
    note.attachments = [...keptFiles, ...newFiles];
    if (content !== undefined) note.note = content;
    note.updatedAt = new Date();

    const saved = await doc.save();

    if (
      !hasPersistedActivityItems(saved, {
        noteSchema: [note._id],
      })
    ) {
      return res.status(500).json({
        error: true,
        message: "Note update was not persisted",
      });
    }

    // Delete removed physical files
    if (filesToDelete.length) {
      await deleteFiles(filesToDelete);
    }

    return res.status(200).json({
      success: true,
      message: "Note updated successfully",
      attachments: note.attachments,
    });
  } catch (err) {
    console.error("Edit Note Error:", err);
    return res.status(500).json({
      error: true,
      message: err.message,
    });
  }
};

const DeleteNote = async (req, res) => {
  const { MainID, id } = req.params;

  if (!MainID || !id) {
    return res
      .status(400)
      .json({ error: true, message: "MainID and Note ID are required" });
  }

  try {
    const doc = await staffSalesSchema.findById(MainID);

    if (!doc) {
      return res
        .status(404)
        .json({ error: true, message: "Document not found" });
    }

    const match = findStageActivity(doc, "noteSchema", id);
    if (!match) {
      return res.status(404).json({ error: true, message: "Note not found" });
    }

    const attachmentsToDelete = [...(match.item.attachments || [])];
    match.items.splice(match.index, 1);
    const saved = await doc.save();
    if (findStageActivity(saved, "noteSchema", id)) {
      return res
        .status(500)
        .json({ error: true, message: "Note deletion was not persisted" });
    }

    if (attachmentsToDelete.length > 0) {
      await deleteFiles(attachmentsToDelete);
    }
    return res
      .status(200)
      .json({ success: true, message: "Note deleted successfully" });
  } catch (err) {
    return res.status(500).json({ error: true, message: err.message });
  }
};

const getNotes = async (req, res) => {
  const { MainID } = req.params;

  if (!MainID) return res.status(400).json({ error: "MainID is required" });

  try {
    const result = await staffSalesSchema
      .findById(MainID)
      .select("details.stages.Stage1");

    // Returns just the nested structural data containing your notes
    return res.status(200).json({
      success: true,
      data: result.details,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

const msg = async (req, res) => {
  const { MainID } = req.params;

  const filePaths = req.files ? req.files.map((file) => file.path) : [];

  let items = req.body.items || req.body;
  if (typeof items === "string") {
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
    const emails = items.filter((i) => i?.type === "email");
    const messages = items.filter(
      (i) => i?.type === "direct" || i?.type === "message",
    );

    const updatePush = {};
    let normalizedEmails = [];
    let normalizedMessages = [];

    if (emails.length) {
      normalizedEmails = emails.map((e) => ({
        _id: new mongoose.Types.ObjectId(),
        type: "email",
        to: e.to || [],
        subject: e.subject || "",
        message: e.note || e.content || "",
        attachments:
          filePaths.length > 0
            ? filePaths
            : Array.isArray(e.attachments)
              ? e.attachments
              : [],
        createdAt: new Date(),
      }));
      updatePush["details.$[].stages.Stage1.$[].emailSchema"] = {
        $each: normalizedEmails,
      };
    }

    if (messages.length) {
      normalizedMessages = messages.map((m) => ({
        _id: new mongoose.Types.ObjectId(),
        type: "message",
        note: m.note || m.content || "",
        attachments:
          filePaths.length > 0
            ? filePaths
            : Array.isArray(m.attachments)
              ? m.attachments
              : [],
        Sdate: m.Sdate || m.fromDate || "",
        Edate: m.Edate || m.toDate || "",
        time: m.time,
        createdAt: new Date(),
      }));
      updatePush["details.$[].stages.Stage1.$[].message"] = {
        $each: normalizedMessages,
      };
    }

    if (Object.keys(updatePush).length === 0) {
      if (filePaths.length > 0) await deleteFiles(filePaths);
      return res.status(400).json({
        error:
          "Payload format mismatch. Ensure objects include type: 'email' or type: 'message'.",
      });
    }

    const result = await staffSalesSchema.findOneAndUpdate(
      { _id: MainID },
      { $push: updatePush },
      {
        new: true,
        strict: false,
      },
    );

    if (!result) {
      if (filePaths.length > 0) await deleteFiles(filePaths);
      return res
        .status(404)
        .json({ error: "Document matching MainID not found" });
    }

    const messagesPersisted =
      (normalizedEmails.length === 0 ||
        hasPersistedActivityItems(result, {
          emailSchema: normalizedEmails.map((item) => item._id),
        })) &&
      (normalizedMessages.length === 0 ||
        hasPersistedActivityItems(result, {
          message: normalizedMessages.map((item) => item._id),
        }));
    if (!messagesPersisted) {
      return res.status(409).json({
        error: true,
        message: "No Stage1 message record was updated; message was not saved.",
      });
    }

    return res.status(200).json({
      success: true,
      data: result,
      attachments: filePaths,
    });
  } catch (err) {
    if (filePaths.length > 0) await deleteFiles(filePaths);
    console.error("Message Processing Error:", err);
    return res.status(500).json({ error: err.message });
  }
};

const EditMessage = async (req, res) => {
  const { MainID, id } = req.params;
  const payload = req.body?.payload || req.body || {};
  const type = req.query.type || payload.type;

  if (!MainID || !id) {
    return res
      .status(400)
      .json({ error: true, message: "MainID and message ID are required" });
  }
  if (!["email", "message", "direct"].includes(type)) {
    return res.status(400).json({
      error: true,
      message: "Type ('email', 'message', or 'direct') is required",
    });
  }

  try {
    const isEmail = type === "email";
    const targetSchema = isEmail ? "emailSchema" : "message";
    const doc = await staffSalesSchema.findById(MainID);
    if (!doc) {
      return res
        .status(404)
        .json({ error: true, message: "Document not found" });
    }

    const match = findStageActivity(doc, targetSchema, id);
    if (!match) {
      return res
        .status(404)
        .json({ error: true, message: "Message record not found" });
    }

    const message = match.item;
    const oldAttachments = [...(message.attachments || [])];
    const retainedAttachments = parseArrayField(payload.retainedAttachments);
    const newFiles = req.files ? req.files.map((file) => file.path) : [];
    message.attachments = [...retainedAttachments, ...newFiles];

    if (payload.content !== undefined) {
      if (isEmail) message.message = payload.content;
      else message.note = payload.content;
    }
    if (isEmail) {
      const recipients = payload["to[]"] ?? payload.to;
      if (recipients !== undefined) message.to = parseArrayField(recipients);
      if (payload.subject !== undefined) message.subject = payload.subject;
      message.type = "email";
    } else {
      if (payload.fromDate !== undefined || payload.Sdate !== undefined) {
        message.Sdate = payload.fromDate ?? payload.Sdate;
      }
      if (payload.toDate !== undefined || payload.Edate !== undefined) {
        message.Edate = payload.toDate ?? payload.Edate;
      }
      if (payload.time !== undefined) message.time = payload.time;
      message.type = "message";
    }

    message.updatedAt = new Date();
    const saved = await doc.save();
    if (
      !hasPersistedActivityItems(saved, {
        [targetSchema]: [message._id],
      })
    ) {
      return res
        .status(500)
        .json({ error: true, message: "Message update was not persisted" });
    }

    const removedAttachments = oldAttachments.filter(
      (attachment) => !message.attachments.includes(attachment),
    );
    if (removedAttachments.length > 0) await deleteFiles(removedAttachments);

    return res.status(200).json({
      success: true,
      message: `${isEmail ? "Email" : "Message"} updated successfully`,
    });
  } catch (err) {
    console.error("Edit Error:", err);
    return res.status(500).json({ error: true, message: err.message });
  }
};

const DeleteMessage = async (req, res) => {
  const { MainID, id } = req.params;

  const type = req.query.type || req.body?.type || req.params.type;

  /* console.log('Running DeleteMessage with:', MainID, id, type); */

  if (!MainID || !id)
    return res
      .status(400)
      .json({ error: true, message: "MainID and message ID are required" });
  if (!["email", "message", "direct"].includes(type))
    return res
      .status(400)
      .json({ error: true, message: "Invalid type provided" });
  if (!mongoose.Types.ObjectId.isValid(id))
    return res
      .status(400)
      .json({ error: true, message: "Invalid message ID format" });

  try {
    const doc = await staffSalesSchema.findById(MainID);
    if (!doc) {
      return res
        .status(404)
        .json({ error: true, message: "Document not found" });
    }

    const targetSchema = type === "email" ? "emailSchema" : "message";
    const match = findStageActivity(doc, targetSchema, id);
    if (!match) {
      return res
        .status(404)
        .json({ error: true, message: `${type} record not found in database` });
    }

    const attachmentsToDelete = [...(match.item.attachments || [])];
    match.items.splice(match.index, 1);
    const saved = await doc.save();
    if (findStageActivity(saved, targetSchema, id)) {
      return res
        .status(500)
        .json({ error: true, message: `${type} deletion was not persisted` });
    }

    if (attachmentsToDelete.length > 0) {
      await deleteFiles(attachmentsToDelete);
    }

    return res.status(200).json({
      success: true,
      message: `${type} deleted successfully`,
      data: saved,
    });
  } catch (err) {
    console.error("Delete Error:", err);
    return res.status(500).json({ error: true, message: err.message });
  }
};

const Calls = async (req, res) => {
  const { MainID } = req.params;

  const filePaths = req.files ? req.files.map((file) => file.path) : [];

  let calls = req.body.items || req.body;
  if (typeof calls === "string") {
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

  if (
    !Array.isArray(calls) ||
    calls.length === 0 ||
    Object.keys(calls[0]).length === 0
  ) {
    return res.status(400).json({ error: "Array cannot be empty" });
  }

  try {
    const formattedCalls = calls.map((call) => {
      let safeFromDate = "";
      if (Array.isArray(call.fromDate)) {
        safeFromDate = call.fromDate[0]?.value || "";
      } else if (typeof call.fromDate === "string") {
        safeFromDate = call.fromDate;
      }

      let safeToDate = "";
      if (Array.isArray(call.toDate)) {
        safeToDate =
          call.toDate[1]?.value || call.toDate[0]?.value || safeFromDate;
      } else if (typeof call.toDate === "string") {
        safeToDate = call.toDate;
      }

      return {
        _id: new mongoose.Types.ObjectId(),
        connected: call.contact || call.connected || "",
        outcome: call.outcome || call.outCome || "",
        note: call.content || call.note || "",
        attachments: filePaths.length > 0 ? filePaths : [],
        fromDate: safeFromDate,
        toDate: safeToDate,
        fromTime: call.fromTime || "",
        toTime: call.toTime || "",
        time: call.time || `${call.fromTime}/${call.toTime}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    });

    /* console.log("formattedCalls ===================", formattedCalls); */
    const result = await staffSalesSchema.findOneAndUpdate(
      { _id: MainID },
      {
        $push: {
          "details.$[].stages.Stage1.$[].callsSchema": {
            $each: formattedCalls,
          },
        },
      },
      {
        new: true,
        strict: false,
      },
    );

    if (!result) {
      return res.status(404).json({ error: "Record not found" });
    }

    if (
      !hasPersistedActivityItems(result, {
        callsSchema: formattedCalls.map((call) => call._id),
      })
    ) {
      return res.status(409).json({
        error: true,
        message: "No Stage1 call record was updated; call was not saved.",
      });
    }

    return res
      .status(200)
      .json({ success: true, data: result, attachments: filePaths });
  } catch (err) {
    console.error("Call Controller Error:", err);
    return res.status(500).json({ error: err.message });
  }
};

const EditCall = async (req, res) => {
  const { MainID, id } = req.params;
  const callPayload = req.body || {};
  const newFiles = req.files ? req.files.map((file) => file.path) : [];

  if (!MainID || !id) {
    return res.status(400).json({ error: "MainID and Call ID are required" });
  }

  try {
    const doc = await staffSalesSchema.findById(MainID);
    if (!doc) return res.status(404).json({ error: "Main record not found" });

    const match = findStageActivity(doc, "callsSchema", id);
    if (!match) return res.status(404).json({ error: "Call record not found" });

    const call = match.item;
    const oldAttachments = [...(call.attachments || [])];
    const retainedAttachments = parseArrayField(
      callPayload.retainedAttachments,
    );
    call.attachments = [...retainedAttachments, ...newFiles];

    if (callPayload.contact !== undefined) call.connected = callPayload.contact;
    if (callPayload.outcome !== undefined) call.outcome = callPayload.outcome;
    if (callPayload.content !== undefined) call.note = callPayload.content;
    if (callPayload.fromDate !== undefined || callPayload.Sdate !== undefined) {
      call.fromDate = callPayload.fromDate ?? callPayload.Sdate;
    }
    if (callPayload.toDate !== undefined || callPayload.Edate !== undefined) {
      call.toDate = callPayload.toDate ?? callPayload.Edate;
    }
    if (callPayload.fromTime !== undefined)
      call.fromTime = callPayload.fromTime;
    if (callPayload.toTime !== undefined) call.toTime = callPayload.toTime;
    call.updatedAt = new Date();

    const saved = await doc.save();
    if (
      !hasPersistedActivityItems(saved, {
        callsSchema: [call._id],
      })
    ) {
      return res
        .status(500)
        .json({ error: true, message: "Call update was not persisted" });
    }

    const removedAttachments = oldAttachments.filter(
      (attachment) => !call.attachments.includes(attachment),
    );
    if (removedAttachments.length > 0) await deleteFiles(removedAttachments);

    return res.status(200).json({ success: true, data: saved });
  } catch (err) {
    console.error("Edit Call Controller Error:", err);
    return res.status(500).json({ error: err.message });
  }
};

const DeleteCall = async (req, res) => {
  const { MainID, id } = req.params;

  if (!MainID || !id) {
    return res
      .status(400)
      .json({ error: true, message: "MainID and Call ID required" });
  }

  try {
    const doc = await staffSalesSchema.findById(MainID);

    if (!doc) {
      return res
        .status(404)
        .json({ error: true, message: "Document not found" });
    }

    const match = findStageActivity(doc, "callsSchema", id);
    if (!match) {
      return res
        .status(404)
        .json({ error: true, message: "Call record not found in database" });
    }

    const attachmentsToDelete = [...(match.item.attachments || [])];
    match.items.splice(match.index, 1);
    const saved = await doc.save();
    if (findStageActivity(saved, "callsSchema", id)) {
      return res
        .status(500)
        .json({ error: true, message: "Call deletion was not persisted" });
    }

    if (attachmentsToDelete.length > 0) {
      await deleteFiles(attachmentsToDelete);
    }

    return res
      .status(200)
      .json({ success: true, message: "Call deleted successfully" });
  } catch (err) {
    console.error("DeleteCall Error:", err);
    return res.status(500).json({ error: true, message: err.message });
  }
};

// const MainModel = require('../models/MainModel'); // Replace with your actual Model

// convertDocxToPdf

const Proposal = async (req, res) => {
  const { MainID } = req.params;

  if (!MainID || !mongoose.Types.ObjectId.isValid(MainID)) {
    return res.status(400).json({
      error: true,
      message: "Invalid MainID",
    });
  }

  const { status, proposalId } = req.body;
  console.log("Proposal Request Body:", req.body);

  try {
    // ==========================================
    // 1. UPDATE EXISTING PROPOSAL STATUS
    // ==========================================

    if (proposalId) {
      if (!mongoose.Types.ObjectId.isValid(proposalId)) {
        return res.status(400).json({
          error: true,
          message: "A valid proposalId is required.",
        });
      }

      const existingProposal = await staffSalesSchema.exists({
        _id: MainID,
        "details.stages.Stage2.proposalInfo._id": proposalId,
      });

      if (!existingProposal) {
        return res.status(404).json({
          error: true,
          message: "Proposal not found.",
        });
      }

      const updateFields = {
        "details.$[det].stages.Stage2.$[stage].proposalInfo.$[proposal].updatedAt":
          new Date(),
      };

      if (status !== undefined) {
        updateFields[
          "details.$[det].stages.Stage2.$[stage].proposalInfo.$[proposal].status"
        ] = status;
      }

      await staffSalesSchema.findOneAndUpdate(
        { _id: MainID },
        {
          $set: updateFields,
        },
        {
          arrayFilters: [
            { "det._id": { $exists: true } },
            { "stage._id": { $exists: true } },
            {
              "proposal._id": new mongoose.Types.ObjectId(proposalId),
            },
          ],
          new: true,
        },
      );

      return res.status(200).json({
        success: true,
        proposalId,
        status,
        message: `Proposal marked ${status}.`,
      });
    }

    // ==========================================
    // 2. GET UPLOADED DOCX FILES
    // ==========================================

    const uploadedFiles = req.files || (req.file ? [req.file] : []);

    if (!uploadedFiles.length) {
      return res.status(400).json({
        error: true,
        message: "Please upload a DOCX proposal.",
      });
    }

    // ==========================================
    // 3. CONVERT DOCX INTO PDF
    // ==========================================

    const formattedAttachments = [];
    const pdfEmailAttachments = [];

    for (const file of uploadedFiles) {
      const ext = path.extname(file.originalname).toLowerCase();

      if (ext !== ".docx") {
        return res.status(400).json({
          error: true,
          message: "Only DOCX proposal files are allowed.",
        });
      }

      // Convert DOCX to PDF
      const { pdfPath, pdfName } = await convertDocxToPdf(file.path);

      // Save both DOCX and PDF paths for MongoDB
      formattedAttachments.push(file.path, pdfPath);

      // Prepare PDF attachment for Gmail
      pdfEmailAttachments.push({
        filename: pdfName,
        path: pdfPath,
        contentType: "application/pdf",
      });
    }

    // ==========================================
    // 4. EXTRACT PROPOSAL DATA
    // ==========================================

    let data = req.body.proposalData ?? req.body;

    if (typeof data === "string") {
      data = JSON.parse(data);
    }

    if (Array.isArray(data)) {
      data = data[0] ?? {};
    }

    if (!data || typeof data !== "object") {
      data = {};
    }

    // ==========================================
    // 5. EXTRACT EMAIL INFORMATION
    // ==========================================

    const subject = req.body.subject || data.subject || "";

    const message =
      req.body.message ||
      req.body.emailBody ||
      req.body.note ||
      data.message ||
      "";

    let rawTo =
      req.body.emilto ||
      req.body.emailTo ||
      req.body["emailTo[]"] ||
      req.body.to ||
      req.body.sendto ||
      data.sendto ||
      [];
    console.log("Raw To:", rawTo);

    // Handle JSON-stringified recipient arrays
    if (typeof rawTo === "string") {
      try {
        const parsed = JSON.parse(rawTo);
        rawTo = Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        rawTo = rawTo.split(",");
      }
    }

    // Remove duplicate recipients
    const recipients = [
      ...new Set(
        (Array.isArray(rawTo) ? rawTo : [rawTo])
          .filter(Boolean)
          .map((email) => String(email).trim())
          .filter(Boolean),
      ),
    ];
    console.log("Recipients:", recipients);

    // ==========================================
    // 6. SEND PDF THROUGH GMAIL
    // ==========================================

    let emailSent = false;
    let emailResults = [];
    let emailErrors = [];

    if (recipients.length > 0) {
      if (!subject || !message) {
        emailErrors.push({
          message: "Email subject and message are required.",
        });
      } else {
        const results = await Promise.allSettled(
          recipients.map((recipient) =>
            sendMailWithAttachments({
              to: recipient,
              subject,
              message,
              attachments: pdfEmailAttachments.map((file) => ({
                filename: file.filename,
                path: file.path,
                contentType: file.contentType,
              })),
            }),
          ),
        );

        // Track each recipient
        emailResults = results.map((result, index) => {
          if (result.status === "fulfilled") {
            return {
              recipient: recipients[index],
              success: true,
              message: "Email sent successfully.",
            };
          }

          const errorMessage =
            result.reason?.message || "Email sending failed.";

          emailErrors.push({
            recipient: recipients[index],
            message: errorMessage,
          });

          console.error(
            `Email sending failed for ${recipients[index]}:`,
            result.reason,
          );

          return {
            recipient: recipients[index],
            success: false,
            message: errorMessage,
          };
        });

        // True only when every recipient receives the email
        emailSent =
          results.length > 0 &&
          results.every((result) => result.status === "fulfilled");
      }
    }

    // ==========================================
    // 7. PREPARE PROPOSAL DATA FOR MONGODB
    // ==========================================

    const successfulRecipients = emailResults
      .filter((item) => item.success)
      .map((item) => item.recipient);

    const newProposal = {
      ...data,

      _id: new mongoose.Types.ObjectId(),

      status: successfulRecipients.length > 0 ? "sent" : "ready",

      attachments: formattedAttachments,

      ...(successfulRecipients.length > 0 && {
        emailInfo: {
          to: successfulRecipients,
          subject,
          message,
          sentAt: new Date(),
        },
      }),

      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // ==========================================
    // 8. SAVE PROPOSAL INTO MONGODB
    // ==========================================

    const updatedDocument = await staffSalesSchema.findOneAndUpdate(
      { _id: MainID },
      {
        $push: {
          "details.$[det].stages.Stage2.$[stage].proposalInfo": newProposal,
        },
      },
      {
        new: true,
        arrayFilters: [
          { "det._id": { $exists: true } },
          { "stage._id": { $exists: true } },
        ],
      },
    );

    if (!updatedDocument) {
      return res.status(404).json({
        error: true,
        message: "Proposal lead not found.",
      });
    }

    // ==========================================
    // 9. FINAL RESPONSE
    // ==========================================

    console.log("Proposal saved successfully:", newProposal._id);
    console.log("Email sent:", emailSent);
    console.log("Email errors:", emailErrors);

    return res.status(201).json({
      success: true,

      proposalId: newProposal._id,

      status: newProposal.status,

      emailSent,

      emailResults,

      emailErrors,

      attachments: formattedAttachments,

      message:
        recipients.length === 0
          ? "Proposal saved successfully. No email recipients provided."
          : emailSent
            ? "Proposal emailed to all recipients and saved successfully."
            : successfulRecipients.length > 0
              ? "Proposal saved successfully. Some emails failed to send."
              : "Proposal saved successfully, but email sending failed.",
    });
  } catch (error) {
    console.error("Error in Proposal Controller:", error);

    return res.status(500).json({
      success: false,
      error: true,
      message:
        error.message ||
        "An internal server error occurred while processing the proposal.",
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
    const document = await staffSalesSchema
      .findById(MainID)
      .select("details.stages.Stage2.proposalInfo")
      .lean(); // .lean() strips heavy Mongoose wrappers for faster processing

    if (!document) {
      return res
        .status(404)
        .json({ error: true, message: "Document not found." });
    }

    // 2. Extract and flatten the deeply nested proposalInfo arrays
    let allProposals = [];

    if (document.details && Array.isArray(document.details)) {
      document.details.forEach((det) => {
        if (
          det.stages &&
          det.stages.Stage2 &&
          Array.isArray(det.stages.Stage2)
        ) {
          det.stages.Stage2.forEach((stg) => {
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
      data: allProposals,
    });
  } catch (error) {
    console.error("Error in GetProposals:", error);
    return res.status(500).json({
      error: true,
      message: "Server error while fetching proposals.",
      details: error.message,
    });
  }
};

const DeleteProposal = async (req, res) => {
  const { MainID, id } = req.params;
  // console.log(mainID,id)
  /* console.log(MainID, id) */
  if (!MainID || !id) {
    return res
      .status(400)
      .json({ error: true, message: "MainID and proposalId are required." });
  }

  try {
    const updatedDocument = await staffSalesSchema.findOneAndUpdate(
      { _id: MainID },
      {
        // $pull removes items from an array that match a condition
        $pull: {
          "details.$[].stages.Stage2.$[].proposalInfo": { _id: id },
        },
      },
      { new: true },
    );

    if (!updatedDocument) {
      return res
        .status(404)
        .json({ error: true, message: "Document not found." });
    }

    return res.status(200).json({
      success: true,
      message: "Proposal deleted successfully.",
    });
  } catch (error) {
    console.error("Error in DeleteProposal:", error);
    return res.status(500).json({
      error: true,
      message: "Server error while deleting proposal.",
      details: error.message,
    });
  }
};

const UpdateProposal = async (req, res) => {
  const { MainID, proposalId } = req.params;
  const payload = req.body;

  if (!MainID || !proposalId) {
    return res
      .status(400)
      .json({ error: true, message: "MainID and proposalId are required." });
  }

  try {
    // 1. Dynamically construct the $set object based on provided payload
    const updateFields = {};
    for (const key in payload) {
      // Prevent accidental overwrites of locked fields like _id
      if (key !== "_id" && key !== "timestamp") {
        updateFields[
          `details.$[det].stages.Stage2.$[stg].proposalInfo.$[prop].${key}`
        ] = payload[key];
      }
    }

    // If no valid fields to update were sent
    if (Object.keys(updateFields).length === 0) {
      return res
        .status(400)
        .json({ error: true, message: "No valid fields provided for update." });
    }

    // 2. Perform the update using arrayFilters
    const updatedDocument = await staffSalesSchema.findOneAndUpdate(
      { _id: MainID },
      { $set: updateFields },
      {
        new: true,
        arrayFilters: [
          { "det.stages": { $exists: true } }, // Matches details that have stages
          { "stg.proposalInfo": { $exists: true } }, // Matches Stage2s that have proposalInfo
          { "prop._id": proposalId }, // Matches the specific proposal ID
        ],
      },
    );

    if (!updatedDocument) {
      return res
        .status(404)
        .json({ error: true, message: "Document or Proposal not found." });
    }

    return res.status(200).json({
      success: true,
      message: "Proposal updated successfully.",
    });
  } catch (error) {
    console.error("Error in UpdateProposal:", error);
    return res.status(500).json({
      error: true,
      message: "Server error while updating proposal.",
      details: error.message,
    });
  }
};

//  End new new new new new new new new new new new

const getDetailsData = async (req, res) => {
  // const id="289323ou98u3289u82"
  const { _id } = req.query;
  /* console.log('something is requesting', req.query) */
  try {
    const fd = await staffSalesSchema.findById({ _id: _id }).select("details");
    if (fd) {
      res.status(200).json(fd);
    } else {
      res.status(400).json({ error: true, message: "Data not available" });
    }
  } catch (err) {
    res.status(404).json(err);
  }
};

const addOrgLeadDetails = async (req, res) => {
  try {
    const { lead = {}, organization = {}, ownership = {} } = req.body;
    console.log("Received organization and lead details:", {
      organization,
      lead,
      ownership,
    });

    /* console.log('Received organization and lead details:', { organization, lead }); */
    const {
      organizationName,
      organizationType,
      industyType,
      registrationNumber,
      vatPan,
      provinceNumber: orgProvinceNumber,
      province: orgProvince,
      district: orgDistrict,
      localLevel: orgLocalLevel,
      totalEmp_learners,
      employeeRange,
      totalEducator,
      contactPersonName,
      GradeFrom,
      GradeTo,
      role,
      standard,
      contactPersonNumber,
      contactPersonEmail,
      orgEmail,
      orgTelephone,
      alternativeContacts = [],
    } = organization;

    const normalizeText = (value) =>
      String(value || "")
        .trim()
        .replace(/\s+/g, " ")
        .toLowerCase();
    const normalizeEmail = (value) =>
      String(value || "")
        .trim()
        .toLowerCase();
    const normalizePhone = (value) => String(value || "").replace(/\D/g, "");

    const existingOrganizations = await staffSalesSchema
      .find({}, { organizationDetails: 1 })
      .lean();
    const incomingOrgName = normalizeText(organizationName);
    const incomingEmails = new Set(
      [
        orgEmail,
        contactPersonEmail,
        ...(Array.isArray(alternativeContacts)
          ? alternativeContacts.map((contact) => contact.email)
          : []),
      ]
        .map(normalizeEmail)
        .filter(Boolean),
    );
    const incomingPhones = new Set(
      [
        orgTelephone,
        contactPersonNumber,
        ...(Array.isArray(alternativeContacts)
          ? alternativeContacts.map(
              (contact) => contact.number || contact.contactPersonNumber,
            )
          : []),
      ]
        .map(normalizePhone)
        .filter(Boolean),
    );

    let duplicateName = false;
    let duplicateEmail = false;
    let duplicatePhone = false;

    for (const record of existingOrganizations) {
      for (const existing of record.organizationDetails || []) {
        if (
          incomingOrgName &&
          normalizeText(existing.organizationName) === incomingOrgName
        ) {
          duplicateName = true;
        }

        const existingEmails = [
          existing.orgEmail,
          existing.contactPersonEmail,
          ...(existing.alternativeContacts || []).map(
            (contact) => contact.email,
          ),
        ];
        if (
          existingEmails.some((email) =>
            incomingEmails.has(normalizeEmail(email)),
          )
        ) {
          duplicateEmail = true;
        }

        const existingPhones = [
          existing.orgTelephone,
          existing.contactPersonNumber,
          ...(existing.alternativeContacts || []).map(
            (contact) => contact.number || contact.contactPersonNumber,
          ),
        ];
        if (
          existingPhones.some((phone) =>
            incomingPhones.has(normalizePhone(phone)),
          )
        ) {
          duplicatePhone = true;
        }
      }
    }

    if (duplicateName || duplicateEmail || duplicatePhone) {
      const duplicateFields = [
        duplicateName && "organization name",
        duplicateEmail && "email",
        duplicatePhone && "phone number",
      ].filter(Boolean);

      return res.status(409).json({
        error: true,
        message: `Duplicate ${duplicateFields.join(", ")} already exists`,
      });
    }

    const leadID = await generateLeadID();

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
          alternativeContacts,
        },
      ],

      leadDetails: [
        {
          ...lead,
          leadID,
          provinceNumber: lead.provinceNumber || orgProvinceNumber,
          district: lead.district || orgDistrict,
          localLevel: lead.localLevel || orgLocalLevel,
          province: lead.province || orgProvince,
        },
      ],

      ownershipDetails: [
        {
          ...ownership,
          assignedSalesRep: ownership.assignedSalesRep || lead.assignedSalesRep,
          salesManager: ownership.salesManager || lead.salesManager,
          LeadPickDate: ownership.LeadPickDate || lead.LeadPickDate || "",
          LeadPickTime: ownership.LeadPickTime || lead.LeadPickTime || "",
          NextFollowup: ownership.NextFollowup || lead.NextFollowup || "",
          NextFollowTime: ownership.NextFollowTime || lead.NextFollowTime || "",
        },
      ],

      details: [
        {
          _id: new mongoose.Types.ObjectId(),
          stages: {
            Stage1: [
              {
                isFilled: false,
                currentStage: 1,
                nextStage: 2,
                active: true,
                stageName: "Lead Generation",
                _id: new mongoose.Types.ObjectId(),
              },
            ],
            Stage2: [
              {
                isFilled: false,
                currentStage: 2,
                nextStage: 3,
                active: true,
                stageName: "VMeeting",
                _id: new mongoose.Types.ObjectId(),
              },
            ],
            Stage3: [
              {
                isFilled: false,
                currentStage: 3,
                nextStage: 4,
                active: true,
                stageName: "Contract",
                _id: new mongoose.Types.ObjectId(),
              },
            ],
            Stage4: [
              {
                isFilled: false,
                currentStage: 4,
                nextStage: 5,
                active: true,
                stageName: "scheduling",
                _id: new mongoose.Types.ObjectId(),
                holidayItems: [],
                jobAssignItems: [],
              },
            ],
          },
        },
      ],
    });

    res.status(201).json({
      success: true,
      message: "Organization Details added successfully",
      data: addOrg,
    });
  } catch (error) {
    console.error("Error saving lead details:", error);
    res.status(500).json({
      error: true,
      message: error.message || "Internal Server Error",
    });
  }
};

const getOnlyOrgDetails = async (req, res) => {
  const { _id } = req.query;
  /* console.log('get only org details', req.query); */
  try {
    const orgDetails = await staffSalesSchema
      .findById(_id, { organizationDetails: 1 })
      .lean();
    if (!orgDetails) {
      return res
        .status(404)
        .json({ error: true, message: "Organization details not found" });
    }
    res.status(200).json({ success: true, data: orgDetails });
  } catch (err) {
    res.status(400).json({ error: true, message: err.message });
  }
};

const updateOnlyOrgDetails = async (req, res) => {
  const { _id, organizationId } = req.params;
  /* console.log("Update Only Org Details called with params:", req.params); */

  // Safely handle if the frontend sends the wrapped 'organization' object or a flat body
  const orgData = req.body.organizationDetails;
  /* console.log(orgData) */

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
    totalEducator: !isNaN(orgData.totalEducator)
      ? Number(orgData.totalEducator)
      : null,
    totalEmp_learners: !isNaN(orgData.totalEmp_learners)
      ? Number(orgData.totalEmp_learners)
      : null,
    employeeRange: orgData.employeeRange || "",
    discounted: !isNaN(orgData.discounted) ? Number(orgData.discounted) : 0,
    alternativeContacts: Array.isArray(orgData.alternativeContacts)
      ? orgData.alternativeContacts
      : [],
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
        "organizationDetails._id": new mongoose.Types.ObjectId(organizationId),
      },
      {
        $set: updateSet,
      },
      {
        new: true,
        strict: false,
      },
    );

    if (!updatedDoc) {
      return res.status(404).json({
        success: false,
        message: "Pipeline document or organization entry not found.",
      });
    }

    res.status(200).json({ success: true, data: updatedDoc });
    /* console.log(updatedDoc) */
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
    res.status(200).json({
      success: true,
      message: "Email sent successfully",
      data: mailRes,
    });
  } catch (err) {
    /* console.log("Email sending failed:", err); */
    res.status(400).json({ success: false, message: "Failed to send email" });
  }
}; //temp

// For holiday section
// ==========================================================================================

const HolidayOnly = async (req, res) => {
  const { holidays } = req.body;
  const { MainID, DetailsID } = req.query;

  if (!MainID || !DetailsID) {
    return res
      .status(400)
      .json({ error: true, message: "MainID and DetailsID are required" });
  }
  if (!holidays?.length) {
    return res
      .status(400)
      .json({ error: true, message: "Holidays array cannot be empty" });
  }

  try {
    // Step 1: Fetch the current document to inspect existing holidayItems
    const doc = await staffSalesSchema.findOne(
      {
        _id: new mongoose.Types.ObjectId(MainID),
        "details._id": new mongoose.Types.ObjectId(DetailsID),
      },
      { "details.$": 1 },
    );

    if (!doc) {
      return res
        .status(404)
        .json({ error: true, message: "Document not found" });
    }

    const detail = doc.details[0];
    const existingHolidays = detail?.stages?.Stage7?.[0]?.holidayItems || [];

    const toUpdate = []; // holidays that conflict (overwrite)
    const toInsert = []; // holidays that are new (push)

    for (const holiday of holidays) {
      const conflict = existingHolidays.find(
        (h) =>
          h.fromDateBs === holiday.fromDateBs ||
          h.toDateBs === holiday.toDateBs,
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
          "details._id": new mongoose.Types.ObjectId(DetailsID),
        },
        {
          $set: {
            "details.$[detail].stages.Stage7.$[].holidayItems.$[holiday].holidayTitle":
              holiday.holidayTitle,
            "details.$[detail].stages.Stage7.$[].holidayItems.$[holiday].fromDateBs":
              holiday.fromDateBs,
            "details.$[detail].stages.Stage7.$[].holidayItems.$[holiday].toDateBs":
              holiday.toDateBs,
            "details.$[detail].stages.Stage7.$[].holidayItems.$[holiday].sn":
              holiday.sn,
          },
        },
        {
          arrayFilters: [
            { "detail._id": new mongoose.Types.ObjectId(DetailsID) },
            { "holiday._id": holiday.existingId },
          ],
        },
      );
    }

    // Step 3: Push non-conflicting holidays
    if (toInsert.length > 0) {
      await staffSalesSchema.updateOne(
        { _id: new mongoose.Types.ObjectId(MainID) },
        {
          $push: {
            "details.$[detail].stages.Stage7.$[].holidayItems": {
              $each: toInsert,
            },
          },
        },
        {
          arrayFilters: [
            { "detail._id": new mongoose.Types.ObjectId(DetailsID) },
          ],
        },
      );
    }

    return res.status(200).json({
      success: true,
      message: "Holidays processed successfully",
      data: {
        overwritten: toUpdate.length,
        inserted: toInsert.length,
      },
    });
  } catch (err) {
    return res.status(500).json({
      error: true,
      message: "Error occurred while processing holidays",
      errorDetails: err.message,
    });
  }
};

const updateSalesLead = async (req, res) => {
  // // console.log("Dhoka", req.params.id);
  // // console.log(req.body);
  const sections = [
    ["organization", "organizationDetails"],
    ["lead", "leadDetails"],
    ["details", "details"],
    ["ownership", "ownershipDetails"],
  ];

  try {
    const {
      isConverted,
      isContracted: contractIsContracted,
      isTerminated: contractIsTerminated,
      terminationReason_contract: terminationReasonContract,
    } = req.body || {};
    const isContractStatusRequest =
      isConverted !== undefined ||
      terminationReasonContract !== undefined ||
      ((contractIsContracted !== undefined ||
        contractIsTerminated !== undefined) &&
        req.body?.isNew === undefined &&
        req.body?.terminationReason === undefined);

    if (isContractStatusRequest) {
      const contractReason =
        typeof terminationReasonContract === "string"
          ? terminationReasonContract.trim()
          : terminationReasonContract;
      const isClearingTermination =
        contractIsTerminated === false && contractReason === "";
      const isRescheduled =
        contractIsContracted === false &&
        (isConverted === undefined || isConverted === false) &&
        (contractIsTerminated === undefined ||
          contractIsTerminated === false) &&
        (contractReason === null ||
          contractReason === undefined ||
          isClearingTermination);
      const isConvertedStatus =
        isConverted === true &&
        (contractIsContracted === undefined || contractIsContracted === true) &&
        (contractIsTerminated === undefined ||
          contractIsTerminated === false) &&
        (contractReason === null ||
          contractReason === undefined ||
          isClearingTermination);
      const isTerminatedStatus =
        contractIsTerminated === true &&
        (isConverted === undefined || isConverted === false) &&
        (contractIsContracted === undefined ||
          typeof contractIsContracted === "boolean") &&
        typeof contractReason === "string" &&
        contractReason.length > 0;

      if (!isRescheduled && !isConvertedStatus && !isTerminatedStatus) {
        return res.status(400).json({
          success: false,
          message:
            "A valid contract status and termination reason are required.",
        });
      }

      const contractStatusUpdates = {
        "leadDetails.$[].updatedAt": new Date(),
      };
      if (isRescheduled) {
        contractStatusUpdates["leadDetails.$[].isContracted"] = false;
        if (isClearingTermination) {
          contractStatusUpdates["leadDetails.$[].isTerminated"] = false;
          contractStatusUpdates["leadDetails.$[].isConverted"] = false;
          contractStatusUpdates["leadDetails.$[].terminationReason_contract"] =
            "";
        }
      } else if (isConvertedStatus) {
        contractStatusUpdates["leadDetails.$[].isConverted"] = true;
        if (isClearingTermination) {
          contractStatusUpdates["leadDetails.$[].isTerminated"] = false;
          contractStatusUpdates["leadDetails.$[].terminationReason_contract"] =
            "";
        }
      } else {
        contractStatusUpdates["leadDetails.$[].isTerminated"] = true;
        contractStatusUpdates["leadDetails.$[].terminationReason_contract"] =
          contractReason;
      }

      const updatedRecord = await staffSalesSchema.findOneAndUpdate(
        { _id: req.params.id },
        { $set: contractStatusUpdates },
        {
          new: true,
          runValidators: true,
        },
      );

      if (!updatedRecord) {
        return res.status(404).json({
          success: false,
          message: "Organization or lead not found.",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Contract status updated successfully.",
        data: updatedRecord,
      });
    }

    const { isNew, isContracted, isTerminated, terminationReason } =
      req.body || {};
    if (
      isNew !== undefined ||
      isContracted !== undefined ||
      isTerminated !== undefined ||
      terminationReason !== undefined
    ) {
      const selectedStatusCount = [isNew, isContracted, isTerminated].filter(
        (status) => status === true,
      ).length;
      if (
        typeof isNew !== "boolean" ||
        typeof isContracted !== "boolean" ||
        typeof isTerminated !== "boolean" ||
        selectedStatusCount !== 1 ||
        (terminationReason !== undefined &&
          typeof terminationReason !== "string")
      ) {
        return res.status(400).json({
          success: false,
          message: "Exactly one valid lead status is required.",
        });
      }

      const normalizedTerminationReason =
        typeof terminationReason === "string" ? terminationReason.trim() : "";
      if (isTerminated && !normalizedTerminationReason) {
        return res.status(400).json({
          success: false,
          message: "A termination reason is required.",
        });
      }

      const updatedRecord = await staffSalesSchema.findOneAndUpdate(
        {
          _id: req.params.id,
        },
        {
          $set: {
            "leadDetails.$[].isNew": isNew,
            "leadDetails.$[].isContracted": isContracted,
            "leadDetails.$[].isTerminated": isTerminated,
            "leadDetails.$[].terminationReason": isTerminated
              ? normalizedTerminationReason
              : "",
            "leadDetails.$[].updatedAt": new Date(),
          },
        },
        {
          new: true,
          runValidators: true,
        },
      );

      if (!updatedRecord) {
        return res.status(404).json({
          success: false,
          message: "Organization or lead not found.",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Lead status updated successfully.",
        data: updatedRecord,
      });
    }

    const updates = {};
    let hasUpdates = false;

    for (const [requestKey, documentKey] of sections) {
      const section = req.body?.[requestKey];
      if (section === undefined) continue;
      if (!section || typeof section !== "object" || Array.isArray(section)) {
        return res.status(400).json({
          success: false,
          message: `The ${requestKey} field must be an object`,
        });
      }

      for (const [key, value] of Object.entries(section)) {
        if (["_id", "__v", "createdAt", "updatedAt"].includes(key)) continue;
        if (key.startsWith("$") || key.includes(".")) {
          return res.status(400).json({
            success: false,
            message: `Invalid field in ${requestKey}`,
          });
        }
        updates[`${documentKey}.0.${key}`] = value;
        hasUpdates = true;
      }
      if (Object.keys(section).length) {
        updates[`${documentKey}.0.updatedAt`] = new Date();
      }
    }

    if (!hasUpdates) {
      return res.status(400).json({
        success: false,
        message: "No lead information was provided",
      });
    }

    const updatedRecord = await staffSalesSchema.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true, strict: false },
    );

    if (!updatedRecord) {
      return res.status(404).json({
        success: false,
        message: "Lead record not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Lead updated successfully",
      data: updatedRecord,
    });
  } catch (error) {
    return res.status(error.name === "CastError" ? 400 : 500).json({
      success: false,
      message: error.message || "Unable to update lead",
    });
  }
};

const deleteSalesLead = async (req, res) => {
  try {
    const deletedRecord = await staffSalesSchema.findByIdAndDelete(
      req.params.id,
    );
    if (!deletedRecord) {
      return res.status(404).json({
        success: false,
        message: "Lead record not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Lead deleted successfully",
      data: { _id: deletedRecord._id },
    });
  } catch (error) {
    return res.status(error.name === "CastError" ? 400 : 500).json({
      success: false,
      message: error.message || "Unable to delete lead",
    });
  }
};

// ==========================================================================================
// End holiday section

module.exports = {
  getSalesData,

  getDetailsData,
  addOrgLeadDetails,

  testEmail,
  getOnlyOrgDetails,
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
  UpdateProposal,
};

// 69e1e50021a886c29e61ea5d
