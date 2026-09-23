import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getVideoById } from "../api/video";
import { getComments, addComment, updateComment, deleteComment } from "../api/comment";
import { toggleVideoLike } from "../api/like";
import { toggleSubscription } from "../api/subscription";
import { getAllVideos } from "../api/video";
import { useAuthStore } from "../store/authStore";
import { formatViews, formatDuration, formatDate, metaLine } from "../utils/format";
import Initials from "../components/ui/Initials";
import RowList from "../components/video/RowList";
import type { VideoData } from "../components/video/VideoRow";
import Skeleton from "../components/ui/Skeleton";
import toast from "react-hot-toast";

interface VideoDetail extends VideoData {
  videoFile: string;
  description: string;
  likesCount: number;
  isLiked: boolean;
  owner: VideoData["owner"] & { subscribersCount: number; isSubscribed: boolean };
}

interface Comment {
  _id: string;
  content: string;
  createdAt: string;
  owner: { _id: string; userName: string; avatar?: string };
}

export default function WatchPage() {
  const { videoId } = useParams<{ videoId: string }>();
  const { user } = useAuthStore();

  const [video, setVideo]       = useState<VideoDetail | null>(null);
  const [related, setRelated]   = useState<VideoData[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentPage, setCommentPage] = useState(1);
  const [hasMoreComments, setHasMoreComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [descExpanded, setDescExpanded] = useState(false);
  const [loading, setLoading]   = useState(true);
  const [editId, setEditId]     = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [liked, setLiked]       = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);

  useEffect(() => {
    if (!videoId) return;
    setLoading(true);
    Promise.all([
      getVideoById(videoId),
      getComments(videoId, 1),
      getAllVideos({ limit: 6, sortBy: "views", sortType: "desc" }),
    ]).then(([vRes, cRes, rRes]) => {
      const v = vRes.data.data;
      setVideo(v);
      setLiked(Boolean(v.isLiked));
      setLikesCount(Number(v.likesCount) || 0);
      setComments(cRes.data.data.comments || []);
      setHasMoreComments(cRes.data.data.pagination?.hasNextPage ?? false);
      setRelated(rRes.data.data.videos.filter((r: VideoData) => r._id !== videoId).slice(0, 5));
    }).catch(() => {}).finally(() => setLoading(false));
  }, [videoId]);

  const handleLike = async () => {
    if (!user) { toast.error("Sign in to like"); return; }
    const prev = liked;
    const prevCount = likesCount;
    setLiked(!prev);
    setLikesCount((n) => prev ? n - 1 : n + 1);
    try {
      const res = await toggleVideoLike(videoId!);
      // Sync with the server's authoritative response to prevent desync
      const serverIsLiked: boolean = res.data.data.isliked;
      setLiked(serverIsLiked);
      setLikesCount((n) => {
        // If our optimistic direction matches the server, keep it;
        // otherwise correct it by applying the server truth from prevCount
        const optimisticWasLike = !prev;
        if (optimisticWasLike === serverIsLiked) return n; // already correct
        // Server disagreed — roll back optimistic delta and apply correct one
        return serverIsLiked ? prevCount + 1 : prevCount - 1;
      });
    } catch (err: unknown) {
      setLiked(prev);
      setLikesCount(prevCount);
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Could not update like";
      toast.error(message);
    }
  };

  const handleSubscription = async () => {
    if (!video?.owner?._id || subscriptionLoading) return;
    const previous = video.owner.isSubscribed;
    setSubscriptionLoading(true);
    try {
      const res = await toggleSubscription(video.owner._id);
      setVideo((current) => current ? { ...current, owner: { ...current.owner, isSubscribed: res.data.data.isSubscribed } } : current);
    } catch (err: unknown) {
      setVideo((current) => current ? { ...current, owner: { ...current.owner, isSubscribed: previous } } : current);
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Could not update subscription";
      toast.error(message);
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const submitComment = async () => {
    if (!user) { toast.error("Sign in to comment"); return; }
    if (!newComment.trim()) return;
    try {
      const res = await addComment(videoId!, newComment.trim());
      setComments((c) => [res.data.data, ...c]);
      setNewComment("");
    } catch { toast.error("Failed to add comment"); }
  };

  const saveEdit = async (id: string) => {
    try {
      await updateComment(id, editText);
      setComments((c) => c.map((cm) => cm._id === id ? { ...cm, content: editText } : cm));
      setEditId(null);
    } catch { toast.error("Failed to update comment"); }
  };

  const removeComment = async (id: string) => {
    try {
      await deleteComment(id);
      setComments((c) => c.filter((cm) => cm._id !== id));
    } catch { toast.error("Failed to delete comment"); }
  };

  const loadMoreComments = async () => {
    const pg = commentPage + 1;
    const res = await getComments(videoId!, pg);
    setComments((c) => [...c, ...(res.data.data.comments || [])]);
    setHasMoreComments(res.data.data.pagination?.hasNextPage ?? false);
    setCommentPage(pg);
  };

  if (loading) {
    return (
      <div className="page-wrap">
        <div className="two-col">
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Skeleton height={0} style={{ aspectRatio: "16/9", height: "auto", paddingBottom: "56.25%", borderRadius: 3 }} />
            <Skeleton width="75%" height={20} />
            <Skeleton width={160} height={12} />
          </div>
          <div><Skeleton width={80} height={13} style={{ marginBottom: 12 }} />{Array.from({length:4}).map((_,i)=><div key={i} className="video-row"><Skeleton width={88} height={52}/><Skeleton width="70%" height={13}/></div>)}</div>
        </div>
      </div>
    );
  }

  if (!video) {
    return <div className="page-wrap"><p className="t-body c-sub" style={{paddingTop:40}}>Video not found.</p></div>;
  }

  return (
    <div className="page-wrap">
      <div className="two-col">
        {/* Left column */}
        <div>
          {/* Player */}
          <video
            src={video.videoFile}
            poster={video.thumbnail}
            controls
            style={{ width: "100%", borderRadius: 3, background: "#000", display: "block" }}
          />

          {/* Title */}
          <h1 className="t-title" style={{ marginTop: 14, marginBottom: 6 }}>{video.title}</h1>

          {/* Meta line */}
          <p className="t-meta c-sub" style={{ marginBottom: 12 }}>
            {metaLine([`${formatViews(video.views)} views`, formatDate(video.createdAt), formatDuration(video.duration)])}
          </p>

          {/* Actions row — icon + text pairs, --sub, not buttons */}
          <div style={{ display: "flex", gap: 20, paddingBottom: 12, borderBottom: "1px solid var(--line)", marginBottom: 14 }}>
            <button className="btn-text" onClick={handleLike} style={{ color: liked ? "var(--accent)" : "var(--sub)", fontSize: 13 }}>
              ♥ {likesCount}
            </button>
            <button className="btn-text" onClick={() => { navigator.clipboard.writeText(location.href); toast.success("Link copied"); }} style={{ fontSize: 13 }}>
              ↗ Share
            </button>
          </div>

          {/* Channel identity */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <Link to={`/channel/${video.owner.userName}`} style={{ display: "flex", alignItems: "center", gap: 10, color: "inherit" }}>
              <Initials name={video.owner.fullName || video.owner.userName} src={video.owner.avatar} size={36} />
              <div>
                <p style={{ fontSize: 14, fontWeight: 500 }}>{video.owner.userName}</p>
                <p className="t-meta c-sub">{formatViews(video.owner.subscribersCount)} subscribers</p>
              </div>
            </Link>
            {user && user._id !== video.owner._id && (
              <button className="btn-outline" onClick={handleSubscription} disabled={subscriptionLoading} style={{ padding: "5px 12px" }}>
                {video.owner.isSubscribed ? "Subscribed" : "Subscribe"}
              </button>
            )}
          </div>

          {/* Description — collapsible */}
          <div style={{ marginBottom: 24 }}>
            <p className="t-body c-sub" style={descExpanded ? {} : { display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
              {video.description}
            </p>
            {video.description?.length > 200 && (
              <button className="btn-text" style={{ padding: 0, marginTop: 4, fontSize: 12, color: "var(--accent)" }} onClick={() => setDescExpanded(!descExpanded)}>
                {descExpanded ? "Show less" : "Show more"}
              </button>
            )}
          </div>

          {/* Comment input — underline style per spec */}
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 20 }}>
            {user && <Initials name={user.fullName} src={user.avatar} size={28} />}
            <div style={{ flex: 1 }}>
              <textarea
                className="comment-input"
                placeholder={user ? "Add a comment…" : "Sign in to comment"}
                disabled={!user}
                rows={1}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitComment(); } }}
              />
              {newComment.trim() && (
                <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                  <button className="btn-text" onClick={() => setNewComment("")}>Cancel</button>
                  <button className="btn-outline" style={{ padding: "4px 12px" }} onClick={submitComment}>Comment</button>
                </div>
              )}
            </div>
          </div>

          {/* Comments */}
          <div>
            {comments.map((c) => (
              <div key={c._id} style={{ display: "flex", gap: 10, paddingBottom: 16, marginBottom: 16, borderBottom: "1px solid var(--line)" }}>
                <Initials name={c.owner.userName} src={c.owner.avatar} size={26} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 12.5, fontWeight: 500, marginBottom: 4 }}>
                    {c.owner.userName}
                    <span className="t-meta c-sub" style={{ fontWeight: 400, marginLeft: 8 }}>{formatDate(c.createdAt)}</span>
                  </p>
                  {editId === c._id ? (
                    <div>
                      <textarea className="field-textarea" value={editText} onChange={(e) => setEditText(e.target.value)} style={{ minHeight: 56 }} />
                      <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                        <button className="btn-text" onClick={() => setEditId(null)}>Cancel</button>
                        <button className="btn-outline" style={{ padding: "3px 10px" }} onClick={() => saveEdit(c._id)}>Save</button>
                      </div>
                    </div>
                  ) : (
                    <p className="t-body">{c.content}</p>
                  )}
                  {user?._id === c.owner._id && editId !== c._id && (
                    <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                      <button className="btn-text" style={{ fontSize: 12, padding: 0 }} onClick={() => { setEditId(c._id); setEditText(c.content); }}>Edit</button>
                      <button className="btn-text" style={{ fontSize: 12, padding: 0, color: "var(--danger)" }} onClick={() => removeComment(c._id)}>Delete</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {hasMoreComments && (
              <button className="btn-text" style={{ color: "var(--accent)", fontSize: 13 }} onClick={loadMoreComments}>More comments</button>
            )}
          </div>
        </div>

        {/* Right column — related */}
        <div>
          <p className="t-meta c-sub" style={{ marginBottom: 12 }}>Related</p>
          <RowList videos={related} />
        </div>
      </div>
    </div>
  );
}
