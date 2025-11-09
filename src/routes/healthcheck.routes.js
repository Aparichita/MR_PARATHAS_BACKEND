// routes/healthcheck.routes.js
import { Router } from "express";
import { healthCheck } from "../controllers/healthcheck.controller.js";

const router = Router();

// Basic route to check if server is running
router.route("/").get(healthCheck);

export default router;
