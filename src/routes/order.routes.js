import { Router } from "express";
import { createOrder, getAllOrders, getUserOrders, updateOrderStatus, cancelOrder } from "../controllers/order.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/role.middleware.js";
import { validate } from "../middlewares/validator.middleware.js";
import { orderValidator, orderStatusValidator } from "../validators/order.validator.js";

const router = Router();

/* Public / Customer routes */
router.post("/", verifyJWT, orderValidator(), validate, createOrder);
router.get("/me", verifyJWT, getUserOrders);

/* Admin routes */
router.get("/", verifyJWT, authorizeRoles("admin"), getAllOrders);

// Update order status (admin)
router.put("/:id/status", verifyJWT, authorizeRoles("admin"), orderStatusValidator(), validate, updateOrderStatus);

// Cancel order (customer-side)
router.put("/:id/cancel", verifyJWT, cancelOrder);

export default router;
