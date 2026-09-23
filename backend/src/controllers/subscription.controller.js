import mongoose from "mongoose";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Subscription } from "../model/subscription.model.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { User } from "../model/user.model.js";

const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  const subscriberId = req.user?._id;
  let isSubscribed;
  if (!channelId) {
    throw new ApiError(400, "Channel is required to move further");
  }

  if (!mongoose.Types.ObjectId.isValid(channelId)) {
    throw new ApiError(400, "Channel id is not valid");
  }

  if (subscriberId.toString() === channelId.toString()) {
    throw new ApiError(400, "You cannot subscribe to yourself");
  }

  const channelExists = await User.exists({ _id: channelId });
  if (!channelExists) {
    throw new ApiError(404, "Channel not found");
  }
  const existingSubscription = await Subscription.findOne({
    subscriber: subscriberId,
    channel: channelId,
  });

  if (!existingSubscription) {
    await Subscription.create({
      subscriber: subscriberId,
      channel: channelId,
    });
    isSubscribed = true;
  } else {
    await existingSubscription.deleteOne();
    isSubscribed = false;
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { isSubscribed },
        `Channel ${isSubscribed ? "subscribed" : "unsubscribed"}  successfully`,
      ),
    );
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  // Improvement add pagination
  const { channelId } = req.params;
  if (!channelId) {
    throw new ApiError(400, "Channel is required to move further");
  }

  if (!mongoose.Types.ObjectId.isValid(channelId)) {
    throw new ApiError(400, "Channel id is not valid");
  }

  const channelExists = await User.exists({
    _id: channelId,
  });

  if (!channelExists) {
    throw new ApiError(404, "Channel not found");
  }

  const result = await Subscription.aggregate([
    {
      $match: {
        channel: new mongoose.Types.ObjectId(channelId),
      },
    },
    {
      $facet: {
        subscribers: [
          {
            $lookup: {
              from: "users",
              foreignField: "_id",
              localField: "subscriber",
              as: "subscriber",
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
              subscriber: { $first: "$subscriber" },
            },
          },
          {
            $project: {
              _id: 0,
              subscriber: 1,
              createdAt: 1,
            },
          },
        ],
        metadata: [
          {
            $count: "totalSubscribers",
          },
        ],
      },
    },
  ]);
  const totalSubscribers = result[0]?.metadata[0]?.totalSubscribers || 0;
  const subscriberList = result[0]?.subscribers || [];

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { subscriberList, totalSubscribers },
        subscriberList.length
          ? "Subscribers Fetched Successfully"
          : "No subcriber",
      ),
    );
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
  const subscriberId = req.user?._id;

  //   if (!subscriberId) {
  //     throw new ApiError(400, "Subcriber id is required to continue");
  //   }

  //   if (!mongoose.Types.ObjectId.isValid(subscriberId)) {
  //     throw new ApiError(400, "Invalid subscriber id");
  //   }

  const result = await Subscription.aggregate([
    {
      $match: {
        subscriber: new mongoose.Types.ObjectId(subscriberId),
      },
    },
    {
      $facet: {
        channels: [
          {
            $lookup: {
              from: "users",
              foreignField: "_id",
              localField: "channel",
              as: "channel",
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
              channel: { $first: "$channel" },
            },
          },
          {
            $project: {
              _id: 0,
              channel: 1,
              subscribedAt: "$createdAt",
            },
          },
        ],
        metadata: [
          {
            $count: "totalChannelSubscribed",
          },
        ],
      },
    },
  ]);
  const totalChannelSubscribed =
    result[0]?.metadata[0]?.totalChannelSubscribed || 0;
  const channelList = result[0]?.channels || [];

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { channelList, totalChannelSubscribed },
        channelList.length
          ? "Successfully fetched channels you subscribed"
          : "No channel subscribed",
      ),
    );
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
