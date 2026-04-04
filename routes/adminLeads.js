const express = require("express");
const {
  listLeads,
  updateLeadStatus,
} = require("../controllers/adminLandingLeadsController");
const { authenticateAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authenticateAdmin);

router.get("/", listLeads);
router.put("/:id/status", updateLeadStatus);

module.exports = router;
