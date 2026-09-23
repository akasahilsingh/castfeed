interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  style?: React.CSSProperties;
}

/** Flat bg-tint placeholder — NO shimmer animation per spec § 6 */
export default function Skeleton({ width = "100%", height = 16, style }: SkeletonProps) {
  return (
    <span
      className="skeleton"
      style={{
        display: "block",
        width,
        height,
        ...style,
      }}
    />
  );
}
