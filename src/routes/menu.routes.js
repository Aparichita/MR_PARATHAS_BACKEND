import { Router } from "express";
import {
  createMenuItem,
  getAllMenuItems,
  getMenuItemById,
  updateMenuItem,
  deleteMenuItem,
  rateMenuItem,
  getMenuRatings,
} from "../controllers/menu.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/role.middleware.js";
import { validate } from "../middlewares/validator.middleware.js";
import { menuValidator, ratingValidator } from "../validators/index.js"; // or adjust import path

const router = Router();

/* ---------- Public Routes ---------- */
// Fetch all menu items
router.get("/", getAllMenuItems);

// Fetch a single menu item by ID
router.get("/:id", getMenuItemById);

/* ---------- Ratings ---------- */
router.post("/:id/rate", verifyJWT, ratingValidator(), validate, rateMenuItem);
router.get("/:id/ratings", getMenuRatings);

/* ---------- Admin Protected Routes ---------- */
// Add a new menu item
router.post(
  "/",
  verifyJWT,
  authorizeRoles("admin"), // fixed: use authorizeRoles
  menuValidator(),
  validate,
  createMenuItem,
);

// Update an existing menu item
router.put(
  "/:id",
  verifyJWT,
  authorizeRoles("admin"), // fixed
  menuValidator(),
  validate,
  updateMenuItem,
);

// Delete a menu item
router.delete("/:id", verifyJWT, authorizeRoles("admin"), deleteMenuItem);

export default router;
