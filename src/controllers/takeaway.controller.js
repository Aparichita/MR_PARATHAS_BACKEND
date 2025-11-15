import { TakeawayCart } from "../models/takeaway.model.js";
import { TakeawayOrder } from "../models/takeaway-order.model.js";
import { Menu } from "../models/menu.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";
import { sendEmail } from "../utils/email.js";
import { logAudit } from "../utils/audit.js";

/* ---------------------------------------------------
   🛒 GET Takeaway Cart (Customer)
--------------------------------------------------- */
export const getTakeawayCart = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  const cart = await TakeawayCart.findOne({ user: userId }).populate("items.menuItem", "name price");
  return res.status(200).json(new ApiResponse(200, cart || { items: [] }, "Takeaway cart fetched"));
});

/* ---------------------------------------------------
   ➕ ADD Item to Takeaway Cart (Customer)
   Body: { menuItem: "<id>", quantity: 2 }
--------------------------------------------------- */
export const addToTakeawayCart = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  const { menuItem, quantity = 1 } = req.body;
  if (!menuItem) throw new ApiError(400, "menuItem is required");

  const qty = Number(quantity) || 1;
  if (!Number.isInteger(qty) || qty < 1) throw new ApiError(400, "quantity must be integer >= 1");

  // validate menu item exists
  const menuDoc = await Menu.findById(menuItem);
  if (!menuDoc) throw new ApiError(404, "Menu item not found");

  let cart = await TakeawayCart.findOne({ user: userId });
  if (!cart) {
    cart = await TakeawayCart.create({ user: userId, items: [{ menuItem, quantity: qty }] });
  } else {
    const existing = cart.items.find((i) => String(i.menuItem) === String(menuItem));
    if (existing) existing.quantity += qty;
    else cart.items.push({ menuItem, quantity: qty });
    await cart.save();
  }

  await logAudit({
    user: userId,
    action: "takeaway_cart_item_added",
    resource: "takeaway_cart",
    resourceId: cart._id,
    meta: { menuItem, quantity: qty },
    ip: req.ip,
  });

  await cart.populate("items.menuItem", "name price");
  return res.status(200).json(new ApiResponse(200, cart, "Item added to takeaway cart"));
});

/* ---------------------------------------------------
   ✏️ UPDATE Takeaway Cart Item (Customer)
   Body: { quantity: 3 }
--------------------------------------------------- */
export const updateTakeawayCartItem = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  const { menuItemId } = req.params;
  const { quantity } = req.body;

  const qty = Number(quantity);
  if (!menuItemId) throw new ApiError(400, "menuItemId required");
  if (!Number.isInteger(qty) || qty < 0) throw new ApiError(400, "quantity must be integer >= 0");

  const cart = await TakeawayCart.findOne({ user: userId });
  if (!cart) throw new ApiError(404, "Cart not found");

  const idx = cart.items.findIndex((i) => String(i.menuItem) === String(menuItemId));
  if (idx === -1) throw new ApiError(404, "Item not in cart");

  if (qty === 0) cart.items.splice(idx, 1);
  else cart.items[idx].quantity = qty;

  await cart.save();
  await logAudit({
    user: userId,
    action: "takeaway_cart_item_updated",
    resource: "takeaway_cart",
    resourceId: cart._id,
    meta: { menuItemId, quantity: qty },
    ip: req.ip,
  });

  await cart.populate("items.menuItem", "name price");
  return res.status(200).json(new ApiResponse(200, cart, "Takeaway cart updated"));
});

/* ---------------------------------------------------
   ❌ REMOVE Item from Takeaway Cart (Customer)
--------------------------------------------------- */
export const removeTakeawayCartItem = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  const { menuItemId } = req.params;

  const cart = await TakeawayCart.findOne({ user: userId });
  if (!cart) throw new ApiError(404, "Cart not found");

  cart.items = cart.items.filter((i) => String(i.menuItem) !== String(menuItemId));
  await cart.save();

  await logAudit({
    user: userId,
    action: "takeaway_cart_item_removed",
    resource: "takeaway_cart",
    resourceId: cart._id,
    meta: { menuItemId },
    ip: req.ip,
  });

  await cart.populate("items.menuItem", "name price");
  return res.status(200).json(new ApiResponse(200, cart, "Item removed from takeaway cart"));
});

/* ---------------------------------------------------
   🗑️ CLEAR Takeaway Cart (Customer)
--------------------------------------------------- */
export const clearTakeawayCart = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  await TakeawayCart.findOneAndDelete({ user: userId });

  await logAudit({
    user: userId,
    action: "takeaway_cart_cleared",
    resource: "takeaway_cart",
    meta: {},
    ip: req.ip,
  });

  return res.status(200).json(new ApiResponse(200, {}, "Takeaway cart cleared"));
});

