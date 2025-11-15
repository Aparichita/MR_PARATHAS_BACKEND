import { Router } from "express";
import verifyJWT from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/role.middleware.js";
import {
  getTakeawayCart,
  addToTakeawayCart,
  updateTakeawayCartItem,
  removeTakeawayCartItem,
  clearTakeawayCart,
  checkoutTakeawayCart,
  getUserTakeawayOrders,
  getAllTakeawayOrders,
  getTakeawayOrderById,
  updateTakeawayOrderStatus,
  updateTakeawayPaymentStatus,
  cancelTakeawayOrder,
} from "../controllers/takeaway.controller.js";

const router = Router();

// all takeaway routes require auth
router.use(verifyJWT);

/* CART ROUTES (Customer) */
router.get("/cart", getTakeawayCart);
router.post("/cart/add", addToTakeawayCart);
router.put("/cart/item/:menuItemId", updateTakeawayCartItem);
router.delete("/cart/item/:menuItemId", removeTakeawayCartItem);
router.delete("/cart", clearTakeawayCart);
router.post("/cart/checkout", checkoutTakeawayCart);

/* ORDER ROUTES (Customer) */
router.get("/orders/me", getUserTakeawayOrders);
router.get("/orders/:id", getTakeawayOrderById);
router.put("/orders/:id/cancel", cancelTakeawayOrder);

/* ADMIN ROUTES */
router.get("/orders", authorizeRoles("admin"), getAllTakeawayOrders);
router.put("/orders/:id/status", authorizeRoles("admin"), updateTakeawayOrderStatus);
router.put("/orders/:id/payment-status", authorizeRoles("admin"), updateTakeawayPaymentStatus);

export default router;