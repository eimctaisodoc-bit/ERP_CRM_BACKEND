const Branch = require("../../Usersmodel/supper/model.branch");
const User = require("../../Usersmodel/UserSchema");
// const branch = require("../../Usersmodel/branchSchema");
// console.log("this is running ", typeof branch);


const GetMeDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const role = req.user?.decoded?.role;
    let user;
    if (role === "staff") {
      user = await User.findById(id)
        .select("province provinceName districtName  localLevelName")
        // .populate({
        //   path: "recruitmentId",
        // })
        .lean();

    }
    if (role === "admin") {
      user = await Branch.findById(id)
        .select("province provinceName district  localLevelName")
        // .populate({
        //   path: "recruitment",
        // })
        .lean();
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        data: null,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: user,
      message: "GetMeDetails retrieved successfully",
    });
  } catch (error) {
    console.error("GetMeDetails Error:", error);

    return res.status(500).json({
      success: false,
      data: null,
      message: "Failed to retrieve user details",
      error: error.message,
    });
  }
};

module.exports = { GetMeDetails };

// /super_admin/credit/edit