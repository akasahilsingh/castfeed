import { asyncHandler } from "../utils/asyncHandler.js";
import { Comment } from "../model/comment.model.js";
import { ApiError } from "../utils/apiError.js";
import mongoose from "mongoose";
import { ApiResponse } from "../utils/apiResponse.js";
import { Video } from "../model/video.model.js";
import { User } from "../model/user.model.js";

const getVideoComments = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  if (!videoId) {
    throw new ApiError(400, "Video id is required");
  }

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Not a valid video id");
  }

  const currentPage = Math.max(parseInt(page || 1), 1);
  const requestedLimit = Math.min(parseInt(limit || 10), 10);
  const perPage = Math.min(parseInt(requestedLimit), 20);
  const skip = (currentPage - 1) * perPage;

  const [result] = await Comment.aggregate([
    {
      $match: {
        video: new mongoose.Types.ObjectId(videoId),
      },
    },
    {
      $facet: {
        metaData: [{ $count: "totalComments" }],
        comments: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    userName: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $unwind: {
              path: "$owner",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $sort: {
              createdAt: -1,
              _id: -1,
            },
          },
          {
            $skip: skip,
          },
          {
            $limit: perPage,
          },
          {
            $project: {
              content: 1,
              owner: 1,
              createdAt: 1,
              updatedAt: 1,
            },
          },
        ],
      },
    },
  ]);

  if (!result.comments.length) {
    return res.status(200).json(new ApiResponse(200, {}, "No comments found"));
  }

  const totalComments = result.metaData[0]?.totalComments || 0;
  const totalPages = Math.ceil(totalComments / perPage) || 1;

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        pagination: {
          currentPage,
          perPage,
          totalPages,
          hasNextPage: currentPage < totalPages,
          hasPreviosPage: currentPage > 1,
        },
        comments: result.comments,
      },
      "Successfully fetched all comments",
    ),
  );
});

const addComment = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { comment } = req.body;

  if (!videoId) {
    throw new ApiError(400, "Video id is required");
  }

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Not a valid video id");
  }

  if (typeof comment !== "string" || !comment.trim()) {
    throw new ApiError(400, "Type your comment to proceed");
  }

  const [video, user] = await Promise.all([
    Video.findById(videoId),
    User.findById(req.user?._id),
  ]);

  if (!video || !user) {
    throw new ApiError(400, "User or video not found");
  }

  const newComment = await Comment.create({
    content: comment,
    video: video._id,
    owner: user._id,
  });
  await newComment.populate("owner", "_id userName avatar");

  return res
    .status(201)
    .json(new ApiResponse(201, newComment, "Comments added successfully"));
});

const updateComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { comment } = req.body;

  if (!commentId) {
    throw new ApiError(400, "Comment id is required");
  }

  if (!mongoose.Types.ObjectId.isValid(commentId)) {
    throw new ApiError(400, "Not a valid comment id");
  }

  if (typeof comment !== "string" || !comment.trim()) {
    throw new ApiError(400, "Type your comment to proceed");
  }

  const existingComment = await Comment.findOne({
    _id: commentId,
    owner: req.user?._id,
  });

  if (!existingComment) {
    throw new ApiError(400, "Comment not found");
  }

  existingComment.content = comment.trim();

  await existingComment.save();

  return res
    .status(201)
    .json(
      new ApiResponse(201, existingComment, "Comment updated successfully"),
    );
});

const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  if (!commentId) {
    throw new ApiError(400, "Comment id is required");
  }

  if (!mongoose.Types.ObjectId.isValid(commentId)) {
    throw new ApiError(400, "Not a valid comment id");
  }

  const existingComment = await Comment.findOne({
    _id: commentId,
    owner: req.user?._id,
  });

  if (!existingComment) {
    throw new ApiError(400, "Comment not found");
  }

  await existingComment.deleteOne();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Comment deleted Successfully"));
});

export { getVideoComments, addComment, updateComment, deleteComment };
