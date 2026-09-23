import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getChannelStats, getChannelVideos, deleteVideo, togglePublishStatus } from "../api/dashboard";
import { useAuthStore } from "../store/authStore";
import { formatViews, formatDuration, formatDate } from "../utils/format";
import StatBlock from "../components/ui/StatBlock";
import toast from "react-hot-toast";

interface Stats { totalVideos: number; totalViews: number; totalLikes: number; totalSubscribers: number; }
interface DashVideo { _id: string; thumbnail: string; title: string; views: number; duration: number; isPublished: boolean; createdAt: string; }

export default function DashboardPage() {
  const { user } = useAuthStore();

  const [stats, setStats]     = useState<Stats | null>(null);
  const [videos, setVideos]   = useState<DashVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setApiError(null);
    Promise.all([getChannelStats(), getChannelVideos()])
      .then(([sRes, vRes]) => {
        setStats(sRes.data.data);
        // Backend returns array directly (or wrapped in data)
        const raw = vRes.data.data;
        setVideos(Array.isArray(raw) ? raw : []);
      })
      .catch((err: unknown) => {
        const msg =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message
          ?? "Could not load dashboard data.";
        setApiError(msg);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = async (id: string) => {
    setToggling(id);
    try {
      const res = await togglePublishStatus(id);
      const { isPublished } = res.data.data;
      setVideos((v) => v.map((vid) => vid._id === id ? { ...vid, isPublished } : vid));
    } catch { toast.error("Failed to toggle status"); }
    finally { setToggling(null); }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteVideo(id);
      setVideos((v) => v.filter((vid) => vid._id !== id));
      setConfirmDelete(null);
      toast.success("Video deleted");
    } catch { toast.error("Failed to delete video"); }
  };

  return (
    <div className="page-wrap">
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 24 }}>
        <h1 className="t-section">Dashboard</h1>
        <Link to="/upload" className="btn-outline" style={{ padding: "5px 12px" }}>Upload video</Link>
      </div>

      {/* Error state */}
      {apiError && !loading && (
        <p className="t-body" style={{ color: "var(--danger)", marginBottom: 20 }}>{apiError}</p>
      )}

      {/* Stat blocks — 4-col grid of flat tint blocks, spec § 4.5 */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 32 }}>
          {Array.from({length:4}).map((_,i) => <div key={i} className="stat-block" style={{ height: 74 }} />)}
        </div>
      ) : stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 32 }}>
          <StatBlock label="Total views"       value={formatViews(stats.totalViews)} />
          <StatBlock label="Subscribers"       value={formatViews(stats.totalSubscribers)} />
          <StatBlock label="Videos"            value={stats.totalVideos} />
          <StatBlock label="Total likes"       value={formatViews(stats.totalLikes)} />
        </div>
      )}

      {/* Video management table — spec § 4.6 */}
      <table className="data-table">
        <thead>
          <tr>
            <th>Video</th>
            <th>Views</th>
            <th>Status</th>
            <th>Uploaded</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({length:4}).map((_,i) => (
              <tr key={i}>
                {Array.from({length:5}).map((__,j) => (
                  <td key={j}><div style={{ height: 13, background: "var(--bg-tint)", borderRadius: 2 }} /></td>
                ))}
              </tr>
            ))
          ) : videos.length === 0 ? (
            <tr><td colSpan={5}><p className="t-body c-sub" style={{paddingTop:20}}>No videos yet. <Link to="/upload" style={{color:"var(--accent)"}}>Upload your first video</Link></p></td></tr>
          ) : (
            videos.map((v) => (
              <React.Fragment key={v._id}>
                <tr>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {/* 56×32 thumbnail — spec § 4.6 */}
                      <div style={{ width: 56, height: 32, borderRadius: 3, background: "var(--bg-tint)", flexShrink: 0, overflow: "hidden" }}>
                        {v.thumbnail && <img src={v.thumbnail} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{v.title}</span>
                    </div>
                  </td>
                  <td className="t-body">{formatViews(v.views)}</td>
                  {/* Status — plain colored text, no badge (spec § 4.7) */}
                  <td style={{ color: v.isPublished ? "var(--accent)" : "var(--sub)", fontSize: 13 }}>
                    {v.isPublished ? "Published" : "Draft"}
                  </td>
                  <td className="t-meta c-sub">{formatDate(v.createdAt)}</td>
                  <td>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <button
                        className="btn-text"
                        style={{ fontSize: 12, padding: 0, color: "var(--accent)" }}
                        onClick={() => handleToggle(v._id)}
                        disabled={toggling === v._id}
                      >
                        {v.isPublished ? "Unpublish" : "Publish"}
                      </button>
                      <Link to={`/watch/${v._id}`} className="btn-text" style={{ fontSize: 12, padding: 0 }}>View</Link>
                      <button
                        className="btn-text"
                        style={{ fontSize: 12, padding: 0, color: "var(--danger)" }}
                        onClick={() => setConfirmDelete(v._id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
                {/* Inline confirmation row — no modal per spec */}
                {confirmDelete === v._id && (
                  <tr>
                    <td colSpan={5} style={{ paddingTop: 4, paddingBottom: 10 }}>
                      <span style={{ fontSize: 13, color: "var(--danger)", marginRight: 12 }}>Delete this video?</span>
                      <button className="btn-text" style={{ fontSize: 13, color: "var(--danger)", marginRight: 12, padding: 0 }} onClick={() => handleDelete(v._id)}>Delete</button>
                      <button className="btn-text" style={{ fontSize: 13, padding: 0 }} onClick={() => setConfirmDelete(null)}>Cancel</button>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
