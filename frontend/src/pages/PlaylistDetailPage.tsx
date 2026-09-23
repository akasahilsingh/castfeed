import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getPlaylistById, updatePlaylist, deletePlaylist, removeVideoFromPlaylist } from "../api/playlist";
import { useAuthStore } from "../store/authStore";
import { formatViews, formatDuration, formatDate } from "../utils/format";
import Skeleton from "../components/ui/Skeleton";
import toast from "react-hot-toast";

interface PlaylistVideo {
  _id: string;
  title: string;
  thumbnail: string;
  duration: number;
  views: number;
  createdAt: string;
}

interface PlaylistDetail {
  _id?: string;
  name: string;
  description: string;
  createdAt: string;
  totalVideos: number;
  totalViews: number;
  videos: PlaylistVideo[];
  owner: { _id: string; userName: string; fullName?: string; avatar?: string };
}

export default function PlaylistDetailPage() {
  const { playlistId } = useParams<{ playlistId: string }>();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [playlist, setPlaylist]   = useState<PlaylistDetail | null>(null);
  const [loading, setLoading]     = useState(true);
  const [editing, setEditing]     = useState(false);
  const [editForm, setEditForm]   = useState({ name: "", description: "" });
  const [saving, setSaving]       = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    if (!playlistId) return;
    setLoading(true);
    getPlaylistById(playlistId)
      .then((res) => {
        // Controller returns an array from aggregate
        const data = Array.isArray(res.data.data) ? res.data.data[0] : res.data.data;
        setPlaylist(data);
      })
      .catch(() => toast.error("Could not load playlist"))
      .finally(() => setLoading(false));
  }, [playlistId]);

  const isOwner = user && playlist?.owner?._id === user._id;

  const startEdit = () => {
    if (!playlist) return;
    setEditForm({ name: playlist.name, description: playlist.description });
    setEditing(true);
  };

  const handleSave = async () => {
    if (!playlistId || !editForm.name.trim() || !editForm.description.trim()) return;
    setSaving(true);
    try {
      const res = await updatePlaylist(playlistId, { name: editForm.name.trim(), description: editForm.description.trim() });
      setPlaylist((prev) => prev ? { ...prev, name: res.data.data.name, description: res.data.data.description } : prev);
      setEditing(false);
      toast.success("Playlist updated");
    } catch {
      toast.error("Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePlaylist = async () => {
    if (!playlistId) return;
    try {
      await deletePlaylist(playlistId);
      toast.success("Playlist deleted");
      navigate("/playlists");
    } catch {
      toast.error("Failed to delete playlist");
    }
  };

  const handleRemoveVideo = async (videoId: string) => {
    if (!playlistId) return;
    setRemovingId(videoId);
    try {
      await removeVideoFromPlaylist(videoId, playlistId);
      setPlaylist((prev) => prev
        ? { ...prev, videos: prev.videos.filter((v) => v._id !== videoId), totalVideos: prev.totalVideos - 1 }
        : prev
      );
      toast.success("Removed from playlist");
    } catch {
      toast.error("Failed to remove video");
    } finally {
      setRemovingId(null);
    }
  };

  if (loading) {
    return (
      <div className="page-wrap">
        <Skeleton width="50%" height={20} style={{ marginBottom: 10 }} />
        <Skeleton width="70%" height={13} style={{ marginBottom: 24 }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ display: "flex", gap: 12, paddingBottom: 14, borderBottom: "1px solid var(--line)" }}>
              <Skeleton width={88} height={52} style={{ borderRadius: 3, flexShrink: 0 }} />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                <Skeleton width="75%" height={13} />
                <Skeleton width="45%" height={11} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!playlist) {
    return <div className="page-wrap"><p className="t-body c-sub" style={{ paddingTop: 40 }}>Playlist not found.</p></div>;
  }

  return (
    <div className="page-wrap">
      {/* Playlist header */}
      <div style={{ marginBottom: 24 }}>
        {editing ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 520 }}>
            <input
              className="field-input"
              value={editForm.name}
              onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Playlist name"
            />
            <textarea
              className="field-textarea"
              rows={2}
              value={editForm.description}
              onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Description"
            />
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn-text" style={{ padding: 0, fontSize: 13 }} onClick={() => setEditing(false)}>Cancel</button>
              <button className="btn-outline" style={{ padding: "5px 14px" }} onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, marginBottom: 6 }}>
              <h1 className="t-title">{playlist.name}</h1>
              {isOwner && (
                <div style={{ display: "flex", gap: 12, flexShrink: 0 }}>
                  <button className="btn-text" style={{ padding: 0, fontSize: 12 }} onClick={startEdit}>Edit</button>
                  <button className="btn-text" style={{ padding: 0, fontSize: 12, color: "var(--danger)" }} onClick={handleDeletePlaylist}>Delete</button>
                </div>
              )}
            </div>
            <p className="t-body c-sub" style={{ marginBottom: 6 }}>{playlist.description}</p>
            <p className="t-meta c-sub">
              by{" "}
              <Link to={`/channel/${playlist.owner.userName}`} style={{ color: "var(--accent)" }}>
                {playlist.owner.userName}
              </Link>
              {" · "}{playlist.totalVideos} video{playlist.totalVideos !== 1 ? "s" : ""}
              {" · "}{formatViews(playlist.totalViews)} total views
              {" · "}{formatDate(playlist.createdAt)}
            </p>
          </>
        )}
      </div>

      {/* Video list */}
      {playlist.videos.length === 0 ? (
        <p className="t-body c-sub">No videos in this playlist yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {playlist.videos.map((v) => (
            <div
              key={v._id}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid var(--line)" }}
            >
              {/* Thumbnail */}
              <Link to={`/watch/${v._id}`} style={{ flexShrink: 0 }}>
                <div style={{ width: 88, height: 52, borderRadius: 3, background: "var(--bg-tint)", overflow: "hidden", position: "relative" }}>
                  {v.thumbnail && <img src={v.thumbnail} alt={v.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                  {v.duration > 0 && (
                    <span style={{ position: "absolute", bottom: 3, right: 3, background: "rgba(0,0,0,0.72)", color: "#fff", fontSize: 10, padding: "1px 4px", borderRadius: 2 }}>
                      {formatDuration(v.duration)}
                    </span>
                  )}
                </div>
              </Link>

              {/* Meta */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <Link to={`/watch/${v._id}`}>
                  <p style={{ fontSize: 13.5, fontWeight: 500, marginBottom: 3, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                    {v.title}
                  </p>
                </Link>
                <p className="t-meta c-sub">
                  {formatViews(v.views)} views · {formatDate(v.createdAt)}
                </p>
              </div>

              {/* Remove button (owner only) */}
              {isOwner && (
                <button
                  className="btn-text"
                  style={{ fontSize: 12, padding: 0, color: "var(--danger)", flexShrink: 0 }}
                  disabled={removingId === v._id}
                  onClick={() => handleRemoveVideo(v._id)}
                >
                  {removingId === v._id ? "…" : "Remove"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
