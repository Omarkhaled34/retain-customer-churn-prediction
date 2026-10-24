import { useRef, useState } from "react";
import Papa from "papaparse";
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  ArrowRight,
  LoaderCircle,
  CheckCircle2,
  X,
  Info,
} from "lucide-react";
import { api, downloadBatch, errorMessage } from "../services/api";
import { PageHeader, ErrorNotice, RiskBadge, percent } from "../components/UI";

export default function Batch() {
  const input = useRef(null);
  const previewGeneration = useRef(0);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [dragging, setDragging] = useState(false);
  function selectFile(next) {
    if (busy) return;
    const generation = ++previewGeneration.current;
    setResult(null);
    setError("");
    setPreview(null);
    setFile(null);
    if (!next) return;
    if (
      !next.name.toLowerCase().endsWith(".csv") ||
      next.size > 5 * 1024 * 1024
    ) {
      setError("Choose a CSV file under 5 MiB.");
      return;
    }
    setFile(next);
    Papa.parse(next, {
      header: true,
      preview: 5,
      skipEmptyLines: true,
      complete: (parsed) => {
        if (generation !== previewGeneration.current) return;
        if (parsed.errors.length)
          setError(`CSV preview: ${parsed.errors[0].message}`);
        setPreview(parsed);
      },
      error: () => {
        if (generation === previewGeneration.current)
          setError("Unable to read this file.");
      },
    });
  }
  async function run() {
    setBusy(true);
    setError("");
    setResult(null);
    const form = new FormData();
    form.append("file", file);
    try {
      const { data } = await api.post("/predict/batch/", form);
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
        eyebrow="PORTFOLIO INTELLIGENCE"
        title="See the bigger picture."
        description="Analyze a customer list, find the patterns, and take your insights with you."
      >
        <a
          className="button button-ghost"
          href="/sample-customers.csv"
          download
        >
          <Download size={16} />
          Sample CSV
        </a>
      </PageHeader>
      <div className="batch-steps">
        <span className="step-active">
          <i>1</i>Upload your data
        </span>
        <div />
        <span className={file ? "step-active" : ""}>
          <i>2</i>Preview & analyze
        </span>
        <div />
        <span className={result ? "step-active" : ""}>
          <i>3</i>Explore & export
        </span>
      </div>
      <ErrorNotice message={error} />
      <div className="card batch-upload">
        <div className="card-heading">
          <div>
            <h3>Bring your customer data</h3>
            <p>One file. A clearer view of your customer relationships.</p>
          </div>
          <span className="subtle-pill">CSV FORMAT</span>
        </div>
        <input
          ref={input}
          className="sr-only"
          aria-label="Upload customer CSV"
          type="file"
          accept=".csv,text/csv"
          disabled={busy}
          onChange={(event) => selectFile(event.target.files[0])}
        />
        <button
          type="button"
          disabled={busy}
          className={`dropzone ${dragging ? "drag-active" : ""}`}
          onClick={() => input.current.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            selectFile(event.dataTransfer.files[0]);
          }}
        >
          <span className="upload-icon">
            <UploadCloud size={29} />
          </span>
          <strong>
            Drop your CSV here, or <em>browse files</em>
          </strong>
          <span>UTF-8 CSV · Up to 5 MiB · Maximum 1,000 customers</span>
        </button>
        {file && (
          <div className="selected-file">
            <FileSpreadsheet size={25} />
            <div>
              <strong>{file.name}</strong>
              <span>
                {(file.size / 1024).toFixed(1)} KB · Ready for validation
              </span>
            </div>
            <button
              className="icon-button"
              aria-label="Remove file"
              disabled={busy}
              onClick={() => {
                ++previewGeneration.current;
                setFile(null);
                setPreview(null);
                setResult(null);
                input.current.value = "";
              }}
            >
              <X size={18} />
            </button>
          </div>
        )}
        <div className="batch-format-note">
          <Info size={17} />
          <p>
            Include all 11 customer columns. Use the sample’s headers or the
            original notebook headers. An optional <code>Churn</code> column is
            ignored. Invalid rows are reported and valid customers are analyzed.
          </p>
        </div>
      </div>
      {preview && (
        <section className="card preview-card">
          <div className="card-heading">
            <div>
              <h3>Preview your data</h3>
              <p>
                First {preview.data.length} records · full validation happens on
                the server
              </p>
            </div>
            <button
              className="button button-primary"
              disabled={busy || !file}
              onClick={run}
            >
              {busy ? (
                <>
                  <LoaderCircle size={16} className="spin" />
                  Analyzing…
                </>
              ) : (
                <>
                  Run batch predictions <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {preview.meta.fields?.map((field) => (
                    <th key={field}>{field}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.data.map((row, i) => (
                  <tr key={i}>
                    {preview.meta.fields?.map((field) => (
                      <td key={field}>{String(row[field] ?? "")}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {result && (
        <section className="card batch-results" aria-live="polite">
          <div className="card-heading">
            <div>
              <h3>
                <CheckCircle2 size={19} className="success-text" />
                Analysis complete
              </h3>
              <p>
                {result.processed} processed · {result.predicted_churn}{" "}
                predicted to churn · {result.rejected} rejected
              </p>
            </div>
            <button
              className="button button-primary"
              onClick={() =>
                downloadBatch(result.batch_id).catch((e) =>
                  setError(errorMessage(e)),
                )
              }
            >
              <Download size={16} />
              Download results
            </button>
          </div>
          <div className="table-scroll batch-result-scroll">
            <table>
              <thead>
                <tr>
                  <th>Customer ID</th>
                  <th>Prediction</th>
                  <th>Churn probability</th>
                  <th>Risk level</th>
                </tr>
              </thead>
              <tbody>
                {result.results.map((row) => (
                  <tr key={row.id}>
                    <td className="customer-link">#{row.customer_id}</td>
                    <td>
                      {row.prediction ? "Likely to churn" : "Likely to stay"}
                    </td>
                    <td>{percent(row.churn_probability)}</td>
                    <td>
                      <RiskBadge risk={row.risk_level} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {result.errors.length > 0 && (
            <div className="row-errors">
              <h4>Rows that need attention</h4>
              {result.errors.map((item) => (
                <p key={item.row}>
                  Row {item.row}: {JSON.stringify(item.errors)}
                </p>
              ))}
            </div>
          )}
        </section>
      )}
    </>
  );
}
