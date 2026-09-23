import api from "./client";

export const toggleVideoLike = (videoId: string) =>
  api.post(`/likes/video/${videoId}`);

export const toggleCommentLike = (commentId: string) =>
  api.post(`/likes/comment/${commentId}`);

export const getLikedVideos = () => api.get("/likes/liked-videos");
