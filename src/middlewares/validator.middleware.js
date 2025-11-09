import { validationResult } from "express-validator";
import { ApiError } from "../utils/api-error.js";

/**
 * Middleware to handle validation results from express-validator
 */
export const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (errors.isEmpty()) return next();

  // Collect all validation messages in a clean format
  const extractedErrors = errors.array().map((err) => ({
    field: err.path,
    message: err.msg,
  }));

  // Use ApiError for consistent error responses
  throw new ApiError(422, "Invalid request data", extractedErrors);
};
