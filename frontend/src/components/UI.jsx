import {
  ArrowRight,
  AlertCircle,
  LoaderCircle,
  Activity,
  Inbox,
} from "lucide-react";
import { Link } from "react-router-dom";

export const percent = (value) =>
  value == null ? "—" : `${(value * 100).toFixed(1)}%`;
export const number = (value) => new Intl.NumberFormat().format(value ?? 0);
export const date = (value) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

export function Brand({ light = false }) {
  return (
    <Link
      to="/"
      className={`brand ${light ? "brand-light" : ""}`}
      aria-label="Retain home"
    >
      <span className="brand-icon">
        <Activity size={23} strokeWidth={2.5} />
      </span>
      retain<span className="brand-dot">.</span>
    </Link>
  );
}
export function PageHeader({
  eyebrow = "YOUR RETENTION WORKSPACE",
  title,
  description,
  children,
}) {
  return (
    <div className="page-header">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="header-actions">{children}</div>
    </div>
  );
}
export function ErrorNotice({ message, onRetry }) {
  if (!message) return null;
  return (
    <div className="notice notice-error" role="alert">
      <AlertCircle size={19} />
      <span>{message}</span>
      {onRetry && (
        <button type="button" className="text-button" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
export function Loading({ text = "Loading your workspace…" }) {
  return (
    <div className="loading" role="status">
      <LoaderCircle className="spin" size={24} />
      <span>{text}</span>
    </div>
  );
}
export function Skeletons() {
  return (
    <div className="stats-grid" aria-label="Loading analytics" role="status">
      {[1, 2, 3, 4].map((i) => (
        <div className="card skeleton" key={i} />
      ))}
    </div>
  );
}
export function EmptyState({
  title = "Your next insight starts here",
  description = "Analyze a customer to start building your retention picture.",
  action = true,
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Inbox size={27} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action && (
        <Link className="button button-primary" to="/app/predict">
          Make a prediction <ArrowRight size={16} />
        </Link>
      )}
    </div>
  );
}
export function RiskBadge({ risk }) {
  return (
    <span className={`badge badge-${risk.toLowerCase()}`}>
      <span />
      {risk} risk
    </span>
  );
}
