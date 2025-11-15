// app.js
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";

import healthCheckRouter from "./routes/healthcheck.routes.js";
import orderRoutes from "./routes/order.routes.js";
import menuRoutes from "./routes/menu.routes.js";
import authRoutes from "./routes/auth.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import contactRoutes from "./routes/contact.routes.js";
import tableRoutes from "./routes/table.routes.js";
import takeawayRoutes from "./routes/takeaway.routes.js";

// Load environment variables
dotenv.config();

const app = express();

/* -------------------- Middlewares -------------------- */
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// cookie parser needed for cookie refresh usage
import cookieParser from "cookie-parser";
app.use(cookieParser());

// --- CORS Setup ---
app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:5173"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

/* -------------------- Routes -------------------- */
app.use("/api/v1/healthcheck", healthCheckRouter);
// mount routes under /api/v1
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/orders", orderRoutes);
app.use("/api/v1/menu", menuRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/contact", contactRoutes);
app.use("/api/v1/tables", tableRoutes);
app.use("/api/v1/takeaway", takeawayRoutes);

/* -------------------- Root Route -------------------- */
app.get("/", (req, res) => {
  res.status(200).send("🍽️ Welcome to Mr. Parathas Backend Server!");
});

// Temporary test endpoint for email (safe to remove later)
import { sendEmail } from "./utils/email.js";
app.post("/api/v1/test/send-email", async (req, res) => {
  const { to, subject, text } = req.body;
  try {
    await sendEmail({ to, subject: subject || "Test email", text: text || "Test" });
    return res.status(200).json({ success: true, message: "Email attempted" });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/* -------------------- Error Handling -------------------- */
// Optional: centralized error middleware
import { errorHandler } from "./middlewares/error.middleware.js";
app.use(errorHandler);

export default app;
