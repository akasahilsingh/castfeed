import { useState, useRef } from "react";
import { useAuthStore } from "../store/authStore";
import { updateAccount, updateAvatar, updateCoverImage, changePassword } from "../api/auth";
import toast from "react-hot-toast";

type Section = "Profile" | "Avatar" | "Cover" | "Password";
const SECTIONS: Section[] = ["Profile", "Avatar", "Cover", "Password"];

export default function SettingsPage() {
  const { user, setUser } = useAuthStore();
  const [section, setSection] = useState<Section>("Profile");

  // Profile
  const [profile, setProfile] = useState({ userName: user?.userName || "", email: user?.email || "" });
  const [profileLoading, setProfileLoading] = useState(false);

  // Avatar
  const avatarRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);

  // Cover
  const coverRef = useRef<HTMLInputElement>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverLoading, setCoverLoading] = useState(false);

  // Password
  const [pw, setPw] = useState({ oldPassword: "", newPassword: "" });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwErrors, setPwErrors] = useState<Record<string, string>>({});

  const handleProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    try {
      const res = await updateAccount(profile);
      setUser({ ...user!, ...res.data.data.user });
      toast.success("Profile updated");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed";
      toast.error(msg);
    } finally { setProfileLoading(false); }
  };

  const handleAvatar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!avatarRef.current?.files?.[0]) { toast.error("Select an image first"); return; }
    const fd = new FormData();
    fd.append("avatar", avatarRef.current.files[0]);
    setAvatarLoading(true);
    try {
      const res = await updateAvatar(fd);
      setUser({ ...user!, avatar: res.data.data.updatedAvatar });
      toast.success("Avatar updated");
    } catch { toast.error("Failed to update avatar"); }
    finally { setAvatarLoading(false); }
  };

  const handleCover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coverRef.current?.files?.[0]) { toast.error("Select an image first"); return; }
    const fd = new FormData();
    fd.append("coverImg", coverRef.current.files[0]);
    setCoverLoading(true);
    try {
      await updateCoverImage(fd);
      toast.success("Cover image updated");
    } catch { toast.error("Failed to update cover image"); }
    finally { setCoverLoading(false); }
  };

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!pw.oldPassword) errs.oldPassword = "Current password is required";
    if (!pw.newPassword) errs.newPassword = "New password is required";
    if (Object.keys(errs).length) { setPwErrors(errs); return; }
    setPwLoading(true);
    try {
      await changePassword(pw);
      toast.success("Password changed — sign in again");
      setPw({ oldPassword: "", newPassword: "" });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed";
      toast.error(msg);
    } finally { setPwLoading(false); }
  };

  return (
    <div className="page-wrap">
      <h1 className="t-section" style={{ marginBottom: 28 }}>Settings</h1>
      <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 40 }}>

        {/* Left-hand tab list — spec § 5 settings: left-border accent, NOT horizontal tabs */}
        <nav className="settings-nav">
          {SECTIONS.map((s) => (
            <button key={s} className={`settings-nav-item ${section === s ? "active" : ""}`} onClick={() => setSection(s)}>
              {s}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div style={{ maxWidth: 400 }}>
          {section === "Profile" && (
            <form onSubmit={handleProfile} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label className="field-label">Username</label>
                <input className="field-input" value={profile.userName} onChange={(e) => setProfile((p) => ({ ...p, userName: e.target.value }))} />
              </div>
              <div>
                <label className="field-label">Email</label>
                <input className="field-input" type="email" value={profile.email} onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))} />
              </div>
              <button type="submit" className="btn-outline" disabled={profileLoading} style={{ alignSelf: "flex-start", padding: "6px 16px" }}>
                {profileLoading ? "Saving…" : "Save changes"}
              </button>
            </form>
          )}

          {section === "Avatar" && (
            <form onSubmit={handleAvatar} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <input ref={avatarRef} type="file" accept="image/*" style={{ display: "none" }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) setAvatarPreview(URL.createObjectURL(f)); }} />
              {/* Square avatar picker — no circular crop per spec */}
              <div className="dropzone" style={{ width: 100, height: 100, cursor: "pointer" }} onClick={() => avatarRef.current?.click()}>
                {(avatarPreview || user?.avatar) ? (
                  <img src={avatarPreview || user?.avatar} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 3 }} />
                ) : (
                  <span className="t-meta c-sub" style={{ fontSize: 11 }}>Click to select</span>
                )}
              </div>
              <button type="submit" className="btn-outline" disabled={avatarLoading} style={{ alignSelf: "flex-start", padding: "6px 16px" }}>
                {avatarLoading ? "Saving…" : "Update avatar"}
              </button>
            </form>
          )}

          {section === "Cover" && (
            <form onSubmit={handleCover} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <input ref={coverRef} type="file" accept="image/*" style={{ display: "none" }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) setCoverPreview(URL.createObjectURL(f)); }} />
              <div className="dropzone" style={{ height: 90, cursor: "pointer" }} onClick={() => coverRef.current?.click()}>
                {(coverPreview || user?.coverImage) ? (
                  <img src={coverPreview || user?.coverImage} alt="Cover" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 3 }} />
                ) : (
                  <p className="t-meta c-sub">Click to select cover image</p>
                )}
              </div>
              <button type="submit" className="btn-outline" disabled={coverLoading} style={{ alignSelf: "flex-start", padding: "6px 16px" }}>
                {coverLoading ? "Saving…" : "Update cover"}
              </button>
            </form>
          )}

          {section === "Password" && (
            <form onSubmit={handlePassword} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label className="field-label">Current password</label>
                <input className="field-input" type="password" value={pw.oldPassword} onChange={(e) => { setPw((p) => ({ ...p, oldPassword: e.target.value })); setPwErrors((er) => ({ ...er, oldPassword: "" })); }} />
                {pwErrors.oldPassword && <p className="field-error">{pwErrors.oldPassword}</p>}
              </div>
              <div>
                <label className="field-label">New password</label>
                <input className="field-input" type="password" value={pw.newPassword} onChange={(e) => { setPw((p) => ({ ...p, newPassword: e.target.value })); setPwErrors((er) => ({ ...er, newPassword: "" })); }} />
                {pwErrors.newPassword && <p className="field-error">{pwErrors.newPassword}</p>}
              </div>
              <button type="submit" className="btn-outline" disabled={pwLoading} style={{ alignSelf: "flex-start", padding: "6px 16px" }}>
                {pwLoading ? "Changing…" : "Change password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