/* ---------------------------------------------------
   🛍️ CHECKOUT Takeaway Cart → Create Order (Customer)
   Body: { paymentMethod: "Online" or "Cash at Shop", notes: "extra spicy" }
--------------------------------------------------- */
export const checkoutTakeawayCart = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  const { paymentMethod = "Cash at Shop", notes = "" } = req.body;

  if (!["Online", "Cash at Shop"].includes(paymentMethod)) {
    throw new ApiError(400, 'paymentMethod must be "Online" or "Cash at Shop"');
  }

  const cart = await TakeawayCart.findOne({ user: userId });
  if (!cart || cart.items.length === 0) throw new ApiError(400, "Takeaway cart is empty");

  const menuIds = cart.items.map((i) => i.menuItem);
  const menuDocs = await Menu.find({ _id: { $in: menuIds } });
  const priceMap = {};
  for (const m of menuDocs) priceMap[String(m._id)] = Number(m.price || 0);

  let totalAmount = 0;
  for (const it of cart.items) {
    const price = priceMap[String(it.menuItem)];
    if (price === undefined) throw new ApiError(400, `Menu item not found: ${it.menuItem}`);
    totalAmount += price * Number(it.quantity);
  }

  // estimated pickup time: 30 minutes from now
  const pickupTime = new Date(Date.now() + 30 * 60 * 1000);

  const takeawayOrder = await TakeawayOrder.create({
    user: userId,
    items: cart.items.map((i) => ({ menuItem: i.menuItem, quantity: i.quantity })),
    totalAmount,
    paymentMethod,
    paymentStatus: paymentMethod === "Online" ? "Pending" : "Pending", // both start as pending
    orderStatus: "Pending",
    pickupTime,
    notes,
  });

  // clear cart
  await TakeawayCart.findOneAndDelete({ user: userId });

  // send confirmation email
  try {
    const user = await User.findById(userId);
    const customerEmail = user?.email;
    if (customerEmail) {
      await sendEmail({
        to: customerEmail,
        subject: "Takeaway Order Confirmation",
        text: `Your takeaway order is confirmed.\n\nOrder ID: ${takeawayOrder._id}\nTotal: ₹${totalAmount}\nPayment: ${paymentMethod}\nPickup Time: ${pickupTime.toLocaleString()}\n\nThank you!`,
        html: `
          <h2>Takeaway Order Confirmed ✓</h2>
          <p><strong>Order ID:</strong> ${takeawayOrder._id}</p>
          <p><strong>Total Amount:</strong> ₹${totalAmount}</p>
          <p><strong>Payment Method:</strong> ${paymentMethod}</p>
          <p><strong>Estimated Pickup Time:</strong> ${pickupTime.toLocaleString()}</p>
          <p><strong>Special Notes:</strong> ${notes || "None"}</p>
          <p>Thank you for your order!</p>
        `,
      });
    }
  } catch (err) {
    console.error("Failed to send takeaway confirmation email:", err);
  }

  // notify admin
  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail) {
      await sendEmail({
        to: adminEmail,
        subject: "New Takeaway Order",
        text: `New takeaway order received.\n\nOrder ID: ${takeawayOrder._id}\nCustomer: ${req.user?.username}\nTotal: ₹${totalAmount}\nPayment: ${paymentMethod}\nPickup Time: ${pickupTime.toLocaleString()}`,
        html: `
          <p><strong>New Takeaway Order</strong></p>
          <p><strong>Order ID:</strong> ${takeawayOrder._id}</p>
          <p><strong>Customer:</strong> ${req.user?.username}</p>
          <p><strong>Total Amount:</strong> ₹${totalAmount}</p>
          <p><strong>Payment Method:</strong> ${paymentMethod}</p>
          <p><strong>Pickup Time:</strong> ${pickupTime.toLocaleString()}</p>
        `,
      });
    }
  } catch (err) {
    console.error("Failed to send admin notification:", err);
  }

  await logAudit({
    user: userId,
    action: "takeaway_order_created",
    resource: "takeaway_order",
    resourceId: takeawayOrder._id,
    meta: { totalAmount, paymentMethod },
    ip: req.ip,
  });

  await takeawayOrder.populate("items.menuItem", "name price");
  return res.status(201).json(new ApiResponse(201, takeawayOrder, "Takeaway order created successfully"));
});

/* ---------------------------------------------------
   📦 GET User's Takeaway Orders (Customer)
--------------------------------------------------- */
export const getUserTakeawayOrders = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  const orders = await TakeawayOrder.find({ user: userId })
    .populate("items.menuItem", "name price")
    .sort({ createdAt: -1 });

  return res.status(200).json(new ApiResponse(200, orders, "User takeaway orders fetched"));
});

/* ---------------------------------------------------
   📅 GET All Takeaway Orders (Admin)
   Query: status, paymentStatus, from, to
--------------------------------------------------- */
export const getAllTakeawayOrders = asyncHandler(async (req, res) => {
  const { status, paymentStatus, from, to } = req.query;
  const filter = {};

  if (status) filter.orderStatus = status;
  if (paymentStatus) filter.paymentStatus = paymentStatus;

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
  }

  const orders = await TakeawayOrder.find(filter)
    .populate("user", "username email")
    .populate("items.menuItem", "name price")
    .sort({ createdAt: -1 });

  return res.status(200).json(new ApiResponse(200, orders, "All takeaway orders fetched"));
});

