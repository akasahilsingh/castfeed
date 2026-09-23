import { videoQueue } from "./queues/video.queue.js";

const job = await videoQueue.add("test-job", {
  message: "Hello from Castfeed",
});

console.log("Job added:", job.id);

process.exit(0);