import api from "./client";

export interface VideoQueryParams {
  page?: number;
  limit?: number;
  query?: string;
  sortBy?: "createdAt" | "views" | "duration" | "title";
  sortType?: "asc" | "desc";
  userId?: string;
}

// Actual backend routes (from video.routes.js):
// GET  /get-all-videos       — all published videos, no auth required
// POST /upload-init          — init Cloudinary direct upload, returns signed params
// POST /upload-complete      — finalize upload after Cloudinary confirms
// POST /upload-failed        — notify backend that upload failed (cleans up DB record)
// GET  /:videoId             — get single video
// PATCH /:videoId            — update video
// DELETE /:videoId           — delete video
// POST /:videoId             — toggle publish status  ← backend uses POST not PATCH

export const getAllVideos = (params: VideoQueryParams = {}) =>
  api.get("/video/get-all-videos", { params });

export const getVideoById = (videoId: string) => api.get(`/video/${videoId}`);

export const uploadVideo = (
  formData: FormData,
  onProgress?: (pct: number) => void,
) =>
  api.post("/video/post-video", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (e) => {
      if (onProgress && e.total)
        onProgress(Math.round((e.loaded * 100) / e.total));
    },
  });

export const recordVideoView = (videoId: string) => {
  return api.post(`/video/${videoId}/view`);
};

// ── New Cloudinary direct-upload pipeline ───────────────────────────────────

export interface UploadInitData {
  videoId: string;
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  publicId: string;
  // Thumbnail signing params
  thumbTimestamp: number;
  thumbSignature: string;
  thumbFolder: string;
  thumbPublicId: string;
}

export const uploadInit = (title: string, description: string) =>
  api.post<{ data: UploadInitData }>("/video/upload-init", {
    title,
    description,
  });

export const uploadComplete = (
  videoId: string,
  publicId: string,
  secureUrl: string,
  duration: number,
  thumbnailUrl?: string,
) =>
  api.post("/video/upload-complete", {
    videoId,
    publicId,
    secureUrl,
    duration,
    thumbnailUrl,
  });

export const uploadFailed = (videoId: string, errorMessage: string) =>
  api.post("/video/upload-failed", { videoId, errorMessage });

export const updateVideo = (videoId: string, formData: FormData) =>
  api.patch(`/video/${videoId}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const deleteVideo = (videoId: string) => api.delete(`/video/${videoId}`);

// Backend uses POST (not PATCH) for toggle publish
export const togglePublishStatus = (videoId: string) =>
  api.post(`/video/${videoId}`);
