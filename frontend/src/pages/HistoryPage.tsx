import { useEffect, useState } from "react";
import { getWatchHistory } from "../api/auth";
import RowList from "../components/video/RowList";
import type { VideoData } from "../components/video/VideoRow";

export default function HistoryPage() {
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getWatchHistory()
      .then((res) => setVideos(res.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-wrap">
      <h1 className="t-section" style={{ marginBottom: 20 }}>History</h1>
      {/* Plain row list — no featured item per spec § 5 history */}
      <RowList
        videos={videos}
        loading={loading}
        emptyText="You haven't watched anything yet."
      />
    </div>
  );
}
