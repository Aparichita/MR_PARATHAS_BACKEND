import Order from "../models/order.model.js";
import { Menu } from "../models/menu.model.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import logger from "../utils/logger.js";

/* ---------------------------------------------------
   🧾 Place a New Order (Customer)
--------------------------------------------------- */
export const createOrder = async (req, res) => {
  try {
    const { items, totalAmount, deliveryAddress, paymentMethod } = req.body;
    const userId = req.user?._id;

    if (!items || items.length === 0 || !totalAmount || !deliveryAddress) {
      return res.status(400).json({
        success: false,
        message: "All fields are required: items, totalAmount, deliveryAddress",
      });
    }

    // Validate items exist in menu
    for (const item of items) {
      const menuItem = await Menu.findById(item.menuItem);
      if (!menuItem) {
        return res.status(404).json({
          success: false,
          message: `Menu item not found: ${item.menuItem}`,
        });
      }
    }
    

    const newOrder = await Order.create({
      user: userId,
      items,
      totalAmount,
      deliveryAddress,
      paymentMethod: paymentMethod || "Cash on Delivery",
      orderStatus: "Pending",
    });

    res.status(201).json({
      success: true,
      message: "Order placed successfully",
      data: newOrder,
    });
  } catch (error) {
    console.error("Error placing order:", error);
    res.status(500).json({
      success: false,
      message: "Server error while placing order",
    });
  }
};

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
export const getMyOrders = async (req, res) => {
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
export const cancelOrder = async (req, res, next) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId);
    if (!order) {
      throw new ApiError(404, "Order not found");
    }

    // Optional: Only the user who created it can cancel
    if (order.user.toString() !== req.user.id) {
      throw new ApiError(403, "You can only cancel your own orders");
    }

    order.status = "cancelled";
    await order.save();

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
    if (
      req.user.role !== "admin" &&
      order.user._id.toString() !== req.user._id.toString()
    ) {
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
export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { orderStatus } = req.body;

    const validStatuses = [
      "Pending",
      "Preparing",
      "Out for Delivery",
      "Delivered",
      "Cancelled",
    ];
    if (!validStatuses.includes(orderStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Choose one of: ${validStatuses.join(", ")}`,
      });
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      id,
      { orderStatus },
      { new: true, runValidators: true },
    );

    if (!updatedOrder) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Order status updated successfully",
      data: updatedOrder,
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating order status",
    });
  }
};

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
