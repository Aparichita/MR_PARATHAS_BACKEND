import Order from "../models/order.model.js";
import { Menu } from "../models/menu.model.js";
import { asyncHandler } from "../utils/async-handler.js";
import { ApiResponse } from "../utils/api-response.js";
import { Audit } from "../models/audit.model.js";

/**
 * GET /admin/dashboard/summary
 * Returns counts and top selling item
 */
export const getDashboardSummary = asyncHandler(async (req, res) => {
  // total orders
  const totalOrders = await Order.countDocuments();

  // counts by status (handle common casings)
  const pendingOrders = await Order.countDocuments({
    orderStatus: { $in: ["Pending", "pending"] },
  });
  const deliveredOrders = await Order.countDocuments({
    orderStatus: { $in: ["Delivered", "delivered"] },
  });
  const cancelledOrders = await Order.countDocuments({
    orderStatus: { $in: ["Cancelled", "cancelled"] },
  });

  // Top selling item aggregation
  const menuCollection = Menu.collection.name; // safe collection name resolution
  const agg = await Order.aggregate([
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.menuItem",
        totalSold: { $sum: "$items.quantity" },
      },
    },
    { $sort: { totalSold: -1 } },
    { $limit: 1 },
    {
      $lookup: {
        from: menuCollection,
        localField: "_id",
        foreignField: "_id",
        as: "menu",
      },
    },
    { $unwind: { path: "$menu", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        menuId: "$_id",
        name: "$menu.name",
        totalSold: 1,
      },
    },
  ]);

  const topSellingItem = agg.length ? agg[0].name || String(agg[0].menuId) : null;

  return res.status(200).json(
    new ApiResponse(200, {
      totalOrders,
      pendingOrders,
      deliveredOrders,
      cancelledOrders,
      topSellingItem: topSellingItem || "N/A",
    }, "Dashboard summary fetched"),
  );
});

export const getAuditLogs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, action, user } = req.query;
  const filter = {};
  if (action) filter.action = action;
  if (user) filter.user = user;

  const skip = (Number(page) - 1) * Number(limit);
  const logs = await Audit.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).populate("user", "username email");
  const total = await Audit.countDocuments(filter);

  return res.status(200).json(new ApiResponse(200, { total, page: Number(page), limit: Number(limit), logs }, "Audit logs fetched"));
});