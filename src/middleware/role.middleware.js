const authorizeRoles = (roles = []) => {
  return (req, res, next) => {
    // console.log(req.headers.authorization?.split(" ")[1])
    // console.log(req);

    if (!req.user.decoded) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    // console.log("checking User role: ", roles.includes(req.user.decoded.role));
    if (!roles.includes(req.user.decoded.role)) {
      return res.status(403).json({ message: "Forbidden: Access denied from backend" });
    }

    next();
  };
};

module.exports = authorizeRoles;
