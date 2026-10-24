# Customer Churn Intelligence

A complete customer churn application built from the supplied `math_ml/customer churn.ipynb`: React/Vite → Django REST Framework → saved Scikit-learn pipeline → database → prediction history and analytics.

The interface includes a landing page, registration/login, private dashboard, single-customer assessment, CSV preview and batch analysis, searchable history, input snapshots, account profile, and measured model information. Charts use the authenticated user's saved predictions. New workspaces start empty. No sample account, synthetic production model, seeded analytics, or simulated predictions are used.

## Model results and limitations

The bundled `backend/ml/artifacts/churn.joblib` is trained on the actual CSV referenced by the notebook. Raw data stays outside the repository. The sample CSV contains the first six real training records, with the target removed; it is an input-format example, not evaluation data.

| Model / split | Rows | Accuracy | Precision | Recall | F1 | ROC-AUC |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Served model, training | 352,665 | 85.15% | 88.07% | 85.36% | 86.69% | 92.84% |
| Served model, validation | 88,167 | 85.04% | 88.12% | 85.16% | 86.62% | 92.84% |
| Served model, independent test | 64,374 | 58.69% | 53.48% | 98.27% | 69.26% | 77.58% |
| Notebook-style comparison with CustomerID, validation | 88,167 | 97.75% | 98.17% | 97.87% | 98.02% | 99.44% |

CustomerID is a unique sequential identifier. It was included in the notebook's final input and scaler despite the `# no CustomerID` comment. The served model excludes it, retaining it only in customer records. Removing it deliberately changes predictions and metrics. The original model was not serialized in the notebook, so this is a reproducible refit of the same approach, not a claim of identical historical weights.

The independent test score is much lower than the random validation score. In particular, the test confusion matrix contains 26,068 false positives and 528 false negatives. The model has limited generalization on that test dataset. Assess representative data and probability calibration before relying on risk scores for business interventions. The app displays these limitations and the actual scores.

Preprocessing preserves the notebook's train-only fitting: 80/20 split, `random_state=42`, no stratification; `StandardScaler` on seven numerical fields; `OrdinalEncoder` on three categorical fields; `LogisticRegression`. `max_iter` increases from the default 100 to 1,000 to allow convergence. The transformers and classifier are saved together. Unknown categories are rejected with a field validation error; no prediction input is used for fitting. See [the notebook analysis](docs/NOTEBOOK_ANALYSIS.md) and [the generated metadata](backend/ml/artifacts/metadata.json).

## Technology

- Django 5.2 LTS, Django REST Framework, Django ORM and authentication, PostgreSQL, Psycopg, django-filter, drf-spectacular, WhiteNoise.
- Scikit-learn 1.9.0, Pandas, NumPy, Joblib.
- React 19, Vite 7, Tailwind CSS 4, Axios, React Router, Recharts, Lucide, Papa Parse.
- Docker Compose, PostgreSQL 17, Gunicorn, nginx; optional HTTPS production override.
- Django tests, Vitest/Testing Library, and Playwright browser tests.

## Quick local installation

Requirements: **Python 3.13** and **Node.js 22.12+ or 24**. Run commands from `customer-churn-platform`. You do not need the raw training CSV to run the bundled model.

```powershell
cd 'D:\vs code projects\Data\customer-churn-platform'
python scripts/setup.py
```

Setup creates a project virtual environment, generates `.env` with new secrets if it does not exist, installs locked dependencies, migrates the local database, collects static files, and installs frontend packages. It never overwrites an existing `.env`.

Start the API in one terminal:

```powershell
cd 'D:\vs code projects\Data\customer-churn-platform'
.\.venv\Scripts\python.exe backend\manage.py runserver 127.0.0.1:8000
```

Start the frontend in a second terminal:

```powershell
cd 'D:\vs code projects\Data\customer-churn-platform\frontend'
npm.cmd run dev
```

Open **http://127.0.0.1:5173**. Register your own account, then enter a customer or upload the sample CSV. Use the same hostname consistently for frontend and API. Vite forwards `/api` and `/static` to Django; the browser uses a same-origin API path.

Linux/macOS use `.venv/bin/python` and `npm` in place of the Windows commands. `scripts/setup.py` handles both platforms.

### Manual environment setup

