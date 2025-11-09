import { Router } from "express";
import {
  createOrder,
  getUserOrders,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
} from "../controllers/order.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/role.middleware.js";
import { validate } from "../middlewares/validator.middleware.js";
import { orderValidator, orderStatusValidator } from "../validators/index.js";

const router = Router();

/* ---------- Customer Routes ---------- */
// Place a new order
router.post("/", verifyJWT, orderValidator(), validate, createOrder);

// Get all orders of the logged-in user
router.get("/my-orders", verifyJWT, getUserOrders);

// Cancel a specific order (only by the same user)
router.delete("/:id", verifyJWT, cancelOrder);

/* ---------- Admin Routes ---------- */
// Get all orders (for admin dashboard)
router.get("/", verifyJWT, authorizeRoles("admin"), getAllOrders);

// Get order by ID
router.get("/:id", verifyJWT, authorizeRoles("admin"), getOrderById);

// Update order status (e.g., “Preparing”, “Out for Delivery”, “Delivered”)
router.put(
  "/:id/status",
  verifyJWT,
  authorizeRoles("admin"),
  orderStatusValidator(),
  validate,
  updateOrderStatus,
);

export default router;
