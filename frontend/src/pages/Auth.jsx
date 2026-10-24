import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ArrowRight, ShieldCheck, Workflow, LoaderCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Brand, ErrorNotice, Loading } from "../components/UI";
import { errorMessage } from "../services/api";

export default function Auth({ register = false }) {
  const { user, loading, authenticate } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (loading) return <Loading />;
  if (user) return <Navigate to="/app" replace />;
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      await authenticate(register ? "register" : "login", values);
      navigate("/app");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-page">
      <aside className="auth-story">
        <Brand light />
        <div>
          <span className="auth-story-icon">
            <Workflow size={45} />
          </span>
          <div className="eyebrow">INTELLIGENCE FOR RELATIONSHIPS</div>
          <h1>
            A little insight.
            <br />A lasting connection.
          </h1>
          <p>
            Turn customer signals into thoughtful decisions. Your retention
            workspace is ready when you are.
          </p>
        </div>
        <span className="auth-security">
          <ShieldCheck size={17} /> Your data stays in your workspace.
        </span>
      </aside>
      <main id="main-content" className="auth-main">
        <div className="auth-card">
          <Link className="back-link" to="/">
            ← Back to home
          </Link>
          <div className="eyebrow">WELCOME TO RETAIN</div>
          <h1>
            {register ? "Your next insight awaits." : "Good to see you again."}
          </h1>
          <p>
            {register
              ? "Create your Customer Churn Intelligence account."
              : "Sign in to your Customer Churn Intelligence workspace."}
          </p>
          <ErrorNotice message={error} />
          <form onSubmit={submit} className="auth-form">
            {register && (
              <label>
                Full name
                <input
                  name="first_name"
                  autoComplete="given-name"
                  maxLength={150}
                  placeholder="Your name"
                  required
                />
              </label>
            )}
            <label>
              Username
              <input
                name="username"
                autoComplete="username"
                maxLength={150}
                pattern="[\w.@+\-]+"
                title="Letters, numbers, and @ . + - _ only"
                placeholder="Your username"
                required
              />
            </label>
            {register && (
              <label>
                Email address
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  required
                />
              </label>
            )}
            <label>
              Password
              <input
                name="password"
                type="password"
                autoComplete={register ? "new-password" : "current-password"}
                minLength={register ? 10 : 1}
                maxLength={128}
                placeholder={
                  register ? "At least 10 characters" : "Enter your password"
                }
                required
              />
            </label>
            {register && (
              <p className="field-help">
                Use a strong password that differs from your name and username.
              </p>
            )}
            <button
              disabled={busy}
              className="button button-primary button-full"
              type="submit"
            >
              {busy ? (
                <LoaderCircle className="spin" size={18} />
              ) : (
                <>
                  {register ? "Create account" : "Sign in"}
                  <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>
          <p className="auth-switch">
            {register ? "Already have an account?" : "New to Retain?"}{" "}
            <Link to={register ? "/login" : "/register"}>
              {register ? "Sign in" : "Create an account"}
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
