
import { Worker } from "bullmq";
import { redisConnection } from "../utils/redis.js";



const videoWorker = new Worker(
  "video-processing",
  async (job) => {
    console.log("=================================");
    console.log("Processing video job");
    console.log("Job ID:", job.id);
    console.log("Job name:", job.name);
    console.log("Video ID:", job.data.videoId);
    console.log("=================================");

    /*
     * Temporary processing simulation.
     *
     * Later this will contain the actual
     * video processing workflow.
     */
    await new Promise((resolve) => {
      setTimeout(resolve, 3000);
    });

    console.log(
      `Video ${job.data.videoId} processing completed`,
    );

    return {
      videoId: job.data.videoId,
      status: "completed",
    };
  },
  {
    connection: redisConnection,
  },
);

videoWorker.on("completed", (job, result) => {
  console.log(
    `Worker completed job ${job.id}`,
    result,
  );
});

videoWorker.on("failed", (job, error) => {
  console.error(
    `Worker failed job ${job?.id}:`,
    error.message,
  );
});

videoWorker.on("error", (error) => {
  console.error(
    "Worker error:",
    error.message,
  );
});

console.log("Video worker started");