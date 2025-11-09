import { Router } from "express";
import {
  createMenuItem,
  getAllMenuItems,
  getMenuItemById,
  updateMenuItem,
  deleteMenuItem,
} from "../controllers/menu.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/role.middleware.js";
import { validate } from "../middlewares/validator.middleware.js";
import { menuValidator } from "../validators/index.js";

const router = Router();

/* ---------- Public Routes ---------- */
// Fetch all menu items
router.get("/", getAllMenuItems);

// Fetch a single menu item by ID
router.get("/:id", getMenuItemById);

/* ---------- Admin Protected Routes ---------- */
// Add a new menu item
router.post(
  "/",
  verifyJWT,
  checkAdminRole,
  menuValidator(),
  validate,
  createMenuItem,
);

// Update an existing menu item
router.put(
  "/:id",
  verifyJWT,
  checkAdminRole,
  menuValidator(),
  validate,
  updateMenuItem,
);

// Delete a menu item
router.delete("/:id", verifyJWT, checkAdminRole, deleteMenuItem);

export default router;
