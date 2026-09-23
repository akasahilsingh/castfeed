import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../model/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";
import { v2 as cloudinary } from "cloudinary";
import mongoose from "mongoose";

const generateAccessTokenAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    // throw new ApiError(500, "Error while genrating access and refresh tokens")
    // console.log(error.message);
  }
};

export const deleteImgOnCloudinary = async (publicId) => {
  try {
    const res = await cloudinary.uploader.destroy(publicId);

    return res;
  } catch (error) {
    throw new ApiError(500, error?.message || "Unable to delete the image");
  }
};

const isProduction = process.env.NODE_ENV === "production";
const options = {
  httpOnly: true,
  secure: isProduction,       // false on localhost (HTTP), true in prod (HTTPS)
  sameSite: isProduction ? "strict" : "lax",
};

const registerUser = asyncHandler(async (req, res) => {
  const { userName, email, fullName, password } = req.body;
  //   console.log("Request: ", req.body);
  if (!userName || !email || !fullName || !password) {
    throw new ApiError(400, "All fields are required to move forward");
  }

  const existedUser = await User.findOne({
    $or: [{ userName }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "User already exists");
  }

  const localAvatarPath = req.files?.avatar?.[0].path;
  // console.log("AvatarPath : ", localAvatarPath);

  const localCoverImagePath = req.files?.coverImage?.[0].path;
  // console.log("localCoverImagepath: ", localCoverImagePath);

  if (!localAvatarPath) {
    throw new ApiError(400, "Avatar is required");
  }

  const avatarOnCloudinary = await uploadOnCloudinary(localAvatarPath);

  if (!avatarOnCloudinary) {
    throw new ApiError(500, "Unable to upload avatar");
  }

  const coverImageOnCloudinary = await uploadOnCloudinary(localCoverImagePath);
  // console.log(coverImageOnCloudinary);
  const user = await User.create({
    userName: userName.toLowerCase(),
    email,
    fullName,
    password,
    avatar: avatarOnCloudinary.url,
    coverImage: coverImageOnCloudinary?.url || "",
  });

  const registeredUser = await User.findById(user._id).select(
    "-password -refreshToken",
  );

  res
    .status(201)
    .json(new ApiResponse(201, registeredUser, "User successfully registered"));
});

const loginUser = asyncHandler(async (req, res) => {
  // get email or userName and password
  // validate and check if available
  //check password if correct
  // generate access and refresh tokens
  // send in response with tokens
  // console.log("Req from client: ", req.body)
  const { email, password, userName } = req.body;

  if (!(email || userName) || !password) {
    throw new ApiError(400, "Provide all fields");
  }

  const user = await User.findOne({
    $or: [{ email }, { userName }],
  });

  if (!user) {
    throw new ApiError(404, "User does not exists");
  }

  const authenticatedUser = await user.isPasswordCorrect(password);

  if (!authenticatedUser) {
    throw new ApiError(401, "Wrong credentials");
  }

  const { accessToken, refreshToken } =
    await generateAccessTokenAndRefreshToken(user._id);

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken",
  );

  res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { loggedInUser, accessToken, refreshToken },
        "Login successfull",
      ),
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  const { decoded } = req.user;
  await User.findOneAndUpdate(
    decoded?._id,
    {
      $unset: {
        refreshToken: 1,
      },
    },
    {
      new: true,
    },
  );

  res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request");
  }
  let decoded;
  try {
    decoded = jwt.verify(incomingRefreshToken, process.env.JWT_REFRESH_SECRET);
  } catch (error) {
    throw new ApiError(401, error?.message || "Unable to verify token");
  }
  // console.log("decoded: ", decoded);
  const user = await User.findById(decoded?._id);

  if (!user) {
    throw new ApiError(401, "Invalid refresh token");
  }

  if (incomingRefreshToken !== user?.refreshToken) {
    throw new ApiError(401, "Refresh token expired or used");
  }

  const { accessToken, refreshToken } =
    await generateAccessTokenAndRefreshToken(user?._id);

  res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { accessToken, refreshToken },
        "Access Token Updated successfully",
      ),
    );
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    throw new ApiError(400, "Old and new passwords are required to continue");
  }

  if (oldPassword === newPassword) {
    throw new ApiError(400, "Old and new password must be different");
  }

  const user = await User.findById(req.user?._id);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid Password");
  }

  user.password = newPassword;
  user.refreshToken = undefined;

  await user.save({ validateBeforeSave: false });

  res
    .status(200)
    .json(
      new ApiResponse(200, {}, "Password changed successfully. Login again"),
    );
});

