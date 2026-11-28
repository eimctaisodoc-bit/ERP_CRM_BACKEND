const mongoose = require('mongoose');
const { deleteFiles } = require('../../middleware/deleteLocalFile.js');
const adminFormRecruitmentSchema = require('../../Usersmodel/admini/AdminRecruitment.model.js');
// const Recruitment = require('../../Usersmodel/admini/AdminRecruitment.model.js');
console.log("adminFormRecruitmentSchema model type:", adminFormRecruitmentSchema.collection.name);

const escapeRegex = (str = "") => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const createRecruitmentForm = async (req, res) => {
  try {
    if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
      return res.status(400).json({ success: false, error: "Invalid form data" });
    }

    const recruitmentData = req.body["0"] || req.body;
    const personal = recruitmentData.personal || {};
    const contact = recruitmentData.contact || {};
    const employment = recruitmentData.employment || {};
    const documents = recruitmentData.documents || {};
    const files = req.files || {};
    const rawPosition =
      typeof employment.jobPosition === "string" ? employment.jobPosition.trim() : "";
    const normalizedPosition = rawPosition.toLowerCase();

    if (["cro", "hr"].includes(normalizedPosition)) {
      const province = employment.province?.trim() || "";
      const district = employment.district?.trim() || "";
      const localLevel = employment.localLevel?.trim() || "";

      if (!province || !district || !localLevel) {
        return res.status(400).json({
          success: false,
          error: `Province, district, and localLevel are required when jobPosition is ${rawPosition.toUpperCase()}.`,
        });
      }

      const existingMatches = await adminFormRecruitmentSchema.find({
        "employment.province": new RegExp(`^${escapeRegex(province)}$`, "i"),
        "employment.district": new RegExp(`^${escapeRegex(district)}$`, "i"),
        "employment.localLevel": new RegExp(`^${escapeRegex(localLevel)}$`, "i"),
        "employment.jobPosition": new RegExp(`^${escapeRegex(normalizedPosition)}$`, "i"),
        "employment.isoStandardCode": employment.isoStandardCode || "",


      });

      if (existingMatches.length > 0) {
        return res.status(409).json({
          success: false,
          error: `A ${normalizedPosition.toUpperCase()} already exists for ${province}, ${district}, ${localLevel}.`,
        });
      }
    }

    const recruitmentPayload = {
      ...recruitmentData,
      personal: {
        ...personal,
        firstName: typeof personal.firstName === "string" ? personal.firstName.trim() : personal.firstName,
        lastName: typeof personal.lastName === "string" ? personal.lastName.trim() : personal.lastName,
        profilePhoto: files.profilePhoto ?? personal.profilePhoto ?? [],
      },
      contact,
      documents: {
        ...documents,
        fresherDocuments: files.fresherDocuments ?? documents.fresherDocuments ?? [],
        experienceDocuments: files.experienceDocuments ?? documents.experienceDocuments ?? [],
      },
      createdBySuper:
        req.user?.decoded?.role === "super_admin"
          ? req.user?.decoded?.id
          : null,

      createdBystaff:
        req.user?.decoded?.role === "staff"
          ? req.user?.decoded?.id
          : null,

      recruitmentStatus: req.user?.decoded?.role,
    };

    const newRecruitment = await adminFormRecruitmentSchema.create(recruitmentPayload);



    return res.status(201).json({
      success: true,
      message: "Recruitment created successfully",
      data: newRecruitment,
    });
  } catch (error) {
    console.error("Error saving recruitment form:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({ success: false, error: error.message });
    }

    if (error.code === 11000) {
      const duplicateField = Object.keys(error.keyPattern || error.keyValue || {})[0];
      const duplicateFieldLabels = {
        "contact.personalEmail": "personal email address",
        "contact.officeEmail": "office email address",
        "contact.officeMobile": "office mobile number",
      };
      const fieldLabel = duplicateFieldLabels[duplicateField];

      return res.status(409).json({
        success: false,
        error: fieldLabel
          ? `A recruitment record with this ${fieldLabel} already exists.`
          : "A recruitment record with one of these unique values already exists.",
      });
    }

    return res.status(500).json({ success: false, error: error.message });
  }
};


