
// const noteSchema = require("../../models/noteSchema");
const { deleteFiles } = require('../../middleware/deleteLocalFile');
const noteSchema =require('../../Usersmodel/supper/super.note')
console.log(noteSchema.collection.name)
// CREATE NOTE
const createNote = async (req, res) => {
  try {
    const body = req.body || {};
    console.log('req.body:', req.body);
    console.log('req.files:', req.files);

    const attachments = Array.isArray(req.files)
      ? req.files.map(file => ({
          name: file.originalname,
          filename: file.filename,
          path: file.path,
          size: file.size,
          mimetype: file.mimetype,
        }))
      : [];

    const note = await noteSchema.create({
      ...body,
      isScheduled: body.isScheduled === 'true',
      attachments,
    });

    res.status(201).json({
      success: true,
      message: 'Note created successfully',
      data: note,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// GET NOTES FOR A USER
const getNotes = async (req, res) => {
  console.log("Fetching notes for user ID:", req.params.id);
  try {
    const notes = await noteSchema.find({ userId: req.params.id });

    res.status(200).json({
      success: true,
      data: notes,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// UPDATE NOTE


const updateNote = async (req, res) => {
  try {
    console.log("BODY:", req.body);
    console.log("FILES:", req.files);
    console.log("CONTENT TYPE:", req.headers["content-type"]);
    const { id } = req.params;
    const body = req.body || {};
    const retainedAttachments = body.retainedAttachments ?? body.existingAttachments;

    const note = await noteSchema.findById(id);

    if (!note) {
      return res.status(404).json({
        success: false,
        message: "Note not found",
      });
    }

    // Existing attachments
    const oldFiles = note.attachments || [];

    // Retained attachments
    let keptFiles = oldFiles;
    if (retainedAttachments !== undefined) {
      try {
        keptFiles = Array.isArray(retainedAttachments)
          ? retainedAttachments
          : JSON.parse(retainedAttachments);
      } catch {
        return res.status(400).json({
          success: false,
          message: "Invalid retained attachments.",
        });
      }
      if (!Array.isArray(keptFiles)) {
        return res.status(400).json({
          success: false,
          message: "Invalid retained attachments.",
        });
      }
    }

    const attachmentKey = file => file?._id || file?.id || file?.path || file?.filename || file?.url || file;
    const keptKeys = new Set(keptFiles.map(attachmentKey));

    // Newly uploaded files
    const newFiles = (req.files || []).map(file => ({
      name: file.originalname,
      filename: file.filename,
      path: file.path,
      size: file.size,
      mimetype: file.mimetype,
    }));

    // Identify removed files
    const filesToDelete = oldFiles.filter(
      file => !keptKeys.has(attachmentKey(file))
    );

    // Update attachments
    note.attachments = [...keptFiles, ...newFiles];

    // Update other fields
    Object.keys(body).forEach((key) => {
      if (!["retainedAttachments", "attachments", "_id"].includes(key)) {
        if (key !== "existingAttachments" && key !== "removedAttachments") {
          note.set(key, body[key]);
        }
      }
    });

    const saved = await note.save();

    // Delete removed physical files
    if (filesToDelete.length) {
      await deleteFiles(filesToDelete);
    }

    return res.status(200).json({
      success: true,
      message: "Note updated successfully",
      data: saved,
    });
  } catch (error) {
    console.error("Update Note Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};



// DELETE NOTE


const deleteNote = async (req, res) => {
  try {
    const { ids } = req.body || {};

    if (!Array.isArray(ids) || !ids.length) {
      return res.status(400).json({
        success: false,
        message: "Please provide note IDs",
      });
    }

    // Find all selected notes
    const notes = await noteSchema.find({
      _id: { $in: ids },
    });

    if (!notes.length) {
      return res.status(404).json({
        success: false,
        message: "No notes found",
      });
    }

    // Collect all physical attachments
    const attachments = notes.flatMap(
      (note) => note.attachments || []
    );

    // Delete physical attachment files
    if (attachments.length) {
      await deleteFiles(attachments);
    }

    // Delete selected notes from database
    const result = await noteSchema.deleteMany({
      _id: { $in: notes.map((note) => note._id) },
    });

    return res.status(200).json({
      success: true,
      message: `${result.deletedCount} notes and attachments deleted successfully`,
      deletedCount: result.deletedCount,
    });

  } catch (error) {
    console.error("Delete Multiple Notes Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createNote,
  getNotes,
  updateNote,
  deleteNote,
};
