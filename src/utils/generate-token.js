import jwt from "jsonwebtoken";

/**
 * Generates a JWT access token.
 * @param {Object} payload - Data to embed in token (e.g. user id, email)
 * @returns {string} Access token
 */
export const generateAccessToken = (payload) => {
  return jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "15m",
  });
};

/**
 * Generates a JWT refresh token.
 * @param {Object} payload - Data to embed in token (usually just user id)
 * @returns {string} Refresh token
 */
export const generateRefreshToken = (payload) => {
  return jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "7d",
  });
};
