import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, Link } from "react-router-dom";
import {
  LayoutDashboard,
  ScanLine,
  Upload,
  History,
  FlaskConical,
  ArrowUpRight,
  LogOut,
  Menu,
  X,
  ChevronDown,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Brand, ErrorNotice } from "./UI";
import { errorMessage } from "../services/api";

const links = [
  ["/app", "Overview", LayoutDashboard],
  ["/app/predict", "Single prediction", ScanLine],
  ["/app/batch", "Batch analysis", Upload],
  ["/app/history", "Prediction history", History],
  ["/app/model", "Model information", FlaskConical],
];

export default function Layout() {
  const [open, setOpen] = useState(false);
  const [mobile, setMobile] = useState(
    () => window.matchMedia("(max-width: 700px)").matches,
  );
  const [error, setError] = useState("");
  const { user, logout } = useAuth();
  const location = useLocation();
  useEffect(() => {
    const media = window.matchMedia("(max-width: 700px)");
    const update = () => {
      setMobile(media.matches);
      setOpen(false);
    };
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    const close = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);
  const current =
    links.find(([path]) => path === location.pathname)?.[1] || "My profile";
  return (
    <div className="app-shell">
      {open && (
        <button
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        id="workspace-navigation"
        className={`sidebar ${open ? "sidebar-open" : ""}`}
        inert={mobile && !open ? true : undefined}
        aria-hidden={mobile && !open ? true : undefined}
      >
        <div className="sidebar-brand">
          <Brand />
          <button
            className="icon-button mobile-only"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          >
            <X size={20} />
          </button>
        </div>
        <div className="workspace-label">
          <span className="workspace-avatar">CI</span>
          <div>
            Customer Intelligence<small>Personal workspace</small>
          </div>
          <ChevronDown size={14} />
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav aria-label="Main navigation">
          {links.map(([path, label, Icon]) => (
            <NavLink
              key={path}
              end={path === "/app"}
              to={path}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `nav-item ${isActive ? "nav-active" : ""}`
              }
            >
              <Icon size={19} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="soft-icon">
              <ShieldCheck size={20} />
            </span>
            <h4>Built on your data.</h4>
            <p>
              Real model predictions.
              <br />A clearer path to retention.
            </p>
            <Link to="/app/model">
              Explore your model <ArrowUpRight size={14} />
            </Link>
          </div>
          <Link className="profile-link" to="/app/profile">
            <span className="avatar">
              {(user.first_name || user.username).slice(0, 2).toUpperCase()}
            </span>
            <span>
              {user.first_name || user.username}
              <small>My account</small>
            </span>
            <UserRound size={17} />
          </Link>
          <button
            className="logout-button"
            onClick={() => logout().catch((e) => setError(errorMessage(e)))}
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-only"
              aria-label="Open menu"
              onClick={() => setOpen(true)}
            >
              <Menu size={22} />
            </button>
            <span>Workspace</span>
            <span className="breadcrumb-slash">/</span>
            <strong>{current}</strong>
          </div>
          <div className="topbar-right">
            <span className="private-label">
              <ShieldCheck size={14} />
              Private workspace
            </span>
            <Link
              to="/app/profile"
              className="avatar avatar-small"
              aria-label="My profile"
            >
              {user.username.slice(0, 1).toUpperCase()}
            </Link>
          </div>
        </header>
        <main id="main-content" className="main-content">
          <ErrorNotice message={error} />
          <Outlet />
        </main>
        <footer className="app-footer">
          <span>Customer Churn Intelligence</span>
          <span>Thoughtful decisions. Stronger relationships.</span>
        </footer>
      </div>
    </div>
  );
}
