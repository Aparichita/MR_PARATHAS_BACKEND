import { Router } from "express";
import {
  createOrder,
  getAllOrders,
  getUserOrders,
  cancelOrder,
  getOrderById,
  updateOrderStatus,
  deleteOrder,
  redeemPoints,
} from "../controllers/order.controller.js";
import verifyJWT from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/role.middleware.js";

const router = Router();

// public/protected as needed
router.post("/", verifyJWT, createOrder); // place order
router.get("/me", verifyJWT, getUserOrders);
router.get("/", verifyJWT, authorizeRoles("admin"), getAllOrders);
router.get("/:id", verifyJWT, getOrderById);
router.put("/:id/status", verifyJWT, authorizeRoles("admin"), updateOrderStatus);
router.put("/:id/cancel", verifyJWT, cancelOrder);
router.post("/:id/redeem", verifyJWT, redeemPoints);
router.delete("/:id", verifyJWT, authorizeRoles("admin"), deleteOrder);

export default router;
