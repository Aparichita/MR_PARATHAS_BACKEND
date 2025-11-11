import Order from "../models/order.model.js";
import { Menu } from "../models/menu.model.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";
import logger from "../utils/logger.js";
import { sendEmail } from "../utils/email.js";
import { logAudit } from "../utils/audit.js";
import { User } from "../models/user.model.js";

/* ---------------------------------------------------
   🧾 Place a New Order (Customer)
--------------------------------------------------- */
export const createOrder = asyncHandler(async (req, res) => {
  const { items, deliveryAddress, paymentMethod } = req.body;
  const userId = req.user?._id;

  if (!items || !Array.isArray(items) || items.length === 0 || !deliveryAddress) {
    throw new ApiError(400, "All fields are required: items (array), deliveryAddress");
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
    deliveryAddress,
    paymentMethod: paymentMethod || "Cash on Delivery",
    orderStatus: "Pending",
  });

  // Notify admin about new order
  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail) {
      await sendEmail({
        to: adminEmail,
        subject: `New Order Received (#${newOrder._id})`,
        text: `A new order was placed.\nOrder ID: ${newOrder._id}\nTotal: ${newOrder.totalAmount}`,
        html: `<p>A new order was placed.</p><p><strong>Order ID:</strong> ${newOrder._id}</p><p><strong>Total:</strong> ${newOrder.totalAmount}</p>`,
      });
    } else {
      logger.warn("ADMIN_EMAIL not configured — admin not notified by email");
    }
  } catch (err) {
    logger.error("Failed to send new order email to admin:", err);
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
    // allow comma separated statuses
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
        // include entire day
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

  try {
    const customerEmail = order.user?.email;
    if (customerEmail) {
      await sendEmail({
        to: customerEmail,
        subject: `Order #${order._id} has been cancelled`,
        text: `Your order ${order._id} has been cancelled.`,
        html: `<p>Your order <strong>#${order._id}</strong> has been cancelled.</p>`,
      });
    } else {
      logger.warn(`Order ${order._id} has no customer email to notify`);
    }
  } catch (err) {
    logger.error("Failed to send order cancellation email to customer:", err);
  }

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
   - notify customer when status changes
--------------------------------------------------- */
export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { orderStatus } = req.body;

  if (!orderStatus) throw new ApiError(400, "orderStatus is required");

  const allowed = ["Pending", "Preparing", "Out for Delivery", "Delivered", "Cancelled"];
  if (!allowed.includes(orderStatus)) throw new ApiError(400, "Invalid orderStatus");

  const order = await Order.findById(id).populate("user", "email username");
  if (!order) throw new ApiError(404, "Order not found");

  order.orderStatus = orderStatus;
  await order.save();

  try {
    const customerEmail = order.user?.email;
    if (customerEmail) {
      await sendEmail({
        to: customerEmail,
        subject: `Order #${order._id} status updated to ${order.orderStatus}`,
        text: `Your order ${order._id} status is now: ${order.orderStatus}`,
        html: `<p>Your order <strong>#${order._id}</strong> status is now: <strong>${order.orderStatus}</strong></p>`,
      });
    } else {
      logger.warn(`Order ${order._id} has no customer email to notify`);
    }
  } catch (err) {
    logger.error("Failed to send order status email to customer:", err);
  }

  return res.status(200).json(new ApiResponse(200, order, "Order status updated successfully"));
});

/* ---------------------------------------------------
   ❌ Delete Order (Admin)
--------------------------------------------------- */
export const deleteOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const deletedOrder = await Order.findByIdAndDelete(id);
  if (!deletedOrder) throw new ApiError(404, "Order not found");

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

  if (!pointsToRedeem || pointsToRedeem <= 0) throw new ApiError(400, "pointsToRedeem is required and must be > 0");

  const order = await Order.findById(id).populate("user", "email username");
  if (!order) throw new ApiError(404, "Order not found");
  if (order.user._id.toString() !== userId.toString()) throw new ApiError(403, "Not authorized");

  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, "User not found");
  if (user.points < pointsToRedeem) throw new ApiError(400, "Insufficient points");

  // Simple scheme: 1 point = 1 unit currency discount (adjust via env)
  const POINT_VALUE = Number(process.env.POINT_VALUE) || 1;
  const discount = pointsToRedeem * POINT_VALUE;

  // Apply discount but do not allow negative total
  const newTotal = Math.max(0, order.totalAmount - discount);
  order.totalAmount = newTotal;
  order.meta = Object.assign({}, order.meta || {}, { redeemedPoints: pointsToRedeem, discountApplied: discount });
  await order.save();

  user.points -= pointsToRedeem;
  await user.save();

  // Audit log
  await logAudit({
    user: userId,
    action: "redeem_points",
    resource: "order",
    resourceId: order._id,
    meta: { pointsRedeemed: pointsToRedeem, discount },
    ip: req.ip,
  });

  return res.status(200).json(new ApiResponse(200, { order, user }, "Points redeemed and applied to order"));
});
