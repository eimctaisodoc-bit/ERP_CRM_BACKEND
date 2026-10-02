const { Server } = require("socket.io");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const { endUserSession } = require("../services/userStatus.service");

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
  const io = new Server(server, {
    cors: { origin: "http://localhost:5173", credentials: true },
  });

  const users = new Map();

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token || typeof token !== "string") {
        return next(new Error("Unauthorized: Invalid token format"));
      }

      const decoded = jwt.verify(token, process.env.Secrete_KEY);
      socket.user = decoded;
      next();
    } catch (err) {
      console.error("❌ Auth Error:", err.message);
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const { userId, username, role, sessionRef } = socket.user || {};
    // console.log("🔗 New connection:", username, socket.id);
    if (!username) return socket.disconnect(true);

    const expiresInMs = socket.user?.exp
      ? Math.max(0, socket.user.exp * 1000 - Date.now())
      : 0;
    const expiryTimer = expiresInMs
      ? setTimeout(async () => {
        await endUserSession(sessionRef, "token_expired");
        socket.disconnect(true);
      }, expiresInMs)
      : null;

    // Save user
    users.set(username, { socketId: socket.id, ...socket.user });
    console.log("✅ Connected:", username, socket.id);

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
      console.log(`📌 ${username} joined role room: ${role}`);
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

        console.log(
          `📄 Document sent: ${username} → user_${receiverId}`
        );

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
      const logoutReason = reason === "server namespace disconnect"
        ? "token_expired"
        : "tab_closed_or_disconnected";
      endUserSession(sessionRef, logoutReason).catch((error) => {
        console.error("Session history error:", error);
      });

      if (users.get(username)?.socketId === socket.id) {
        users.delete(username);
        console.log(`🔌 Disconnected: ${username} (${reason})`);
        io.emit("user:status", [...users.entries()]);
      }
    });
  });

  return io;
};

module.exports = { initSocket };