/* ---------------------------------------------------
   🔍 GET Single Takeaway Order (Customer or Admin)
--------------------------------------------------- */
export const getTakeawayOrderById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const order = await TakeawayOrder.findById(id)
    .populate("user", "username email")
    .populate("items.menuItem", "name price");

  if (!order) throw new ApiError(404, "Takeaway order not found");

  if (req.user.role !== "admin" && order.user._id.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Not authorized to view this order");
  }

  return res.status(200).json(new ApiResponse(200, order, "Takeaway order fetched"));
});

/* ---------------------------------------------------
   ✏️ UPDATE Takeaway Order Status (Admin)
   Body: { orderStatus: "Preparing" }
--------------------------------------------------- */
export const updateTakeawayOrderStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { orderStatus } = req.body;

  if (!orderStatus) throw new ApiError(400, "orderStatus is required");

  const allowed = ["Pending", "Preparing", "Ready for Pickup", "Picked Up", "Cancelled"];
  if (!allowed.includes(orderStatus)) throw new ApiError(400, "Invalid orderStatus");

  const order = await TakeawayOrder.findById(id).populate("user", "email username");
  if (!order) throw new ApiError(404, "Takeaway order not found");

  order.orderStatus = orderStatus;
  await order.save();

  // notify customer
  try {
    const customerEmail = order.user?.email;
    if (customerEmail) {
      await sendEmail({
        to: customerEmail,
        subject: `Takeaway Order Status Update - ${orderStatus}`,
        text: `Your takeaway order status has been updated to ${orderStatus}.\n\nOrder ID: ${order._id}`,
        html: `
          <p>Your takeaway order status: <strong>${orderStatus}</strong></p>
          <p><strong>Order ID:</strong> ${order._id}</p>
        `,
      });
    }
  } catch (err) {
    console.error("Failed to send status update email:", err);
  }

  await logAudit({
    user: req.user?._id,
    action: "takeaway_order_status_updated",
    resource: "takeaway_order",
    resourceId: order._id,
    meta: { status: orderStatus },
    ip: req.ip,
  });

  return res.status(200).json(new ApiResponse(200, order, "Takeaway order status updated"));
});

/* ---------------------------------------------------
   💳 UPDATE Payment Status (Admin or Payment Gateway)
   Body: { paymentStatus: "Paid" }
--------------------------------------------------- */
export const updateTakeawayPaymentStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { paymentStatus } = req.body;

  if (!["Pending", "Paid"].includes(paymentStatus)) throw new ApiError(400, "Invalid paymentStatus");

  const order = await TakeawayOrder.findById(id).populate("user", "email username");
  if (!order) throw new ApiError(404, "Takeaway order not found");

  order.paymentStatus = paymentStatus;
  await order.save();

  // notify customer on payment confirmation
  if (paymentStatus === "Paid") {
    try {
      const customerEmail = order.user?.email;
      if (customerEmail) {
        await sendEmail({
          to: customerEmail,
          subject: "Payment Confirmed",
          text: `Payment for your takeaway order has been confirmed.\n\nOrder ID: ${order._id}\nAmount: ₹${order.totalAmount}`,
          html: `
            <p>Payment confirmed ✓</p>
            <p><strong>Order ID:</strong> ${order._id}</p>
            <p><strong>Amount Paid:</strong> ₹${order.totalAmount}</p>
          `,
        });
      }
    } catch (err) {
      console.error("Failed to send payment confirmation email:", err);
    }
  }

  await logAudit({
    user: req.user?._id,
    action: "takeaway_payment_status_updated",
    resource: "takeaway_order",
    resourceId: order._id,
    meta: { paymentStatus },
    ip: req.ip,
  });

  return res.status(200).json(new ApiResponse(200, order, "Payment status updated"));
});

/* ---------------------------------------------------
   ❌ CANCEL Takeaway Order (Customer or Admin)
--------------------------------------------------- */
export const cancelTakeawayOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const order = await TakeawayOrder.findById(id).populate("user", "email username");

  if (!order) throw new ApiError(404, "Takeaway order not found");

  if (req.user.role !== "admin" && order.user._id.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Not authorized to cancel this order");
  }

  if (["Picked Up", "Cancelled"].includes(order.orderStatus)) {
    throw new ApiError(400, `Cannot cancel order with status: ${order.orderStatus}`);
  }

  order.orderStatus = "Cancelled";
  await order.save();

  // notify customer
  try {
    const customerEmail = order.user?.email;
    if (customerEmail) {
      await sendEmail({
        to: customerEmail,
        subject: "Takeaway Order Cancelled",
        text: `Your takeaway order has been cancelled.\n\nOrder ID: ${order._id}`,
        html: `<p>Your takeaway order has been cancelled.</p><p><strong>Order ID:</strong> ${order._id}</p>`,
      });
    }
  } catch (err) {
    console.error("Failed to send cancellation email:", err);
  }

  await logAudit({
    user: req.user?._id,
    action: "takeaway_order_cancelled",
    resource: "takeaway_order",
    resourceId: order._id,
    meta: {},
    ip: req.ip,
  });

  return res.status(200).json(new ApiResponse(200, order, "Takeaway order cancelled"));
});