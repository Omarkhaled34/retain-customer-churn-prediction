import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  ScanLine,
  Layers3,
  ChartNoAxesCombined,
  ShieldCheck,
  Database,
  Workflow,
  Sparkles,
  Check,
  Activity,
} from "lucide-react";
import { Brand } from "../components/UI";
import { useAuth } from "../context/AuthContext";

const features = [
  [
    ScanLine,
    "One customer. A clearer picture.",
    "Bring together customer behavior, engagement, and payment signals in a single churn assessment.",
  ],
  [
    Layers3,
    "A whole portfolio, in one pass.",
    "Upload your CSV, validate every row, and download actionable predictions for your customer base.",
  ],
  [
    ChartNoAxesCombined,
    "Turn signals into perspective.",
    "See risk distributions, subscription patterns, and prediction trends across your own workspace.",
  ],
];

export default function Landing() {
  const { user } = useAuth();
  return (
    <div className="landing">
      <div className="landing-top">
        <nav className="landing-nav">
          <Brand />
          <div className="landing-nav-links">
            <a href="#features">Platform</a>
            <a href="#how-it-works">How it works</a>
            <a href="#technology">Technology</a>
          </div>
          <div className="flex items-center gap-3">
            <Link className="text-button" to={user ? "/app" : "/login"}>
              {user ? "My workspace" : "Sign in"}
            </Link>
            <Link
              className="button button-dark button-small"
              to={user ? "/app" : "/register"}
            >
              Get started <ArrowUpRight size={15} />
            </Link>
          </div>
        </nav>
        <main id="main-content">
          <section className="hero">
            <div className="hero-copy">
              <div className="hero-pill">
                <span className="status-dot" /> CUSTOMER CHURN INTELLIGENCE
              </div>
              <h1>
                Know the risk.
                <br />
                Keep the <span>relationship.</span>
              </h1>
              <p>
                Understand who might leave, before they do. Bring your customer
                signals into focus with machine learning built for better
                retention decisions.
              </p>
              <div className="hero-actions">
                <Link
                  className="button button-primary button-large"
                  to={user ? "/app/predict" : "/register"}
                >
                  Start Predicting <ArrowRight size={18} />
                </Link>
                <a
                  href="#how-it-works"
                  className="button button-ghost button-large"
                >
                  See how it works
                </a>
              </div>
              <div className="hero-proof">
                <span>
                  <Check size={15} /> Your trained model
                </span>
                <span>
                  <Check size={15} /> Real probabilities
                </span>
                <span>
                  <Check size={15} /> Private by design
                </span>
              </div>
            </div>
            <div
              className="intelligence-visual"
              aria-label="Customer signals are transformed by a saved machine learning pipeline into retention insights"
            >
              <div className="visual-grid" />
              <div className="visual-caption">
                <span className="status-dot" /> FROM SIGNAL TO UNDERSTANDING{" "}
                <span>01 — 03</span>
              </div>
              <div className="signal-node node-one">
                <span className="node-icon">
                  <Activity size={19} />
                </span>
                <div>
                  Customer behavior<small>Usage · tenure · interactions</small>
                </div>
                <span className="signal-wave">▁▃▂▅▃▆▅</span>
              </div>
              <div className="signal-node node-two">
                <span className="node-icon blue">
                  <Database size={19} />
                </span>
                <div>
                  Relationship signals<small>Support · payments · spend</small>
                </div>
                <Check size={17} className="muted" />
              </div>
              <div className="pipeline-line" />
              <div className="model-node">
                <div className="orbit orbit-one" />
                <div className="orbit orbit-two" />
                <div className="model-core">
                  <Workflow size={31} />
                </div>
                <span>YOUR SAVED MODEL</span>
                <strong>Patterns become perspective.</strong>
              </div>
              <div className="visual-result">
                <span className="result-spark">
                  <Sparkles size={22} />
                </span>
                <div>
                  <strong>A more informed next move.</strong>
                  <small>Churn probability + clear risk categories</small>
                </div>
                <ArrowUpRight size={20} />
              </div>
              <div className="visual-footer">
                <ShieldCheck size={14} /> Scikit-learn pipeline{" "}
                <span>Built from your notebook</span>
              </div>
            </div>
          </section>
        </main>
      </div>
      <section className="technology-strip" id="technology">
        <span>A CONNECTED INTELLIGENCE STACK</span>
        <div>
          Python <i /> Django <i /> Scikit-learn <i /> React <i /> PostgreSQL
        </div>
      </section>
      <section className="landing-section" id="features">
        <div className="section-heading">
          <div>
            <div className="eyebrow">LESS GUESSWORK. MORE UNDERSTANDING.</div>
            <h2>Make every customer signal count.</h2>
          </div>
          <p>
            From an individual check-in to a portfolio-wide view, keep your
            retention workflow in one place.
          </p>
        </div>
        <div className="feature-grid">
          {features.map(([Icon, title, copy], i) => (
            <article className="feature-card" key={title}>
              <span className={`feature-icon feature-${i}`}>
                <Icon size={24} />
              </span>
              <h3>{title}</h3>
              <p>{copy}</p>
              <span className="feature-number">0{i + 1}</span>
            </article>
          ))}
        </div>
      </section>
      <section className="how-section" id="how-it-works">
        <div>
          <div className="eyebrow">A CLEAR PATH FROM DATA TO DECISION</div>
          <h2>
            Your data in.
            <br />
            Your next insight out.
          </h2>
          <Link className="text-link" to="/register">
            Build your retention workspace <ArrowRight size={16} />
          </Link>
        </div>
        <div className="how-steps">
          {[
            [
              "Bring your customer signals",
              "Enter one customer or upload a CSV. Every input is validated before inference.",
            ],
            [
              "Let your model do the analysis",
              "Your saved pipeline applies the same preprocessing it learned during training.",
            ],
            [
              "Decide with more context",
              "Review estimated risk, explore your history, and choose the next conversation.",
            ],
          ].map(([title, copy], i) => (
            <div className="how-step" key={title}>
              <span>{i + 1}</span>
              <div>
                <h3>{title}</h3>
                <p>{copy}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      <div className="landing-cta">
        <div className="eyebrow">
          BETTER RETENTION STARTS WITH UNDERSTANDING
        </div>
        <h2>Make the next relationship count.</h2>
        <Link className="button button-primary button-large" to="/register">
          Start Predicting <ArrowRight size={18} />
        </Link>
      </div>
      <footer className="landing-footer">
        <Brand />
        <span>Customer Churn Intelligence</span>
        <span>Built for informed retention decisions.</span>
      </footer>
    </div>
  );
}
