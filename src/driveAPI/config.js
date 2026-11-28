const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const TOKEN_FILE = path.join(__dirname, "tokens.json");
// console.log("Token file path:", TOKEN_FILE);

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

      /* console.log(
        `✅ Tokens saved for User: ${userId}`
      ); */
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

      /* console.log(
        `🗑️ Google tokens deleted for User: ${userId}`
      ); */
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

// console.log('process env files:', process.env)



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
        /* console.log(
          `🔄 Google token refreshed for user ${userId}`
        ); */

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

const escapeDriveQueryValue = (value) =>
  String(value)
    .trim()
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'");

async function listAllFiles(drive, folderId) {
  if (!drive) {
    throw new Error("Google Drive client is required.");
  }

  const safeFolderId = escapeDriveQueryValue(folderId);
  if (!safeFolderId) {
    return [];
  }

  let allFiles = [];
  let pageToken = null;

  do {
    const response = await drive.files.list({
      q: `'${safeFolderId}' in parents and trashed = false`,
      pageSize: 1000,
      orderBy: "folder,name",
      fields:
        "nextPageToken, files(id, name, size, mimeType, createdTime, modifiedTime, webViewLink)",
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
      ...(pageToken ? { pageToken } : {}),
    });

    const files = response.data.files || [];
    allFiles = allFiles.concat(files);
    pageToken = response.data.nextPageToken || null;

    // console.log(
    //   `[DMS] Folder ${safeFolderId} fetched ${files.length} items. Total so far: ${allFiles.length}`
    // );
  } while (pageToken);

  return allFiles;
}

module.exports = {
  getGoogleClient,
  db,
  listAllFiles,
};