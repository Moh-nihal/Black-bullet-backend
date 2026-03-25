const jwt = require("jsonwebtoken");

const getJwtSecret = () => {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    const error = new Error("JWT_SECRET is not defined");
    error.statusCode = 500;
    throw error;
  }

  return jwtSecret;
};

const signAdminToken = (admin) => {
  const payload = {
    sub: String(admin._id),
    email: admin.email,
    role: admin.role,
  };

  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

const verifyToken = (token) => jwt.verify(token, getJwtSecret());

module.exports = {
  signAdminToken,
  verifyToken,
};
