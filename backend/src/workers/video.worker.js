import dotenv from "dotenv";
import { Worker } from "bullmq";
import mongoose from "mongoose";

import { redisConnection } from "../utils/redis.js";
import { Video } from "../model/video.model.js";
import { cloudinary } from "../utils/cloudinary.js";

dotenv.config();

/*
 * Connect worker to MongoDB
 */

const connectDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    console.log("Worker connected to MongoDB");
  } catch (error) {
    console.error("Worker failed to connect to MongoDB:", error.message);

    process.exit(1);
  }
};

/*
 * Create video worker
 */

const videoWorker = new Worker(
  "video-processing",

  async (job) => {
    const { videoId } = job.data;

    console.log("=================================");
    console.log("Processing video job");
    console.log("Job ID:", job.id);
    console.log("Job name:", job.name);
    console.log("Video ID:", videoId);
    console.log("=================================");

    /*
     * 1. Validate video ID
     */

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
      throw new Error("Invalid video ID");
    }

    /*
     * 2. Find video in MongoDB
     */

    const video = await Video.findById(videoId);

    if (!video) {
      throw new Error(`Video ${videoId} not found`);
    }

    /*
     * 3. Verify processing state
     */

    if (video.processingStatus !== "PROCESSING") {
      throw new Error(`Video is in ${video.processingStatus} state`);
    }

    /*
     * 4. Verify Cloudinary information
     */

    if (!video.cloudinaryPublicId) {
      throw new Error("Video is missing Cloudinary public ID");
    }

    console.log(`Checking Cloudinary asset: ${video.cloudinaryPublicId}`);

    /*
     * 5. Retrieve video from Cloudinary
     *
     * This is NOT the upload signature.
     *
     * The upload signature was already used when
     * the client uploaded the video to Cloudinary.
     *
     * This request uses the Cloudinary API credentials
     * configured in cloudinary.js.
     */

    let cloudinaryAsset;

    try {
      cloudinaryAsset = await cloudinary.api.resource(
        video.cloudinaryPublicId,
        {
          resource_type: "video",
          type: "upload",
        },
      );
    } catch (error) {
      console.error("=================================");
      console.error("CLOUDINARY RESOURCE LOOKUP FAILED");
      console.error("Public ID:", video.cloudinaryPublicId);
      console.error("Error object:", error);
      console.error("Error message:", error?.message);
      console.error("Error name:", error?.name);
      console.error("Error stack:", error?.stack);
      console.error("Cloudinary nested error:", error?.error);
      console.error("=================================");

      /*
       * Throw the original error so BullMQ can retry
       * the job according to the queue configuration.
       */

      throw error;
    }

    /*
     * 6. Validate Cloudinary response
     */

    if (!cloudinaryAsset) {
      throw new Error("Cloudinary did not return the video asset");
    }

    /*
     * Make sure Cloudinary says this is a video.
     */

    if (cloudinaryAsset.resource_type !== "video") {
      throw new Error("Cloudinary asset is not a video");
    }

    /*
     * Make sure Cloudinary returned a public ID.
     */

    if (!cloudinaryAsset.public_id) {
      throw new Error("Cloudinary asset is missing public ID");
    }

    /*
     * Make sure the Cloudinary asset is exactly
     * the asset belonging to this video.
     */

    if (cloudinaryAsset.public_id !== video.cloudinaryPublicId) {
      throw new Error("Cloudinary public ID does not match database record");
    }

    /*
     * 7. Get authoritative metadata from Cloudinary
     */

    console.log("=================================");
    console.log("CLOUDINARY ASSET DETAILS");
    console.log("Public ID:", cloudinaryAsset.public_id);
    console.log("Resource Type:", cloudinaryAsset.resource_type);
    console.log("Format:", cloudinaryAsset.format);
    console.log("Duration:", cloudinaryAsset.duration);
    console.log("Bytes:", cloudinaryAsset.bytes);
    console.log("Full Cloudinary Asset:", cloudinaryAsset);
    console.log("=================================");

    const cloudinaryDuration = Number(cloudinaryAsset.duration);

    if (!Number.isFinite(cloudinaryDuration) || cloudinaryDuration <= 0) {
      throw new Error("Video is missing a valid duration");
    }

    video.videoFile = cloudinaryAsset.secure_url || video.videoFile;
    video.duration = cloudinaryDuration;
    video.processingStatus = "READY";
    video.processingError = null;

    await video.save();

    /*
     * 9. Log successful processing
     */

    console.log(`Video ${videoId} verified successfully`);

    console.log(`Duration: ${video.duration} seconds`);

    console.log(`Format: ${cloudinaryAsset.format}`);

    console.log(`Size: ${cloudinaryAsset.bytes} bytes`);

    console.log(`Video ${videoId} is now READY`);

    /*
     * 10. Return worker result
     */

    return {
      videoId,
      status: "READY",
      duration: video.duration,
      format: cloudinaryAsset.format,
      bytes: cloudinaryAsset.bytes,
    };
  },

  {
    connection: redisConnection,

    /*
     * Allow two video jobs to be processed
     * concurrently by this worker.
     */

    concurrency: 2,
  },
);

/*
 * Job completed
 */

videoWorker.on("completed", (job, result) => {
  console.log(`Worker completed job ${job.id}`, result);
});

/*
 * Job failed
 *
 * BullMQ retries the job according to the queue
 * configuration.
 */

videoWorker.on("failed", async (job, error) => {
  console.error("=================================");
  console.error(`Worker failed job ${job?.id}`);
  console.error("Error:", error);
  console.error("=================================");

  /*
   * Sometimes BullMQ can emit a failed event
   * without a job object.
   */

  if (!job) {
    return;
  }

  /*
   * Get the maximum number of attempts configured
   * for this job.
   */

  const maxAttempts = job.opts.attempts || 1;

  /*
   * Only mark the video FAILED after all
   * retry attempts have been exhausted.
   */

  if (job.attemptsMade >= maxAttempts) {
    const { videoId } = job.data;

    try {
      await Video.findByIdAndUpdate(videoId, {
        processingStatus: "FAILED",
        processingError: error?.message || "Video processing failed",
      });

      console.log(`Video ${videoId} marked as FAILED`);
    } catch (updateError) {
      console.error(
        "Failed to update video failure status:",
        updateError.message,
      );
    }
  }
});

/*
 * Worker-level error
 */

videoWorker.on("error", (error) => {
  console.error("Worker error:", error.message);
});

/*
 * Start worker
 */

const startWorker = async () => {
  await connectDatabase();

  console.log("Video worker started");
};

startWorker();
