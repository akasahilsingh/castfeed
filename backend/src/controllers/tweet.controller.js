import mongoose from "mongoose";
import { Tweet } from "../model/tweet.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createTweet = asyncHandler(async (req, res) => {
  const owner = req.user?._id;
  const { content } = req.body;

  if (typeof content !== "string" || !content.trim()) {
    throw new ApiError(400, "Content is needed to tweet");
  }

  const tweet = await Tweet.create({
    owner: owner,
    content: content.trim(),
  });

  return res
    .status(201)
    .json(new ApiResponse(201, tweet, "Successfully tweeted"));
});

const getUserTweets = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    throw new ApiError(400, "User id is required to continue");
  }

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(400, "Invalid user id");
  }

  const [result] = await Tweet.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $facet: {
        tweet: [
          {
            $lookup: {
              from: "users",
              foreignField: "_id",
              localField: "owner",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    userName: 1,
                    fullName: 1,
                    avatar: 1,
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
          {
            $project: {
              content: 1,
              createdAt: 1,
              updatedAt: 1,
              owner: 1,
            },
          },
        ],
        metaData: [
          {
            $count: "totalTweets",
          },
        ],
      },
    },
  ]);

  const totalTweets = result?.metaData[0]?.totalTweets || 0;
  const tweet = result?.tweet || [];

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { tweet, totalTweets },
        "Successfully fetched all tweets",
      ),
    );
});

const updateTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  const { content } = req.body;
  if (!tweetId) {
    throw new ApiError(400, "tweet is required to update tweet");
  }
  if (!mongoose.Types.ObjectId.isValid(tweetId)) {
    throw new ApiError(400, "Invalid tweet id");
  }

  if (typeof content !== "string" || !content.trim()) {
    throw new ApiError(400, "Content is required to update tweet");
  }

  const updatedTweet = await Tweet.findOneAndUpdate(
    {
      _id: tweetId,
      owner: req.user?._id,
    },
    {
      $set: { content: content.trim() },
    },
    {
      new: true,
      runValidators: true,
    },
  );

  if (!updatedTweet) {
    throw new ApiError(404, "Tweet not found");
  }
  //   const existingTweet = await Tweet.findOne({
  //     _id: tweetId,
  //     owner: req.user?._id,
  //   });

  //   if (!existingTweet) {
  //     throw new ApiError(404, "Tweet not found");
  //   }

  //   existingTweet.content = content.trim();

  //   await existingTweet.save();

  return res
    .status(200)
    .json(new ApiResponse(200, updatedTweet, "Successfully updated tweet"));
});

const deleteTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  if (!tweetId) {
    throw new ApiError(400, "tweet is required to update tweet");
  }
  if (!mongoose.Types.ObjectId.isValid(tweetId)) {
    throw new ApiError(400, "Invalid tweet id");
  }

  const tweet = await Tweet.findOneAndDelete({
    _id: tweetId,
    owner: req.user?._id,
  });

  if (!tweet) {
    throw new ApiError(404, "Tweet not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Successfully deleted the tweet"));
});

export { createTweet, getUserTweets, updateTweet, deleteTweet };
