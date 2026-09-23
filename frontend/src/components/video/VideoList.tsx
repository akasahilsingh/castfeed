import VideoCard from "./VideoCard";
import Skeleton from "../ui/Skeleton";
import type { VideoData } from "./VideoRow";

interface Props {
  videos: VideoData[];
  loading?: boolean;
}

export default function VideoList({ videos, loading }: Props) {
  if (loading) {
    return (
      <div className="video-grid">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="video-card-skeleton">
            {/* 16:9 thumbnail skeleton */}
            <Skeleton height={0} style={{ aspectRatio: "16/9", height: "auto", borderRadius: 6 }} />
            <div style={{ display: "flex", gap: 10, padding: "0 4px" }}>
              <Skeleton width={30} height={30} style={{ borderRadius: 0, flexShrink: 0 }} />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
                <Skeleton width="90%" height={13} />
                <Skeleton width="60%" height={13} />
                <Skeleton width="45%" height={11} />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!videos.length) {
    return (
      <p className="t-body c-sub" style={{ paddingTop: 24 }}>No videos found.</p>
    );
  }

  return (
    <div className="video-grid">
      {videos.map((v, i) => (
        <VideoCard key={v._id} video={v} index={i} />
      ))}
    </div>
  );
}
