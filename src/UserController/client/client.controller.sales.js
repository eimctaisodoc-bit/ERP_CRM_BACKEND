const bcrypt = require("bcrypt");
const ClientRegister = require("../../Usersmodel/client/client.Register_schema");
const Organization = require("../../Usersmodel/client/staff.Sales.Schema");

const RegisterClient = async (req, res) => {
  try {
    const { organizationID, password, ...clientDetails } = req.body || {};
    const organization = await Organization.findById(organizationID);

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found"
      });
    }

    const existingClient = await ClientRegister.findOne({ organizationID });
    if (existingClient) {
      return res.status(409).json({
        success: false,
        message: "A client is already registered for this organization"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const client = await ClientRegister.create({
      ...clientDetails,
      organizationID,
      role: "client",
      password: hashedPassword,
    });

    const responseData = client.toObject();
    delete responseData.password;

    return res.status(201).json({
      success: true,
      message: "Client registered successfully",
      data: responseData
    });
  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A client is already registered for this organization"
      });
    }

    console.error("Client registration failed:", error);
    return res.status(500).json({
      success: false,
      message: "Client registration failed"
    });
  }
};

module.exports = { RegisterClient };
