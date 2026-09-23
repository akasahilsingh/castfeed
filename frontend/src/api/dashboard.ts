import api from "./client";
export { deleteVideo, togglePublishStatus } from "./video";

export const getChannelStats = () => api.get("/dashboard/stats");
export const getChannelVideos = () => api.get("/dashboard/videos");
