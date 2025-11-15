// src/routes/auth.routes.js
import { Router } from "express";
import verifyJWT from "../middlewares/auth.middleware.js";
import {
  registerUser,
  login,
  logoutUser,
  getCurrentUser,
  refreshAccessToken,
  changeCurrentPassword,
} from "../controllers/auth.controller.js";

const router = Router();

router.post("/register", registerUser);
router.post("/login", login);
router.post("/refresh", refreshAccessToken);
router.post("/logout", logoutUser);

// protect this route so req.user is populated
router.get("/me", verifyJWT, getCurrentUser);
router.post("/change-password", verifyJWT, changeCurrentPassword);

export default router;
