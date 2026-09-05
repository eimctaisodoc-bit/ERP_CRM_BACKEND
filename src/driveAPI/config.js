const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const TOKEN_FILE = path.join(__dirname, "tokens.json");
console.log("Token file path:", TOKEN_FILE);

const db = {
  async saveTokens(userId, newTokens) {
    let allTokens = {};

    if (fs.existsSync(TOKEN_FILE)) {
      try {
        const fileContent = fs.readFileSync(
          TOKEN_FILE,
          "utf-8"
        );

        allTokens = fileContent.trim()
          ? JSON.parse(fileContent)
          : {};
      } catch (error) {
        console.error(
          "⚠️ tokens.json was corrupted. Resetting:",
          error.message
        );

        allTokens = {};
      }
    }

    const existing = allTokens[userId] || {};

    // IMPORTANT:
    // If Google only sends a new access_token,
    // preserve the existing refresh_token.
    allTokens[userId] = {
      ...existing,
      ...newTokens,
    };

    try {
      fs.writeFileSync(
        TOKEN_FILE,
        JSON.stringify(allTokens, null, 2),
        "utf-8"
      );

      console.log(
        `✅ Tokens saved for User: ${userId}`
      );
    } catch (error) {
      console.error(
        `❌ Failed to write tokens for ${userId}:`,
        error.message
      );

      throw error;
    }
  },

  async getTokens(userId) {
    if (!fs.existsSync(TOKEN_FILE)) {
      return null;
    }

    try {
      const fileContent = fs.readFileSync(
        TOKEN_FILE,
        "utf-8"
      );

      const allTokens = fileContent.trim()
        ? JSON.parse(fileContent)
        : {};

      return allTokens[userId] || null;
    } catch (error) {
      console.error(
        "❌ Failed to read tokens.json:",
        error.message
      );

      return null;
    }
  },

  // NEW:
  // Remove tokens when the Google refresh token
  // is invalid/revoked.
  async deleteTokens(userId) {
    if (!fs.existsSync(TOKEN_FILE)) {
      return;
    }

    try {
      const fileContent = fs.readFileSync(
        TOKEN_FILE,
        "utf-8"
      );

      const allTokens = fileContent.trim()
        ? JSON.parse(fileContent)
        : {};

      delete allTokens[userId];

      fs.writeFileSync(
        TOKEN_FILE,
        JSON.stringify(allTokens, null, 2),
        "utf-8"
      );

      console.log(
        `🗑️ Google tokens deleted for User: ${userId}`
      );
    } catch (error) {
      console.error(
        "❌ Failed to delete tokens:",
        error.message
      );

      throw error;
    }
  },
};


// ==========================================
// GOOGLE CLIENT & AUTO REFRESH
// ==========================================

function getGoogleClient(userId) {
  const oauth2Client =
    new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

  // Google automatically calls this when
  // it obtains a new access token.
  oauth2Client.on(
    "tokens",
    async (newTokens) => {
      try {
        console.log(
          `🔄 Google token refreshed for user ${userId}`
        );

        await db.saveTokens(
          userId,
          newTokens
        );
      } catch (error) {
        console.error(
          "❌ Failed to save refreshed token:",
          error.message
        );
      }
    }
  );

  return oauth2Client;
}


// ==========================================
// PAGINATION
// ==========================================

async function listAllFiles(drive) {
  let allFiles = [];
  let pageToken = null;

  do {
    const response =
      await drive.files.list({
        pageSize: 1000,

        fields:
          "nextPageToken, files(id, name, size, mimeType, createdTime, webViewLink)",

        pageToken: pageToken || undefined,
      });

    if (response.data.files) {
      allFiles = allFiles.concat(
        response.data.files
      );
    }

    pageToken =
      response.data.nextPageToken || null;

  } while (pageToken);

  return allFiles;
}


module.exports = {
  getGoogleClient,
  db,
  listAllFiles,
};