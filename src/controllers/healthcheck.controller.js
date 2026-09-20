import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";

const healthcheck = asyncHandler(async (req, res) => {
  //TODO: build a healthcheck response that simply returns the OK status as json with a message
  const healthData = {
    status: "OK",
    uptime: process.uptime(),
    date: new Date().toISOString(),
  };
  return res
    .status(200)
    .json(new ApiResponse(200, healthData, "Everything is okay"));
});

export { healthcheck };
