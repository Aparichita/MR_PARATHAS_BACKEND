import { Router } from "express";
import {
  getAllMenuItems,
  getMenuItemById,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  rateMenuItem,
  getMenuRatings,
} from "../controllers/menu.controller.js";
import verifyJWT from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/role.middleware.js";

const router = Router();

/* ---------- Public Routes ---------- */
// Fetch all menu items
router.get("/", getAllMenuItems);

// Fetch a single menu item by ID
router.get("/:id", getMenuItemById);

/* ---------- Ratings ---------- */
router.post("/:id/rate", verifyJWT, rateMenuItem);
router.get("/:id/ratings", getMenuRatings);

/* ---------- Admin Protected Routes ---------- */
// Add a new menu item
router.post(
  "/",
  verifyJWT,
  authorizeRoles("admin"), // fixed: use authorizeRoles
  createMenuItem,
);

// Update an existing menu item
router.put(
  "/:id",
  verifyJWT,
  authorizeRoles("admin"), // fixed
  updateMenuItem,
);

// Delete a menu item
router.delete("/:id", verifyJWT, authorizeRoles("admin"), deleteMenuItem);

export default router;
