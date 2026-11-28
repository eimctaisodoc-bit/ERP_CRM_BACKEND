
const User = require("../../Usersmodel/UserSchema");
const Branch = require("../../Usersmodel/supper/model.branch");

const getCROSales = async (req, res) => {
  try {
    const {
      provinceName = "",
      districtName = "",
    } = req.query || {};

    // Support both frontend query parameter names
    const localLevelName =
      req.query?.localLevelName || req.query?.localLevel || "";

    const province = String(provinceName).trim();
    const district = String(districtName).trim();
    const localLevel = String(localLevelName).trim();

    const response = {
      croFullName: "",
      salesFullName: "",
    };

    if (!province || !district || !localLevel) {
      return res.status(200).json({
        success: true,
        data: response,
        message: "Incomplete location information",
      });
    }

    // STAFF / USER FILTER
    // User schema uses districtName
    const staffFilter = {
      provinceName: province,
      districtName: district,
      localLevelName: localLevel,
    };

    // BRANCH FILTER
    // Branch schema uses district
    const branchFilter = {
      provinceName: province,
      district: district,
      localLevelName: localLevel,
    };

    console.log("Staff Filter:", staffFilter);
    console.log("Branch Filter:", branchFilter);

    // Search both collections simultaneously
    const [staffRecords, branchRecords] = await Promise.all([
      User.find(staffFilter)
        .select("fullName jobRole")
        .lean(),

      Branch.find(branchFilter)
        .select("fullName jobRole")
        .lean(),
    ]);

    console.log("Staff Records:", staffRecords);
    console.log("Branch Records:", branchRecords);

    // Combine both collections
    const allRecords = [
      ...staffRecords,
      ...branchRecords,
    ];

    // Identify CRO and Sales
    for (const member of allRecords) {
      const jobRole = String(member.jobRole || "")
        .trim()
        .toLowerCase();

      if (jobRole === "cro" && !response.croFullName) {
        response.croFullName = member.fullName || "";
      }

      if (jobRole === "sales" && !response.salesFullName) {
        response.salesFullName = member.fullName || "";
      }

      if (response.croFullName && response.salesFullName) {
        break;
      }
    }

    return res.status(200).json({
      success: true,
      data: response,
    });

  } catch (error) {
    console.error("getCROSales error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = { getCROSales };
