#!/bin/sh
set -eu
# PostgreSQL runs this once for a new volume. The web application never uses the superuser.
psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --set=app_password="$APP_DB_PASSWORD" <<'SQL'
CREATE ROLE churn LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD :'app_password';
ALTER DATABASE churn OWNER TO churn;
GRANT USAGE, CREATE ON SCHEMA public TO churn;
SQL
