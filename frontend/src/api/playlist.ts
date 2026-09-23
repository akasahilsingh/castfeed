import api from "./client";

export const createPlaylist = (data: { name: string; description: string }) =>
  api.post("/playlist/", data);

export const getUserPlaylists = (userId: string) =>
  api.get(`/playlist/user/${userId}`);

export const getPlaylistById = (playlistId: string) =>
  api.get(`/playlist/${playlistId}`);

export const updatePlaylist = (playlistId: string, data: { name?: string; description?: string }) =>
  api.patch(`/playlist/${playlistId}`, data);

export const deletePlaylist = (playlistId: string) =>
  api.delete(`/playlist/${playlistId}`);

export const addVideoToPlaylist = (videoId: string, playlistId: string) =>
  api.patch(`/playlist/add/${videoId}/${playlistId}`);

export const removeVideoFromPlaylist = (videoId: string, playlistId: string) =>
  api.delete(`/playlist/remove/${videoId}/${playlistId}`);
