import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { logoutUser } from "../../api/auth";
import Initials from "../ui/Initials";
import toast from "react-hot-toast";

export default function Navbar() {
  const { user, clearUser } = useAuthStore();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchVal, setSearchVal] = useState("");

  const handleLogout = async () => {
    try {
      await logoutUser();
    } finally {
      clearUser();
      toast.success("Logged out");
      navigate("/login");
    }
  };

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchVal.trim()) {
      navigate(`/?q=${encodeURIComponent(searchVal.trim())}`);
      setSearchOpen(false);
      setSearchVal("");
    }
    if (e.key === "Escape") { setSearchOpen(false); setSearchVal(""); }
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `t-body ${isActive ? "c-ink" : "c-sub"}`;

  return (
    <header style={{ borderBottom: "1px solid var(--line)", position: "sticky", top: 0, background: "var(--bg)", zIndex: 100 }}>
      <div className="page-wrap" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 52 }}>

        {/* Wordmark */}
        <Link to="/" style={{ fontSize: 15, fontWeight: 500, color: "var(--ink)", letterSpacing: "-0.2px" }}>
          CastFeed
        </Link>

        {/* Nav links */}
        <nav style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <NavLink to="/" end className={navLinkClass}>Home</NavLink>
          {user && <NavLink to="/dashboard" className={navLinkClass}>Dashboard</NavLink>}
          {user && <NavLink to="/history" className={navLinkClass}>History</NavLink>}
          {user && <NavLink to="/liked" className={navLinkClass}>Liked</NavLink>}
          {user && <NavLink to="/tweets" className={navLinkClass}>Tweets</NavLink>}
          {user && <NavLink to="/playlists" className={navLinkClass}>Playlists</NavLink>}

          {/* Search icon */}
          {searchOpen ? (
            <input
              autoFocus
              className="field-input"
              style={{ width: 180, height: 28 }}
              placeholder="Search..."
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              onKeyDown={handleSearch}
              onBlur={() => { if (!searchVal) setSearchOpen(false); }}
            />
          ) : (
            <button className="btn-text" style={{ padding: 0 }} onClick={() => setSearchOpen(true)} aria-label="Search">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </button>
          )}

          {/* Auth */}
          {user ? (
            <div style={{ position: "relative" }}>
              <button onClick={() => setMenuOpen(!menuOpen)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                <Initials name={user.fullName} src={user.avatar} size={26} />
              </button>
              {menuOpen && (
                <div style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 3, minWidth: 160, zIndex: 200 }}>
                  <Link to={`/channel/${user.userName}`} style={{ display: "block", padding: "10px 14px", fontSize: 13, color: "var(--ink)", borderBottom: "1px solid var(--line)" }} onClick={() => setMenuOpen(false)}>
                    Channel
                  </Link>
                  <Link to="/upload" style={{ display: "block", padding: "10px 14px", fontSize: 13, color: "var(--ink)", borderBottom: "1px solid var(--line)" }} onClick={() => setMenuOpen(false)}>
                    Upload
                  </Link>
                  <Link to="/playlists" style={{ display: "block", padding: "10px 14px", fontSize: 13, color: "var(--ink)", borderBottom: "1px solid var(--line)" }} onClick={() => setMenuOpen(false)}>
                    Playlists
                  </Link>
                  <Link to="/settings" style={{ display: "block", padding: "10px 14px", fontSize: 13, color: "var(--ink)", borderBottom: "1px solid var(--line)" }} onClick={() => setMenuOpen(false)}>
                    Settings
                  </Link>
                  <button onClick={handleLogout} style={{ width: "100%", textAlign: "left", display: "block", padding: "10px 14px", fontSize: 13, color: "var(--danger)", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="btn-outline" style={{ padding: "5px 12px", fontSize: 13 }}>Sign in</Link>
          )}
        </nav>
      </div>
    </header>
  );
}
