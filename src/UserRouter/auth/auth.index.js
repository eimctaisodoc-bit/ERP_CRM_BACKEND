const express = require("express");
const { google } = require("googleapis");
const { generateToken } = require("../../middleware/tokengerate");
const verifyToken = require("../../middleware/authmiddleware");
const UserSchema = require("../../Usersmodel/UserSchema");
const router = express.Router();
const bcrypt = require("bcrypt");
const { getGoogleClient, db, listAllFiles } = require("../../driveAPI/config");
const Branch = require("../../Usersmodel/supper/model.branch");



router.post("/login", async (req, res) => {
  try {
    const { username, password, role } = req.body;


    // Find User
    const user = await UserSchema.findOne({
      username: username.trim(),
      role
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or role"
      });
    }

    // Check Status
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Account is inactive"
      });
    }

    // Compare Password
    const isPasswordValid = await bcrypt.compare(
      password,
      user.password
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid password"
      });
    }

    // Generate JWT
    const token = generateToken({
      id: user._id,
      username: user.username,
      role: user.role
    });

    // Cookie
    res.cookie("token__", token, {
      httpOnly: true,
      // secure: process.env.NODE_ENV === "production",
      // sameSite: "strict",
      maxAge: 8 * 60 * 60 * 1000 // 8 hours
    });

    // Response
    return res.status(200).json({
      success: true,
      message: "Login successful",
      user: {
        id: user._id,
        fullName: user.fullName,
        username: user.username,
        role: user.role,
        officeEmail: user.officeEmail,
        token
      }
    });

  } catch (err) {
    console.error("Login Error:", err);

    return res.status(500).json({
      success: false,
      message: err.message
    });
  }


});



// 🔐 ME
router.get("/me", verifyToken, (req, res) => {
  return res.status(200).json({
    user: req.user
  });
});

// 🚪 LOGOUT
router.post("/logout", (req, res) => {
  console.log('logout route hit')
  res.clearCookie("token__");
  // console.log('logout is operate.')
  return res.json({ logout: true, message: "Logged out" });
});



router.get("/google", verifyToken, (req, res) => {
  try {
    const userId = req.user.decoded.id;
    console.log("GOOGLE ROUTE HIT");

    const client = getGoogleClient(userId);
    const url = client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: ["https://www.googleapis.com/auth/drive"],
      state: userId,
    });

    res.redirect(url);
  } catch (error) {
    console.error("Google auth start error:", error);
    res.status(500).json({ message: "Failed to start Google authentication" });
  }
});


router.get("/google/callback", async (req, res) => {
  const { code, state: userId, error } = req.query;
  console.log("req.query:", req.query);

  try {
    if (error) {
      console.error("Google OAuth error:", error);
      return res.status(400).send("Google authentication cancelled");
    }

    if (!code) return res.status(400).send("Google authorization code missing");
    if (!userId) return res.status(400).send("User ID missing");

    const client = getGoogleClient(userId);
    const { tokens } = await client.getToken(code);

    console.log("Google tokens received", {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      expiryDate: tokens.expiry_date,
    });
    await db.saveTokens(userId, tokens);
    res.send("Auth successful! You can now visit /list-files");
  } catch (error) {
    console.error("Authentication failed:", error.message);
    console.error("Google error:", error.response?.data);
    console.error(error.stack);
    res.status(500).send("Authentication failed");
  }
});





router.get("/list-files", verifyToken, async (req, res) => {
  const userId = req.user.decoded.id;
  console.log("list-files route hit for user:", userId);

  try {
    const userTokens = await db.getTokens(userId);
    if (!userTokens || !userTokens.refresh_token) {
      console.log("No Google refresh token");
      return res.status(401).json({ message: "AUTH_REQUIRED" });
    }

    const client = getGoogleClient(userId);
    client.setCredentials(userTokens);
    const drive = google.drive({ version: "v3", auth: client });
    const files = await listAllFiles(drive);

    console.log(`${files.length} files loaded`);
    return res.json({ success: true, totalFiles: files.length, files });
  } catch (error) {
    console.error("Google Drive API Error:", error.message);
    console.error("Google response:", error.response?.data);

    const googleError = error.response?.data?.error;
    const googleDescription = error.response?.data?.error_description;
    const invalidGrant = googleError === "invalid_grant" ||
      error.message?.includes("invalid_grant") ||
      googleDescription?.toLowerCase().includes("invalid");

    if (error.code === 401 || invalidGrant) {
      console.log(`Google authorization required again for ${userId}`);
      await db.deleteTokens(userId);
      return res.status(401).json({ message: "AUTH_REQUIRED" });
    }

    return res.status(500).json({ message: "Failed to fetch files", error: error.message });
  }
});

module.exports = router;