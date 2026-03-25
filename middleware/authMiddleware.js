const mongoose = require("mongoose");

const { verifyToken } = require("../utils/jwt");

const authenticateAdmin = async (req, _res, next) => {
  try {
    const authorization = req.headers.authorization || "";
    const cookieToken = req.cookies?.admin_token || "";
    let token = "";

    if (cookieToken) {
      token = cookieToken;
    } else if (authorization.startsWith("Bearer ")) {
      token = authorization.slice("Bearer ".length).trim();
    }

    if (!token) {
      const error = new Error("Authorization token is missing");
      error.statusCode = 401;
      throw error;
    }

    let payload;
    try {
      payload = verifyToken(token);
    } catch (_error) {
      const error = new Error("Invalid or expired token");
      error.statusCode = 401;
      throw error;
    }

    const Admin = mongoose.model("Admin");
    const admin = await Admin.findById(payload.sub);

    if (!admin) {
      const error = new Error("Admin not found");
      error.statusCode = 401;
      throw error;
    }

    if (!admin.isActive) {
      const error = new Error("Admin account is inactive");
      error.statusCode = 403;
      throw error;
    }

    req.admin = admin;
    next();
  } catch (error) {
    next(error);
  }
};

const requireRole = (...allowedRoles) => (req, _res, next) => {
  if (!req.admin) {
    const error = new Error("Unauthorized");
    error.statusCode = 401;
    next(error);
    return;
  }

  if (!allowedRoles.includes(req.admin.role)) {
    const error = new Error("Forbidden");
    error.statusCode = 403;
    next(error);
    return;
  }

  next();
};

module.exports = {
  authenticateAdmin,
  protectAdmin: authenticateAdmin,
  requireRole,
};