If you prefer to install each layer yourself:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend/requirements.lock.txt
python scripts/create_env.py
.\.venv\Scripts\python.exe backend/manage.py migrate
.\.venv\Scripts\python.exe backend/manage.py collectstatic --noinput
cd frontend
npm.cmd ci
```

`requirements.txt` records compatible direct dependencies; `requirements.lock.txt` records the exact tested dependency set. `package-lock.json` records the frontend dependency tree. Keep the pinned Scikit-learn version consistent with saved artifacts.

Without `DATABASE_URL`, local development uses SQLite. This is explicitly a local fallback. Docker uses PostgreSQL, and `DJANGO_DEBUG=false` refuses a SQLite database. Without a configured development secret, Django generates an ephemeral key; create `.env` to keep sessions valid across restarts.

### PostgreSQL configuration

Set `DATABASE_URL` in `.env` to a database you own, for example:

```dotenv
DATABASE_URL=postgresql://churn:URL_ENCODED_PASSWORD@127.0.0.1:5432/churn
```

Create the database and its dedicated role with permissions limited to that database, then run `manage.py migrate`. Use a separate database/user for tests if the application role lacks `CREATEDB`; Django's test runner creates and drops a test database. Production settings require PostgreSQL. No database port is published by Compose, and the web process does not receive the PostgreSQL administrator's credentials outside its dedicated role.

## Training and model artifacts

The original notebook remains at `../math_ml/customer churn.ipynb`. To retrain on the original local files:

```powershell
cd backend
..\.venv\Scripts\python.exe -m ml.train `
  --train-csv 'C:\Users\MAREY\Downloads\archive (1)\customer_churn_dataset-training-master.csv' `
  --test-csv 'C:\Users\MAREY\Downloads\archive (1)\customer_churn_dataset-testing-master.csv'
```

Or pass your own CSV paths. `--output` selects another artifact directory. The training file must contain all ten predictive features and binary `Churn`; a CustomerID column enables the notebook-style comparison but is never used by the served model. Headers may use notebook names or the API names below. Test data is optional and is only transformed and evaluated after fitting. No test data is used to choose hyperparameters or thresholds.

Training writes:

- `churn.joblib`: the fitted pipeline and its metadata in one bundle. Artifact replacement is atomic.
- `metadata.json`: readable metrics, category vocabulary, thresholds, train/test hashes, version and methodology.

Restart API workers after replacing the artifact. Each worker loads it lazily once and reuses it under a guarded cache. If it is missing or incompatible, predictions return HTTP 503 and health reports unavailable. Artifact loading never trains. Only load Joblib artifacts you trust, as deserialization executes Python objects.

Model version: `lr-v1-a41be7b96f`. The suffix identifies the original training source hash. `MODEL_PATH` can select another artifact without editing source. Full source hashes are recorded in metadata; do not change the inference feature schema without updating training, serializers, tests, and the model version policy together.

## Input schema

All fields are required. JSON uses the API names. CSV accepts all API names or exact notebook names (including spaces). CustomerID is kept as a string to preserve external identifiers and leading zeros; numeric JSON IDs are also accepted as strings by the serializer.

| API field | Notebook CSV header | Validation / meaning |
| --- | --- | --- |
| `customer_id` | CustomerID | Nonempty, at most 80 characters; identifier only |
| `age` | Age | Integer, 1–120 years |
| `gender` | Gender | Female / Male, as learned in training |
| `tenure` | Tenure | Integer, 0–1,200 months |
| `usage_frequency` | Usage Frequency | Nonnegative integer, at most 1,000,000 |
| `support_calls` | Support Calls | Nonnegative integer, at most 1,000,000 |
| `payment_delay` | Payment Delay | Nonnegative integer days, at most 1,000,000 |
| `subscription_type` | Subscription Type | Basic / Premium / Standard |
| `contract_length` | Contract Length | Annual / Monthly / Quarterly |
| `total_spend` | Total Spend | Finite number, 0–1,000,000,000,000; dataset currency |
| `last_interaction` | Last Interaction | Nonnegative integer days, at most 1,000,000 |

These bounds enforce format and basic plausibility, not statistical membership in the training distribution. Large out-of-range inputs may be poor estimates. The exact categories in a retrained artifact are served by `/api/model/` and populate the frontend dropdowns. Extra JSON fields are rejected. CSV may include `Churn`, which is ignored during inference.

Risk bands are Low below 0.40, Medium from 0.40 to below 0.70, High from 0.70. These operational thresholds are not tuned or claimed as validated interventions. The binary label comes from `pipeline.predict()`; churn probability comes from the column of `predict_proba()` whose class is `1`.

## API reference

Interactive Swagger: **http://127.0.0.1:8000/api/docs/**. OpenAPI: `/api/schema/`.

| Method | Endpoint | Behavior |
| --- | --- | --- |
| GET | `/api/auth/csrf/` | Initialize CSRF cookie; returns masked token |
| POST | `/api/auth/register/` | Create account and session (201) |
| POST | `/api/auth/login/` | Create authenticated session (200) |
| POST | `/api/auth/logout/` | End session (200) |
| GET | `/api/auth/profile/` | Current user, excluding password |
| POST | `/api/predict/` | Validate, infer, save input and prediction (201) |
| POST | `/api/predict/batch/` | Multipart `file`, partial row validation and saved results (201) |
| GET | `/api/predictions/` | Paginated owned history, 15 per page |
| GET | `/api/predictions/{id}/` | Owned prediction with immutable input snapshot |
| DELETE | `/api/predictions/{id}/` | Delete owned prediction and exclusive snapshot (204) |
| GET | `/api/predictions/export/?batch_id=UUID` | Owned batch as downloadable CSV |
| GET | `/api/analytics/overview/` | User's aggregates, trends, risk and subscription breakdown |
| GET | `/api/model/` | Actual model metadata and evaluation metrics |
| GET | `/api/health/` | Public database/model readiness; 200 or 503 |

History filters: `search=CUS-1001`, `risk_level=High`, `prediction=1`, `batch_id=UUID`, `page=2`; sort by `ordering=-created_at`, `created_at`, `-churn_probability`, `churn_probability`, or `customer__customer_id`. Analytics optionally accepts `days=7`, `30`, or `90`; the selected period applies to all statistics. Statistics count prediction events, and `total_customers` counts distinct customer identifiers. Repeated assessments appear as separate prediction events.

Validation returns HTTP 400 with `{"detail":"Please check the submitted data.","errors":{...}}`; unauthenticated sessions/CSRF failures return 403; inaccessible records return 404; rate limits return 429; unavailable model returns 503. Batch responses contain row-level errors, valid results, counts, a batch UUID, and a download URL. Row numbering begins at 2 after the header. Files with no valid records return 400. File structure/row-limit errors reject the entire upload before writes. Valid rows are inferred in one model call and saved in one transaction. A partial batch returns 201 with `rejected > 0`; rejected rows are never saved.

### Session authentication and example request

Sessions use Django's password hashing and a server-side session record. The session cookie is HttpOnly; the CSRF cookie is readable by the frontend. The login and registration endpoints explicitly enforce CSRF for anonymous requests, too. Every unsafe request must supply `X-CSRFToken`, and it must be refreshed after login because Django rotates it. No authentication tokens are kept in localStorage.

For a script, install `requests` separately, then use a session:

```python
import requests

