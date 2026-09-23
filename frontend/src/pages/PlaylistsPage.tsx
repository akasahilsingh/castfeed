import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { getUserPlaylists, createPlaylist, deletePlaylist } from "../api/playlist";
import { formatDate } from "../utils/format";
import Skeleton from "../components/ui/Skeleton";
import toast from "react-hot-toast";

interface Playlist {
  _id: string;
  name: string;
  description: string;
  createdAt: string;
  videos: string[]; // array of video ids from the plain Playlist.find() response
}

export default function PlaylistsPage() {
  const { user } = useAuthStore();

  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading]     = useState(true);
  const [creating, setCreating]   = useState(false);
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState({ name: "", description: "" });
  const [errors, setErrors]       = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    getUserPlaylists(user._id)
      .then((res) => {
        const raw = res.data.data;
        setPlaylists(Array.isArray(raw) ? raw : []);
      })
      .catch(() => toast.error("Could not load playlists"))
      .finally(() => setLoading(false));
  }, [user]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.description.trim()) e.description = "Description is required";
    return e;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setCreating(true);
    try {
      const res = await createPlaylist({ name: form.name.trim(), description: form.description.trim() });
      setPlaylists((prev) => [res.data.data, ...prev]);
      setForm({ name: "", description: "" });
      setShowForm(false);
      toast.success("Playlist created");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to create";
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deletePlaylist(id);
      setPlaylists((prev) => prev.filter((p) => p._id !== id));
      setConfirmDelete(null);
      toast.success("Playlist deleted");
    } catch {
      toast.error("Failed to delete playlist");
    }
  };

  return (
    <div className="page-wrap">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 24 }}>
        <h1 className="t-section">Playlists</h1>
        {user && (
          <button
            className="btn-outline"
            style={{ padding: "5px 12px" }}
            onClick={() => { setShowForm(!showForm); setErrors({}); }}
          >
            {showForm ? "Cancel" : "+ New playlist"}
          </button>
        )}
      </div>

      {/* Create form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          style={{ background: "var(--bg-tint)", padding: 16, borderRadius: 6, marginBottom: 24, display: "flex", flexDirection: "column", gap: 14 }}
        >
          <div>
            <label className="field-label">Name <span style={{ color: "var(--danger)" }}>*</span></label>
            <input
              className="field-input"
              value={form.name}
              onChange={(e) => { setForm((f) => ({ ...f, name: e.target.value })); setErrors((er) => ({ ...er, name: "" })); }}
              placeholder="My favourite videos"
            />
            {errors.name && <p className="field-error">{errors.name}</p>}
          </div>
          <div>
            <label className="field-label">Description <span style={{ color: "var(--danger)" }}>*</span></label>
            <textarea
              className="field-textarea"
              rows={2}
              value={form.description}
              onChange={(e) => { setForm((f) => ({ ...f, description: e.target.value })); setErrors((er) => ({ ...er, description: "" })); }}
              placeholder="What's this playlist about?"
            />
            {errors.description && <p className="field-error">{errors.description}</p>}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button type="submit" className="btn-outline" style={{ padding: "6px 16px" }} disabled={creating}>
              {creating ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
      )}

      {/* List */}
      {loading ? (
        <div style={{ display: "grid", gap: 12 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: 8, padding: "14px 0", borderBottom: "1px solid var(--line)" }}>
              <Skeleton width="40%" height={14} />
              <Skeleton width="65%" height={12} />
              <Skeleton width={80} height={11} />
            </div>
          ))}
        </div>
      ) : playlists.length === 0 ? (
        <p className="t-body c-sub" style={{ paddingTop: 12 }}>No playlists yet. Create one above!</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {playlists.map((p) => (
            <div key={p._id}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", borderBottom: confirmDelete === p._id ? "none" : "1px solid var(--line)" }}>
                <Link to={`/playlists/${p._id}`} style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 3 }}>{p.name}</p>
                  <p className="t-meta c-sub" style={{ marginBottom: 3, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                    {p.description}
                  </p>
                  <p className="t-eyebrow c-sub">
                    {p.videos?.length ?? 0} video{(p.videos?.length ?? 0) !== 1 ? "s" : ""} · {formatDate(p.createdAt)}
                  </p>
                </Link>
                <div style={{ display: "flex", gap: 12, marginLeft: 16, flexShrink: 0 }}>
                  <Link to={`/playlists/${p._id}`} className="btn-text" style={{ fontSize: 12, padding: 0 }}>Open</Link>
                  <button
                    className="btn-text"
                    style={{ fontSize: 12, padding: 0, color: "var(--danger)" }}
                    onClick={() => setConfirmDelete(p._id)}
                  >Delete</button>
                </div>
              </div>
              {/* Inline confirm row */}
              {confirmDelete === p._id && (
                <div style={{ padding: "8px 0 14px", borderBottom: "1px solid var(--line)" }}>
                  <span style={{ fontSize: 13, color: "var(--danger)", marginRight: 12 }}>Delete "{p.name}"?</span>
                  <button className="btn-text" style={{ fontSize: 13, color: "var(--danger)", padding: 0, marginRight: 12 }} onClick={() => handleDelete(p._id)}>Delete</button>
                  <button className="btn-text" style={{ fontSize: 13, padding: 0 }} onClick={() => setConfirmDelete(null)}>Cancel</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
