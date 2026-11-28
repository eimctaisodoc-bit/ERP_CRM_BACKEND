const { Server } = require("socket.io");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const { endUserSession } = require("../services/userStatus.service");
const Branch = require("../Usersmodel/supper/model.branch");
const UserSchema = require("../Usersmodel/UserSchema");

const clientsRegisters = require("../Usersmodel/client/client.Register_schema");

let io;

const getAccountModel = (role) => {
  if (role === "admin") return Branch;
  if (role === "staff" || role === "super_admin") return UserSchema;
  if (role === "client") return clientsRegisters;
  return null;
};

const findDisabledAccount = async (decoded) => {
  const AccountModel = getAccountModel(decoded.role);
  if (!AccountModel) return false;

  const account = await AccountModel.findOne({
    _id: decoded.id,
    username: decoded.username,
  }).select("isActive");

  return account?.isActive === false;
};

const staticNotifications = [
  {
    id: "static-1",
    format: "message",
    category: "System",
    title: "Welcome to EIMCTA ERP",
    description: "Your real-time notifications are connected.",
    priority: "Low",
    status: "unread",
  },
  {
    id: "static-2",
    format: "info",
    category: "System",
    title: "Notification test message",
    description: "This is static data sent by the Socket.IO server.",
    priority: "Medium",
    status: "info",
  },
];

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: [
        process.env.FRONTEND_URL_PROD,
        "http://localhost:5173",
      ].filter(Boolean),
      credentials: true,
    },
  });
// manojthakur6165#
// GNZ7chY4rW#i
  const users = new Map();

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token || typeof token !== "string") {
        return next(new Error("Unauthorized: Invalid token format"));
      }

      const decoded = jwt.verify(token, process.env.Secrete_KEY);

      if (["admin", "staff", "super_admin", "client"].includes(decoded.role)) {
        try {
          if (await findDisabledAccount(decoded)) {
            return next(new Error("Account disabled"));
          }
        } catch (error) {
          console.error("Account socket status check error:", error);
          return next(new Error("Unable to validate account status"));
        }
      }

      socket.user = decoded;
      return next();
    } catch (err) {
      console.error("❌ Auth Error:", err.message);
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    // console.log('+>', socket.disconnect(false));
    const { userId, username, role, sessionRef } = socket.user || {};
    // console.log("🔗 New connection:", username, socket.id);
    if (!username) return socket.disconnect(true);

    const expiresInMs = socket.user?.exp
      ? Math.max(0, socket.user.exp * 1000 - Date.now())
      : 0;
    const expiryTimer = expiresInMs
      ? setTimeout(async () => {
        socket.data.logoutReason = "token_expired";
        socket.disconnect(true);
      }, expiresInMs)
      : null;
    let accountStatusTimer = null;
    let checkingAccountStatus = false;

    if (["admin", "staff", "super_admin", "client"].includes(role)) {
      accountStatusTimer = setInterval(async () => {
        if (checkingAccountStatus) return;
        checkingAccountStatus = true;

        try {
          if (await findDisabledAccount(socket.user)) {
            socket.data.logoutReason = "account_disabled";
            socket.disconnect(true);
          }
        } catch (error) {
          console.error("Account socket status check error:", error);
        } finally {
          checkingAccountStatus = false;
        }
      }, 15000);
    }

    // Save user
    users.set(username, { socketId: socket.id, ...socket.user });
    /* console.log("✅ Connected:", username, socket.id); */

    if (userId) {
      socket.join(`user_${userId}`);
    }

    socket.emit("notification:static", staticNotifications);

    // Send current users to newly connected socket
    socket.emit("user:status", [...users.entries()]);

    // Broadcast to others
    socket.broadcast.emit("user:status", [...users.entries()]);


    if (role) {
      socket.join(role);
      /* console.log(`📌 ${username} joined role room: ${role}`); */
    }

    socket.on("notification:send", (data) => {
      const { receiverId, title, description, type = "info" } = data || {};

      if (!receiverId || !title || !description) {
        return socket.emit("notification:error", {
          message: "receiverId, title, and description are required",
        });
      }

      const notification = {
        id: `notification-${Date.now()}`,
        type,
        title,
        description,
        senderId: userId,
        senderName: username,
        senderRole: role,
        receiverId,
        createdAt: new Date().toISOString(),
        status: "unread",
      };

      io.to(`user_${receiverId}`).emit(
        "notification:received",
        notification
      );
    });


    socket.on("document:send", (data) => {
      try {
        const {
          receiverId,
          documentId,
          documentName,
          documentUrl,
        } = data || {};

        // Validate receiver
        if (!receiverId) {
          return socket.emit("document:error", {
            message: "Receiver ID is required",
          });
        }

        // Validate document
        if (!documentId) {
          return socket.emit("document:error", {
            message: "Document ID is required",
          });
        }

        const documentData = {
          documentId,
          documentName,
          documentUrl,

          senderId: userId,
          senderName: username,
          senderRole: role,

          receiverId,

          timestamp: new Date(),
        };


        io.to(`user_${receiverId}`).emit(
          "document:received",
          documentData
        );

        /* console.log(
          `📄 Document sent: ${username} → user_${receiverId}`
        ); */

      } catch (error) {
        console.error(
          "❌ Document transfer error:",
          error
        );

        socket.emit("document:error", {
          message: "Failed to send document",
        });
      }
    });




    socket.on("disconnect", (reason) => {
      if (expiryTimer) clearTimeout(expiryTimer);
      if (accountStatusTimer) clearInterval(accountStatusTimer);
      const logoutReason = socket.data.logoutReason
        || (reason === "server namespace disconnect"
          ? "token_expired"
          : "tab_closed_or_disconnected");
      endUserSession(sessionRef, logoutReason).catch((error) => {
        console.error("Session history error:", error);
      });

      if (users.get(username)?.socketId === socket.id) {
        users.delete(username);
        /* console.log(`🔌 Disconnected: ${username} (${reason})`); */
        io.emit("user:status", [...users.entries()]);
      }
    });
  });

  return io;
};

const disconnectAccountSockets = (userId, role) => {
  if (!io) return;
  const normalizedRole =
    typeof role === "string" ? role.trim().toLowerCase() : "";

  for (const socket of io.sockets.sockets.values()) {
    if (
      String(socket.user?.id) === String(userId) &&
      socket.user?.role === normalizedRole
    ) {
      socket.data.logoutReason = "account_disabled";
      socket.disconnect(true);
    }
  }
};

module.exports = { initSocket, disconnectAccountSockets };