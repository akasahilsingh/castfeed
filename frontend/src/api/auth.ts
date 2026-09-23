import api from "./client";

export const loginUser = (data: { email?: string; userName?: string; password: string }) =>
  api.post("/users/login", data);

export const registerUser = (formData: FormData) =>
  api.post("/users/register", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const logoutUser = () => api.post("/users/logout");

export const refreshToken = () => api.post("/users/refresh-token");

export const getCurrentUser = () => api.get("/users/current-user");

export const updateAccount = (data: { userName?: string; email?: string }) =>
  api.patch("/users/update-account", data);

export const updateAvatar = (formData: FormData) =>
  api.patch("/users/update-avatar", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const updateCoverImage = (formData: FormData) =>
  api.patch("/users/update-cover-img", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const changePassword = (data: { oldPassword: string; newPassword: string }) =>
  api.post("/users/change-password", data);

export const getChannelProfile = (userName: string) =>
  api.get(`/users/channel-profile/${userName}`);

export const getWatchHistory = () => api.get("/users/watch-history");
