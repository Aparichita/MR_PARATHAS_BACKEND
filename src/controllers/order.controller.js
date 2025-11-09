import Order from "../models/order.model.js";
import { Menu } from "../models/menu.model.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";
import logger from "../utils/logger.js";
import { sendEmail } from "../utils/email.js";

/* ---------------------------------------------------
   🧾 Place a New Order (Customer)
--------------------------------------------------- */
export const createOrder = asyncHandler(async (req, res) => {
  const { items, deliveryAddress, paymentMethod } = req.body;
  const userId = req.user?._id;

  if (!items || !Array.isArray(items) || items.length === 0 || !deliveryAddress) {
    throw new ApiError(400, "All fields are required: items (array), deliveryAddress");
  }

  // Unique menu IDs
  const menuIds = [...new Set(items.map((it) => String(it.menuItem)))];

  // Fetch menu docs
  const menuDocs = await Menu.find({ _id: { $in: menuIds } });

  // Check missing menu items
  const foundIds = new Set(menuDocs.map((m) => String(m._id)));
  const missing = menuIds.filter((id) => !foundIds.has(id));
  if (missing.length) {
    throw new ApiError(404, `Menu item(s) not found: ${missing.join(", ")}`);
  }

  // price map
  const priceMap = {};
  for (const m of menuDocs) priceMap[String(m._id)] = Number(m.price || 0);

  // Calculate total
  let totalAmount = 0;
  for (const it of items) {
    const qty = Number(it.quantity || 0);
    if (!Number.isInteger(qty) || qty < 1) {
      throw new ApiError(400, `Invalid quantity for menuItem ${it.menuItem}`);
    }
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

  return res
    .status(201)
    .json(new ApiResponse(201, newOrder, "Order placed successfully"));
});

/* ---------------------------------------------------
   📦 Get All Orders (Admin only)
--------------------------------------------------- */
export const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("user", "username email")
      .populate("items.menuItem", "name price")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching orders",
    });
  }
};

/* ---------------------------------------------------
   👤 Get Orders for Logged-in User (Customer)
--------------------------------------------------- */
export const getUserOrders = async (req, res) => {
  try {
    const userId = req.user?._id;
    const orders = await Order.find({ user: userId })
      .populate("items.menuItem", "name price")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    console.error("Error fetching user orders:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching your orders",
    });
  }
};

/* ---------------------------------------------------
   ❌ Cancel My Order (Customer)
--------------------------------------------------- */
export const cancelOrder = async (req, res, next) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id);
    if (!order) {
      throw new ApiError(404, "Order not found");
    }

    // Only the user who created it can cancel
    if (order.user.toString() !== req.user._id.toString()) {
      throw new ApiError(403, "You can only cancel your own orders");
    }

    order.orderStatus = "Cancelled";
    await order.save();

    // Notify customer about order cancellation
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

    return res
      .status(200)
      .json(new ApiResponse(200, order, "Order cancelled successfully"));
  } catch (err) {
    next(err);
  }
};

/* ---------------------------------------------------
   🔍 Get Single Order by ID (Admin or Customer)
--------------------------------------------------- */
export const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id)
      .populate("user", "username email")
      .populate("items.menuItem", "name price");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Check if user is authorized (admin or owner)
    if (req.user.role !== "admin" && order.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this order",
      });
    }

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching order",
    });
  }
};

/* ---------------------------------------------------
   🚚 Update Order Status (Admin)
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

  // Notify customer of status change
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

  return res
    .status(200)
    .json(new ApiResponse(200, order, "Order status updated successfully"));
});

/* ---------------------------------------------------
   ❌ Delete Order (Admin)
--------------------------------------------------- */
export const deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedOrder = await Order.findByIdAndDelete(id);
    if (!deletedOrder) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Order deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting order:", error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting order",
    });
  }
};
