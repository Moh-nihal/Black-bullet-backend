const express = require("express");
const multer = require("multer");

const { deleteMedia, uploadMedia } = require("../controllers/mediaController");
const { authenticateAdmin, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024,
  },
});

router.post(
  "/upload",
  authenticateAdmin,
  requireRole("editor", "admin", "super_admin"),
  upload.single("file"),
  uploadMedia
);
router.delete("/", authenticateAdmin, requireRole("admin", "super_admin"), deleteMedia);

module.exports = router;
