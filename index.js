require("dotenv").config();

const http = require("http");

const app = require("./app");
const connectDB = require("./config/db");

require("./models/Admin");
require("./models/Booking");
require("./models/Service");
require("./models/Settings");
require("./models/Blogs");
require("./models/GalleryItem");
require("./models/ContentPage");

const PORT = Number(process.env.PORT) || 5000;
let server;

const startServer = async () => {
  try {
    const dbConnection = await connectDB();
    console.log(`MongoDB connected: ${dbConnection.host}/${dbConnection.name}`);

    server = http.createServer(app);
    server.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to initialize server:", error.message);
    process.exit(1);
  }
};

const shutdown = (signal) => {
  console.log(`${signal} received. Shutting down gracefully...`);

  if (server) {
    server.close(() => {
      console.log("HTTP server closed.");
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

startServer();
