import { ApiError } from "../utils/api-error.js";
import logger from "../utils/logger.js";

/**
 * Centralized Express error-handling middleware.
 * Catches both operational (ApiError) and unexpected errors.
 */
export const errorHandler = (err, req, res, next) => {
  console.error("🔥 Error caught:", err);

  // If the error is an instance of our custom ApiError class
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors || [],
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
  }

  // For unexpected or unhandled errors
  return res.status(500).json({
    success: false,
    message: err.message || "Internal Server Error",
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
};