const getCurrentUser = asyncHandler(async (req, res) => {
  res
    .status(200)
    .json(new ApiResponse(200, req.user, "User fetched successfully"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { userName, email } = req.body;

  if (!userName && !email) {
    throw new ApiError(401, "All fields are required");
  }

  let updateFields = {};

  if (userName?.trim()) {
    const isUserNameAlreadyAvailable = await User.findOne({
      userName,
      _id: { $ne: req.user?._id },
    });
    if (isUserNameAlreadyAvailable) {
      throw new ApiError(
        409,
        "This user name is already taken try something else",
      );
    }

    updateFields.userName = userName.toLowerCase().trim();
  }

  if (email?.trim()) {
    const isEmailAlreadyAvailable = await User.findOne({
      email,
      _id: { $ne: req.user?._id },
    });

    if (isEmailAlreadyAvailable) {
      throw new ApiError(409, "This email is already taken try something else");
    }

    updateFields.email = email.toLowerCase().trim();
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: updateFields,
    },
    {
      new: true,
    },
  ).select("-password");

  res
    .status(201)
    .json(new ApiResponse(201, { user }, "Details updated successfully"));
});

// Edge Case missed if deleteCloudinaryImg fail then that asset link will remain unallocated
const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing");
  }

  const user = await User.findById(req.user?._id);

  if (!user) {
    throw new ApiError(404, "Unable to find user");
  }

  const cloudUploadResponse = await uploadOnCloudinary(avatarLocalPath);

  if (!cloudUploadResponse || !cloudUploadResponse.url) {
    throw new ApiError(500, "Failed to upload the new avatar to cloud");
  }

  if (user.avatar) {
    const rawPath = user?.avatar.split("/upload/")[1];
    if (rawPath) {
      const publicId = rawPath
        ?.replace(/^v\d+\//, "")
        ?.replace(/\.[^/.]+$/, "");
      if (publicId) {
        await deleteImgOnCloudinary(publicId);
      }
    }
  }

  const updatedAvatar = cloudUploadResponse?.url;
  user.avatar = updatedAvatar;
  await user.save({ validateBeforeSave: false });
  res
    .status(201)
    .json(
      new ApiResponse(
        201,
        { updatedAvatar },
        "Successfully updated avatar image",
      ),
    );
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath) {
    throw new ApiError(400, "Upload cover image to update");
  }

  const user = await User.findById(req.user?._id);

  if (!user) {
    throw new ApiError(404, "Unable to find the user");
  }

  const cloudUploadResponse = await uploadOnCloudinary(coverImageLocalPath);

  if (!cloudUploadResponse || !cloudUploadResponse.url) {
    throw new ApiError(500, "Unable to upload new cover image");
  }

  if (user.coverImage) {
    const rawPath = user?.coverImage.split("/upload/")[1];
    if (rawPath) {
      const publicId = rawPath
        ?.replace(/^v\d+\//, "")
        ?.replace(/\.[^/.]+$/, "");
      if (publicId) {
        await deleteImgOnCloudinary(publicId);
      }
    }
  }

  const updatedCoverImage = cloudUploadResponse?.url;
  user.coverImage = updatedCoverImage;
  await user.save({ validateBeforeSave: false });

  res
    .status(201)
    .json(
      new ApiResponse(
        201,
        { updatedCoverImage },
        "Successfully updated cover image",
      ),
    );
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { userName } = req.params;
  const viewerId = req.user?._id || null;
  if (!userName?.trim()) {
    throw new ApiError(400, "User name is missing");
  }

  const channel = await User.aggregate([
    {
      $match: {
        userName: userName?.toLowerCase().trim(),
      },
    },
    {
      $lookup: {
        from: "Subscription",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "Subscription",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscriberCount: {
          $size: "$subscribers",
        },
        channelsSubscribedToCount: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: { $in: [viewerId, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        _id: 1,
        fullName: 1,
        avatar: 1,
        coverImage: 1,
        subscriberCount: 1,
        channelsSubscribedToCount: 1,
        isSubscribed: 1,
      },
    },
  ]);

  // console.log("Channel: ", channel);

  if (!channel.length) {
    throw new ApiError(404, "No channel found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, channel[0], "Successfully fetched channel"));
});

const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user?._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "User",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    userName: 1,
                    avatar: 1,
                    fullName: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: { $first: "$owner" },
            },
          },
        ],
      },
    },
  ]);
  // console.log(user);
  if (!user.length) {
    throw new ApiError(404, "User not found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0].watchHistory,
        "Fetched Watch history successfully",
      ),
    );
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory,
};
