import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import { useAuthStore } from "../../store/authStore";
import { getCurrentUser } from "../../api/auth";

export default function Layout() {
  const { setUser, setLoading } = useAuthStore();

  // Rehydrate auth on every hard refresh
  useEffect(() => {
    getCurrentUser()
      .then((res) => setUser(res.data.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <Navbar />
      <main style={{ paddingTop: 32, paddingBottom: 64 }}>
        <Outlet />
      </main>
    </div>
  );
}
