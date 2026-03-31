const express = require("express");

const {
  getPublicContentByPageKey,
  listPublicBlogs,
  getPublicBlogBySlugOrId,
  listPublicServices,
  getPublicServiceBySlugOrId,
  listPublicGalleryItems,
} = require("../controllers/publicController");
const { getPublicAvailableSlots } = require("../controllers/bookingsController");
const publicLandingRouter = require("./publicLanding");

const router = express.Router();

router.get("/content/:pageKey", getPublicContentByPageKey);
router.get("/blog", listPublicBlogs);
router.get("/blog/:slugOrId", getPublicBlogBySlugOrId);
router.get("/services", listPublicServices);
router.get("/services/:idOrSlug", getPublicServiceBySlugOrId);
router.get("/gallery", listPublicGalleryItems);
router.get("/bookings/available-slots", getPublicAvailableSlots);
router.use("/", publicLandingRouter);

module.exports = router;
