// index.js
import dotenv from "dotenv";
import app from "./app.js";
import connectDB from "./db/index.js";
import logger from "./utils/logger.js";
import adminRoutes from "./routes/admin.routes.js";

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 5000;

(async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    console.log("✅ MongoDB connected successfully");

    // mount admin routes under /api/v1/admin
    app.use("/api/v1/admin", adminRoutes);

    // Start Express server
    app.listen(PORT, () => { console.log(`Server running on ${PORT}`); });
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err);
    process.exit(1);
  }
})();
