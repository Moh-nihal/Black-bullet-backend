const express = require("express");
const {
  listLandingPages,
  getLandingPage,
  createLandingPage,
  updateLandingPage,
  deleteLandingPage,
  getLandingAnalytics,
} = require("../controllers/adminLandingController");
const { authenticateAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authenticateAdmin);

router.get("/", listLandingPages);
router.get("/:id", getLandingPage);
router.post("/", createLandingPage);
router.put("/:id", updateLandingPage);
router.delete("/:id", deleteLandingPage);
router.get("/:id/analytics", getLandingAnalytics);

module.exports = router;
