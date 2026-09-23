import { useEffect, useState } from "react";
import { getLikedVideos } from "../api/like";
import RowList from "../components/video/RowList";
import type { VideoData } from "../components/video/VideoRow";

export default function LikedPage() {
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLikedVideos()
      .then((res) => {
        // API returns [{ video: { ...videoFields } }]
        const items = res.data.data || [];
        setVideos(items.map((item: { video: VideoData }) => item.video).filter(Boolean));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-wrap">
      <h1 className="t-section" style={{ marginBottom: 20 }}>Liked</h1>
      {/* Plain row list — no featured item per spec § 5 liked */}
      <RowList
        videos={videos}
        loading={loading}
        emptyText="No liked videos yet."
      />
    </div>
  );
}
