// index.js
import dotenv from "dotenv";
import app from "./app.js";
import connectDB from "./db/index.js";
import logger from "./utils/logger.js";


// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 5000;

(async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    console.log("✅ MongoDB connected successfully");

    // Start Express server
    app.listen(PORT, () => {
      console.log(`🚀 Mr. Parathas server running at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err);
    process.exit(1);
  }
})();
