import { body } from "express-validator";

export const orderValidator = () => [
  body("items")
    .isArray({ min: 1 })
    .withMessage("Order must contain at least one item"),

  body("items.*.menuItem")
    .notEmpty()
    .withMessage("Each order item must reference a menu item ID")
    .isMongoId()
    .withMessage("Menu item ID must be a valid Mongo ID"),

  body("items.*.quantity")
    .notEmpty()
    .withMessage("Quantity is required for each item")
    .isInt({ min: 1 })
    .withMessage("Quantity must be at least 1"),

  body("paymentStatus")
    .optional()
    .isIn(["pending", "paid", "failed"])
    .withMessage("Payment status must be 'pending', 'paid', or 'failed'"),

  body("deliveryAddress")
    .optional()
    .trim()
    .isLength({ min: 5 })
    .withMessage("Delivery address must be at least 5 characters long"),
];

// Validator for updating order status (used by admin)
export const orderStatusValidator = () => [
  body("orderStatus")
    .notEmpty()
    .withMessage("orderStatus is required")
    .isIn(["Pending", "Preparing", "Out for Delivery", "Delivered", "Cancelled"])
    .withMessage("Invalid orderStatus"),
];
