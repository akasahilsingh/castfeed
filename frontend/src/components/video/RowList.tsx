import VideoRow from "./VideoRow";
import Skeleton from "../ui/Skeleton";
import type { VideoData } from "./VideoRow";

interface Props {
  videos: VideoData[];
  loading?: boolean;
  emptyText?: string;
}

/**
 * Spec § 4.4 — Plain row list.
 * No featured item. Used for: related sidebar, history, liked.
 */
export default function RowList({ videos, loading, emptyText = "No videos yet." }: Props) {
  if (loading) {
    return (
      <div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="video-row" style={{ pointerEvents: "none" }}>
            <Skeleton width={88} height={52} style={{ borderRadius: 3, flexShrink: 0 }} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
              <Skeleton width="80%" height={14} />
              <Skeleton width="50%" height={12} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!videos.length) {
    return <p className="t-body c-sub" style={{ paddingTop: 16 }}>{emptyText}</p>;
  }

  return (
    <div>
      {videos.map((v, i) => (
        <VideoRow key={v._id} video={v} index={i} />
      ))}
    </div>
  );
}
