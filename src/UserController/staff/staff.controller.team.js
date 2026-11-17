const User = require("../../Usersmodel/UserSchema");

const GetMeDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id)
      .select("-password -resetPasswordToken -resetPasswordExpire")
      .lean();

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
