import mongoose from "mongoose";
import dotenv from "dotenv";
import { User } from "../models/user.model.js";

dotenv.config();

const seedAdmin = async () => {
  try {
    // Connect to MongoDB with a specific database
    await mongoose.connect(process.env.MONGO_URI, {
      dbName: "MR_PARATHAS", // Must match your desired DB
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("✅ Connected to MongoDB");

    const adminEmail = process.env.ADMIN_EMAIL || "admin2@mrparathas.com";
    const adminUsername = process.env.ADMIN_USERNAME || "admin2";
    const adminPassword = process.env.ADMIN_PASSWORD || "Admin@1234";

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin) {
      console.log("⚠️ Admin user already exists. No changes made.");
      process.exit(0);
    }

    // Create the admin user WITHOUT pre-hashing the password
    // The password will be hashed automatically by the pre-save hook in the User model
    const admin = await User.create({
      username: adminUsername,
      email: adminEmail,
      password: adminPassword, // <-- plain password
      role: "admin",
      isEmailVerified: true,
    });

    console.log("✅ Admin user created successfully:");
    console.log(`📧 Email: ${adminEmail}`);
    console.log(`🔑 Password: ${adminPassword}`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding admin:", error.message);
    process.exit(1);
  }
};

seedAdmin();
