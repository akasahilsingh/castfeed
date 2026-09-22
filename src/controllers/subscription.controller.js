import mongoose from "mongoose";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Subscription } from "../model/subscription.model.js";
import { ApiResponse } from "../utils/apiResponse.js";

const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  let isSubcribed;
  if (!channelId) {
    throw new ApiError(400, "Channel is required to move further");
  }

  if (!mongoose.Types.ObjectId.isValid(channelId)) {
    throw new ApiError(400, "Channel id is not valid");
  }

  const channel = await Subscription.findOne({
    subscriber: req.user?._id,
    channel: channelId,
  });
  if (!channel) {
    await Subscription.create({
      subscriber: req.user?._id,
      channel: channelId,
    });
    isSubcribed = true;
  } else {
    await channel.deleteOne();
    isSubcribed = false;
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        isSubcribed,
        `Channel ${isSubcribed ? "subscribed" : "unsubscribed"}  successfully`,
      ),
    );
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  if (!channelId) {
    throw new ApiError(400, "Channel is required to move further");
  }

  if (!mongoose.Types.ObjectId.isValid(channelId)) {
    throw new ApiError(400, "Channel id is not valid");
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
              totalSubscriber: 1,
            },
          },
        ],
        metadata: [
          {
            $count: "totalSubcriber",
          },
        ],
      },
    },
  ]);
  const totalSubcriber = result[0]?.metadata[0].totalSubcriber || 0;
  const subscriberList = result[0]?.subscribers;

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { subscriberList, totalSubcriber },
        subscriberList.length
          ? "Subscribers Fetched Successfully"
          : "No subcriber",
      ),
    );
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
