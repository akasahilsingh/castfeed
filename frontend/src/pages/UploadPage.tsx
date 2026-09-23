import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { uploadVideo } from "../api/video";
import toast from "react-hot-toast";

export default function UploadPage() {
  const navigate = useNavigate();
  const videoRef    = useRef<HTMLInputElement>(null);
  const thumbRef    = useRef<HTMLInputElement>(null);

  const [form, setForm]   = useState({ title: "", description: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [videoName, setVideoName] = useState<string | null>(null);
  const [thumbPreview, setThumbPreview] = useState<string | null>(null);

  const change = (k: string, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.title.trim())       e.title = "Title is required";
    if (!videoRef.current?.files?.[0]) e.video = "Video file is required";
    if (!thumbRef.current?.files?.[0]) e.thumb = "Thumbnail is required";
    return e;
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }

    const fd = new FormData();
    fd.append("title",       form.title);
    fd.append("description", form.description);
    fd.append("video",       videoRef.current!.files![0]);
    fd.append("thumbnail",   thumbRef.current!.files![0]);

    setUploading(true);
    setProgress(0);
    try {
      const res = await uploadVideo(fd, setProgress);
      toast.success("Video published");
      navigate(`/watch/${res.data.data.uploadedVideo._id}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Upload failed";
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="page-wrap">
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <h1 className="t-section" style={{ marginBottom: 28 }}>Upload video</h1>

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Video dropzone */}
          <div>
            <label className="field-label">Video file <span style={{ color: "var(--danger)" }}>*</span></label>
            <input ref={videoRef} type="file" accept="video/*" style={{ display: "none" }}
              onChange={(e) => setVideoName(e.target.files?.[0]?.name || null)} />
            <div className="dropzone" style={{ height: 96 }} onClick={() => videoRef.current?.click()}>
              {videoName ? (
                <p className="t-meta" style={{ color: "var(--ink)" }}>✓ {videoName}</p>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--sub)" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  <p className="t-meta c-sub">Drop a video file or click to browse</p>
                </>
              )}
            </div>
            {errors.video && <p className="field-error">{errors.video}</p>}
          </div>

          {/* Thumbnail dropzone */}
          <div>
            <label className="field-label">Thumbnail <span style={{ color: "var(--danger)" }}>*</span></label>
            <input ref={thumbRef} type="file" accept="image/*" style={{ display: "none" }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) setThumbPreview(URL.createObjectURL(f)); }} />
            <div className="dropzone" style={{ height: 56, overflow: "hidden" }} onClick={() => thumbRef.current?.click()}>
              {thumbPreview ? (
                <img src={thumbPreview} alt="Thumbnail" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 3 }} />
              ) : (
                <p className="t-meta c-sub">Click to select thumbnail (16:9 recommended)</p>
              )}
            </div>
            {errors.thumb && <p className="field-error">{errors.thumb}</p>}
          </div>

          <div>
            <label className="field-label">Title <span style={{ color: "var(--danger)" }}>*</span></label>
            <input className="field-input" value={form.title} onChange={(e) => change("title", e.target.value)} />
            {errors.title && <p className="field-error">{errors.title}</p>}
          </div>

          <div>
            <label className="field-label">Description <span className="c-sub" style={{ fontStyle: "italic" }}>(optional)</span></label>
            <textarea className="field-textarea" rows={4} value={form.description} onChange={(e) => change("description", e.target.value)} placeholder="Leave blank to use default description" />
            {errors.description && <p className="field-error">{errors.description}</p>}
          </div>

          {/* Progress bar — thin 2px accent fill, no ring (spec § 5 upload) */}
          {uploading && (
            <div>
              <div className="progress-bar-track">
                <div
                  className="progress-bar-fill"
                  style={{
                    width: `${progress}%`,
                    // pulse animation when server is processing (progress already at 100%)
                    animation: progress >= 100 ? "progress-pulse 1.4s ease-in-out infinite" : "none",
                  }}
                />
              </div>
              <p className="t-meta c-sub" style={{ marginTop: 6 }}>
                {progress < 100
                  ? `${progress}% — Uploading to server…`
                  : "Processing video on server (this may take a moment)…"}
              </p>
            </div>
          )}

          {/* Full-width outlined submit — spec § 5 upload: "outlined accent, full-width on this form only" */}
          <button type="submit" disabled={uploading} className="btn-outline" style={{ width: "100%", justifyContent: "center", padding: "9px 0" }}>
            {!uploading ? "Publish video" : progress < 100 ? "Uploading…" : "Processing…"}
          </button>
        </form>
      </div>
    </div>
  );
}
