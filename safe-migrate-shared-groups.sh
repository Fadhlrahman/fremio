#!/bin/bash

# Safest path to enable Group Share links:
# 1) Backup PostgreSQL DB
# 2) Apply ONLY additive migrations for shared_groups
# This does NOT touch membership/payment tables.

set -euo pipefail

PROD_HOST="${PROD_HOST:-api.fremio.id}"
PROD_USER="${PROD_USER:-root}"
PM2_APP_NAME="${PM2_APP_NAME:-fremio-api}"
BACKEND_FALLBACK_DIR="${BACKEND_FALLBACK_DIR:-/var/www/fremio-backend}"

echo "🔐 Connecting to ${PROD_USER}@${PROD_HOST}..."

echo "🧭 Detecting backend directory from PM2 (${PM2_APP_NAME})..."
BACKEND_CWD=$(ssh -o StrictHostKeyChecking=no "${PROD_USER}@${PROD_HOST}" "node -e 'const {execSync}=require(\"child_process\"); const list=JSON.parse(execSync(\"pm2 jlist\",{encoding:\"utf8\"})||\"[]\"); const p=list.find(x=>x.name===\"${PM2_APP_NAME}\"); process.stdout.write((p&&p.pm2_env&&p.pm2_env.pm_cwd)||\"\");'" | tr -d '\r')

if [ -z "${BACKEND_CWD}" ]; then
  BACKEND_CWD="$BACKEND_FALLBACK_DIR"
  echo "⚠️  PM2 cwd not found; using fallback: ${BACKEND_CWD}"
else
  echo "✅ Using backend dir: ${BACKEND_CWD}"
fi

echo "🗄️  Running SAFE backup + shared_groups migration on server..."
ssh -o StrictHostKeyChecking=no "${PROD_USER}@${PROD_HOST}" <<'ENDSSH'
set -euo pipefail

# Recompute backend cwd again on server side.
# NOTE: do NOT rely on env injection; embed the PM2 app name directly.
PM2_APP_NAME="${PM2_APP_NAME:-fremio-api}"
BACKEND_FALLBACK_DIR="${BACKEND_FALLBACK_DIR:-/var/www/fremio-backend}"
BACKEND_CWD=$(node -e "const {execSync}=require('child_process'); const list=JSON.parse(execSync('pm2 jlist',{encoding:'utf8'})||'[]'); const p=list.find(x=>x.name==='${PM2_APP_NAME}'); console.log(p?.pm2_env?.pm_cwd||'');" | tr -d '\r')
if [ -z "${BACKEND_CWD}" ]; then
  BACKEND_CWD="$BACKEND_FALLBACK_DIR"
fi
echo "📁 Backend dir on server: ${BACKEND_CWD}"
cd "$BACKEND_CWD"

# Load env vars if present (does not print secrets)
if [ -f ".env" ]; then
  set -a
  . ./.env
  set +a
fi

# Support both DB_* and PG* styles
DB_HOST_VAL="${DB_HOST:-${PGHOST:-localhost}}"
DB_PORT_VAL="${DB_PORT:-${PGPORT:-5432}}"
DB_NAME_VAL="${DB_NAME:-${PGDATABASE:-fremio}}"
DB_USER_VAL="${DB_USER:-${PGUSER:-fremio_user}}"
DB_PASS_VAL="${DB_PASSWORD:-${PGPASSWORD:-}}"

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "❌ pg_dump not installed on server. Install it (postgresql-client) or run backup via your DB provider." >&2
  exit 1
fi
if ! command -v psql >/dev/null 2>&1; then
  echo "❌ psql not installed on server. Install it (postgresql-client) to run migrations." >&2
  exit 1
fi
if [ -z "${DB_PASS_VAL}" ]; then
  echo "❌ DB password not found. Ensure backend .env has DB_PASSWORD (or export PGPASSWORD)." >&2
  exit 1
fi

mkdir -p backups
STAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backups/pre_shared_groups_${STAMP}.dump"

echo "💾 Creating backup: ${BACKUP_FILE}"
PGPASSWORD="$DB_PASS_VAL" pg_dump -h "$DB_HOST_VAL" -p "$DB_PORT_VAL" -U "$DB_USER_VAL" -Fc -f "$BACKUP_FILE" "$DB_NAME_VAL"
echo "✅ Backup created"

# Apply ONLY the two additive shared_groups migrations
MIG1="migrations/add_shared_groups_table.sql"
MIG2="migrations/add_shared_groups_preferences_column.sql"

for MIG in "$MIG1" "$MIG2"; do
  if [ ! -f "$MIG" ]; then
    echo "❌ Migration file missing: $BACKEND_CWD/$MIG" >&2
    echo "🔎 Listing migrations directory (if any):" >&2
    ls -la "$(dirname "$MIG")" 2>/dev/null || true
    exit 1
  fi
  echo "🛠️  Applying migration: $MIG"
  PGPASSWORD="$DB_PASS_VAL" psql -h "$DB_HOST_VAL" -p "$DB_PORT_VAL" -U "$DB_USER_VAL" -d "$DB_NAME_VAL" -v ON_ERROR_STOP=1 -f "$MIG"
  echo "✅ Applied: $MIG"
done

echo "🎉 Done. shared_groups schema should be ready."
ENDSSH

echo "✅ SAFE migration complete. Now retry Share Group on /create."
