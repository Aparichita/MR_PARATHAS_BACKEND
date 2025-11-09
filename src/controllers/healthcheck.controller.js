import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";
import logger from "../utils/logger.js";


/**
 * @desc Health check endpoint to verify server and DB status
 * @route GET /api/v1/healthcheck
 * @access Public
 */
export const healthCheck = asyncHandler(async (req, res) => {
  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { message: "Server is running fine 🟢" },
        "Health check successful",
      ),
    );
});
