import api from "./client";

export const getComments = (videoId: string, page = 1) =>
  api.get(`/comment/${videoId}`, { params: { page, limit: 10 } });

export const addComment = (videoId: string, comment: string) =>
  api.post(`/comment/${videoId}`, { comment });

export const updateComment = (commentId: string, comment: string) =>
  api.patch(`/comment/c/${commentId}`, { comment });

export const deleteComment = (commentId: string) =>
  api.delete(`/comment/c/${commentId}`);
