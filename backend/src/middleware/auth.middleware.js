import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../model/user.model.js";
import { ApiError } from "../utils/apiError.js";
import jwt from "jsonwebtoken";

const verifyJwt = asyncHandler(async (req, res, next) => {
  try {
    const accessToken =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (!accessToken) {
      throw new ApiError(401, "Uauthorized request");
    }

    const decoded = jwt.verify(accessToken, process.env.JWT_ACCESS_SECRET);

    req.user = decoded;

    next();
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid or expired tokens");
  }
});

// Optional variant — populates req.user when a valid token is present,
// but silently passes through (without error) when there is no token or
// the token is invalid/expired. Use on routes that work for both guests
// and logged-in users (e.g. getVideoById needs req.user to compute isLiked).
const verifyJwtOptional = (req, res, next) => {
  try {
    const accessToken =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (accessToken) {
      const decoded = jwt.verify(accessToken, process.env.JWT_ACCESS_SECRET);
      req.user = decoded;
    }
  } catch {
    // Token missing or invalid — treat as unauthenticated, do not error
  }
  next();
};

export { verifyJwt, verifyJwtOptional };
