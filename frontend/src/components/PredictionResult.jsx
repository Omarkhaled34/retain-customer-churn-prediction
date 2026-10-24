import { Link } from "react-router-dom";
import { CheckCircle2, ArrowRight, ShieldAlert, Info } from "lucide-react";
import { RiskBadge, percent } from "./UI";

export default function PredictionResult({ result }) {
  const Icon = result.prediction ? ShieldAlert : CheckCircle2;
  return (
    <div className="prediction-result" aria-live="polite">
      <div className="result-topline">
        <span className="eyebrow">PREDICTION COMPLETE</span>
        <RiskBadge risk={result.risk_level} />
      </div>
      <div className={`result-outcome ${result.prediction ? "is-churn" : ""}`}>
        <Icon size={30} />
        <h2>{result.prediction ? "Likely to churn" : "Likely to stay"}</h2>
        <p>Customer #{result.customer_id}</p>
      </div>
      <div className="probability-display">
        <span>Estimated churn probability</span>
        <strong>{percent(result.churn_probability)}</strong>
        <div className="result-progress">
          <span style={{ width: `${result.churn_probability * 100}%` }} />
        </div>
        <div className="probability-scale">
          <span>Lower risk</span>
          <span>Higher risk</span>
        </div>
      </div>
      <div className="retention-row">
        <span>Retention probability</span>
        <strong>{percent(result.retention_probability)}</strong>
      </div>
      <div className="result-explanation">
        <Info size={17} />
        <p>
          {result.prediction
            ? "Consider reaching out to understand this customer’s experience and identify opportunities to strengthen the relationship."
            : "Keep nurturing this relationship. Continue monitoring engagement and supporting the customer’s needs."}{" "}
          This is estimated risk, not guaranteed future behavior.
        </p>
      </div>
      <div className="result-saved">
        <CheckCircle2 size={15} />
        Saved to your prediction history
      </div>
      <Link to={`/app/history?record=${result.id}`} className="text-link">
        View full assessment <ArrowRight size={15} />
      </Link>
      <span className="model-version">Model {result.model_version}</span>
    </div>
  );
}
