
const sendAccountCredentialsMail = require('../../middleware/Sendpw');
const mongoose = require('mongoose');
const ClientsCredit = require('../../Usersmodel/client/client.Register_schema');

const createSendPasswordResetController = require('../../UserController/sendPasswordReset');
const SALT_ROUNDS = 10;
const bcrypt = require("bcryptjs");



const CreateClientCredential = async (req, res) => {
  try {
    const payload = req.body;
    console.log('PAyload',payload)
    const orgId = payload.organizationID ;

    if (!payload.password || !orgId)
      return res.status(400).json({
        success: false,
        message: !payload.password
          ? "Password is required."
          : "Organization ID is required."
      });

    if (!mongoose.Types.ObjectId.isValid(orgId))
      return res.status(400).json({
        success: false,
        message: "Invalid organization ID."
      });

    // Check duplicate organization
    const exists = await ClientsCredit.findOne({
      organizationID: orgId
    });

    if (exists)
      return res.status(409).json({
        success: false,
        duplicate: true,
        message: "Credentials already exist for this organization."
      });

    const client = await ClientsCredit.create({
      organizationID: orgId,
      role: payload.role || "client",
      username: payload.userName,
      password: await bcrypt.hash(payload.password, SALT_ROUNDS),
      province: payload.province || "",
      district: payload.district || "",
      isoStandardCode: payload.isoStandardCode || null,
      officeEmail: payload.orgEmail || payload.email || "",
      officaPhone: payload.orgTelephone || "",
      handledBranches: payload.handledBranches || []
    });

    let emailSent = true;

    try {
      await sendAccountCredentialsMail({
        to: payload.email,
        username: payload.userName,
        password: payload.password,
        role: payload.role || "client"
      });
    } catch (err) {
      emailSent = false;
      console.error("Email error:", err);
    }

    const data = client.toObject();
    delete data.password;

    return res.status(201).json({
      success: true,
      emailSent,
      message: emailSent
        ? "Client credentials created and email sent."
        : "Credentials created, but email sending failed.",
      data
    });

  } catch (error) {
    console.error(error);

    return res.status(error.code === 11000 ? 409 : 500).json({
      success: false,
      duplicate: error.code === 11000,
      message: error.code === 11000
        ? "Credentials already exist for this organization."
        : error.message || "Failed to create credentials."
    });
  }
};


const getRecruitmentForm = async (req, res) => {
  try {
    const respose = await ClientsCredit.find({});
    res.status(201).json({ success: true, data: respose });

  } catch (error) {
    res.json({ success: false, error: error.message })

  }
}


const getAllClients = async (req, res) => {
  try {
    const users = await ClientsCredit.find({})
      .select("username role province district officeEmail officaPhone isActive")
      .populate({
        path: "organizationID",
        select: "organizationDetails.organizationName  leadDetails"
      })
      .lean();

    return res.status(200).json({
      success: true,
      data: users
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

const sendPasswordResetEmail = createSendPasswordResetController(
    (req) => ClientsCredit.findById(req.params.id)
);

const RemoveClients = async (req, res) => {
    try {
        const { ids } = req.body;

        if (!Array.isArray(ids) || !ids.length)
            return res.status(400).json({ success: false, msg: "No client IDs provided" });

        if (ids.some(id => !mongoose.isValidObjectId(id)))
            return res.status(400).json({ success: false, msg: "Invalid client IDs" });

        const result = await ClientsCredit.deleteMany({
            _id: { $in: ids }
        });

        return res.status(200).json({
            success: true,
            deletedCount: result.deletedCount,
            msg: `${result.deletedCount} client(s) deleted successfully`
        });

    } catch (err) {
        return res.status(500).json({ success: false, msg: err.message });
    }
};
const disableClient = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ success: false, msg: "Invalid client ID" });
        }

        const existing = await ClientsCredit.findById(id).select("isActive");
        if (!existing) {
            return res.status(404).json({ success: false, msg: "Client not found" });
        }

        const nextIsActive =
            typeof req.body?.isActive === "boolean"
                ? req.body.isActive
                : existing.isActive === false;

        const client = await ClientsCredit.findByIdAndUpdate(
            id,
            { $set: { isActive: nextIsActive } },
            { new: true, runValidators: true }
        ).select("-password -resetPasswordToken -resetPasswordExpire");

        return res.status(200).json({
            success: true,
            msg: nextIsActive
                ? "Client enabled successfully"
                : "Client disabled successfully",
            data: client
        });
    } catch (err) {
        return res.status(500).json({ success: false, msg: err.message });
    }
};
const editClients = async (req, res) => {
    try {
        const { id } = req.params;
        const { username, password, confirmPassword } = req.body;

        if (!mongoose.isValidObjectId(id))
            return res.status(400).json({ success: false, msg: "Invalid client ID" });

        const client = await ClientsCredit.findById(id);
        if (!client)
            return res.status(404).json({ success: false, msg: "Client not found" });

        if (username !== undefined) {
            const duplicate = await ClientsCredit.findOne({
                username,
                _id: { $ne: id }
            });

            if (duplicate)
                return res.status(400).json({ success: false, msg: "Username already exists" });

            client.username = username;
        }

        if (password) {
            if (password !== confirmPassword)
                return res.status(400).json({ success: false, msg: "Passwords do not match" });

            client.password = await bcrypt.hash(password, 10);
        }

       

        await client.save();

        const result = client.toObject();
        delete result.password;
        delete result.resetPasswordToken;
        delete result.resetPasswordExpire;

        return res.status(200).json({
            success: true,
            msg: "Client updated successfully",
            data: result
        });

    } catch (err) {
        return res.status(500).json({ success: false, msg: err.message });
    }
};





module.exports = {
  CreateClientCredential, getRecruitmentForm,
  getAllClients,
  RemoveClients,
  editClients,
  disableClient,
  sendPasswordResetEmail
};
