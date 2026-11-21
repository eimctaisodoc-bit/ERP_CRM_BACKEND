const express = require("express");

const connectDB = require("./config/db");
const path = require("path");
const cookieParser = require("cookie-parser");
const http = require("http");

const authrouter = require("../src/UserRouter/auth/auth.index");
const adminRoutes = require("./UserRouter/Admin/admin.index");
const superRoutes = require("./UserRouter/super/super.admin.index");
const clientRoutes = require("./UserRouter/client/client.index");
const staffRoutes = require("./UserRouter/Staff/staff.index");

const cors = require("cors");

const verifyToken = require("./middleware/authmiddleware");
const authorizeRoles = require("./middleware/role.middleware");
const { initSocket } = require("./socket/socket");
const loginRoute = require("./login/LoginController");

const app = express();

app.use("/backend/public", express.static(path.join(__dirname, "../public")));

app.use(express.json()); // parse JSON bodies
app.use(express.urlencoded({ extended: true })); // parse form bodies
app.use(cookieParser());
app.use(
  cors({
    //  origin: "*",
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  }),
);
// app.use(
//   cors({
//     origin: "*",
//     methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
//     allowedHeaders: ["Content-Type", "Authorization"]
//   })
// );

const bcrypt = require("bcrypt");
const UserSchema = require("./Usersmodel/UserSchema");
// this below for temp.
app.get("/dummy", async (req, res) => {
  // const hashedPassword1 = await bcrypt.hash("SuperAdmin123!", 10);
  // const hashedPassword1 = await bcrypt.hash("DMqKDuI!", 10);
  const hashedPassword1 = await bcrypt.hash("bvXMRulL", 10);

  res.status(200).json({ enc: hashedPassword1 });
});

// ===========================
// role:admin, pw:Jlbn#NyH,
// Username:sumanthapa7954#
// jobrole:cro

// manojthakur1378!
// sales
// bvXMRulL

// <<<<<<< HEAD

app.get("/", async (req, res) => {
  const user = await UserSchema.findOne();
  console.log("Database:", UserSchema.db.name);
  console.log("Collection:", UserSchema.collection.name);
  return res.status(200).json({ exists: !!user, data: user });
});
// =======

app.use("/api/auth", authrouter);
app.use("/api", loginRoute);

app.use(
  "/super_admin",
  verifyToken,
  authorizeRoles(["super_admin"]),
  superRoutes,
);
app.use("/admin", verifyToken, authorizeRoles(["admin"]), adminRoutes);
app.use("/client", verifyToken, authorizeRoles(["client"]), clientRoutes);
app.use("/staff", verifyToken, authorizeRoles(["staff"]), staffRoutes);

// if (require.main === module) {
//   const startServer = async () => {
//     await connectDB();

//     const server = http.createServer(app);
//     initSocket(server);

//     const port = process.env.PORT || 5000;
//     server.listen(port, () => {
//       console.log(`Server running on port ${port}`);
//     });
//   };

//   startServer().catch((error) => {
//     console.error("Server startup failed:", error.message);
//     process.exitCode = 1;
//   });
// }

module.exports = app
