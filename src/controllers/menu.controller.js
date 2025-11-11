import { Menu } from "../models/menu.model.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";

/* ---------------------------------------------------
   🍽️ Create a new Menu Item (Admin only)
--------------------------------------------------- */
export const createMenuItem = async (req, res) => {
  try {
    const { name, description, price, category, imageUrl, isAvailable } =
      req.body;

    // Validation
    if (!name || !price || !category) {
      return res.status(400).json({
        success: false,
        message: "Name, price, and category are required",
      });
    }

    const newItem = await Menu.create({
      name,
      description,
      price,
      category,
      imageUrl,
      isAvailable,
    });

    res.status(201).json({
      success: true,
      message: "Menu item created successfully",
      data: newItem,
    });
  } catch (error) {
    console.error("Error creating menu item:", error);
    res.status(500).json({
      success: false,
      message: "Server error while creating menu item",
    });
  }
};

/* ---------------------------------------------------
   📜 Get All Menu Items (Public)
--------------------------------------------------- */
export const getAllMenuItems = asyncHandler(async (req, res) => {
  const { name, category, minPrice, maxPrice, page = 1, limit = 20, sort } = req.query;
  const filter = {};

  if (name) filter.name = { $regex: name, $options: "i" };
  if (category) filter.category = category;
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }

  const skip = (Number(page) - 1) * Number(limit);
  const q = Menu.find(filter).skip(skip).limit(Number(limit));
  if (sort) q.sort(sort);
  else q.sort({ createdAt: -1 });

  const [items, total] = await Promise.all([q.exec(), Menu.countDocuments(filter)]);

  return res.status(200).json({
    success: true,
    count: items.length,
    total,
    page: Number(page),
    limit: Number(limit),
    data: items,
  });
});

/* ---------------------------------------------------
   🔍 Get Single Menu Item by ID (Public)
--------------------------------------------------- */
export const getMenuItemById = async (req, res) => {
  try {
    const { id } = req.params;

    const item = await Menu.findById(id);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Menu item not found",
      });
    }

    res.status(200).json({
      success: true,
      data: item,
    });
  } catch (error) {
    console.error("Error fetching menu item:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching menu item",
    });
  }
};

/* ---------------------------------------------------
   ✏️ Update Menu Item (Admin only)
--------------------------------------------------- */
export const updateMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const updatedItem = await Menu.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!updatedItem) {
      return res.status(404).json({
        success: false,
        message: "Menu item not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Menu item updated successfully",
      data: updatedItem,
    });
  } catch (error) {
    console.error("Error updating menu item:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating menu item",
    });
  }
};

/* ---------------------------------------------------
   ❌ Delete Menu Item (Admin only)
--------------------------------------------------- */
export const deleteMenuItem = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedItem = await Menu.findByIdAndDelete(id);

    if (!deletedItem) {
      return res.status(404).json({
        success: false,
        message: "Menu item not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Menu item deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting menu item:", error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting menu item",
    });
  }
};

/* ---------------------------------------------------
   ⭐ Rate Menu Item (User)
--------------------------------------------------- */
/* POST /menu/:id/rate
   Auth required (req.user._id should be available)
*/
export const rateMenuItem = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rating, comment } = req.body;
  const userId = req.user?._id;
  if (!userId) throw new ApiError(401, "Authentication required");

  const menu = await Menu.findById(id);
  if (!menu) throw new ApiError(404, "Menu item not found");

  // Prevent duplicate rating by same user — you can allow updates instead
  const existingIdx = menu.ratings.findIndex((r) => String(r.user) === String(userId));
  if (existingIdx !== -1) {
    // update existing rating
    menu.ratings[existingIdx].rating = rating;
    menu.ratings[existingIdx].comment = comment || menu.ratings[existingIdx].comment;
    menu.ratings[existingIdx].createdAt = new Date();
  } else {
    menu.ratings.push({ user: userId, rating, comment });
  }

  await menu.save();

  // return updated ratings and average
  const payload = {
    averageRating: menu.averageRating,
    totalRatings: menu.ratings.length,
    ratings: menu.ratings.slice().reverse(), // newest first
  };

  return res.status(201).json(new ApiResponse(201, payload, "Rating saved"));
});

/* GET /menu/:id/ratings
   Public
*/
export const getMenuRatings = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const menu = await Menu.findById(id).populate("ratings.user", "username email");
  if (!menu) throw new ApiError(404, "Menu item not found");

  const payload = {
    averageRating: menu.averageRating,
    totalRatings: menu.ratings.length,
    ratings: menu.ratings
      .map((r) => ({
        id: r._id,
        user: r.user ? { id: r.user._id, username: r.user.username, email: r.user.email } : null,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt,
      }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
  };

  return res.status(200).json(new ApiResponse(200, payload, "Ratings fetched"));
});
