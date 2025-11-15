import Order from "../models/order.model.js";
import { Menu } from "../models/menu.model.js";
import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/async-handler.js";
import { ApiResponse } from "../utils/api-response.js";

/* GET /admin/dashboard */
export const getDashboard = asyncHandler(async (req, res) => {
  // total orders
  const totalOrders = await Order.countDocuments();

  // orders by status
  const orders = await Order.aggregate([
    { $group: { _id: "$orderStatus", count: { $sum: 1 } } },
  ]);
  const ordersByStatus = orders.reduce((acc, o) => {
    acc[o._id] = o.count;
    return acc;
  }, {});

  // top selling item (by quantity)
  const top = await Order.aggregate([
    { $unwind: "$items" },
    { $group: { _id: "$items.menuItem", qty: { $sum: "$items.quantity" } } },
    { $sort: { qty: -1 } },
    { $limit: 1 },
  ]);
  let topSellingItem = null;
  if (top.length) {
    const menu = await Menu.findById(top[0]._id).select("name");
    topSellingItem = { name: menu?.name || "Unknown", quantity: top[0].qty };
  }

  // total users
  const totalUsers = await User.countDocuments();

  return res.status(200).json(new ApiResponse(200, {
    totalOrders,
    ordersByStatus,
    topSellingItem,
    totalUsers,
  }, "Admin dashboard"));
});