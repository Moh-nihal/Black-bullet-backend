const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");

const healthRouter = require("./routes/health");
const mediaRouter = require("./routes/media");
const authRouter = require("./routes/auth");
const bookingsRouter = require("./routes/bookings");
const publicRouter = require("./routes/public");
const adminDashboardRouter = require("./routes/adminDashboard");
const adminServicesRouter = require("./routes/adminServices");
const adminBlogRouter = require("./routes/adminBlog");
const adminGalleryRouter = require("./routes/adminGallery");
const adminBookingsRouter = require("./routes/adminBookings");
const adminContentRouter = require("./routes/adminContent");
const publicLandingRouter = require("./routes/publicLanding");
const adminLandingRouter = require("./routes/adminLanding");
const adminLeadsRouter = require("./routes/adminLeads");
const { notFoundHandler, errorHandler } = require("./middleware/errorHandler");

const app = express();
const corsOriginList = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim())
  : [];
const useWildcardCors = corsOriginList.length === 0;

app.use(
  cors({
    origin: useWildcardCors ? "*" : corsOriginList,
    credentials: !useWildcardCors,
  })
);
app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

app.get("/", (_req, res) => {
  res.status(200).json({
    ok: true,
    service: "black_bullet_backend",
    message: "Server initialized",
  });
});

app.use("/api/health", healthRouter);
app.use("/api/public", publicRouter);
app.use("/api/public", publicLandingRouter);
app.use("/api/admin", authRouter);
app.use("/api/admin/dashboard", adminDashboardRouter);
app.use("/api/bookings", bookingsRouter);
app.use("/api/admin/services", adminServicesRouter);
app.use("/api/admin/blog", adminBlogRouter);
app.use("/api/admin/gallery", adminGalleryRouter);
app.use("/api/admin/bookings", adminBookingsRouter);
app.use("/api/admin/content", adminContentRouter);
app.use("/api/admin/landing", adminLandingRouter);
app.use("/api/admin/leads", adminLeadsRouter);
app.use("/api/media", mediaRouter);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
