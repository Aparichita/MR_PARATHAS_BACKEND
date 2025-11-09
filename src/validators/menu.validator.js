import { body } from "express-validator";

export const menuValidator = () => [
  body("name").trim().notEmpty().withMessage("Menu item name is required"),

  body("price")
    .isFloat({ gt: 0 })
    .withMessage("Price must be a number greater than 0"),

  body("category").trim().notEmpty().withMessage("Category is required"),

  body("description")
    .optional()
    .isLength({ max: 300 })
    .withMessage("Description can be up to 300 characters long"),
];

export const ratingValidator = () => [
  body("rating")
    .notEmpty()
    .withMessage("rating is required")
    .isInt({ min: 1, max: 5 })
    .withMessage("rating must be an integer between 1 and 5"),
  body("comment")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage("comment must be a string up to 500 chars"),
];
