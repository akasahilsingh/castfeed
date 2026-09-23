import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { getAllVideos } from "../api/video";
import VideoList from "../components/video/VideoList";
import type { VideoData } from "../components/video/VideoRow";

type SortOption = { label: string; sortBy: string; sortType: string };

const SORT_OPTIONS: SortOption[] = [
  { label: "Latest",      sortBy: "createdAt", sortType: "desc" },
  { label: "Most viewed", sortBy: "views",     sortType: "desc" },
  { label: "Oldest",      sortBy: "createdAt", sortType: "asc"  },
];

export default function HomePage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";

  const [videos, setVideos]       = useState<VideoData[]>([]);
  const [loading, setLoading]     = useState(true);
  const [apiError, setApiError]   = useState<string | null>(null);
  const [sortIdx, setSortIdx]     = useState(0);
  const [page, setPage]           = useState(1);
  const [hasMore, setHasMore]     = useState(false);
  const [appending, setAppending] = useState(false);

  const sort = SORT_OPTIONS[sortIdx];

  const fetchVideos = useCallback(async (pg: number, append: boolean) => {
    if (append) setAppending(true); else { setLoading(true); setApiError(null); }
    try {
      const res = await getAllVideos({
        page: pg,
        limit: 12,
        query: query || undefined,
        sortBy: sort.sortBy as never,
        sortType: sort.sortType as never,
      });
      const data = res.data.data;
      setVideos((prev) => append ? [...prev, ...data.videos] : data.videos);
      setHasMore(data.pagination.hasNextPage);
      setPage(pg);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? "Could not load videos. Is the backend running?";
      setApiError(msg);
    } finally {
      setLoading(false);
      setAppending(false);
    }
  }, [query, sort.sortBy, sort.sortType]);

  // Reset + refetch whenever sort or search query changes
  useEffect(() => {
    setVideos([]);
    setPage(1);
    fetchVideos(1, false);
  }, [fetchVideos]);

  return (
    <div className="page-wrap">
      {/* Section label + sort controls */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 20 }}>
        <h1 className="t-section">
          {query ? `Results for "${query}"` : "Latest"}
        </h1>
        {/* Sort — plain text words, not pills (spec § 5 home) */}
        <div style={{ display: "flex", gap: 16 }}>
          {SORT_OPTIONS.map((opt, i) => (
            <button
              key={opt.label}
              onClick={() => { setSortIdx(i); }}
              className="btn-text"
              style={{
                padding: 0,
                fontSize: 13,
                color: i === sortIdx ? "var(--ink)" : "var(--sub)",
                textDecoration: i === sortIdx ? "underline" : "none",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error state — plain danger text per spec § 6 */}
      {apiError && !loading && (
        <div style={{ paddingTop: 8, paddingBottom: 16 }}>
          <p className="t-body" style={{ color: "var(--danger)", marginBottom: 10 }}>{apiError}</p>
          <button className="btn-text" style={{ color: "var(--accent)", padding: 0 }} onClick={() => fetchVideos(1, false)}>
            Retry
          </button>
        </div>
      )}

      <VideoList videos={videos} loading={loading} />

      {/* "More" text link — spec § 5 home: no numbered pager, no infinite scroll */}
      {!loading && !apiError && hasMore && (
        <div style={{ textAlign: "center", paddingTop: 28 }}>
          <button
            onClick={() => fetchVideos(page + 1, true)}
            disabled={appending}
            className="btn-text c-accent"
            style={{ color: "var(--accent)", fontSize: 13 }}
          >
            {appending ? "Loading…" : "More"}
          </button>
        </div>
      )}
    </div>
  );
}
