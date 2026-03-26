const express = require("express");

const { authenticateAdmin, requireRole } = require("../middleware/authMiddleware");
const { getContentByPageKey, upsertContentByPageKey } = require("../controllers/adminContentController");

const router = express.Router();

router.use(authenticateAdmin);

router.get("/:pageKey", requireRole("editor", "admin", "super_admin"), getContentByPageKey);
router.put("/:pageKey", requireRole("editor", "admin", "super_admin"), upsertContentByPageKey);

module.exports = router;