base = 'http://127.0.0.1:8000/api'
session = requests.Session()
session.get(f'{base}/auth/csrf/').raise_for_status()
headers = {'X-CSRFToken': session.cookies['csrftoken']}
response = session.post(f'{base}/auth/login/', json={
    'username': 'YOUR_USERNAME', 'password': 'YOUR_PASSWORD'
}, headers=headers)
response.raise_for_status()
headers['X-CSRFToken'] = session.cookies['csrftoken']

response = session.post(f'{base}/predict/', json={
    'customer_id': '1001', 'age': 35, 'gender': 'Male', 'tenure': 12,
    'usage_frequency': 18, 'support_calls': 3, 'payment_delay': 5,
    'subscription_type': 'Standard', 'contract_length': 'Monthly',
    'total_spend': 750.5, 'last_interaction': 10
}, headers=headers)
response.raise_for_status()
print(response.json())  # Actual probabilities, label, risk, snapshot, timestamp and model version.
```

Swagger's same-origin requests use the session cookie and CSRF token after registration/login through the app. In local development the frontend and docs should use the same hostname (`127.0.0.1`).

## Tests and builds

From the project directory:

```powershell
.\.venv\Scripts\python.exe backend/manage.py test core.tests --verbosity 2
cd frontend
npm.cmd test
npm.cmd run build
npx.cmd playwright install chromium
npm.cmd run test:e2e
```

Playwright starts the Django API and Vite automatically. Its default API uses a separate `backend/e2e.sqlite3` database. Stop development servers on ports 8000 and 5173 before running tests to keep browser-test data separate; `reuseExistingServer` supports deliberate manual debugging. `E2E_PYTHON` can point to another Python executable, and `E2E_DATABASE_URL` can select an isolated PostgreSQL database.

The backend suite uses the real bundled artifact and a real input from the supplied dataset. Tests cover preprocessing state, ordering, class probability alignment, invalid and unknown inputs, sessions/CSRF, uploads, limits, ownership, deletion, filters, exports, analytics, and throttling. Unit frontend tests use clearly scoped response fixtures to test rendering and failure behavior; the running app and browser workflow use the actual API and artifact.

The browser workflow registers a new account, predicts a real customer, checks the returned probability in the UI, opens persisted history and its input snapshot, uploads a real row as a batch, downloads results, checks analytics, tests mobile navigation, and logs out. Screenshots and traces appear in `frontend/test-results/`.

Validate the schema and migration state:

```powershell
cd backend
..\.venv\Scripts\python.exe manage.py spectacular --file schema.yml --validate --fail-on-warn
..\.venv\Scripts\python.exe manage.py makemigrations --check --dry-run
```

GitHub Actions configuration includes a PostgreSQL service to run the backend tests against PostgreSQL and the browser workflow against an isolated PostgreSQL database.

## Docker Compose

Install Docker Desktop (including Compose). From the project directory:

```powershell
python scripts/create_env.py
docker compose up --build -d
docker compose ps
```

Skip `create_env.py` if setup already generated `.env`. Open **http://localhost:8080**. PostgreSQL is the primary database in Compose. The backend performs migrations, creates the shared production throttle cache table, collects static files, and starts Gunicorn. nginx serves React and proxies `/api`, `/admin`, and `/static`. Health checks wait for PostgreSQL and the model-ready backend. Database data persists in `postgres_data`.

```powershell
docker compose logs -f backend
docker compose exec backend python manage.py check
docker compose down
```

`down` keeps the database volume. Only remove volumes if you intend to delete all saved customer data. Compose initializes a dedicated non-superuser `churn` role with no database/role creation privileges. The backend receives only this role?s password; the separate generated `DB_ADMIN_PASSWORD` stays with the database container. Initialization runs only for a new volume. Run tests with a separate test database role that has `CREATEDB`, as in CI; the deployed role intentionally cannot create test databases. On managed production PostgreSQL, use a database owner only for migrations and a separate runtime role with the required table permissions.

### HTTPS production deployment

Set these values in `.env` (configuration, not source changes):

```dotenv
DJANGO_DEBUG=false
DJANGO_ALLOWED_HOSTS=churn.example.com,127.0.0.1,backend
CSRF_TRUSTED_ORIGINS=https://churn.example.com
CORS_ALLOWED_ORIGINS=https://churn.example.com
TLS_CERT_DIR=/absolute/path/to/your/certificates
```

Keep generated secrets private. The certificate directory must contain `fullchain.pem` and `privkey.pem`. Deploy with:

```powershell
docker compose -f docker-compose.yml -f docker-compose.production.yml up --build -d
docker compose exec backend python manage.py check --deploy
```

Expose port 443 and route DNS to the host. The default HTTP mapping on port 8080 redirects to HTTPS in this configuration. nginx terminates TLS and sets the trusted forwarding header; the backend has no public port. Secure cookies, HTTPS redirect, HSTS, explicit hosts/origins, and the shared database throttle cache are enabled when debug is false. Model readiness is exempt from HTTPS redirect for internal health checks. Back up the PostgreSQL volume, establish certificate renewal, and configure your host's logs/monitoring and recovery policy before operating the service.

CSV uploads are limited to 5 MiB and 1,000 rows. Prediction requests are limited to 60/minute per user, batch/export to 5/minute, auth to 10/minute per session/IP, and reads to 180/minute. These DRF throttles provide application-level control; nginx adds an IP request limit. They are not a strict distributed abuse-prevention guarantee.

## Troubleshooting

- **PowerShell blocks npm.ps1:** use `npm.cmd` and `npx.cmd`; you do not need to relax execution policy.
- **Model unavailable (503):** verify `backend/ml/artifacts/churn.joblib`, install the pinned requirements, retrain if needed, and restart all API workers. Never download and load an untrusted pickle/Joblib file.
- **CSRF 403:** use one hostname, initialize `/api/auth/csrf/`, include cookies, and read the new CSRF cookie after login. Verify the exact browser origin appears in `CSRF_TRUSTED_ORIGINS`. Cookies are secure-only in production and require HTTPS.
- **Unexpected logout after restarting development:** generate `.env` so `DJANGO_SECRET_KEY` stays constant.
- **Database connection failure:** check `DATABASE_URL`, database permissions and availability. Inside Docker the database hostname is `db`; outside Docker use its real address.
- **No charts:** register/login and create predictions. Analytics only shows your saved records, and the selected date range may exclude old records.
- **Invalid CSV:** use UTF-8 and the sample headers. Duplicate, missing, extra or malformed columns are rejected. Empty files and nonfinite values are invalid. To process larger datasets, split them into files with at most 1,000 customers each.
- **Poor test performance:** the supplied independent test dataset has substantially lower measured accuracy. This is shown openly; do not substitute the notebook's validation score as production performance.
- **Production redirects or secure cookies on local HTTP:** use the documented development configuration for local HTTP, or deploy the HTTPS override with a valid certificate.
- **Linux shell fails to execute entrypoint:** preserve LF line endings for `backend/entrypoint.sh`; `.gitattributes` enforces this.
- **Port already in use:** stop the server occupying 8000 or 5173 before automatic browser tests. Normal development may use another Vite port, but add its origin to the environment configuration.

## Verification record

See [docs/VERIFICATION.md](docs/VERIFICATION.md) for the actual checks performed in the build environment and any remaining infrastructure limitations. Docker and PostgreSQL must be independently exercised where those runtimes are installed.
