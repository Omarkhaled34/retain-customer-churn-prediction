import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ScanLine,
  ArrowRight,
  UserRound,
  Activity,
  CreditCard,
  Info,
  LoaderCircle,
  Sparkles,
  History,
} from "lucide-react";
import { useResource } from "../hooks/useResource";
import { api, errorMessage } from "../services/api";
import { PageHeader, ErrorNotice, Loading } from "../components/UI";
import PredictionResult from "../components/PredictionResult";

const groups = [
  {
    title: "Customer profile",
    subtitle: "The basics of your customer relationship.",
    Icon: UserRound,
    fields: [
      [
        "customer_id",
        "Customer ID",
        "text",
        "Your customer reference",
        null,
        null,
      ],
      ["age", "Age", "number", "Age in years", 1, 120],
      ["gender", "Gender", "select", "As recorded in the dataset"],
      ["tenure", "Tenure", "number", "Months as a customer", 0, 1200],
    ],
  },
  {
    title: "Engagement & support",
    subtitle: "How your customer interacts with your business.",
    Icon: Activity,
    fields: [
      [
        "usage_frequency",
        "Usage frequency",
        "number",
        "Recorded product usage count",
        0,
        1000000,
      ],
      [
        "support_calls",
        "Support calls",
        "number",
        "Number of support calls",
        0,
        1000000,
      ],
      [
        "last_interaction",
        "Last interaction",
        "number",
        "Days since their last interaction",
        0,
        1000000,
      ],
      [
        "payment_delay",
        "Payment delay",
        "number",
        "Number of days payment is delayed",
        0,
        1000000,
      ],
    ],
  },
  {
    title: "Subscription & spending",
    subtitle: "A closer look at the commercial relationship.",
    Icon: CreditCard,
    fields: [
      [
        "subscription_type",
        "Subscription type",
        "select",
        "Current subscription tier",
      ],
      [
        "contract_length",
        "Contract length",
        "select",
        "Current billing commitment",
      ],
      [
        "total_spend",
        "Total spend",
        "number",
        "Lifetime spend in your dataset’s currency",
        0,
        1000000000000,
      ],
    ],
  },
];

export default function Predict() {
  const model = useResource("/model/");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    setResult(null);
    const values = Object.fromEntries(new FormData(event.currentTarget));
    for (const [key, value] of Object.entries(values))
      if (
        ![
          "customer_id",
          "gender",
          "subscription_type",
          "contract_length",
        ].includes(key)
      )
        values[key] = Number(value);
    try {
      const { data } = await api.post("/predict/", values);
      setResult(data);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeader
        eyebrow="CUSTOMER INTELLIGENCE"
        title="One customer. A clearer picture."
        description="Bring their signals together and understand the risk of churn."
      >
        <Link className="button button-ghost" to="/app/history">
          <History size={16} />
          View history
        </Link>
      </PageHeader>
      <ErrorNotice message={model.error} onRetry={model.refresh} />
      <ErrorNotice message={error} />
      {model.loading ? (
        <Loading text="Loading your saved model…" />
      ) : (
        model.data && (
          <div className="prediction-layout">
            <form onSubmit={submit} className="card prediction-form">
              {groups.map(({ title, subtitle, Icon, fields }, i) => (
                <fieldset className="form-section" key={title}>
                  <legend>
                    <span className="form-section-icon">
                      <Icon size={19} />
                    </span>
                    <span>
                      {title}
                      <small>{subtitle}</small>
                    </span>
                    <span className="section-index">0{i + 1}</span>
                  </legend>
                  <div className="form-grid">
                    {fields.map(([name, label, type, help, min, max]) => (
                      <label
                        key={name}
                        className={name === "total_spend" ? "field-wide" : ""}
                      >
                        {label}
                        <span className="required-mark">*</span>
                        {type === "select" ? (
                          <select
                            name={name}
                            aria-label={label}
                            aria-describedby={`${name}-help`}
                            defaultValue=""
                            required
                          >
                            <option value="" disabled>
                              Select {label.toLowerCase()}
                            </option>
                            {model.data.categories[name].map((option) => (
                              <option key={option}>{option}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            name={name}
                            aria-label={label}
                            aria-describedby={`${name}-help`}
                            type={type}
                            min={min}
                            max={max}
                            step={
                              name === "total_spend"
                                ? "0.01"
                                : type === "number"
                                  ? "1"
                                  : undefined
                            }
                            maxLength={name === "customer_id" ? 80 : undefined}
                            placeholder={
                              name === "customer_id"
                                ? "e.g. CUS-1001"
                                : "Enter value"
                            }
                            required
                          />
                        )}
                        <span id={`${name}-help`} className="field-help">
                          {help}
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
              <div className="form-submit-row">
                <span>
                  <ShieldCheckInline />
                  Securely analyzed in your workspace
                </span>
                <button
                  className="button button-primary"
                  disabled={busy}
                  type="submit"
                >
                  {busy ? (
                    <>
                      <LoaderCircle size={17} className="spin" />
                      Analyzing…
                    </>
                  ) : (
                    <>
                      <ScanLine size={17} />
                      Predict Churn <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </form>
            <aside className="prediction-side">
              {result ? (
                <div className="card">
                  <PredictionResult result={result} />
                </div>
              ) : (
                <div className="card result-placeholder">
                  <div className="placeholder-orbit">
                    <Sparkles size={28} />
                  </div>
                  <span className="eyebrow">YOUR NEXT INSIGHT</span>
                  <h2>
                    From signals
                    <br /> to understanding.
                  </h2>
                  <p>
                    Complete the customer details to see their estimated churn
                    probability and risk level.
                  </p>
                  <div className="placeholder-steps">
                    <span>
                      <i>1</i>Add customer details
                    </span>
                    <span>
                      <i>2</i>Run your saved model
                    </span>
                    <span>
                      <i>3</i>Explore the prediction
                    </span>
                  </div>
                </div>
              )}
              <div className="notice model-note">
                <Info size={18} />
                <p>
                  All 10 predictive features are required. Customer ID
                  identifies the record and is excluded from model inference.
                  Categories come from your training data.
                </p>
              </div>
            </aside>
          </div>
        )
      )}
    </>
  );
}

function ShieldCheckInline() {
  return <Info size={14} />;
}
