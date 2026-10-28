import dotenv from "dotenv";

import { videoQueue } from "./queues/video.queue.js";

dotenv.config();

const videoId = "6ab3bfe2d9ab1c5e4dc83797";

const job = await videoQueue.add(
  "process-video",
  {
    videoId,
  },
);

console.log("Video processing job added:", job.id);

process.exit(0);