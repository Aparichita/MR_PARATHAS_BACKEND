import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/api-error.js";

/**
 * verifyJWT middleware
 * - Reads token from Authorization: Bearer <token> OR req.cookies.accessToken
 * - Tries JWT_SECRET and ACCESS_TOKEN_SECRET
 * - Attaches req.user (user document without sensitive fields)
 */
export const verifyJWT = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    const bearer = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
    const cookieToken = req.cookies && req.cookies.accessToken;
    const token = bearer || cookieToken;

    if (!token) throw new ApiError(401, "No access token provided");

    // try multiple possible secrets (permits varied env names)
    const secrets = [
      process.env.JWT_SECRET,
      process.env.ACCESS_TOKEN_SECRET,
      process.env.ACCESS_TOKEN, // optional
      "dev_jwt_secret",
    ].filter(Boolean);

    let payload = null;
    let lastError = null;
    for (const secret of secrets) {
      try {
        payload = jwt.verify(token, secret);
        break;
      } catch (err) {
        lastError = err;
      }
    }

    if (!payload) {
      // helpful debug log (remove in production)
      console.error("verifyJWT failed. Tried secrets:", secrets.map(s => (s ? "set" : "unset")));
      console.error("Token (first 40 chars):", token && token.substring ? token.substring(0, 40) : token);
      if (lastError) console.error("Last JWT error:", lastError.message);
      throw new ApiError(401, "Invalid or expired access token.");
    }

    const userId = payload.id || payload._id;
    if (!userId) throw new ApiError(401, "Invalid token payload");

    const user = await User.findById(userId).select("-password -refreshTokens -emailVerificationToken -emailVerificationExpiry");
    if (!user) throw new ApiError(401, "User not found for token");

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

// export default for compatibility with existing imports
export default verifyJWT;
