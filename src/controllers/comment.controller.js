import { asyncHandler } from "../utils/asyncHandler.js";
import { Comment } from "../model/comment.model.js";
import { ApiError } from "../utils/apiError.js";
import mongoose from "mongoose";
import { ApiResponse } from "../utils/apiResponse.js";
import { Video } from "../model/video.model.js";
import { User } from "../model/user.model.js";

const getVideoComments = asyncHandler(async (req, res) => {
  //TODO: get all comments for a video
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;
});

const addComment = asyncHandler(async (req, res) => {
  // TODO: add a comment to a video
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

  //   const comments = await Comment.aggregate([
  //     {
  //       $match: {
  //         video: videoId,
  //       },
  //     },
  //     {
  //       $lookup: {
  //         from: "Video",
  //         localField: "video",
  //         foreignField: "_id",
  //         as: "comments",
  //       },
  //     },
  //     {
  //       $lookup: {
  //         from: "User",
  //         localField: "owner",
  //         foreignField: "_id",
  //         as: "owner",
  //       },
  //     },
  //   ]);

  //   if (!comments.length) {
  //     throw new ApiError(404, "No comments found");
  //   }

  return res
    .status(201)
    .json(new ApiResponse(201, newComment, "Comments added successfully"));
});

const updateComment = asyncHandler(async (req, res) => {
  // TODO: update a comment
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
  // TODO: delete a comment
});

export { getVideoComments, addComment, updateComment, deleteComment };
