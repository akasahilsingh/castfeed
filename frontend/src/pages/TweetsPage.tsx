import { useEffect, useState, useRef } from "react";
import { useAuthStore } from "../store/authStore";
import { createTweet, getUserTweets, updateTweet, deleteTweet } from "../api/tweet";
import { formatDate } from "../utils/format";
import Initials from "../components/ui/Initials";
import Skeleton from "../components/ui/Skeleton";
import toast from "react-hot-toast";

interface Tweet {
  _id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  owner: { _id: string; userName: string; fullName?: string; avatar?: string };
}

export default function TweetsPage() {
  const { user } = useAuthStore();

  const [tweets, setTweets]     = useState<Tweet[]>([]);
  const [loading, setLoading]   = useState(true);
  const [newText, setNewText]   = useState("");
  const [posting, setPosting]   = useState(false);
  const [editId, setEditId]     = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [saving, setSaving]     = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    getUserTweets(user._id)
      .then((res) => {
        const raw = res.data.data;
        setTweets(Array.isArray(raw?.tweet) ? raw.tweet : []);
      })
      .catch(() => toast.error("Could not load tweets"))
      .finally(() => setLoading(false));
  }, [user]);

  const handlePost = async () => {
    if (!newText.trim()) return;
    setPosting(true);
    try {
      const res = await createTweet(newText.trim());
      // Backend returns the tweet doc directly; inject owner from current user
      const created: Tweet = {
        ...res.data.data,
        owner: {
          _id: user!._id,
          userName: user!.userName,
          fullName: user!.fullName,
          avatar: user!.avatar,
        },
      };
      setTweets((prev) => [created, ...prev]);
      setNewText("");
      toast.success("Tweeted!");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to post";
      toast.error(msg);
    } finally {
      setPosting(false);
    }
  };

  const startEdit = (t: Tweet) => {
    setEditId(t._id);
    setEditText(t.content);
  };

  const handleSave = async (id: string) => {
    if (!editText.trim()) return;
    setSaving(true);
    try {
      await updateTweet(id, editText.trim());
      setTweets((prev) => prev.map((t) => t._id === id ? { ...t, content: editText.trim() } : t));
      setEditId(null);
      toast.success("Updated");
    } catch {
      toast.error("Failed to update tweet");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTweet(id);
      setTweets((prev) => prev.filter((t) => t._id !== id));
      toast.success("Deleted");
    } catch {
      toast.error("Failed to delete tweet");
    }
  };

  return (
    <div className="page-wrap">
      <h1 className="t-section" style={{ marginBottom: 24 }}>Tweets</h1>

      {/* Compose box */}
      {user && (
        <div style={{ display: "flex", gap: 12, marginBottom: 28, alignItems: "flex-start" }}>
          <Initials name={user.fullName} src={user.avatar} size={32} />
          <div style={{ flex: 1 }}>
            <textarea
              ref={textareaRef}
              className="comment-input"
              placeholder="What's on your mind?"
              rows={2}
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              style={{ fontSize: 13.5, minHeight: 48 }}
            />
            {newText.trim() && (
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
                <button className="btn-text" onClick={() => setNewText("")} style={{ padding: 0, fontSize: 13 }}>Cancel</button>
                <button
                  className="btn-outline"
                  style={{ padding: "5px 14px" }}
                  onClick={handlePost}
                  disabled={posting}
                >
                  {posting ? "Posting…" : "Tweet"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tweet feed */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ display: "flex", gap: 12, paddingBottom: 20, borderBottom: "1px solid var(--line)" }}>
              <Skeleton width={32} height={32} />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                <Skeleton width={120} height={12} />
                <Skeleton width="80%" height={13} />
                <Skeleton width="55%" height={13} />
              </div>
            </div>
          ))}
        </div>
      ) : tweets.length === 0 ? (
        <p className="t-body c-sub" style={{ paddingTop: 12 }}>No tweets yet. Be the first to tweet!</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {tweets.map((t) => (
            <div
              key={t._id}
              style={{ display: "flex", gap: 12, paddingTop: 16, paddingBottom: 16, borderBottom: "1px solid var(--line)" }}
            >
              <Initials name={t.owner.fullName || t.owner.userName} src={t.owner.avatar} size={32} />
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Header */}
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{t.owner.userName}</span>
                  <span className="t-meta c-sub">{formatDate(t.createdAt)}</span>
                  {t.createdAt !== t.updatedAt && (
                    <span className="t-eyebrow c-sub">(edited)</span>
                  )}
                </div>

                {/* Body / edit mode */}
                {editId === t._id ? (
                  <div>
                    <textarea
                      className="field-textarea"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      style={{ minHeight: 64, marginBottom: 8 }}
                    />
                    <div style={{ display: "flex", gap: 10 }}>
                      <button className="btn-text" style={{ padding: 0, fontSize: 12 }} onClick={() => setEditId(null)}>Cancel</button>
                      <button
                        className="btn-outline"
                        style={{ padding: "3px 10px", fontSize: 12 }}
                        onClick={() => handleSave(t._id)}
                        disabled={saving}
                      >
                        {saving ? "Saving…" : "Save"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="t-body" style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{t.content}</p>
                    {user && user._id === t.owner._id && (
                      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                        <button
                          className="btn-text"
                          style={{ padding: 0, fontSize: 12 }}
                          onClick={() => startEdit(t)}
                        >Edit</button>
                        <button
                          className="btn-text"
                          style={{ padding: 0, fontSize: 12, color: "var(--danger)" }}
                          onClick={() => handleDelete(t._id)}
                        >Delete</button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
