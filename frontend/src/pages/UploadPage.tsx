import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { uploadInit, uploadComplete, uploadFailed } from "../api/video";
import toast from "react-hot-toast";

// ── Upload pipeline stages ───────────────────────────────────────────────────
type Stage =
  | "idle"
  | "init" // POST /videos/upload-init
  | "uploading" // Upload to Cloudinary (progress tracked)
  | "completing" // POST /videos/upload-complete
  | "error" // Upload failed — shown inside the overlay
  | "done";

export default function UploadPage() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLInputElement>(null);
  const thumbRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({ title: "", description: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [videoName, setVideoName] = useState<string | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbPreview, setThumbPreview] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState(0); // 0-100, used in "uploading" stage
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const uploading = stage !== "idle" && stage !== "done";

  // ── helpers ─────────────────────────────────────────────────────────────────
  const change = (k: string, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = "Title is required";
    if (!videoRef.current?.files?.[0]) e.video = "Video file is required";
    return e;
  };

  // ── submit ───────────────────────────────────────────────────────────────────
  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    // console.log("SELECTED THUMBNAIL:", thumbRef.current?.files?.[0]);
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }

    const videoFile = videoRef.current!.files![0];

    // Hoisted so the catch block can notify the backend if Cloudinary fails
    let videoId: string | null = null;

    try {
      // ── Step 1: Init ────────────────────────────────────────────────────────
      setStage("init");
      const initRes = await uploadInit(form.title, form.description);
      const {
        videoId: initializedVideoId,
        cloudName,
        apiKey,
        timestamp,
        signature,
        folder,
        publicId,
        thumbTimestamp,
        thumbSignature,
        thumbFolder,
        thumbPublicId,
      } = initRes.data.data;

      videoId = initializedVideoId; // now accessible in catch

      // ── Step 2: Upload directly to Cloudinary via axios (with progress) ─────
      setStage("uploading");
      setProgress(0);

      const fd = new FormData();
      fd.append("file", videoFile);
      fd.append("api_key", apiKey);
      fd.append("timestamp", String(timestamp));
      fd.append("signature", signature);
      fd.append("folder", folder);
      fd.append("public_id", publicId);

      const cloudinaryRes = await axios.post<{
        public_id: string;
        secure_url: string;
        duration: number;
      }>(`https://api.cloudinary.com/v1_1/${cloudName}/video/upload`, fd, {
        onUploadProgress: (e) => {
          if (e.total) setProgress(Math.round((e.loaded * 100) / e.total));
        },
      });
      // console.log("VIDEO UPLOAD SUCCESS — NOW STARTING THUMBNAIL");
      // -- Step 2b: Upload thumbnail to Cloudinary (optional) ---------------
      let thumbnailUrl: string | undefined = undefined;
      const thumbFile = thumbnailFile;
      // console.log("THUMB FILE BEFORE IF:", thumbFile);
      if (thumbFile) {
        const thumbFd = new FormData();
        thumbFd.append("file", thumbFile);
        thumbFd.append("api_key", apiKey);
        thumbFd.append("timestamp", String(thumbTimestamp));
        thumbFd.append("signature", thumbSignature);
        thumbFd.append("folder", thumbFolder);
        thumbFd.append("public_id", thumbPublicId);

        // console.log("THUMBNAIL UPLOAD PARAMS:", {
        //   cloudName,
        //   apiKey,
        //   thumbTimestamp,
        //   thumbSignature,
        //   thumbFolder,
        //   thumbPublicId,
        //   fileName: thumbFile.name,
        //   fileType: thumbFile.type,
        //   fileSize: thumbFile.size,
        // });
        // console.log("STARTING THUMBNAIL UPLOAD");
        try {
          const thumbRes = await axios.post<{
            secure_url: string;
            public_id: string;
          }>(
            `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
            thumbFd,
          );
          // console.log("THUMBNAIL CLOUDINARY RESPONSE:", thumbRes.data);
          thumbnailUrl = thumbRes.data.secure_url;
        } catch (error) {
          console.error("Thumbnail upload failed:", error);

          if (axios.isAxiosError(error)) {
            console.error("Cloudinary thumbnail error:", {
              status: error.response?.status,
              data: error.response?.data,
            });
          }

          throw error;
        }
      }

      // ── Step 3: Notify backend ──────────────────────────────────────────────
      setStage("completing");
      const { public_id, secure_url, duration } = cloudinaryRes.data;
      await uploadComplete(
        videoId,
        public_id,
        secure_url,
        duration ?? 0,
        thumbnailUrl,
      );

      setStage("done");
      toast.success("Video uploaded! It's being processed in the background.");
      navigate("/dashboard");
    } catch (err: unknown) {
      // Cloudinary 413 arrives as a network error (no CORS headers on error response)
      // so error.response is undefined — detect it via the status hint in the message.
      const axiosErr = err as {
        message?: string;
        response?: {
          status?: number;
          data?: { message?: string; error?: { message?: string } };
        };
      };

      let msg = "Upload failed. Please try again.";

      if (
        axiosErr.response?.status === 413 ||
        axiosErr.message?.includes("413") ||
        axiosErr.message?.includes("Request Entity Too Large")
      ) {
        msg =
          "File too large. Cloudinary rejected the upload (413). Try a smaller file or upgrade your Cloudinary plan.";
      } else if (!axiosErr.response) {
        // Pure network error (CORS blocked error response, offline, etc.)
        msg = axiosErr.message?.includes("413")
          ? "File too large for your Cloudinary plan."
          : "Network error — check your connection and try again.";
      } else {
        msg =
          axiosErr.response.data?.error?.message ||
          axiosErr.response.data?.message ||
          msg;
      }

      setErrorMsg(msg);
      setStage("error");
      setProgress(0);

      // ── Notify backend so it can mark the video record as FAILED ────────────
      if (videoId) {
        try {
          await uploadFailed(videoId, msg);
        } catch (notifyErr) {
          // Non-critical — swallow so the original error stays visible
          console.error(
            "Failed to notify backend of upload failure:",
            notifyErr,
          );
        }
      }
    }
  };

  const resetError = () => {
    setStage("idle");
    setErrorMsg(null);
    setProgress(0);
  };

  // ── uploading overlay (also used for error state) ─────────────────────────────
  if (uploading) {
    const circumference = 2 * Math.PI * 52;

    const ringOffset =
      stage === "init"
        ? circumference // empty ring
        : stage === "uploading"
          ? circumference * (1 - progress / 100)
          : stage === "error"
            ? circumference // empty ring on error
            : 0; // full ring for completing/done

    const ringColor = stage === "error" ? "var(--danger)" : "var(--accent)";

    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 32,
          background: "var(--surface)",
          zIndex: 999,
        }}
      >
        {/* Animated ring */}
        <div style={{ position: "relative", width: 120, height: 120 }}>
          <svg
            width="120"
            height="120"
            viewBox="0 0 120 120"
            style={{ transform: "rotate(-90deg)" }}
          >
            {/* Track */}
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              stroke="var(--border)"
              strokeWidth="8"
            />
            {/* Fill */}
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              stroke={ringColor}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={ringOffset}
              style={{ transition: "stroke-dashoffset 0.3s ease" }}
            />
          </svg>

          {/* Centre — percentage or spinner */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {stage === "uploading" ? (
              <span
                style={{ fontSize: 22, fontWeight: 700, color: "var(--ink)" }}
              >
                {progress}%
              </span>
            ) : stage === "error" ? (
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--danger)"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            ) : (
              <span
                style={{
                  width: 20,
                  height: 20,
                  border: "2.5px solid var(--accent)",
                  borderTopColor: "transparent",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                  display: "inline-block",
                }}
              />
            )}
          </div>
        </div>

        {/* Labels */}
        <div style={{ textAlign: "center", maxWidth: 320 }}>
          <p
            className="t-section"
            style={{
              marginBottom: 8,
              color: stage === "error" ? "var(--danger)" : undefined,
            }}
          >
            {stage === "uploading"
              ? "Uploading video"
              : stage === "init"
                ? "Getting ready"
                : stage === "error"
                  ? "Upload failed"
                  : "Almost there"}
          </p>
          <p
            className="t-meta c-sub"
            style={{
              color: stage === "error" ? "var(--danger)" : undefined,
              lineHeight: 1.5,
            }}
          >
            {stage === "init"
              ? "Preparing upload…"
              : stage === "uploading"
                ? `Uploading to cloud — ${progress}%`
                : stage === "error"
                  ? errorMsg
                  : "Finalising on server…"}
          </p>
        </div>

        {/* Retry button — only shown on error */}
        {stage === "error" && (
          <button
            className="btn-outline"
            onClick={resetError}
            style={{ padding: "8px 28px" }}
          >
            Try again
          </button>
        )}

        {/* Thin linear bar — only during upload */}
        {stage === "uploading" && (
          <div style={{ width: 280 }}>
            <div className="progress-bar-track">
              <div
                className="progress-bar-fill"
                style={{ width: `${progress}%`, transition: "width 0.3s ease" }}
              />
            </div>
          </div>
        )}

        <p
          className="t-meta c-sub"
          style={{ maxWidth: 280, textAlign: "center", lineHeight: 1.5 }}
        >
          Please keep this tab open until the upload finishes.
        </p>
      </div>
    );
  }

  // ── form ─────────────────────────────────────────────────────────────────────
  return (
    <div className="page-wrap">
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <h1 className="t-section" style={{ marginBottom: 28 }}>
          Upload video
        </h1>

        <form
          onSubmit={submit}
          style={{ display: "flex", flexDirection: "column", gap: 20 }}
        >
          {/* Video dropzone */}
          <div>
            <label className="field-label">
              Video file <span style={{ color: "var(--danger)" }}>*</span>
            </label>
            <input
              ref={videoRef}
              type="file"
              accept="video/*"
              style={{ display: "none" }}
              onChange={(e) => setVideoName(e.target.files?.[0]?.name || null)}
            />
            <div
              className="dropzone"
              style={{ height: 96 }}
              onClick={() => videoRef.current?.click()}
            >
              {videoName ? (
                <p className="t-meta" style={{ color: "var(--ink)" }}>
                  ✓ {videoName}
                </p>
              ) : (
                <>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--sub)"
                    strokeWidth="1.5"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <p className="t-meta c-sub">
                    Drop a video file or click to browse
                  </p>
                </>
              )}
            </div>
            {errors.video && <p className="field-error">{errors.video}</p>}
          </div>

          {/* Thumbnail dropzone */}
          <div>
            <label className="field-label">
              Thumbnail{" "}
              <span className="c-sub" style={{ fontStyle: "italic" }}>
                (optional)
              </span>
            </label>
            <input
              ref={thumbRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0] || null;
                setThumbnailFile(f);
                if (f) {
                  setThumbPreview(URL.createObjectURL(f));
                } else {
                  setThumbPreview(null);
                }
              }}
            />
            <div
              className="dropzone"
              style={{ height: 56, overflow: "hidden" }}
              onClick={() => thumbRef.current?.click()}
            >
              {thumbPreview ? (
                <img
                  src={thumbPreview}
                  alt="Thumbnail"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    borderRadius: 3,
                  }}
                />
              ) : (
                <p className="t-meta c-sub">
                  Click to select thumbnail (16:9 recommended)
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="field-label">
              Title <span style={{ color: "var(--danger)" }}>*</span>
            </label>
            <input
              className="field-input"
              value={form.title}
              onChange={(e) => change("title", e.target.value)}
            />
            {errors.title && <p className="field-error">{errors.title}</p>}
          </div>

          <div>
            <label className="field-label">
              Description{" "}
              <span className="c-sub" style={{ fontStyle: "italic" }}>
                (optional)
              </span>
            </label>
            <textarea
              className="field-textarea"
              rows={4}
              value={form.description}
              onChange={(e) => change("description", e.target.value)}
              placeholder="Add a description…"
            />
          </div>

          <button
            type="submit"
            className="btn-outline"
            style={{
              width: "100%",
              justifyContent: "center",
              padding: "9px 0",
            }}
          >
            Upload &amp; publish
          </button>
        </form>
      </div>
    </div>
  );
}
