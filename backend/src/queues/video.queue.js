import { Queue } from "bullmq";
import { redisConnection } from "../utils/redis.js";

const videoQueue = new Queue("video-processing", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,

    backoff: {
      type: "exponential",
      delay: 5000,
    },

    removeOnComplete: {
      count: 100,
    },

    removeOnFail: {
      count: 100,
    },
  },
});

export { videoQueue };
