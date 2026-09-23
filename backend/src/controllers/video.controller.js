import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/apiError.js";
import { Video } from "../model/video.model.js";
import { User } from "../model/user.model.js";
import { uploadOnCloudinary, cloudinary } from "../utils/cloudinary.js";
import mongoose from "mongoose";
import { deleteImgOnCloudinary } from "./user.controller.js";
import { videoQueue } from "../queues/video.queue.js";

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

  if (!title?.trim()) {
    throw new ApiError(400, "Title is required to publish a video");
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
    title: title.trim(),
    // Only set description if provided — otherwise let schema default apply
    ...(description?.trim() ? { description: description.trim() } : {}),
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
  const viewerId =
    req.user?._id && mongoose.Types.ObjectId.isValid(req.user._id)
      ? new mongoose.Types.ObjectId(req.user._id)
      : null;
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
              userName: 1,
              fullName: 1,
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
            if: { $in: [viewerId, "$likes.likedBy"] },
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

  if (req.user?._id) {
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: {
        watchHistory: videoId,
      },
    });
  }

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

// const generateUploadSignature = asyncHandler(async (req, res) => {
//   const userId = req.user?._id;

//   if (!userId) {
//     throw new ApiError(401, "Unauthorized request");
//   }

//   const timestamp = Math.floor(Date.now() / 1000);

//   // Everything included here will be signed by your backend.
//   const paramsToSign = {
//     timestamp,
//     folder: `videos/${userId}`,
//   };

//   const signature = cloudinary.utils.api_sign_request(
//     paramsToSign,
//     process.env.CLOUDINARY_SECRET_KEY,
//   );

//   return res.status(200).json(
//     new ApiResponse(
//       200,
//       {
//         signature,
//         timestamp,
//         cloudName: process.env.CLOUDINARY_NAME,
//         apiKey: process.env.CLOUDINARY_API_KEY,
//         folder: paramsToSign.folder,
//       },
//       "Upload authorization generated successfully",
//     ),
//   );
// });

const completeVideoUpload = asyncHandler(async (req, res) => {
  const userId = req.user?._id;

  if (!userId) {
    throw new ApiError(401, "Unauthorized request");
  }

  const { videoId, publicId, secureUrl, duration } = req.body;

  if (!videoId) {
    throw new ApiError(400, "Video ID is required");
  }

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  if (!publicId || !secureUrl) {
    throw new ApiError(400, "Cloudinary upload information is required");
  }

  /*
   * Find the video AND verify ownership.
   *
   * This prevents User A from completing User B's upload.
   */
  const video = await Video.findOne({
    _id: videoId,
    owner: userId,
  });

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  /*
   * The upload should only be completed once.
   */
  if (video.processingStatus !== "UPLOADING") {
    throw new ApiError(
      409,
      `Video upload cannot be completed from ${video.processingStatus} state`,
    );
  }

  /*
   * This is the Cloudinary location generated
   * during /upload-init.
   *
   * Example:
   *
   * videos/
   *   6aa6f24.../
   *   6ab3b39.../
   */
  const expectedPublicId = `videos/${userId}/${videoId}`;

  /*
   * Cloudinary's public_id should exactly match
   * the identity we created during upload-init.
   */
  if (publicId !== expectedPublicId) {
    throw new ApiError(400, "Cloudinary asset does not belong to this video");
  }

  /*
   * Save the Cloudinary information.
   */
  video.videoFile = secureUrl;
  video.cloudinaryPublicId = publicId;
  video.duration = Number(duration) || null;

  /*
   * The upload is finished.
   * Now background processing needs to happen.
   */
  video.processingStatus = "PROCESSING";

  await video.save();

    /*
   * Put the processing task into BullMQ.
   *
   * Send only the videoId.
   * The worker can fetch the actual video
   * information from MongoDB.
   */

  const job = await videoQueue.add("process-video", {
    videoId: video._id.toString(),
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        videoId: video._id,
        processingStatus: video.processingStatus,
        jobId: job.id,
      },
      "Video upload completed successfully. Processing started.",
    ),
  );
});

const uploadInit = asyncHandler(async (req, res) => {
  const userId = req.user?._id;

  if (!userId) {
    throw new ApiError(401, "Unauthorized request");
  }

  const { title, description } = req.body;

  if (!title?.trim()) {
    throw new ApiError(400, "Title is required");
  }

  const video = await Video.create({
    title: title.trim(),
    description: description?.trim() || "",
    owner: userId,

    videoFile: null,
    thumbnail: null,
    duration: null,

    processingStatus: "UPLOADING",
    processingError: null,

    isPublished: false,
  });

  const videoId = video._id.toString();

  /*
   * Every video gets its own Cloudinary location.
   *
   * Example:
   *
   * videos/
   *   123456/
   *     68c9abc123/
   *
   * userId      = 123456
   * videoId     = 68c9abc123
   */
  const folder = `videos/${userId}/${videoId}`;

  /*
   * Using the videoId as the Cloudinary public_id.
   *
   * Therefore the final Cloudinary asset becomes:
   *
   * videos/USER_ID/VIDEO_ID
   */
  const publicId = videoId;

  const timestamp = Math.floor(Date.now() / 1000);

  const paramsToSign = {
    timestamp,
    folder,
    public_id: publicId,
  };

  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    process.env.CLOUDINARY_SECRET_KEY,
  );

  return res.status(201).json(
    new ApiResponse(
      201,
      {
        videoId,
        cloudName: process.env.CLOUDINARY_NAME,
        apiKey: process.env.CLOUDINARY_API_KEY,

        timestamp,
        signature,

        folder,
        publicId,

        processingStatus: video.processingStatus,
      },
      "Video upload initialized successfully",
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
  // generateUploadSignature,
  completeVideoUpload,
  uploadInit,
};
