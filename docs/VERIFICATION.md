# Verification record

Verified on 24 October 2026 in the provided Windows workspace. All generated secrets are kept in ignored `.env`; this report contains no credentials.

## User story

A visitor registers, enters customer details in React, submits through Axios with a session and CSRF header, receives a probability from the real saved Scikit-learn pipeline, and reviews the persisted result. The same user uploads a CSV, downloads owned results, and sees analytics built from those records.

| Boundary | Result | Evidence |
| --- | --- | --- |
| Notebook → training | Passed | Both original CSV paths exist; model trained on 352,665 records, evaluated on 88,167 validation and 64,374 independent test records. |
| Artifact → predictor | Passed | Real Joblib bundle, fixed feature order, training-only fitted scaler/encoder, correct churn class probability, cached loading. ML tests pass. |
| Browser → auth API | Passed | Chromium registration returned 201; session established; anonymous profile denied with 403; logout returned 200 and private routes redirected to login. |
| Form → prediction API | Passed | Real customer row submitted; `POST /api/predict/` returned 201; UI probability matched the API response. |
| API → database → history | Passed locally | SQLite persisted prediction and immutable snapshot; history/detail returned the stored result. Cross-user access tests pass. |
| CSV → batch → export | Passed | CSV preview rendered; batch returned 201; authenticated export returned 200 and a downloadable CSV. Invalid-row and file-limit tests pass. |
| Saved records → dashboard | Passed | Backend totals and charts reflected the signed-in user's two assessment events for one distinct customer. No analytics were seeded. |
| Mobile navigation and layout | Passed | Chromium 390 × 844 viewport, drawer navigation, form, logout, and overflow check passed. Mobile landing page also passed. |
| Browser runtime | Passed | No page errors during the full workflow. |

## Automated checks

- `python manage.py test core.tests --verbosity 1`: **26 passed**, using the bundled real model and an isolated test database.
- `npm test`: **8 passed** with Vitest and Testing Library.
- `npm run test:e2e`: **2 passed** in Chromium; final run completed with exit code 0 in 14.2 seconds.
- `npm run build`: passed; route-specific pages, including the Recharts dashboard, are split into separate production chunks.
- `python manage.py spectacular --file schema.yml --validate --fail-on-warn`: passed with exit code 0.
- `python manage.py makemigrations --check --dry-run`: `No changes detected`.
- `python manage.py check --deploy` with production settings: `System check identified no issues (0 silenced)`.
- Docker Compose and CI configuration YAML parse successfully. Dockerfiles, nginx routes, TLS configuration, startup migrations, cache creation and database initialization were reviewed.

The first browser run caught an ambiguous input name: “Age” also matched the text of “Usage frequency.” Inputs now have precise accessible names and separate described help text. Visual review led to route scroll reset, deterministic chart rendering, clearer text, hidden-drawer focus protection and modal focus handling. The final browser run passed after these fixes.

Desktop dashboard and prediction screenshots, a mobile prediction screenshot, and a mobile landing screenshot are generated under `frontend/test-results/` by Playwright. These are runtime test artifacts and are not committed. The test database is separate from `backend/db.sqlite3`.

## Infrastructure verification limits

Docker, PostgreSQL server/client executables, and nginx were not installed in the execution environment. Therefore container image builds, container health transitions, live PostgreSQL persistence, TLS termination and the complete Compose stack were **not executed here**. A production settings check validates configuration, not a live database connection or deployment. The supplied PostgreSQL CI job has not been run remotely in this session.

The default browser tests and backend tests were executed against SQLite locally. Docker Compose selects PostgreSQL, and CI is configured to run backend and browser tests against PostgreSQL. Run those checks on a machine with Docker before treating the infrastructure as verified.

## Remaining model limitation

Measured independent test accuracy is **58.69%**, compared with **85.04%** validation accuracy without CustomerID. This result is visible in the model page and README. The application works end to end locally; the supplied algorithm still requires representative evaluation and probability calibration before business reliance.
