import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/apiError.js";
import { Video } from "../model/video.model.js";
import { User } from "../model/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import mongoose from "mongoose";
import { deleteImgOnCloudinary } from "./user.controller.js";

const extractCloudinaryPublicId = (url) => {
  try {
    const urlObject = new URL(url);

    const pathParts = urlObject.pathname.split("/").filter(Boolean);

    const uploadIndex = pathParts.indexOf("upload");

    if (uploadIndex === -1) {
      return null;
    }

    const publicIdParts = pathParts.slice(uploadIndex + 1);

    // Remove version: v123456789
    if (publicIdParts[0] && /^v\d+$/.test(publicIdParts[0])) {
      publicIdParts.shift();
    }

    const publicIdWithExtension = publicIdParts.join("/");

    // Remove file extension
    return publicIdWithExtension.replace(/\.[^/.]+$/, "");
  } catch {
    return null;
  }
};

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;

  const currentPage = Math.max(parseInt(page || 1), 1);
  const requestedLimit = parseInt(limit || 10) || 10;
  const perPage = Math.min(parseInt(requestedLimit || 50), 50);
  const skip = (currentPage - 1) * perPage;

  const matchStage = {
    isPublished: true,
  };

  if (userId) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ApiError(400, "Invalid user Id");
    }

    matchStage.owner = new mongoose.Types.ObjectId(userId);
  }
  if (query?.trim()) {
    const searchQuery = query.trim();

    matchStage.$or = [
      {
        title: {
          $regex: searchQuery,
          $options: "i",
        },
        description: {
          $regex: searchQuery,
          $options: "i",
        },
      },
    ];
  }

  const allowedSortFields = {
    createdAt: "createdAt",
    views: "views",
    duration: "duration",
    title: "title",
  };

  const sortField = allowedSortFields[sortBy] || "createdAt";

  const sortDirection = sortType === "asc" ? 1 : -1;

  const sortStage = {
    [sortField]: sortDirection,
    _id: -1,
  };

  const [result] = await Video.aggregate([
    {
      $match: matchStage,
    },
    {
      $facet: {
        metaData: [{ $count: "totalVideos" }],
        videos: [
          {
            $sort: sortStage,
          },
          {
            $skip: skip,
          },
          {
            $limit: perPage,
          },
          {
            $lookup: {
              from: "users",

              let: {
                ownerId: "$owner",
              },
              pipeline: [
                {
                  $match: {
                    $expr: { $eq: ["$_id", "$$ownerId"] },
                  },
                },
                {
                  $project: {
                    _id: 1,
                    userName: 1,
                    fullName: 1,
                    avatar: 1,
                  },
                },
              ],
              as: "owner",
            },
          },
          {
            $unwind: {
              path: "$owner",
              preserveNullAndEmptyArrays: true,
            },
          },

          {
            $project: {
              _id: 1,
              videoFile: 1,
              thumbnail: 1,
              title: 1,
              description: 1,
              duration: 1,
              views: 1,
              isPublished: 1,
              createdAt: 1,

              owner: {
                _id: "$owner._id",
                userName: "$owner.userName",
                fullName: "$owner.fullName",
                avatar: "$owner.avatar",
              },
            },
          },
        ],
      },
    },
  ]);

  const totalVideos = result.metaData[0]?.totalVideos || 0;
  const totalPages = Math.ceil(totalVideos / perPage);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        videos: result.videos,

        pagination: {
          currentPage,
          perPage,
          totalPages,
          hasNextPage: currentPage < totalPages,
          hasPreviousPage: currentPage > 1,
        },
      },
      "all Videos fetched successfully",
    ),
  );

  // const user = await User.findById(userId);
  // // if (!user) {
  // //   throw new ApiError(404, "User not found");
  // // }
  // const page = Math.max(Number(req.query.page) || 1);
  // const limit = Math.min(Number(req.query.limit) || 10);

  // const skip = (page - 1)* limit
  // const videos = await Video.aggregate([
  //   {
  //     $lookup: {
  //       from: "users",
  //       localField: "owner",
  //       foreignField: "_id",
  //       as: "owner",
  //     },
  //   },
  //   // {
  //   //   $unwind: "$owner",
  //   // },
  //   {
  //     $addFields: {
  //       owner: {$first: "$owner"}
  //     }
  //   },
  //   {
  //     $project: {
  //       title: 1,
  //       description: 1,
  //       videoFile: 1,
  //       thumbnail: 1,
  //       duration: 1,
  //       views: 1,
  //       owner: {
  //         userName: 1,
  //         fullName: 1,
  //         avatar: 1,
  //       },
  //       createdAt: 1,
  //     },
  //   },
  //   {
  //     $sort: {
  //       createdAt: -1,
  //     },
  //   },
  // ]);

  // if (!videos.length) {
  //   return res.status(404).json(new ApiResponse(404, "Cannot find videos"));
  // }

  // return res
  //   .status(200)
  //   .json(new ApiResponse(200, videos, "All videos fetched successfully"));
});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  // TODO: get video, upload to cloudinary, create video

  if (!title.trim() || !description.trim()) {
    throw new ApiError(
      400,
      "Title and description is required to publish vidoe",
    );
  }
  const videoLocalPath = req.files?.video?.[0].path;
  const thumbnailLocalPath = req.files?.thumbnail?.[0].path;

  if (!videoLocalPath) {
    throw new ApiError(400, "Video file is required to publish video");
  }

  if (!thumbnailLocalPath) {
    throw new ApiError(400, "Thumbnail file is required to publish video");
  }

  const video = await uploadOnCloudinary(videoLocalPath);
  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

  if (!video || !video.url) {
    throw new ApiError(500, "Unable to upload video on Cloudinary");
  }

  if (!thumbnail || !thumbnail.url) {
    throw new ApiError(500, "Unable to upload thumbnail on Cloudinary");
  }

  const uploadedVideo = await Video.create({
    videoFile: video.url,
    thumbnail: thumbnail.url,
    title: title,
    description: description,
    duration: video?.duration,
    isPublished: true,
    owner: req.user?._id,
  });

  res
    .status(201)
    .json(
      new ApiResponse(201, { uploadedVideo }, "Video published successfully"),
    );
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  // Further improvement comments
  if (!videoId) {
    throw new ApiError(400, "Video is required");
  }

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Not a valid video Id");
  }
  // const video = await Video.findById(videoId);

  const video = await Video.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(videoId),
        isPublished: true,
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "likes",
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $lookup: {
              from: "subscriptions",
              localField: "_id",
              foreignField: "channel",
              as: "subscribers",
            },
          },
          {
            $addFields: {
              subscribersCount: {
                $size: "$subscribers",
              },
              isSubscribed: {
                $cond: {
                  if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                  then: true,
                  else: false,
                },
              },
            },
          },
          {
            $project: {
              userName: 1,
              avatar: 1,
              subscribersCount: 1,
              isSubscribed: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        likesCount: {
          $size: "$likes",
        },
        owner: {
          $first: "$owner",
        },
        isLiked: {
          $cond: {
            if: { $in: [req.user?._id, "$likes.likedby"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        videoFile: 1,
        thumbnail: 1,
        title: 1,
        description: 1,
        duration: 1,
        views: 1,
        createdAt: 1,
        userName: 1,
        avatar: 1,
        subscribersCount: 1,
        isSubscribed: 1,
        likesCount: 1,
        owner: 1,
        isLiked: 1,
      },
    },
  ]);

  if (!video.length) {
    throw new ApiError(404, "Video not found");
  }

  await Video.findByIdAndUpdate(videoId, {
    $inc: {
      views: 1,
    },
  });

  await User.findByIdAndUpdate(req.user?._id, {
    $addToSet: {
      watchHistory: videoId,
    },
  });

  return res
    .status(200)
    .json(new ApiResponse(200, video[0], "Video fetched successfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { title, description } = req.body;

  if (!videoId) {
    throw new ApiError(400, "Video id is required to continue");
  }

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "videoId is not valid");
  }

  if (!title === undefined && description === undefined && !req.file) {
    throw new ApiError(400, "No video details provided fro update");
  }

  const video = await Video.findOne({ _id: videoId, owner: req.user?._id });

  if (title !== undefined) {
    if (typeof title !== "string" || !title.trim()) {
      throw new ApiError(400, "Title cannot be empty");
    }

    video.title = title.trim();
  }

  if (description !== undefined) {
    if (typeof description !== "string" || !description.trim()) {
      throw new ApiError(400, "Description cannot be empty");
    }
    video.description = description.trim();
  }

  let oldThumbnail = video.thumbnail;
  let newThumbnail = null;

  if (req.file?.path) {
    newThumbnail = await uploadOnCloudinary(req.file.path);

    if (!newThumbnail?.secure_url) {
      throw new ApiError(500, "Failed to upload thumbnail");
    }
    video.thumbnail = newThumbnail.secure_url;
  }

  try {
    await video.save();
  } catch (error) {
    if (newThumbnail) {
      try {
        await deleteImgOnCloudinary(newThumbnail.public_id);
      } catch (error) {
        console.error("Failed to cleanup new thumbnail: ", error);
      }
    }
    throw error;
  }

  if (newThumbnail && oldThumbnail) {
    const oldPublicId = extractCloudinaryPublicId(oldThumbnail);
    if (oldPublicId) {
      try {
        await deleteImgOnCloudinary(oldPublicId);
      } catch (error) {
        console.log("Failed to delete old thumbnail: ", error);
      }
    }
  }

  const updatedVideo = {
    title: video.title,
    description: video.description,
    thumbnail: video.thumbnail,
  };
  return res
    .status(200)
    .json(new ApiResponse(200, updatedVideo, "Updated Sucessfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!videoId) {
    throw new ApiError(400, "video id is required to continue");
  }

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Not a valid video id");
  }

  const video = await Video.findOne({ _id: videoId, owner: req.user?._id });

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  const videoPublicId = extractCloudinaryPublicId(video.videoFile);
  if (videoPublicId) {
    try {
      await deleteImgOnCloudinary(videoPublicId);
    } catch (error) {
      console.error("Failed to delete video from cloudinary: ", error);
      throw error;
    }
  }

  await video.deleteOne();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Successfully deleted video"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!videoId) {
    throw new ApiError(400, "Video Id is required to continue");
  }

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Not a valid video Id");
  }

  const video = await Video.findOne({ _id: videoId, owner: req.user?._id });

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  video.isPublished = !video.isPublished;

  await video.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { isPublished: video.isPublished },
        ` Video ${video.isPublished ? "published" : "unpublished"} successfully`,
      ),
    );
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
