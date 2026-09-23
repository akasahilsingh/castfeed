import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(relativeTime);

/** 15000 → "15K",  1500000 → "1.5M" */
export function formatViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

/** 300 → "5:00",  3661 → "1:01:01" */
export function formatDuration(seconds: number): string {
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }
  return `${m}:${String(sec).padStart(2, "0")}`;
}

/** ISO string → "2 days ago" */
export function formatDate(iso: string): string {
  return dayjs(iso).fromNow();
}

/** Build comma-separated meta line — spec § 3 no middle dots */
export function metaLine(parts: (string | number | null | undefined)[]): string {
  return parts.filter(Boolean).join(", ");
}

/** Get initials from a name — "Sahil Singh" → "SS" */
export function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}
