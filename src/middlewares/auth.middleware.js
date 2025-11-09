import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";

/**
 * Middleware to verify JWT access token and attach user to request
 */
export const verifyJWT = asyncHandler(async (req, res, next) => {
  let token = null;

  // Get token from cookie or Authorization header
  if (req.cookies?.accessToken) {
    token = req.cookies.accessToken;
  } else if (req.header("Authorization")?.startsWith("Bearer ")) {
    token = req.header("Authorization").replace("Bearer ", "");
  }

  if (!token) {
    throw new ApiError(401, "Access denied. No token provided.");
  }

  try {
    // Verify JWT
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    // Fetch user details (excluding sensitive fields)
    const user = await User.findById(decoded?._id).select(
      "-password -refreshToken -forgotPasswordToken -forgotPasswordExpiry -emailVerificationToken -emailVerificationExpiry",
    );

    if (!user) {
      throw new ApiError(401, "Invalid or expired token. User not found.");
    }

    req.user = user; // attach user info to req
    next();
  } catch (error) {
    throw new ApiError(401, "Invalid or expired access token.");
  }
});

/**
 * Optional middleware for routes that require admin privileges
 */
export const verifyAdmin = asyncHandler(async (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    throw new ApiError(403, "Access denied. Admin privileges required.");
  }
  next();
});
