import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../model/user.model.js";
import { Video } from "../model/video.model.js";
import mongoose from "mongoose";
import { Subscription } from "../model/subscription.model.js";

const getChannelStats = asyncHandler(async (req, res) => {
  // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.
  const [result, totalSubscriber] = await Promise.all([
    Video.aggregate([
      {
        $match: {
          owner: new mongoose.Types.ObjectId(req.user?._id),
        },
      },
      {
        $facet: {
          videoStats: [
            {
              $group: {
                _id: null,
                totalViews: { $sum: "$views" },
                totalVideos: { $sum: 1 },
              },
            },
          ],
          likeStats: [
            {
              $lookup: {
                from: "likes",
                foreignField: "video",
                localField: "_id",
                as: "likes",
              },
            },
            {
              $group: {
                _id: null,
                totalLikes: {
                  $sum: { $size: "$likes" },
                },
              },
            },
          ],
        },
      },
    ]),
    Subscription.countDocuments({ channel: req.user?._id }),
  ]);

  const totalVideos = result[0].videoStats[0]?.totalVideos || 0;
  const totalViews = result[0].videoStats[0]?.totalViews || 0;
  const totalLikes = result[0].likeStats[0]?.totalLikes || 0;

  const stats = {
    totalVideos,
    totalViews,
    totalLikes,
    totalSubscriber,
  };

  return res
    .status(200)
    .json(new ApiResponse(200, stats, "Successfully fetched dashboard data"));
});

const getChannelVideos = asyncHandler(async (req, res) => {
  const result = await Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(req.user?._id),
      },
    },
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
      $sort: {
        createdAt: -1,
        _id: -1,
      },
    },
  ]);

  if (!result.length) {
    throw new ApiResponse(200, {}, "No videos uploaded by this channel");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        result,
        "Successfully fetched all videos of this channel",
      ),
    );
});

export { getChannelStats, getChannelVideos };
