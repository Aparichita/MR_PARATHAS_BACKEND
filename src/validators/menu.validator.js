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
