import { Queue } from "bullmq";
import { redisConnection } from "../utils/redis.js";

const videoQueue = new Queue("video-processing", {
  connection: redisConnection,
});

export { videoQueue };