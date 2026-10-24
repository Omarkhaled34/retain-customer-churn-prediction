import {
  FlaskConical,
  Check,
  Layers3,
  Database,
  ShieldCheck,
  ExternalLink,
  Info,
} from "lucide-react";
import { useResource } from "../hooks/useResource";
import {
  PageHeader,
  ErrorNotice,
  Loading,
  percent,
  number,
  date,
} from "../components/UI";

export default function ModelInfo() {
  const { data, loading, error, refresh } = useResource("/model/");
  const metrics = [
    ["accuracy", "Accuracy"],
    ["precision", "Precision"],
    ["recall", "Recall"],
    ["f1", "F1 score"],
    ["roc_auc", "ROC-AUC"],
  ];
  return (
    <>
      <PageHeader
        eyebrow="TRANSPARENT BY DESIGN"
        title="Know the model behind the insight."
        description="Your methodology, preprocessing, and measured performance in one place."
      >
        <a
          href="/api/docs/"
          target="_blank"
          rel="noreferrer"
          className="button button-ghost"
        >
          API documentation
          <ExternalLink size={15} />
        </a>
      </PageHeader>
      <ErrorNotice message={error} onRetry={refresh} />
      {loading ? (
        <Loading />
      ) : (
        data && (
          <>
            <div className="card model-hero">
              <span className="model-hero-icon">
                <FlaskConical size={32} />
              </span>
              <div>
                <div className="eyebrow">YOUR ACTIVE MODEL</div>
                <h2>{data.algorithm}</h2>
                <p>
                  Saved Scikit-learn pipeline · {data.features.length}{" "}
                  predictive features
                </p>
              </div>
              <div className="model-hero-version">
                <span className="subtle-pill">{data.version}</span>
                <small>Trained {date(data.trained_at)}</small>
              </div>
            </div>
            <section className="card model-metrics">
              <div className="card-heading">
                <div>
                  <h3>Measured performance</h3>
                  <p>
                    Calculated from real evaluation data · each metric is a
                    fraction of 1
                  </p>
                </div>
                <span className="live-label">
                  <span />
                  Evaluated
                </span>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Evaluation split</th>
                      <th>Records</th>
                      {metrics.map(([, title]) => (
                        <th key={title}>{title}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["training", "Training"],
                      ["validation", "Validation"],
                      ["test", "Independent test"],
                    ].map(([key, label]) => (
                      <tr key={key}>
                        <td>
                          <strong>{label}</strong>
                        </td>
                        <td>
                          {data[key] ? number(data[key].rows) : "Not supplied"}
                        </td>
                        {metrics.map(([metric]) => (
                          <td key={metric}>
                            {data[key] ? percent(data[key][metric]) : "—"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
            <div className="model-details-grid">
              <section className="card detail-card">
                <span className="soft-icon">
                  <Layers3 size={21} />
                </span>
                <h3>Consistent from training to inference</h3>
                <p>{data.preprocessing}</p>
                <ul className="check-list">
                  <li>
                    <Check size={16} />
                    Encoder and scaler fitted on training data only
                  </li>
                  <li>
                    <Check size={16} />
                    Strict training category validation
                  </li>
                  <li>
                    <Check size={16} />
                    Fixed feature order on every prediction
                  </li>
                  <li>
                    <Check size={16} />
                    Probabilities from the model’s churn class
                  </li>
                </ul>
              </section>
              <section className="card detail-card">
                <span className="soft-icon">
                  <Database size={21} />
                </span>
                <h3>A reproducible methodology</h3>
                <p>{data.methodology}</p>
                <dl className="info-list">
                  <div>
                    <dt>Training records</dt>
                    <dd>{number(data.training_rows)}</dd>
                  </div>
                  <div>
                    <dt>Validation records</dt>
                    <dd>{number(data.validation_rows)}</dd>
                  </div>
                  <div>
                    <dt>Missing rows removed</dt>
                    <dd>{number(data.dropped_missing_rows)}</dd>
                  </div>
                  <div>
                    <dt>Scikit-learn</dt>
                    <dd>{data.sklearn_version}</dd>
                  </div>
                </dl>
              </section>
            </div>
            <section className="card detail-card">
              <div className="card-heading">
                <div>
                  <h3>Inputs that shape the prediction</h3>
                  <p>{data.customer_id_policy}</p>
                </div>
                <ShieldCheck size={22} className="purple-text" />
              </div>
              <div className="feature-tags">
                {data.features.map((feature) => (
                  <span key={feature}>
                    {feature.replaceAll("_", " ")}
                    <small>
                      {data.categorical_features.includes(feature)
                        ? "category"
                        : "numeric"}
                    </small>
                  </span>
                ))}
              </div>
              <div className="category-grid">
                {Object.entries(data.categories).map(([key, values]) => (
                  <div key={key}>
                    <strong>{key.replaceAll("_", " ")}</strong>
                    <span>{values.join(" · ")}</span>
                  </div>
                ))}
              </div>
            </section>
            {data.identifier_comparison && (
              <div className="notice">
                <Info size={20} />
                <p>
                  The notebook included CustomerID in training. Its validation
                  accuracy with the identifier was{" "}
                  {percent(
                    data.identifier_comparison.validation_with_customer_id
                      .accuracy,
                  )}
                  ; the served model without it achieves{" "}
                  {percent(data.validation.accuracy)}. The identifier can encode
                  dataset ordering rather than transferable customer behavior.
                  See the independent test metrics above when assessing
                  generalization. Scores may differ from the notebook after this
                  deliberate change.
                </p>
              </div>
            )}
            <div className="insight-note">
              <Info size={15} />
              Risk thresholds: Low below 40% · Medium from 40% to below 70% ·
              High from 70%. These are operational bands, not validated
              intervention thresholds.
            </div>
          </>
        )
      )}
    </>
  );
}
