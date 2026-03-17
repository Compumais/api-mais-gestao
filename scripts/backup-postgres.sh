#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="/opt/backups/mais-gestao"
DATE="$(date +%Y%m%d-%H%M%S)"
FILE="${BACKUP_DIR}/backup-${DATE}.sql.gz"

POSTGRES_HOST="${POSTGRES_HOST:-127.0.0.1}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_USER="${POSTGRES_USER:-mais_gestao}"
POSTGRES_DB="${POSTGRES_DB:-mais_gestao}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-}"

mkdir -p "${BACKUP_DIR}"

if [[ -z "${POSTGRES_PASSWORD}" ]]; then
  echo "POSTGRES_PASSWORD não definido. Exporte a variável antes de executar."
  exit 1
fi

export PGPASSWORD="${POSTGRES_PASSWORD}"
pg_dump \
  --host "${POSTGRES_HOST}" \
  --port "${POSTGRES_PORT}" \
  --username "${POSTGRES_USER}" \
  --dbname "${POSTGRES_DB}" \
  --format=plain \
  --no-owner \
  --no-privileges \
  | gzip > "${FILE}"
unset PGPASSWORD

find "${BACKUP_DIR}" -type f -name "backup-*.sql.gz" -mtime +7 -delete

echo "Backup concluído: ${FILE}"
