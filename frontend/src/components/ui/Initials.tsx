import { initials as getInitials } from "../../utils/format";

interface Props {
  name: string;
  src?: string;
  size?: number; // px
}

/** Square (not circular) initials block — spec § 4.1 */
export default function Initials({ name, src, size = 32 }: Props) {
  return (
    <span
      className="initials"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {src ? (
        <img src={src} alt={name} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
      ) : (
        getInitials(name)
      )}
    </span>
  );
}
