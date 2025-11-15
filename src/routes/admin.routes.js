import { Router } from "express";
import verifyJWT from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/role.middleware.js";
import { getDashboard } from "../controllers/admin.controller.js";

const router = Router();

router.use(verifyJWT, authorizeRoles("admin"));

router.get("/dashboard", getDashboard);

export default router;