const deleteRecruitment = async (req, res) => {
  const ids = req.params.id ?? req.params.ids;
  console.log("Delete Recruitment Request IDs:", ids);

  if (!ids) {
    return res.status(400).json({
      error: true,
      message: "Recruitment IDs are required",
    });
  }

  try {
    // Parse and validate IDs
    const recruitmentIds = [...new Set(ids.split(",").map((id) => id.trim()))];

    if (
      recruitmentIds.some(
        (id) => !mongoose.Types.ObjectId.isValid(id)
      )
    ) {
      return res.status(400).json({
        error: true,
        message: "One or more recruitment IDs are invalid",
      });
    }

    // Find recruitment records
    const records = await adminFormRecruitmentSchema.find({
      _id: { $in: recruitmentIds },
    });

    if (!records.length) {
      return res.status(404).json({
        error: true,
        message: "Recruitment records not found",
      });
    }

    // Collect all local attachment paths
    const attachmentsToDelete = [];

    records.forEach((record) => {
      // Fresher documents
      if (Array.isArray(record.fresherDocuments)) {
        record.fresherDocuments.forEach((file) => {
          if (typeof file === "string") {
            attachmentsToDelete.push(file);
          } else if (file?.path) {
            attachmentsToDelete.push(file.path);
          }
        });
      }

      // Previous experience documents
      if (Array.isArray(record.previousExperience)) {
        record.previousExperience.forEach((experience) => {
          if (Array.isArray(experience.documents)) {
            experience.documents.forEach((file) => {
              if (typeof file === "string") {
                attachmentsToDelete.push(file);
              } else if (file?.path) {
                attachmentsToDelete.push(file.path);
              }
            });
          }
        });
      }
    });

    // Delete MongoDB records
    const result = await adminFormRecruitmentSchema.deleteMany({
      _id: { $in: records.map((record) => record._id) },
    });

    // Verify deletion
    const remainingRecords = await adminFormRecruitmentSchema.countDocuments({
      _id: { $in: records.map((record) => record._id) },
    });

    if (remainingRecords > 0) {
      return res.status(500).json({
        error: true,
        message: "Recruitment deletion was not fully persisted",
        deletedCount: result.deletedCount,
      });
    }

    // Delete physical local files
    if (attachmentsToDelete.length > 0) {
      await deleteFiles([...new Set(attachmentsToDelete)]);
    }

    return res.status(200).json({
      success: true,
      message: `${result.deletedCount} recruitment records deleted successfully.`,
      deletedCount: result.deletedCount,
      deletedFiles: [...new Set(attachmentsToDelete)].length,
    });
  } catch (error) {
    console.error("Delete Recruitment Error:", error);

    return res.status(500).json({
      error: true,
      message: error.message,
    });
  }
};


// GET Recruitment


const getRecruitmentForm = async (req, res) => {
  const {
    districtName,
    localLevel,
    localLevelName,
    provinceName,
  } = req.query || {};

  console.log("Get Recruitment Request Query:", req.query);

  const role = req.user?.decoded?.role;

  try {
    let response;

    if (role === "super_admin") {
      response = await adminFormRecruitmentSchema
        .find({})
        .sort({ createdAt: -1 });

    } else if (role === "admin" || role === "staff") {
      const filter = {
        "employment.district": districtName || "",
        "employment.localLevel": localLevel || localLevelName || "",
        "employment.province": provinceName || "",
        "employment.jobPosition": { $ne: "CRO" },
        "employment.isoStandardCode": "iso21001",
        isActive: false,
      };

      response = await adminFormRecruitmentSchema
        .find(filter)
        .sort({ createdAt: -1 });

    } else {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to access recruitment forms.",
      });
    }

    return res.status(200).json({
      success: true,
      count: response.length,
      data: response,
    });

  } catch (error) {
    console.error("Error fetching recruitment:", error);

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};





