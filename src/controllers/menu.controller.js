import { Menu } from "../models/menu.model.js";

import logger from "../utils/logger.js";
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
export const getAllMenuItems = async (req, res) => {
  try {
    const { category } = req.query;
    let filter = {};

    if (category) {
      filter.category = category;
    }

    const menuItems = await Menu.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: menuItems.length,
      data: menuItems,
    });
  } catch (error) {
    console.error("Error fetching menu items:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching menu items",
    });
  }
};

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
