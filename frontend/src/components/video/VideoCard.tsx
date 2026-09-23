import { useNavigate, Link } from "react-router-dom";
import { formatViews, formatDuration, formatDate } from "../../utils/format";
import Initials from "../ui/Initials";
import type { VideoData } from "./VideoRow";

interface Props {
  video: VideoData;
  index?: number;
}

const THUMB_TONES = ["#ECEAE7","#E9EBEC","#EDEDEA","#E4DEC8","#DEE3E1","#E4E3DA"];

export default function VideoCard({ video, index = 0 }: Props) {
  const navigate = useNavigate();
  const watchPath = `/watch/${video._id}`;
  const tone = THUMB_TONES[index % THUMB_TONES.length];

  return (
    <div
      className="video-card"
      role="link"
      tabIndex={0}
      onClick={() => navigate(watchPath)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate(watchPath); }
      }}
    >
      {/* Thumbnail — 16:9, rounded top corners */}
      <div className="video-card-thumb" style={{ background: tone }}>
        {video.thumbnail && (
          <img src={video.thumbnail} alt={video.title} />
        )}
        {/* Duration badge — bottom-right overlay */}
        {video.duration > 0 && (
          <span className="video-card-duration">{formatDuration(video.duration)}</span>
        )}
      </div>

      {/* Card body */}
      <div className="video-card-body">
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          {video.owner && (
            <Link
              to={`/channel/${video.owner.userName}`}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              style={{ flexShrink: 0, marginTop: 2 }}
              aria-label={video.owner.userName}
            >
              <Initials name={video.owner.fullName || video.owner.userName} src={video.owner.avatar} size={30} />
            </Link>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p className="video-card-title">{video.title}</p>
            {video.owner && (
              <Link
                to={`/channel/${video.owner.userName}`}
                className="video-card-channel"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                {video.owner.userName}
              </Link>
            )}
            <p className="video-card-meta">
              {formatViews(video.views)} views · {formatDate(video.createdAt)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
