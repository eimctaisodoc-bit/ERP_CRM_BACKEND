const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

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
    const username = socket.user?.username;
    if (!username) return socket.disconnect(true);

    // Save user
    users.set(username, { socketId: socket.id, ...socket.user });
    console.log("✅ Connected:", username, socket.id);

    // Send current users to newly connected socket
    socket.emit("user:status", [...users.entries()]);

    // Broadcast to others
    socket.broadcast.emit("user:status", [...users.entries()]);

    socket.on("disconnect", (reason) => {
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