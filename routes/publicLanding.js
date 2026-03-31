const express = require("express");

const {
  getPublicLandingBySlug,
  registerLandingConversion,
  createLandingLead,
} = require("../controllers/publicLandingController");

const router = express.Router();

router.get("/landing/:slug", getPublicLandingBySlug);
router.post("/landing/:slug/convert", registerLandingConversion);
router.post("/landing/:slug/leads", createLandingLead);

module.exports = router;
