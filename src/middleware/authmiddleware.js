const { verifyTokenJWT } = require("../middleware/tokengerate.js");
const jwt = require("jsonwebtoken");
const { endUserSession } = require("../services/userStatus.service");

const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;
    const token = bearerToken || req.cookies?.token__;

    // console.log("Authorization Header:", authHeader);

    if (!token) {
      return res.status(401).json({
        message: "No token found in Authorization header"
      });
    }

    // console.log("Token from header:", token);

    const decoded = verifyTokenJWT(token);

    req.user = {
      decoded,
      token
    };

    // console.log("Decoded Token:", decoded);

    next();

  } catch (err) {
    console.error("JWT Error:", err.message);
    const decoded = token ? jwt.decode(token) : null;
    if (err.name === "TokenExpiredError" && decoded?.sessionRef) {
      endUserSession(decoded.sessionRef, "token_expired").catch((historyError) => {
        console.error("Session expiry history error:", historyError);
      });
    }
    return res.status(401).json({
      message: "Invalid or expired token"
    });
  }
};

module.exports = verifyToken;