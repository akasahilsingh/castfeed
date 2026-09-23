import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginUser } from "../api/auth";
import { getCurrentUser } from "../api/auth";
import { useAuthStore } from "../store/authStore";
import toast from "react-hot-toast";

export default function LoginPage() {
  const navigate = useNavigate();
  const { setUser } = useAuthStore();

  const [form, setForm]       = useState({ credential: "", password: "" });
  const [errors, setErrors]   = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const change = (k: string, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.credential.trim()) e.credential = "Email or username is required";
    if (!form.password)          e.password   = "Password is required";
    return e;
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }

    setLoading(true);
    try {
      const isEmail = form.credential.includes("@");
      await loginUser(
        isEmail
          ? { email: form.credential, password: form.password }
          : { userName: form.credential, password: form.password }
      );
      const me = await getCurrentUser();
      setUser(me.data.data);
      toast.success("Welcome back");
      navigate("/");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Login failed";
      setErrors({ form: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 16px", background: "var(--bg)" }}>
      {/* Wordmark */}
      <p style={{ fontSize: 15, fontWeight: 500, marginBottom: 32, color: "var(--ink)" }}>CastFeed</p>

      {/* Form — no bordered card wrapper per spec */}
      <form onSubmit={submit} style={{ width: "100%", maxWidth: 380, display: "flex", flexDirection: "column", gap: 16 }}>
        <h1 style={{ fontSize: 17, fontWeight: 500, marginBottom: 4 }}>Sign in</h1>

        {errors.form && <p className="field-error">{errors.form}</p>}

        <div>
          <label className="field-label">Email or username</label>
          <input
            className="field-input"
            type="text"
            value={form.credential}
            onChange={(e) => change("credential", e.target.value)}
            autoComplete="username"
          />
          {errors.credential && <p className="field-error">{errors.credential}</p>}
        </div>

        <div>
          <label className="field-label">Password</label>
          <input
            className="field-input"
            type="password"
            value={form.password}
            onChange={(e) => change("password", e.target.value)}
            autoComplete="current-password"
          />
          {errors.password && <p className="field-error">{errors.password}</p>}
        </div>

        {/* Solid ink submit — the one exception to outlined rule per spec */}
        <button type="submit" className="btn-solid" disabled={loading} style={{ marginTop: 4 }}>
          {loading ? "Signing in…" : "Sign in"}
        </button>

        <p className="t-meta c-sub" style={{ textAlign: "center" }}>
          No account?{" "}
          <Link to="/register" style={{ color: "var(--accent)" }}>Create one</Link>
        </p>
      </form>
    </div>
  );
}
