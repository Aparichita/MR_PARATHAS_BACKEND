import { Router } from "express";
import { getDashboardSummary } from "../controllers/admin.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/role.middleware.js";

const router = Router();

// GET /admin/dashboard/summary
router.get("/dashboard/summary", verifyJWT, authorizeRoles("admin"), getDashboardSummary);

export default router;