import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Search,
  Plus,
  Trash2,
  Eye,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  X,
  LoaderCircle,
} from "lucide-react";
import { useResource } from "../hooks/useResource";
import { api, errorMessage } from "../services/api";
import {
  PageHeader,
  ErrorNotice,
  Loading,
  EmptyState,
  RiskBadge,
  percent,
  date,
} from "../components/UI";
import PredictionResult from "../components/PredictionResult";

function RecordDialog({ id, onClose }) {
  const dialog = useRef(null);
  const { data, loading, error } = useResource(`/predictions/${id}/`);
  useEffect(() => {
    const previous = document.activeElement;
    const listener = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab") {
        const controls = dialog.current?.querySelectorAll(
          "button:not(:disabled), a[href], input, select",
        );
        if (!controls?.length) return;
        const first = controls[0],
          last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", listener);
    return () => {
      window.removeEventListener("keydown", listener);
      previous?.focus();
    };
  }, [onClose]);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        ref={dialog}
        className="record-modal card"
        role="dialog"
        aria-modal="true"
        aria-label="Prediction details"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          autoFocus
          className="icon-button modal-close"
          onClick={onClose}
          aria-label="Close details"
        >
          <X size={20} />
        </button>
        <ErrorNotice message={error} />
        {loading ? (
          <Loading />
        ) : (
          data && (
            <>
              <PredictionResult result={data} />
              <div className="snapshot">
                <h4>Customer input snapshot</h4>
                <dl>
                  {Object.entries(data.customer).map(([key, value]) => (
                    <div key={key}>
                      <dt>{key.replaceAll("_", " ")}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
                <span className="field-help">
                  Analyzed {date(data.created_at)}
                </span>
              </div>
            </>
          )
        )}
      </section>
    </div>
  );
}

export default function History() {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [risk, setRisk] = useState("");
  const [outcome, setOutcome] = useState("");
  const [ordering, setOrdering] = useState("-created_at");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);
  const filters = new URLSearchParams({
    page,
    ordering,
    ...(query && { search: query }),
    ...(risk && { risk_level: risk }),
    ...(outcome !== "" && { prediction: outcome }),
  });
  const {
    data,
    loading,
    error: resourceError,
    refresh,
  } = useResource(`/predictions/?${filters}`);
  async function remove(id) {
    setDeleting(id);
    setError("");
    try {
      await api.delete(`/predictions/${id}/`);
      setConfirmId(null);
      if (data.results.length === 1 && page > 1) setPage(page - 1);
      else refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setDeleting(null);
    }
  }
  return (
    <>
      <PageHeader
        eyebrow="YOUR INTELLIGENCE LIBRARY"
        title="Every insight, in one place."
        description="Revisit past assessments and follow the story behind each prediction."
      >
        <Link className="button button-primary" to="/app/predict">
          <Plus size={17} />
          New prediction
        </Link>
      </PageHeader>
      <ErrorNotice message={error || resourceError} onRetry={refresh} />
      <section className="card history-card">
        <div className="history-toolbar">
          <label className="search-input">
            <Search size={17} />
            <span className="sr-only">Search customer ID</span>
            <input
              placeholder="Search customer ID…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <div className="history-filters">
            <label>
              <span className="sr-only">Filter risk</span>
              <select
                value={risk}
                onChange={(event) => {
                  setRisk(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">All risk levels</option>
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
            </label>
            <label>
              <span className="sr-only">Filter prediction</span>
              <select
                value={outcome}
                onChange={(event) => {
                  setOutcome(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">All predictions</option>
                <option value="1">Likely to churn</option>
                <option value="0">Likely to stay</option>
              </select>
            </label>
            <label className="sort-select">
              <ArrowUpDown size={14} />
              <span className="sr-only">Sort predictions</span>
              <select
                value={ordering}
                onChange={(event) => {
                  setOrdering(event.target.value);
                  setPage(1);
                }}
              >
                <option value="-created_at">Newest first</option>
                <option value="created_at">Oldest first</option>
                <option value="-churn_probability">Highest risk</option>
                <option value="churn_probability">Lowest risk</option>
                <option value="customer__customer_id">Customer ID</option>
              </select>
            </label>
          </div>
        </div>
        {loading ? (
          <Loading text="Loading predictions…" />
        ) : data?.results.length ? (
          <>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Customer ID</th>
                    <th>Prediction</th>
                    <th>Churn probability</th>
                    <th>Risk level</th>
                    <th>Analyzed</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.results.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <button
                          className="customer-link text-button"
                          onClick={() => setParams({ record: row.id })}
                        >
                          #{row.customer_id}
                        </button>
                      </td>
                      <td>
                        <span
                          className={`outcome ${row.prediction ? "outcome-churn" : ""}`}
                        >
                          {row.prediction
                            ? "Likely to churn"
                            : "Likely to stay"}
                        </span>
                      </td>
                      <td>
                        <div className="probability-cell">
                          <span>{percent(row.churn_probability)}</span>
                          <div>
                            <i
                              style={{
                                width: `${row.churn_probability * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td>
                        <RiskBadge risk={row.risk_level} />
                      </td>
                      <td className="muted nowrap">{date(row.created_at)}</td>
                      <td>
                        <div className="row-actions">
                          <button
                            className="icon-button"
                            aria-label={`View ${row.customer_id}`}
                            onClick={() => setParams({ record: row.id })}
                          >
                            <Eye size={17} />
                          </button>
                          {confirmId === row.id ? (
                            <>
                              <button
                                className="danger-text text-button"
                                disabled={deleting === row.id}
                                onClick={() => remove(row.id)}
                              >
                                {deleting === row.id ? (
                                  <LoaderCircle size={14} className="spin" />
                                ) : (
                                  "Delete"
                                )}
                              </button>
                              <button
                                className="icon-button"
                                aria-label="Cancel deletion"
                                onClick={() => setConfirmId(null)}
                              >
                                <X size={15} />
                              </button>
                            </>
                          ) : (
                            <button
                              className="icon-button danger-hover"
                              aria-label={`Delete ${row.customer_id}`}
                              onClick={() => setConfirmId(row.id)}
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pagination">
              <span>
                Showing {(page - 1) * 15 + 1}–{Math.min(page * 15, data.count)}{" "}
                of {data.count} predictions
              </span>
              <div>
                <button
                  className="button button-ghost button-small"
                  disabled={!data.previous}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft size={16} />
                  Previous
                </button>
                <span>{page}</span>
                <button
                  className="button button-ghost button-small"
                  disabled={!data.next}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        ) : (
          !resourceError && (
            <EmptyState
              title={
                query || risk || outcome
                  ? "No matching predictions"
                  : "A fresh start for your insights"
              }
              description={
                query || risk || outcome
                  ? "Try another customer ID or adjust your filters."
                  : "Analyze a customer to begin your prediction history."
              }
            />
          )
        )}
      </section>
      {params.get("record") && (
        <RecordDialog id={params.get("record")} onClose={() => setParams({})} />
      )}
    </>
  );
}
