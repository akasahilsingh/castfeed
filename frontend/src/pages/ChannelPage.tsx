import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getChannelProfile } from "../api/auth";
import { getAllVideos } from "../api/video";
import { toggleSubscription } from "../api/subscription";
import { useAuthStore } from "../store/authStore";
import { formatViews } from "../utils/format";
import Initials from "../components/ui/Initials";
import VideoList from "../components/video/VideoList";
import type { VideoData } from "../components/video/VideoRow";
import toast from "react-hot-toast";

interface ChannelProfile {
  _id?: string;
  fullName: string;
  avatar: string;
  coverImage: string;
  subscriberCount: number;
  channelsSubscribedToCount: number;
  isSubscribed: boolean;
}

const TABS = ["Videos", "About"] as const;
type Tab = typeof TABS[number];

export default function ChannelPage() {
  const { userName } = useParams<{ userName: string }>();
  const { user } = useAuthStore();

  const [profile, setProfile] = useState<ChannelProfile | null>(null);
  const [videos, setVideos]   = useState<VideoData[]>([]);
  const [tab, setTab]         = useState<Tab>("Videos");
  const [loading, setLoading] = useState(true);
  const [subscribed, setSubscribed] = useState(false);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);

  useEffect(() => {
    if (!userName) return;
    setLoading(true);
    getChannelProfile(userName)
      .then(async (res) => {
        const p = res.data.data;
        setProfile(p);
        setSubscribed(p.isSubscribed);
        // Fetch channel videos by userId (need owner _id from profile)
        // The channel-profile endpoint returns the channel user without _id in current spec
        // So we query by userName using the videos endpoint query param fallback
        const vRes = await getAllVideos({ limit: 20, sortBy: "createdAt", sortType: "desc" });
        setVideos(vRes.data.data.videos.filter((v: VideoData) => v.owner?.userName === userName));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userName]);

  const handleSubscription = async () => {
    if (!profile?._id || subscriptionLoading) return;
    setSubscriptionLoading(true);
    try {
      const res = await toggleSubscription(profile._id);
      setSubscribed(res.data.data.isSubscribed);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Could not update subscription";
      toast.error(message);
    } finally {
      setSubscriptionLoading(false);
    }
  };

  if (loading || !profile) {
    return (
      <div className="page-wrap">
        <div style={{ height: 140, background: "var(--bg-tint)", borderRadius: 3, marginBottom: 20 }} />
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", marginBottom: 28 }}>
          <div style={{ width: 72, height: 72, background: "var(--bg-tint)" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ width: 140, height: 18, background: "var(--bg-tint)" }} />
            <div style={{ width: 100, height: 12, background: "var(--bg-tint)" }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Banner — flat tint block, no overlay, no gradient (spec § 5 channel) */}
      <div style={{
        height: 160,
        background: profile.coverImage ? undefined : "var(--bg-tint)",
        backgroundImage: profile.coverImage ? `url(${profile.coverImage})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }} />

      <div className="page-wrap">
        {/* Identity row — square initials overlapping banner */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: -36, marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 16 }}>
            <Initials name={profile.fullName} src={profile.avatar} size={72} />
            <div style={{ paddingBottom: 4 }}>
              <h1 style={{ fontSize: 19, fontWeight: 500, marginBottom: 4 }}>{profile.fullName}</h1>
              <p className="t-meta c-sub">
                {/* comma-separated stats per spec */}
                {[
                  `${formatViews(profile.subscriberCount)} subscribers`,
                  `${videos.length} videos`,
                  `${formatViews(profile.channelsSubscribedToCount)} subscriptions`,
                ].join(", ")}
              </p>
            </div>
          </div>

          {user && user.userName !== userName && (
            <button className="btn-outline" onClick={handleSubscription} disabled={subscriptionLoading} style={{ alignSelf: "flex-end" }}>
              {subscribed ? "Subscribed" : "Subscribe"}
            </button>
          )}
        </div>

        {/* Tabs — plain text, 2px accent underline on active (spec § 5 channel) */}
        <div className="tab-list" style={{ marginBottom: 24 }}>
          {TABS.map((t) => (
            <button key={t} className={`tab-item ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
              {t}
            </button>
          ))}
        </div>

        {tab === "Videos" && (
          <VideoList videos={videos} loading={false} />
        )}

        {tab === "About" && (
          <div style={{ maxWidth: 560 }}>
            <p className="t-body c-sub" style={{ marginBottom: 16 }}>
              {formatViews(profile.subscriberCount)} subscribers · {formatViews(profile.channelsSubscribedToCount)} subscriptions
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
