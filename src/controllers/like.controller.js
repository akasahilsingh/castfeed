import mongoose from "mongoose";
import { Video } from "../model/video.model.js";
import { Comment } from "../model/comment.model.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Like } from "../model/like.model.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { Tweet } from "../model/tweet.model.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  let isliked;
  if (!videoId) {
    throw new ApiError(400, "Video id is required to continue");
  }

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Not a valid video id");
  }

  const video = await Video.findOne({
    _id: videoId,
  });

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  const alreadyLiked = await Like.findOne({
    video: videoId,
    likedBy: req.user?._id,
  });

  if (!alreadyLiked) {
    await Like.create({
      video: videoId,
      likedBy: req.user?._id,
    });
    isliked = true;
  } else {
    await alreadyLiked.deleteOne();
    isliked = false;
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { isliked },
        `Successfully ${isliked ? "Liked" : "Disliked"} Video`,
      ),
    );
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  let isliked;
  if (!commentId) {
    throw new ApiError(400, "comment id is required to continue");
  }

  if (!mongoose.Types.ObjectId.isValid(commentId)) {
    throw new ApiError(400, "Not a valid comment id");
  }

  const comment = await Comment.findOne({
    _id: commentId,
  });

  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  const alreadyLiked = await Like.findOne({
    comment: commentId,
    likedBy: req.user?._id,
  });

  if (!alreadyLiked) {
    await Like.create({
      comment: commentId,
      likedBy: req.user?._id,
    });
    isliked = true;
  } else {
    await alreadyLiked.deleteOne();
    isliked = false;
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { isliked },
        `Successfully ${isliked ? "Liked" : "Disliked"} Comment`,
      ),
    );
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  //Testing left
  const { tweetId } = req.params;
  let isliked;
  if (!tweetId) {
    throw new ApiError(400, "Tweet id is required to continue");
  }

  if (!mongoose.Types.ObjectId.isValid(tweetId)) {
    throw new ApiError(400, "Not a valid tweet id");
  }

  const tweet = await Tweet.findOne({
    _id: tweetId,
  });

  if (!tweet) {
    throw new ApiError(404, "Tweet not found");
  }

  const alreadyLiked = await Like.findOne({
    tweet: tweetId,
    likedBy: req.user?._id,
  });

  if (!alreadyLiked) {
    await Like.create({
      tweet: tweetId,
      likedBy: req.user?._id,
    });
    isliked = true;
  } else {
    await alreadyLiked.deleteOne();
    isliked = false;
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { isliked },
        `Successfully ${isliked ? "Liked" : "Disliked"} Tweet`,
      ),
    );
});

const getLikedVideos = asyncHandler(async (req, res) => {
  const result = await Like.aggregate([
    {
      $match: {
        likedBy: new mongoose.Types.ObjectId(req.user?._id),
        video: { $exists: true },
      },
    },
    {
      $lookup: {
        from: "videos",
        foreignField: "_id",
        localField: "video",
        as: "likedVideos",
        pipeline: [
          {
            $project: {
              videoFile: 1,
              thumbnail: 1,
              title: 1,
              description: 1,
              duration: 1,
              views: 1,
              createdAt: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: "$likedVideos",
    },
    {
      $project: {
        _id: 0,
        video: "$likedVideos",
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        result,
        `${result.length ? "Successfully fetched liked videos" : "No videos liked by you"}`,
      ),
    );
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
