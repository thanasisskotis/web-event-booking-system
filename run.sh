#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# All-in-one local launcher (WSL). Idempotent: sets up whatever is missing
# (Postgres role/DB/schema, Python venv, frontend deps), then starts backend
# + frontend. Safe to re-run — it won't wipe an existing database.
#
#   ./run.sh
#
# Ctrl+C stops backend + frontend (Postgres stays up).
# ---------------------------------------------------------------------------
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

DB_NAME="eventapp_db"
DB_USER="tass"
DB_PASS="tass"
export DATABASE_URL="postgresql+psycopg2://${DB_USER}:${DB_PASS}@localhost/${DB_NAME}"

# --- 1. PostgreSQL up (system cluster, :5432) ------------------------------
echo " PostgreSQL ..."
sudo service postgresql start

# --- 2. Role (create if missing) -------------------------------------------
if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" 2>/dev/null | grep -q 1; then
  echo " Creating role ${DB_USER} ..."
  sudo -u postgres psql -c "CREATE ROLE ${DB_USER} WITH LOGIN SUPERUSER PASSWORD '${DB_PASS}';"
fi

# --- 3. Database + schema (only if the DB doesn't exist yet) ----------------
if PGPASSWORD="$DB_PASS" psql -h localhost -U "$DB_USER" -lqt 2>/dev/null | cut -d'|' -f1 | grep -qw "$DB_NAME"; then
  echo " Database ${DB_NAME} exists (schema not reloaded)"
else
  echo " Creating ${DB_NAME} + loading schema.sql ..."
  PGPASSWORD="$DB_PASS" createdb -h localhost -U "$DB_USER" "$DB_NAME"
  PGPASSWORD="$DB_PASS" psql -h localhost -U "$DB_USER" -d "$DB_NAME" -f "$ROOT/schema.sql"
fi

# --- 4. Python venv + backend deps (create/install if missing) -------------
if [ ! -x "$ROOT/.venv/bin/uvicorn" ]; then
  echo " Creating venv + installing backend deps ..."
  python3 -m venv "$ROOT/.venv"
  "$ROOT/.venv/bin/pip" install -q -r "$ROOT/requirements.txt"
fi

# --- 5. Frontend deps (install if missing) ---------------------------------
if [ ! -d "$ROOT/frontend/node_modules" ]; then
  echo " Installing frontend deps ..."
  ( cd "$ROOT/frontend" && npm install )
fi

# --- 6. Backend (FastAPI, background) --------------------------------------
echo " Backend  -> http://localhost:8000"
"$ROOT/.venv/bin/uvicorn" app.main:app --port 8000 &
BACKEND_PID=$!
trap 'echo; echo " Stopping backend"; kill "$BACKEND_PID" 2>/dev/null || true' EXIT INT TERM

# --- 7. Frontend (Vite, foreground) ----------------------------------------
echo " Frontend -> http://localhost:5173   (Ctrl+C stops both)"
cd "$ROOT/frontend"
npm run dev
