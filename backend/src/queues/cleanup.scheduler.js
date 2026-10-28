import { cleanupQueue } from "./cleanup.queue.js";

const scheduleCleanupJob = async () => {
  await cleanupQueue.upsertJobScheduler(
    "stale-video-upload-cleanup",
    {
      every: 15 * 60 * 1000,
    },
    {
      name: "cleanup-stale-uploads",
      data: {},
    },
  );

  console.log(
    "Stale video cleanup scheduler started",
  );
};

scheduleCleanupJob().catch((error) => {
  console.error(
    "Failed to schedule cleanup job:",
    error.message,
  );

  process.exit(1);
});