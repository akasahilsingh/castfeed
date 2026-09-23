import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerUser } from "../api/auth";
import toast from "react-hot-toast";

export default function RegisterPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({ userName: "", email: "", fullName: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [avatarPreview, setAvatarPreview]   = useState<string | null>(null);
  const [coverPreview, setCoverPreview]     = useState<string | null>(null);
  const avatarRef = useRef<HTMLInputElement>(null);
  const coverRef  = useRef<HTMLInputElement>(null);

  const change = (k: string, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
  };

  const pickFile = (ref: React.RefObject<HTMLInputElement | null>, setPreview: (s: string) => void) => {
    ref.current?.click();
    ref.current!.onchange = () => {
      const file = ref.current?.files?.[0];
      if (file) setPreview(URL.createObjectURL(file));
    };
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.userName.trim()) e.userName = "Username is required";
    if (!form.email.trim())    e.email    = "Email is required";
    if (!form.fullName.trim()) e.fullName = "Full name is required";
    if (!form.password)        e.password = "Password is required";
    if (!avatarRef.current?.files?.[0]) e.avatar = "Avatar is required";
    return e;
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }

    const fd = new FormData();
    fd.append("userName",  form.userName);
    fd.append("email",     form.email);
    fd.append("fullName",  form.fullName);
    fd.append("password",  form.password);
    fd.append("avatar",    avatarRef.current!.files![0]);
    if (coverRef.current?.files?.[0]) fd.append("coverImage", coverRef.current.files[0]);

    setLoading(true);
    try {
      await registerUser(fd);
      toast.success("Account created — please sign in");
      navigate("/login");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Registration failed";
      setErrors({ form: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 16px", background: "var(--bg)" }}>
      <p style={{ fontSize: 15, fontWeight: 500, marginBottom: 32, color: "var(--ink)" }}>CastFeed</p>

      <form onSubmit={submit} style={{ width: "100%", maxWidth: 380, display: "flex", flexDirection: "column", gap: 16 }}>
        <h1 style={{ fontSize: 17, fontWeight: 500, marginBottom: 4 }}>Create account</h1>

        {errors.form && <p className="field-error">{errors.form}</p>}

        <div>
          <label className="field-label">Full name</label>
          <input className="field-input" value={form.fullName} onChange={(e) => change("fullName", e.target.value)} />
          {errors.fullName && <p className="field-error">{errors.fullName}</p>}
        </div>

        <div>
          <label className="field-label">Username</label>
          <input className="field-input" value={form.userName} onChange={(e) => change("userName", e.target.value)} autoComplete="username" />
          {errors.userName && <p className="field-error">{errors.userName}</p>}
        </div>

        <div>
          <label className="field-label">Email</label>
          <input className="field-input" type="email" value={form.email} onChange={(e) => change("email", e.target.value)} autoComplete="email" />
          {errors.email && <p className="field-error">{errors.email}</p>}
        </div>

        <div>
          <label className="field-label">Password</label>
          <input className="field-input" type="password" value={form.password} onChange={(e) => change("password", e.target.value)} autoComplete="new-password" />
          {errors.password && <p className="field-error">{errors.password}</p>}
        </div>

        {/* Avatar — square dropzone per spec (no circular avatar at upload time either) */}
        <div>
          <label className="field-label">Avatar <span style={{ color: "var(--danger)" }}>*</span></label>
          <input ref={avatarRef} type="file" accept="image/*" style={{ display: "none" }} />
          <div
            className="dropzone"
            style={{ height: 80, cursor: "pointer" }}
            onClick={() => pickFile(avatarRef, setAvatarPreview)}
          >
            {avatarPreview ? (
              <img src={avatarPreview} alt="Avatar preview" style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 3 }} />
            ) : (
              <span className="t-meta c-sub">Click to select avatar image</span>
            )}
          </div>
          {errors.avatar && <p className="field-error">{errors.avatar}</p>}
        </div>

        {/* Cover image — optional */}
        <div>
          <label className="field-label">Cover image <span className="c-sub">(optional)</span></label>
          <input ref={coverRef} type="file" accept="image/*" style={{ display: "none" }} />
          <div
            className="dropzone"
            style={{ height: 56 }}
            onClick={() => pickFile(coverRef, setCoverPreview)}
          >
            {coverPreview ? (
              <img src={coverPreview} alt="Cover preview" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 3 }} />
            ) : (
              <span className="t-meta c-sub">Click to select cover image</span>
            )}
          </div>
        </div>

        <button type="submit" className="btn-solid" disabled={loading} style={{ marginTop: 4 }}>
          {loading ? "Creating account…" : "Create account"}
        </button>

        <p className="t-meta c-sub" style={{ textAlign: "center" }}>
          Already have an account?{" "}
          <Link to="/login" style={{ color: "var(--accent)" }}>Sign in</Link>
        </p>
      </form>
    </div>
  );
}
