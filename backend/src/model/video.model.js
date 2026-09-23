import mongoose, { Schema } from "mongoose";

const videoSchema = new Schema(
  {
    videoFile: {
      type: String,
      // required: true,
      default: null,
    },
    thumbnail: {
      type: String,
      // required: true,
      default: null,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: "No description provided",
    },
    duration: {
      type: Number,
      // required: true,
      default: null,
    },
    views: {
      type: Number,
      required: true,
      default: 0,
    },
    cloudinaryPublicId: {
      type: String,
      default: null,
    },
    processingStatus: {
      type: String,
      enum: ["UPLOADING", "PROCESSING", "READY", "FAILED"],
      default: "UPLOADING",
      index: true,
    },
    processingError: {
      type: String,
      default: null,
    },

    isPublished: {
      type: Boolean,
      default: false,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

videoSchema.index({
  createdAt: -1,
  _id: -1,
});

// Mongoose Model Aggregate Pipeline here
export const Video = mongoose.model("Video", videoSchema);
