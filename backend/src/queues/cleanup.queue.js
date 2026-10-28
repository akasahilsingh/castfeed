import { Queue } from "bullmq";
import { redisConnection } from "../utils/redis.js";

const cleanupQueue = new Queue("video-cleanup", {
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

export { cleanupQueue };