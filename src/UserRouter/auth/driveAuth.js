const express = require("express");
const { google } = require("googleapis");
const { getGoogleClient, db, listAllFiles } = require("../../driveAPI/config");

const router = express.Router();

// ==========================================
// 1. GOOGLE OAUTH - CONNECT GOOGLE ACCOUNT
// ==========================================

router.get("/google", verifyToken, (req, res) => {
  try {
    const userId = req.user.decoded.id;

    const client = getGoogleClient(userId);

    const url = client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: ["https://www.googleapis.com/auth/drive"],
      state: userId, // Replace with validated, securely stored OAuth state
    });

    res.redirect(url);
  } catch (error) {
    console.error("Google auth start error:", error);

    res.status(500).json({
      message: "Failed to start Google authentication",
    });
  }
});

// ==========================================
// 2. GOOGLE OAUTH CALLBACK
// ==========================================

router.get("/google/callback", async (req, res) => {
  const { code, state: userId, error } = req.query;

  try {
    if (error) {
      return res.status(400).send("Google authentication cancelled");
    }

    if (!code || !userId) {
      return res.status(400).send("Authorization code or state missing");
    }

    const client = getGoogleClient(userId);

    const { tokens } = await client.getToken(code);

    await db.saveTokens(userId, tokens);

    res.send("Google Drive connected successfully");
  } catch (error) {
    console.error("Google authentication failed:", error.message);
    console.error(error.response?.data);

    res.status(500).send("Authentication failed");
  }
});

// ==========================================
// 3. GOOGLE DRIVE AUTH MIDDLEWARE
// ==========================================

const driveAuth = async (req, res, next) => {
  try {
    const userId = req.user?.decoded?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const userTokens = await db.getTokens(userId);

    if (!userTokens?.refresh_token) {
      return res.status(401).json({
        success: false,
        message: "AUTH_REQUIRED",
      });
    }

    const client = getGoogleClient(userId);

    client.setCredentials(userTokens);

    req.googleDrive = google.drive({
      version: "v3",
      auth: client,
    });

    req.googleUserId = userId;

    next();
  } catch (error) {
    console.error("Drive authentication error:", error);

    return res.status(500).json({
      success: false,
      message: "Google Drive authentication failed",
    });
  }
};

// ==========================================
// 4. GET GOOGLE DRIVE FILES CONTROLLER
// ==========================================

const getDrive = async (req, res) => {
  try {
    const files = await listAllFiles(req.googleDrive);

    return res.json({
      success: true,
      totalFiles: files.length,
      files,
    });
  } catch (error) {
    console.error("Google Drive API Error:", error.message);

    const googleError = error.response?.data?.error;
    const googleDescription = error.response?.data?.error_description || "";

    const invalidGrant =
      googleError === "invalid_grant" ||
      error.message?.includes("invalid_grant") ||
      googleDescription.toLowerCase().includes("invalid");

    if (error.code === 401 || invalidGrant) {
      await db.deleteTokens(req.googleUserId);

      return res.status(401).json({
        success: false,
        message: "AUTH_REQUIRED",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to fetch files",
      error: error.message,
    });
  }
};

// ==========================================
// 5. EXPORT
// ==========================================

module.exports = {
  router,
  driveAuth,
  getDrive,
};
