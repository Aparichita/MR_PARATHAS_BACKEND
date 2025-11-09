import { ApiError } from "../utils/api-error.js";

/**
 * Middleware to restrict access based on user roles.
 * Usage: router.post("/admin", verifyJWT, authorizeRoles("admin"), controllerFn);
 */
export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      // Ensure user is attached by verifyJWT middleware
      if (!req.user) {
        throw new ApiError(401, "User not authenticated");
      }

      // Check if the user’s role is allowed
      if (!allowedRoles.includes(req.user.role)) {
        throw new ApiError(403, "Access denied. Insufficient permissions");
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
