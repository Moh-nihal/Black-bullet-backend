const express = require("express");

const { getAvailableSlots, createBooking } = require("../controllers/bookingsController");

const router = express.Router();

// Public booking creation endpoint (no admin auth required).
router.get("/slots", getAvailableSlots);
router.post("/", createBooking);

module.exports = router;

