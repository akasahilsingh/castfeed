import mongoose, { mongo } from "mongoose";
import { Playlist } from "../model/playlist.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../model/video.model.js";

const createPlaylist = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  if (!name.trim() || !description.trim()) {
    throw new ApiError(400, "Name and description is required to continue");
  }

  const playlist = await Playlist.create({
    name,
    description,
    owner: req.user?._id,
  });

  if (!playlist) {
    throw new ApiError(500, "Failed to create playlist");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, playlist, "Playlist created successfully"));
});

const getUserPlaylists = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  if (!userId) {
    throw new ApiError(400, "User id is required to continue");
  }

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(400, "Not a valid user Id");
  }

  const playlist = await Playlist.find({
    owner: userId,
  }).sort({
    createdAt: -1,
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        playlist.length ? playlist : "You do not have any playlist",
        "Successfully fetched playlist",
      ),
    );
});

const getPlaylistById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;

  if (!playlistId) {
    throw new ApiError(400, "Playlist Id is required to continue");
  }

  if (!mongoose.Types.ObjectId.isValid(playlistId)) {
    throw new ApiError(400, "Not a valid playlist id");
  }

  // const playlist = await Playlist.findById(playlistId);
  const playlist = await Playlist.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(playlistId),
      },
    },
    {
      $lookup: {
        from: "videos",
        foreignField: "_id",
        localField: "videos",
        as: "videos",
        pipeline: [
          {
            $match: {
              isPublished: true,
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
              createdAt: 1,
              views: 1,
            },
          },
        ],
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
              avatar: 1,
              fullName: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        totalVideos: { $size: "$videos" },
        totalViews: { $sum: "$videos.views" },
        owner: { $first: "$owner" },
      },
    },

    {
      $project: {
        name: 1,
        description: 1,
        createdAt: 1,
        updatedAt: 1,
        totalVideos: 1,
        totalViews: 1,
        videos: 1,
        owner: 1,
      },
    },
  ]);

  if (!playlist.length) {
    throw new ApiError(404, "No playlist found of this playlist id");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Playlist fetched successfully"));
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;

  if (!playlistId || !videoId) {
    throw new ApiError(400, "Playlist Id and video Id is required to continue");
  }

  if (
    !mongoose.Types.ObjectId.isValid(playlistId) ||
    !mongoose.Types.ObjectId.isValid(videoId)
  ) {
    throw new ApiError(400, "Invalid playlist id or video id");
  }

  const [playlist, video] = await Promise.all([
    Playlist.findById(playlistId),
    Video.findById(videoId),
  ]);

  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }

  if (!video) {
    throw new ApiError(404, "Video not found");
  }
  if (playlist.owner?.toString() !== req.user?._id) {
    throw new ApiError(
      401,
      "Only owner of the playlist is allowed to add video to this playlist",
    );
  }

  const addedVideoToPlaylist = await Playlist.findByIdAndUpdate(
    playlistId,
    {
      $addToSet: {
        videos: videoId,
      },
    },
    {
      new: true,
    },
  );

  if (!addedVideoToPlaylist) {
    throw new ApiError(400, "Failed to add video to playlist");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        addedVideoToPlaylist,
        "Successfully added video to playlist",
      ),
    );
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;
  if (!playlistId || !videoId) {
    throw new ApiError(400, "Playlist Id and video Id is required to continue");
  }

  if (
    !mongoose.Types.ObjectId.isValid(playlistId) ||
    !mongoose.Types.ObjectId.isValid(videoId)
  ) {
    throw new ApiError(400, "Invalid playlist id or video id");
  }

  const updatedPlaylist = await Playlist.findOneAndUpdate(
    {
      _id: playlistId,
      owner: req.user?._id,
      videos: videoId,
    },
    {
      $pull: {
        videos: videoId,
      },
    },
    {
      new: true,
    },
  );

  if (!updatedPlaylist) {
    throw new ApiError(404, "Playlist does not exist");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedPlaylist,
        "Successfully removed video from playlist",
      ),
    );
});

const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  if (!playlistId) {
    throw new ApiError(400, "Playlist Id is required to continue");
  }

  if (!mongoose.Types.ObjectId.isValid(playlistId)) {
    throw new ApiError(400, "Not a valid playlist id");
  }

  const playlist = await Playlist.findOne({
    _id: playlistId,
    owner: req.user?._id,
  });

  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }

  await playlist.deleteOne();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Successfully deleted the video"));
});

const updatePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { name, description } = req.body;
  if (!playlistId) {
    throw new ApiError(400, "Playlist Id is required to continue");
  }

  if (!mongoose.Types.ObjectId.isValid(playlistId)) {
    throw new ApiError(400, "Not a valid playlist id");
  }

  if (name === undefined && description === undefined) {
    throw new ApiError(400, "At least one field is required to update");
  }

  const playlist = await Playlist.findOne({
    _id: playlistId,
    owner: req.user?._id,
  });

  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }
  if (name !== undefined) {
    if (typeof name !== "string" || !name.trim()) {
      throw new ApiError(400, "Playlist name must be non empty string");
    }

    playlist.name = name.trim();
  }

  if (description !== undefined) {
    if (typeof description !== "string" || !description.trim()) {
      throw new ApiError(400, "Playlist description must be non empty string");
    }

    playlist.description = description.trim();
  }

  await playlist.save();

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Playlist updated successfully"));
});

export {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist,
};