const editRecruitment = async (req, res) => {
  const { id } = req.params;

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      error: "Valid recruitment ID is required",
    });
  }

  try {
    // =================================================
    // FIND EXISTING RECRUITMENT
    // =================================================

    const recruitment = await adminFormRecruitmentSchema.findById(id);

    if (!recruitment) {
      return res.status(404).json({
        success: false,
        error: "Recruitment record not found",
      });
    }

    // =================================================
    // REQUEST DATA STRUCTURE
    // =================================================

    const recruitmentData = req.body["0"] || req.body;

    const personal = recruitmentData.personal || {};
    const contact = recruitmentData.contact || {};
    const employment = recruitmentData.employment || {};
    const documents = recruitmentData.documents || {};
    const getEffectiveEmploymentValue = (field) => {
      const value = Object.prototype.hasOwnProperty.call(employment, field)
        ? employment[field]
        : recruitment.employment?.[field];

      return typeof value === "string" ? value.trim() : "";
    };

    const rawPosition = getEffectiveEmploymentValue("jobPosition");
    const normalizedPosition = rawPosition.toLowerCase();

    if (["cro", "hr"].includes(normalizedPosition)) {
      const province = getEffectiveEmploymentValue("province");
      const district = getEffectiveEmploymentValue("district");
      const localLevel = getEffectiveEmploymentValue("localLevel");

      if (!province || !district || !localLevel) {
        return res.status(400).json({
          success: false,
          error: `Province, district, and localLevel are required when jobPosition is ${rawPosition.toUpperCase()}.`,
        });
      }
    }

    const retainedAttachments =
      recruitmentData.retainedAttachments || {};

    const files = req.files || {};

    // =================================================
    // COLLECT OLD ATTACHMENTS
    // =================================================

    const oldProfilePhotos = recruitment.personal.profilePhoto || [];
    // console.log("Old Profile Photos:", oldProfilePhotos);

    const oldFresherDocuments =
      recruitment.documents.fresherDocuments || [];

    const oldExperienceDocuments =
      recruitment.documents.experienceDocuments || [];

    // =================================================
    // RETAINED ATTACHMENTS
    // =================================================

    const keptProfilePhotos = Array.isArray(
      retainedAttachments.profilePhoto
    )
      ? retainedAttachments.profilePhoto
      : oldProfilePhotos;

    const keptFresherDocuments = Array.isArray(
      retainedAttachments.fresherDocuments
    )
      ? retainedAttachments.fresherDocuments
      : oldFresherDocuments;

    const keptExperienceDocuments = Array.isArray(
      retainedAttachments.experienceDocuments
    )
      ? retainedAttachments.experienceDocuments
      : oldExperienceDocuments;


    // Retain only existing files belonging to this record
    const finalProfilePhotos = oldProfilePhotos.filter((file) =>
      keptProfilePhotos.includes(file)
    );

    const finalFresherDocuments = oldFresherDocuments.filter((file) =>
      keptFresherDocuments.includes(file)
    );

    const finalExperienceDocuments = oldExperienceDocuments.filter(
      (file) => keptExperienceDocuments.includes(file)
    );

    // =================================================
    // NEW UPLOADED FILES
    // =================================================

    const newProfilePhotos = (files.profilePhoto || []).map(
      (file) => file.path
    );

    const newFresherDocuments = (
      files.fresherDocuments || []
    ).map((file) => file.path);

    const newExperienceDocuments = (
      files.experienceDocuments || []
    ).map((file) => file.path);

    // =================================================
    // IDENTIFY REMOVED FILES
    // =================================================

    const filesToDelete = [
      ...oldProfilePhotos.filter(
        (file) => !finalProfilePhotos.includes(file)
      ),

      ...oldFresherDocuments.filter(
        (file) => !finalFresherDocuments.includes(file)
      ),

      ...oldExperienceDocuments.filter(
        (file) => !finalExperienceDocuments.includes(file)
      ),
    ];

    // =================================================
    // UPDATE PERSONAL INFORMATION
    // =================================================

    Object.assign(recruitment.personal, personal);

    recruitment.personal.profilePhoto = [
      ...finalProfilePhotos,
      ...newProfilePhotos,
    ];

    // =================================================
    // UPDATE CONTACT INFORMATION
    // =================================================

    Object.assign(recruitment.contact, contact);

    // =================================================
    // UPDATE EMPLOYMENT INFORMATION
    // =================================================

    Object.assign(recruitment.employment, employment);

    // =================================================
    // UPDATE DOCUMENT INFORMATION
    // =================================================

    if (documents.experienceType !== undefined) {
      recruitment.documents.experienceType =
        documents.experienceType;
    }

    if (documents.totalExperience !== undefined) {
      recruitment.documents.totalExperience =
        documents.totalExperience;
    }

    if (documents.previousExperience !== undefined) {
      recruitment.documents.previousExperience =
        documents.previousExperience;
    }

    recruitment.documents.fresherDocuments = [
      ...finalFresherDocuments,
      ...newFresherDocuments,
    ];

    recruitment.documents.experienceDocuments = [
      ...finalExperienceDocuments,
      ...newExperienceDocuments,
    ];

    recruitment.createdBySuper = req.user?.decoded?.id;
    recruitment.CreatedByAdmin = req.user?.decoded?.id;
    recruitment.recruitmentStatus = req.user?.decoded?.role;

    // =================================================
    // SAVE MONGODB
    // =================================================

    const saved = await recruitment.save();

    // =================================================
    // VERIFY PERSISTENCE
    // =================================================

    const persisted = await adminFormRecruitmentSchema.findById(
      saved._id
    );

    if (!persisted) {
      return res.status(500).json({
        success: false,
        error: "Recruitment update was not persisted",
      });
    }

    // =================================================
    // DELETE REMOVED PHYSICAL FILES
    // =================================================

    if (filesToDelete.length > 0) {
      await deleteFiles([...new Set(filesToDelete)]);
    }

    // =================================================
    // SUCCESS RESPONSE
    // =================================================

    return res.status(200).json({
      success: true,
      message: "Recruitment updated successfully",
      data: persisted,
    });

  } catch (error) {
    console.error("Edit Recruitment Error:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};



module.exports = {
  createRecruitmentForm, getRecruitmentForm, deleteRecruitment, editRecruitment
};
