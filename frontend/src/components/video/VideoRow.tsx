import { Link, useNavigate } from "react-router-dom";
import { formatViews, formatDuration, formatDate, metaLine } from "../../utils/format";
import Initials from "../ui/Initials";

export interface VideoData {
  _id: string;
  thumbnail: string;
  title: string;
  duration: number;
  views: number;
  createdAt: string;
  owner?: { _id: string; userName: string; fullName?: string; avatar?: string };
}

interface Props {
  video: VideoData;
  index?: number; // for rotating thumb colors
}

const THUMB_TONES = ["#ECEAE7","#E9EBEC","#EDEDEA","#E4DEC8","#DEE3E1","#E4E3DA"];

/**
 * Spec § 4.3 — dense list row: 88px thumb + title + comma-separated meta.
 * No duration badge on thumb. No circular avatar. No border/shadow on row.
 */
export default function VideoRow({ video, index = 0 }: Props) {
  const thumbBg = THUMB_TONES[index % THUMB_TONES.length];
  const owner = video.owner; // may be undefined if owner was deleted
  const navigate = useNavigate();
  const watchPath = `/watch/${video._id}`;

  return (
    <div
      className="video-row"
      role="link"
      tabIndex={0}
      onClick={() => navigate(watchPath)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          navigate(watchPath);
        }
      }}
    >
      {/* Thumbnail — 88px, 3px radius, NO duration badge */}
      <div className="video-row-thumb" style={{ background: thumbBg, flexShrink: 0 }}>
        {video.thumbnail && (
          <img
            src={video.thumbnail}
            alt={video.title}
            style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 3 }}
          />
        )}
      </div>

      {/* Text block */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p className="t-row-title" style={{ marginBottom: 4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
          {video.title}
        </p>

        {/* Channel identity — only render if owner exists */}
        {owner && (
          <Link
            to={`/channel/${owner.userName}`}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 4, color: "var(--sub)" }}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <Initials name={owner.fullName || owner.userName} src={owner.avatar} size={18} />
            <span className="t-meta">{owner.userName}</span>
          </Link>
        )}

        {/* Meta — comma separated, spec § 3 */}
        <p className="t-meta c-sub">
          {metaLine([
            video.views !== undefined ? `${formatViews(video.views)} views` : null,
            video.createdAt ? formatDate(video.createdAt) : null,
            video.duration ? formatDuration(video.duration) : null,
          ])}
        </p>
      </div>
    </div>
  );
}
