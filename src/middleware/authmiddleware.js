const { verifyTokenJWT } = require("../middleware/tokengerate.js");
const jwt = require("jsonwebtoken");
const { endUserSession } = require("../services/userStatus.service");
const Branch = require("../Usersmodel/supper/model.branch");
const UserSchema = require("../Usersmodel/UserSchema");
const clientsRegisters = require("../Usersmodel/client/client.Register_schema");

const getAccountModel = (role) => {
  if (role === "admin") return Branch;
  if (role === "staff") return UserSchema;
  if (role === "client") return clientsRegisters;
  return null;
};

const verifyToken = async (req, res, next) => {
  let token;

  try {
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;
    token = bearerToken || req.cookies?.token__;

    if (!token) {
      return res.status(401).json({
        message: "No token found in Authorization header or cookies"
      });
    }

    const decoded = verifyTokenJWT(token);

    const AccountModel = getAccountModel(decoded.role);
    if (AccountModel) {
      let account;
      try {
        account = await AccountModel.findOne({
          _id: decoded.id,
          username: decoded.username,
        }).select("isActive");
      } catch (error) {
        console.error("Account status check error:", error);
        return res.status(500).json({
          message: "Unable to validate account status"
        });
      }

      if (account?.isActive === false) {
        res.clearCookie("token__");
        try {
          await endUserSession(decoded.sessionRef, "account_disabled");
        } catch (error) {
          console.error("Disabled account session history error:", error);
        }

        return res.status(401).json({
          message: "You have been disabled by the administrator.",
          code: `${decoded.role.toUpperCase()}_DISABLED`
        });
      }
    }

    req.user = {
      decoded,
      token
    };

    next();

  } catch (err) {
    console.error("JWT Error:", err.message);
    res.clearCookie("token__");

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