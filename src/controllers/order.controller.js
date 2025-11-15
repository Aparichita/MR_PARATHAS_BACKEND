import Order from "../models/order.model.js";
import { Menu } from "../models/menu.model.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";
import logger from "../utils/logger.js";
import { logAudit } from "../utils/audit.js";
import { User } from "../models/user.model.js";

/* ---------------------------------------------------
   🧾 Place a New Order (Customer)
--------------------------------------------------- */
export const createOrder = asyncHandler(async (req, res) => {
  const { items } = req.body;
  const userId = req.user?._id;

  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, "items (array) are required");
  }

  const menuIds = [...new Set(items.map((it) => String(it.menuItem)))];
  const menuDocs = await Menu.find({ _id: { $in: menuIds } });
  const foundIds = new Set(menuDocs.map((m) => String(m._id)));
  const missing = menuIds.filter((id) => !foundIds.has(id));
  if (missing.length) throw new ApiError(404, `Menu item(s) not found: ${missing.join(", ")}`);

  const priceMap = {};
  for (const m of menuDocs) priceMap[String(m._id)] = Number(m.price || 0);

  let totalAmount = 0;
  for (const it of items) {
    const qty = Number(it.quantity || 0);
    if (!Number.isInteger(qty) || qty < 1) throw new ApiError(400, `Invalid quantity for menuItem ${it.menuItem}`);
    const price = priceMap[String(it.menuItem)];
    totalAmount += price * qty;
  }

  const newOrder = await Order.create({
    user: userId,
    items,
    totalAmount,
    orderStatus: "Pending",
  });

  // Award loyalty points (simple scheme: 1 point per X currency)
  try {
    const POINTS_PER_AMOUNT = Number(process.env.POINTS_PER_AMOUNT) || 100; // default: 1 point per 100 units
    const pointsEarned = Math.floor(totalAmount / POINTS_PER_AMOUNT);
    if (pointsEarned > 0) {
      const user = await User.findById(userId);
      if (user) {
        user.points = (user.points || 0) + pointsEarned;
        await user.save();
      }
    }
  } catch (err) {
    logger.error("Failed to award points:", err);
  }

  await logAudit({
    user: userId,
    action: "order_created",
    resource: "order",
    resourceId: newOrder._id,
    meta: { totalAmount },
    ip: req.ip,
  });

  return res.status(201).json(new ApiResponse(201, newOrder, "Order placed successfully"));
});

/* ---------------------------------------------------
   📦 Get All Orders (Admin only) - supports filters
   Query params: status, from (YYYY-MM-DD), to (YYYY-MM-DD), user
--------------------------------------------------- */
export const getAllOrders = asyncHandler(async (req, res) => {
  const { status, from, to, user } = req.query;
  const filter = {};

  if (status) {
    const statuses = String(status).split(",").map((s) => s.trim());
    filter.orderStatus = { $in: statuses };
  }

  if (user) filter.user = user;

  if (from || to) {
    filter.createdAt = {};
    if (from) {
      const f = new Date(from);
      if (!isNaN(f)) filter.createdAt.$gte = f;
    }
    if (to) {
      const t = new Date(to);
      if (!isNaN(t)) {
        t.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = t;
      }
    }
    if (Object.keys(filter.createdAt).length === 0) delete filter.createdAt;
  }

  const orders = await Order.find(filter)
    .populate("user", "username email")
    .populate("items.menuItem", "name price")
    .sort({ createdAt: -1 });

  return res.status(200).json({
    success: true,
    count: orders.length,
    data: orders,
  });
});

/* ---------------------------------------------------
   👤 Get Orders for Logged-in User (Customer)
--------------------------------------------------- */
export const getUserOrders = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  const orders = await Order.find({ user: userId })
    .populate("items.menuItem", "name price")
    .sort({ createdAt: -1 });

  return res.status(200).json({
    success: true,
    count: orders.length,
    data: orders,
  });
});

