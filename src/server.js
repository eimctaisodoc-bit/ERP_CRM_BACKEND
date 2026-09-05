const express = require('express');

require('dotenv').config();
const connectDB = require('./config/db');
const path = require('path');
const cookieParser = require('cookie-parser');
const http = require('http');

const authrouter = require('../src/UserRouter/auth/auth.index');
const adminRoutes = require('./UserRouter/Admin/admin.index');
const superRoutes = require('./UserRouter/super/super.admin.index');
const clientRoutes = require('./UserRouter/client/client.index');
const staffRoutes = require('./UserRouter/Staff/staff.index');

const cors = require('cors');

const verifyToken = require('./middleware/authmiddleware');
const authorizeRoles = require("./middleware/role.middleware");
const { initSocket } = require('./socket/socket');
const loginRoute = require('./login/LoginController');

const app = express();
connectDB();


app.use('/backend/uploads', express.static(path.join(__dirname, '../uploads')));
app.use(express.json()); // parse JSON bodies
app.use(express.urlencoded({ extended: true })); // parse form bodies
app.use(cookieParser());
app.use(
  cors({
     origin: "*"
    // origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    // credentials: true,
  })
);

const bcrypt = require("bcrypt");
// this below for temp.
app.get('/dummy', async (req, res) => {
  const hashedPassword1 = await bcrypt.hash("SuperAdmin123!", 10);
  res.status(200).json({ enc: hashedPassword1 })

})
// Username: saritabhattarai6703*

// Password: GbfkBGKc

// Role: staff
// Username: gitapoudel4694#

// Password: DMqKDuI!

// Role: admin

app.get('/',(req,res)=>{
  return res.status(200).json({message:"Welcome to the API"} ,req?.user )

})

app.use("/api/auth", authrouter);
app.use("/api", loginRoute);

app.use("/super_admin", verifyToken, authorizeRoles(["super_admin"]), superRoutes);
app.use("/admin", verifyToken, authorizeRoles(["admin"]), adminRoutes);
app.use("/client", verifyToken, authorizeRoles(["client"]), clientRoutes);
app.use("/staff", verifyToken, authorizeRoles(["staff"]), staffRoutes);

if (require.main === module) {
  const server = http.createServer(app);
  initSocket(server);

  const port = process.env.PORT || 5000;
  server.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

module.exports = app;
