interface Props {
  label: string;
  value: string | number;
}

/** Flat tint block — spec § 4.5 */
export default function StatBlock({ label, value }: Props) {
  return (
    <div className="stat-block">
      <p className="t-meta c-sub" style={{ marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 22, fontWeight: 500, color: "var(--ink)", lineHeight: 1 }}>{value}</p>
    </div>
  );
}
