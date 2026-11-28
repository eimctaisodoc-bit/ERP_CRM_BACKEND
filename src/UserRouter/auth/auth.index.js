const express = require("express");
const { google } = require("googleapis");

const { generateToken } = require("../../middleware/tokengerate");
const verifyToken = require("../../middleware/authmiddleware");

const UserSchema = require("../../Usersmodel/UserSchema");
const router = express.Router();

const bcrypt = require("bcrypt");

const { getGoogleClient, db, listAllFiles } = require("../../driveAPI/config");

const Branch = require("../../Usersmodel/supper/model.branch");
const { randomUUID } = require("crypto");
const {
  startUserSession,
  endUserSession,
} = require("../../services/userStatus.service");

const clientsRegisters = require("../../Usersmodel/client/client.Register_schema");
// const { RegisterClient } = require("../../UserController/client/client.controller.sales");
/* console.log(clientsRegisters.collection.name) */

// router.post("/client/register", RegisterClient);

router.post("/login", async (req, res) => {
  const { username, password, role } = req.body;
  /* console.log("Login attempt:", req.body); */

  if (
    typeof username !== "string" ||
    !username.trim() ||
    typeof password !== "string" ||
    !password ||
    typeof role !== "string"
  ) {
    return res.status(400).json({
      success: false,
      message: "Username, password, and role are required",
    });
  }

  const normalizedRole = role.trim().toLowerCase();
  const normalizedUsername = username.trim();
  const supportedRoles = ["admin", "super_admin", "staff", "client"];
  if (!supportedRoles.includes(normalizedRole)) {
    return res.status(400).json({
      success: false,
      message: "Invalid role",
    });
  }

  try {
    let user;
    let isBranchUser = false;

    if (normalizedRole === "admin") {
      user = await Branch.findOne({
        username: normalizedUsername,
        role: normalizedRole,
      });
      isBranchUser = Boolean(user);
    } else if (normalizedRole === "client") {
      user = await clientsRegisters.findOne({ username: normalizedUsername });
    } else {
      user = await UserSchema.findOne({
        username: normalizedUsername,
        role: normalizedRole,
      });
    }

    console.log("User lookup result:", {
      username: normalizedUsername,
      role: normalizedRole,
      found: !!user,
      isBranchUser,
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or role",
      });
    }

    if (typeof user.password !== "string" || !user.password) {
      return res.status(401).json({
        success: false,
        message: "Invalid password",
      });
    }

    // Check Status
    const isActive = isBranchUser
      ? user.isActive === true
      : user.isActive !== false;

    console.log("User status check:", {
      isBranchUser,
      userIsActive: user.isActive,
      active: isActive,
    });

    if (!isActive) {
      return res.status(403).json({
        success: false,
        message: "You have been disabled by the administrator.",
        code: `${normalizedRole.toUpperCase()}_DISABLED`,
      });
    }

    // Compare Password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid password",
      });
    }

    const sessionRef = randomUUID();
    const fullName =
      normalizedRole === "super_admin"
        ? "headOffice"
        : user.fullName || user.fullname || user.username;

    // Generate JWT
    const token = generateToken({
      id: user._id,
      fullName,
      username: user.username,
      role: normalizedRole,
      sessionRef,
      jobRole: user.jobRole,
    });

    await startUserSession({
      sessionRef,
      userId: user._id,
      role: normalizedRole,
      email: user.officeEmail || user.personalEmail || "",
      jobRole: user.jobRole,
    });

    // Cookie
    res.cookie("token__", token, {
      httpOnly: true,
      // secure: process.env.NODE_ENV === "production",
      // sameSite: "strict",
      maxAge: 8 * 60 * 60 * 1000, // 8 hours
    });

    // Response
    return res.status(200).json({
      success: true,
      message: "Login successful",
      user: {
        id: user._id,
        fullName,
        username: user.username,
        role: normalizedRole,
        officeEmail: user.officeEmail,
        jobRole: user.jobRole,
        token,
      },
    });
  } catch (err) {
    console.error("Login Error:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// 🔐 ME
router.get("/me", verifyToken, (req, res) => {
  return res.status(200).json({
    user: req.user,
  });
});

// 🚪 LOGOUT
router.post("/logout", verifyToken, async (req, res) => {
  try {
    await endUserSession(req.user.decoded.sessionRef, "logout");
    res.clearCookie("token__");
    return res.json({ logout: true, message: "Logged out" });
  } catch (error) {
    console.error("Logout history error:", error);
    return res.status(500).json({ message: "Could not record logout" });
  }
});

router.get("/google", verifyToken, (req, res) => {
  try {
    const userId = req.user.decoded.id;
    /* console.log("GOOGLE ROUTE HIT"); */

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
  /* console.log("req.query:", req.query); */

  try {
    if (error) {
      console.error("Google OAuth error:", error);
      return res.status(400).send("Google authentication cancelled");
    }

    if (!code) return res.status(400).send("Google authorization code missing");
    if (!userId) return res.status(400).send("User ID missing");

    const client = getGoogleClient(userId);
    const { tokens } = await client.getToken(code);

    /* console.log("Google tokens received", {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      expiryDate: tokens.expiry_date,
    }); */
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
  /* console.log("list-files route hit for user:", userId); */

  try {
    const userTokens = await db.getTokens(userId);

    /* console.log("User tokens retrieved:", {
      hasAccessToken: !!userTokens?.access_token,
      hasRefreshToken: !!userTokens?.refresh_token,
      expiryDate: userTokens?.expiry_date,
    }); */

    if (!userTokens || !userTokens.refresh_token) {
      /* console.log("No Google refresh token"); */
      return res.status(401).json({ message: "AUTH_REQUIRED" });
    }

    const client = getGoogleClient(userId);
    client.setCredentials(userTokens);
    const drive = google.drive({ version: "v3", auth: client });
    const files = await listAllFiles(drive, "14boBPONFtnNvk82r4flPOUTOZiMcqnMB");

    /* console.log(`${files.length} files loaded`); */
    return res.json({ success: true, totalFiles: files.length, files });
  } catch (error) {
    console.error("Google Drive API Error:", error.message);
    console.error("Google response:", error.response?.data);

    const googleError = error.response?.data?.error;
    const googleDescription = error.response?.data?.error_description;
    const invalidGrant =
      googleError === "invalid_grant" ||
      error.message?.includes("invalid_grant") ||
      googleDescription?.toLowerCase().includes("invalid");

    if (error.code === 401 || invalidGrant) {
      /* console.log(`Google authorization required again for ${userId}`); */
      await db.deleteTokens(userId);
      return res.status(401).json({ message: "AUTH_REQUIRED" });
    }

    return res
      .status(500)
      .json({ message: "Failed to fetch files", error: error.message });
  }
});

module.exports = router;
