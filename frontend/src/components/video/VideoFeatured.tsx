import { Link, useNavigate } from "react-router-dom";
import { formatViews, formatDuration, formatDate, metaLine } from "../../utils/format";
import Initials from "../ui/Initials";
import type { VideoData } from "./VideoRow";

interface Props {
  video: VideoData;
}

/**
 * Spec § 4.3 — first/featured item: large thumb (1.3fr), title 21/500,
 * description, meta. Sits above the dense row list.
 */
export default function VideoFeatured({ video }: Props) {
  const navigate = useNavigate();
  const owner = video.owner;

  return (
    <div
      className="video-featured"
      role="link"
      tabIndex={0}
      onClick={() => navigate(`/watch/${video._id}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          navigate(`/watch/${video._id}`);
        }
      }}
    >
      {/* Thumbnail — full width of 1.3fr column */}
      <div style={{ background: "#ECEAE7", borderRadius: 3, aspectRatio: "16/9", overflow: "hidden" }}>
        {video.thumbnail && (
          <img src={video.thumbnail} alt={video.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        )}
      </div>

      {/* Text */}
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 10 }}>
        {/* Channel */}
        {owner && (
          <Link to={`/channel/${owner.userName}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--sub)" }} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
            <Initials name={owner.fullName || owner.userName} src={owner.avatar} size={22} />
            <span className="t-meta">{owner.userName}</span>
          </Link>
        )}

        <h2 className="t-featured" style={{ marginBottom: 0 }}>
          {video.title}
        </h2>

        <p className="t-body c-sub" style={{ display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {/* description may not always be in list response — graceful */}
        </p>

        <p className="t-meta c-sub">
          {metaLine([
            `${formatViews(video.views)} views`,
            formatDate(video.createdAt),
            formatDuration(video.duration),
          ])}
        </p>
      </div>
    </div>
  );
}
