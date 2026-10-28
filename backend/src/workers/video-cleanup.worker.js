import dotenv from "dotenv";
import { Worker } from "bullmq";
import mongoose from "mongoose";

import { redisConnection } from "../utils/redis.js";
import { Video } from "../model/video.model.js";
import { cloudinary } from "../utils/cloudinary.js";

dotenv.config();

const STALE_UPLOAD_AGE_MS = 2 * 60 * 60 * 1000;

const BATCH_SIZE = 50;

const connectDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    console.log("Cleanup worker connected to MongoDB");
  } catch (error) {
    console.error(
      "Cleanup worker failed to connect to MongoDB:",
      error.message,
    );

    process.exit(1);
  }
};

const cleanupStaleUploads = async () => {
  const staleBefore = new Date(
    Date.now() - STALE_UPLOAD_AGE_MS,
  );

  console.log("=================================");
  console.log("Checking for stale video uploads");
  console.log("Stale before:", staleBefore.toISOString());
  console.log("=================================");

  let cleanedCount = 0;

  while (true) {
    /*
     * Atomically claim one stale upload.
     *
     * UPLOADING → CLEANING
     *
     * This prevents upload-complete from racing
     * with the cleanup process.
     */
    const video = await Video.findOneAndUpdate(
      {
        processingStatus: "UPLOADING",
        createdAt: {
          $lt: staleBefore,
        },
      },
      {
        $set: {
          processingStatus: "CLEANING",
          processingError:
            "Upload abandoned or timed out. Cleaning up resources.",
        },
      },
      {
        new: true,
      },
    );

    if (!video) {
      break;
    }

    try {
      console.log("---------------------------------");
      console.log("Cleaning stale video");
      console.log("Video ID:", video._id.toString());
      console.log("Owner:", video.owner.toString());
      console.log("Created at:", video.createdAt);
      console.log(
        "Cloudinary public ID:",
        video.cloudinaryPublicId,
      );

      /*
       * Delete the Cloudinary asset if one exists.
       */
      if (video.cloudinaryPublicId) {
        try {
          const result = await cloudinary.uploader.destroy(
            video.cloudinaryPublicId,
            {
              resource_type: "video",
              type: "upload",
            },
          );

          console.log(
            "Cloudinary cleanup result:",
            result,
          );
        } catch (cloudinaryError) {
          /*
           * Cloudinary cleanup failure should not leave
           * the MongoDB document stuck in CLEANING.
           *
           * The document becomes FAILED and retains
           * the Cloudinary public ID so the problem
           * can be diagnosed/retried later.
           */
          console.error(
            "Cloudinary cleanup failed:",
            cloudinaryError.message,
          );

          await Video.findByIdAndUpdate(video._id, {
            processingStatus: "FAILED",
            processingError:
              `Upload timed out and Cloudinary cleanup failed: ${cloudinaryError.message}`,
          });

          continue;
        }
      }

      /*
       * Cloudinary cleanup succeeded or there was
       * no Cloudinary asset.
       */
      await Video.findByIdAndUpdate(video._id, {
        processingStatus: "FAILED",
        processingError:
          "Video upload timed out after 2 hours and was cleaned up.",
        videoFile: null,
        cloudinaryPublicId: null,
        isPublished: false,
      });

      cleanedCount += 1;

      console.log(
        `Video ${video._id} marked as FAILED`,
      );
    } catch (error) {
      console.error(
        `Unexpected cleanup error for video ${video._id}:`,
        error.message,
      );

      /*
       * Make sure the document doesn't remain
       * stuck in CLEANING forever.
       */
      await Video.findByIdAndUpdate(video._id, {
        processingStatus: "FAILED",
        processingError:
          `Video cleanup failed: ${error.message}`,
        isPublished: false,
      });
    }

    /*
     * Don't process an unlimited number of records
     * in one execution.
     */
    if (cleanedCount >= BATCH_SIZE) {
      break;
    }
  }

  console.log(
    `Stale upload cleanup finished. Cleaned: ${cleanedCount}`,
  );

  return {
    cleanedCount,
  };
};

const cleanupWorker = new Worker(
  "video-cleanup",
  async (job) => {
    console.log("=================================");
    console.log("Running cleanup job");
    console.log("Job ID:", job.id);
    console.log("Job name:", job.name);
    console.log("=================================");

    return await cleanupStaleUploads();
  },
  {
    connection: redisConnection,
    concurrency: 1,
  },
);

cleanupWorker.on("completed", (job, result) => {
  console.log(
    `Cleanup job ${job.id} completed`,
    result,
  );
});

cleanupWorker.on("failed", (job, error) => {
  console.error("=================================");
  console.error(`Cleanup job ${job?.id} failed`);
  console.error("Error:", error.message);
  console.error("=================================");
});

cleanupWorker.on("error", (error) => {
  console.error(
    "Cleanup worker error:",
    error.message,
  );
});

const startWorker = async () => {
  await connectDatabase();

  console.log("Video cleanup worker started");
};

startWorker();