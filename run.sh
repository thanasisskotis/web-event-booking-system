#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# All-in-one local launcher (WSL). Idempotent: sets up whatever is missing
# (Postgres role/DB/schema, Python venv, frontend deps), then starts backend
# + frontend. Safe to re-run — it won't wipe an existing database.
#
#   ./run.sh
#
# Optional local HTTPS (self-signed cert), per README:
#   HTTPS=true ./run.sh
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

HTTPS="${HTTPS:-false}"
CERT_DIR="$ROOT/certs"
KEY_FILE="$CERT_DIR/key.pem"
CERT_FILE="$CERT_DIR/cert.pem"

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

# --- 6. HTTPS certs (only if requested) -------------------------------------
UVICORN_SSL_ARGS=()
if [ "$HTTPS" = "true" ]; then
  if [ ! -f "$KEY_FILE" ] || [ ! -f "$CERT_FILE" ]; then
    echo " Generating self-signed TLS cert ..."
    "$ROOT/scripts/generate_certs.sh"
  fi
  UVICORN_SSL_ARGS=(--ssl-keyfile="$KEY_FILE" --ssl-certfile="$CERT_FILE")

  # Ensure frontend/.env has VITE_HTTPS=true (Vite reads certs from ../certs itself)
  touch "$ROOT/frontend/.env"
  if grep -q "^VITE_HTTPS=" "$ROOT/frontend/.env" 2>/dev/null; then
    sed -i "s/^VITE_HTTPS=.*/VITE_HTTPS=true/" "$ROOT/frontend/.env"
  else
    echo "VITE_HTTPS=true" >> "$ROOT/frontend/.env"
  fi
else
  # Make sure a previous HTTPS run doesn't linger and force HTTPS on the frontend
  if [ -f "$ROOT/frontend/.env" ] && grep -q "^VITE_HTTPS=" "$ROOT/frontend/.env" 2>/dev/null; then
    sed -i "s/^VITE_HTTPS=.*/VITE_HTTPS=false/" "$ROOT/frontend/.env"
  fi
fi

# --- 7. Backend (FastAPI, background) --------------------------------------
BACKEND_SCHEME="http"; [ "$HTTPS" = "true" ] && BACKEND_SCHEME="https"
echo " Backend  -> ${BACKEND_SCHEME}://localhost:8000"
"$ROOT/.venv/bin/uvicorn" app.main:app --port 8000 "${UVICORN_SSL_ARGS[@]}" &
BACKEND_PID=$!
trap 'echo; echo " Stopping backend"; kill "$BACKEND_PID" 2>/dev/null || true' EXIT INT TERM

# --- 8. Frontend (Vite, foreground) ----------------------------------------
FRONTEND_SCHEME="http"; [ "$HTTPS" = "true" ] && FRONTEND_SCHEME="https"
echo " Frontend -> ${FRONTEND_SCHEME}://localhost:5173   (Ctrl+C stops both)"
cd "$ROOT/frontend"
npm run dev
