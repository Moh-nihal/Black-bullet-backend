const express = require("express");
const { body } = require("express-validator");

const { login, me, logout } = require("../controllers/authController");
const { authenticateAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Valid email is required").normalizeEmail(),
    body("password").isString().isLength({ min: 1 }).withMessage("Password is required"),
  ],
  login
);
router.use(authenticateAdmin);

router.get("/me", me);
router.post("/logout", logout);

module.exports = router;