/* ---------------------------------------------------
   ❌ Cancel My Order (Customer)
--------------------------------------------------- */
export const cancelOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const order = await Order.findById(id).populate("user", "email username");
  if (!order) throw new ApiError(404, "Order not found");

  if (order.user._id.toString() !== req.user._id.toString()) throw new ApiError(403, "You can only cancel your own orders");

  order.orderStatus = "Cancelled";
  await order.save();

  await logAudit({
    user: req.user?._id,
    action: "order_cancelled",
    resource: "order",
    resourceId: order._id,
    meta: {},
    ip: req.ip,
  });

  return res.status(200).json(new ApiResponse(200, order, "Order cancelled successfully"));
});

/* ---------------------------------------------------
   🔍 Get Single Order by ID (Admin or Customer)
--------------------------------------------------- */
export const getOrderById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const order = await Order.findById(id)
    .populate("user", "username email")
    .populate("items.menuItem", "name price");

  if (!order) throw new ApiError(404, "Order not found");

  if (req.user.role !== "admin" && order.user._id.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Not authorized to view this order");
  }

  return res.status(200).json({
    success: true,
    data: order,
  });
});

/* ---------------------------------------------------
   🚚 Update Order Status (Admin)
--------------------------------------------------- */
export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { orderStatus } = req.body;

  if (!orderStatus) throw new ApiError(400, "orderStatus is required");

  const allowed = ["Pending", "Preparing", "Delivered", "Cancelled"];
  if (!allowed.includes(orderStatus)) throw new ApiError(400, "Invalid orderStatus");

  const order = await Order.findById(id).populate("user", "email username");
  if (!order) throw new ApiError(404, "Order not found");

  order.orderStatus = orderStatus;
  await order.save();

  await logAudit({
    user: req.user?._id,
    action: "order_status_updated",
    resource: "order",
    resourceId: order._id,
    meta: { status: orderStatus },
    ip: req.ip,
  });

  return res.status(200).json(new ApiResponse(200, order, "Order status updated successfully"));
});

/* ---------------------------------------------------
   ❌ Delete Order (Admin)
--------------------------------------------------- */
export const deleteOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const deletedOrder = await Order.findByIdAndDelete(id);
  if (!deletedOrder) throw new ApiError(404, "Order not found");

  await logAudit({
    user: req.user?._id,
    action: "order_deleted",
    resource: "order",
    resourceId: deletedOrder._id,
    meta: {},
    ip: req.ip,
  });

  return res.status(200).json({
    success: true,
    message: "Order deleted successfully",
  });
});

/* ---------------------------------------------------
   🎟️ Redeem Points (Customer)
   - apply points as discount to order
--------------------------------------------------- */
export const redeemPoints = asyncHandler(async (req, res) => {
  const { id } = req.params; // order id
  const { pointsToRedeem } = req.body;
  const userId = req.user?._id;

  if (!pointsToRedeem || !Number.isInteger(Number(pointsToRedeem)) || Number(pointsToRedeem) <= 0)
    throw new ApiError(400, "pointsToRedeem is required and must be a positive integer");

  const order = await Order.findById(id).populate("user", "email username");
  if (!order) throw new ApiError(404, "Order not found");
  if (order.user._id.toString() !== userId.toString()) throw new ApiError(403, "Not authorized to redeem points on this order");

  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, "User not found");
  const pts = Number(pointsToRedeem);
  if ((user.points || 0) < pts) throw new ApiError(400, "Insufficient points");

  // prevent double redemption
  const alreadyRedeemed = order.meta && order.meta.redeemedPoints;
  if (alreadyRedeemed) throw new ApiError(400, "Points already redeemed for this order");

  const POINT_VALUE = Number(process.env.POINT_VALUE) || 1; // currency value per point
  const discount = pts * POINT_VALUE;
  const newTotal = Math.max(0, order.totalAmount - discount);

  order.totalAmount = newTotal;
  order.meta = Object.assign({}, order.meta || {}, { redeemedPoints: pts, discountApplied: discount });
  await order.save();

  user.points = (user.points || 0) - pts;
  await user.save();

  await logAudit({
    user: userId,
    action: "redeem_points",
    resource: "order",
    resourceId: order._id,
    meta: { pointsRedeemed: pts, discount },
    ip: req.ip,
  });

  return res.status(200).json(new ApiResponse(200, { order, user }, "Points redeemed and applied to order"));
});
