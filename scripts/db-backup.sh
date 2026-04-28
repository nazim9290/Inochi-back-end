#!/usr/bin/env bash
# =============================================================================
# EN: Daily PostgreSQL backup for the Inochi production DB.
#     - Reads DATABASE_URL from /home/inochi/back-end/.env (single source).
#     - Writes a gzipped dump to /home/inochi/db-backups/YYYY-MM-DD-HHMM.sql.gz
#     - Keeps only the last 14 daily backups (rolling window).
#     - On failure (pg_dump exit code != 0 OR resulting file < 1 KB), writes
#       a marker file the uptime check picks up + emails admin.
#     - All output appended to /home/inochi/logs/db-backup.log so problems
#       are visible later.
#
# BN: Inochi production DB-এর daily PostgreSQL backup।
#     - DATABASE_URL /home/inochi/back-end/.env থেকে পড়ে (single source)।
#     - /home/inochi/db-backups/YYYY-MM-DD-HHMM.sql.gz তে gzipped dump লেখে।
#     - শুধু সর্বশেষ ১৪টা daily backup রাখে (rolling window)।
#     - Failure হলে (pg_dump exit code != 0 OR file 1 KB-এর কম) marker file
#       লেখে যেটা uptime check পড়ে + admin-কে email।
#     - সব output /home/inochi/logs/db-backup.log-এ append, পরে problem দেখা যায়।
# =============================================================================

set -uo pipefail

ENV_FILE="/home/inochi/back-end/.env"
BACKUP_DIR="/home/inochi/db-backups"
LOG_FILE="/home/inochi/logs/db-backup.log"
MARKER_FILE="/home/inochi/logs/db-backup.fail"
RETENTION_DAYS=14
MIN_SIZE_BYTES=1024  # below this we treat the dump as broken

mkdir -p "$BACKUP_DIR" "$(dirname "$LOG_FILE")"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG_FILE"
}

fail() {
  log "FAIL: $*"
  echo "$(date -Is) $*" > "$MARKER_FILE"
  exit 1
}

# EN: Load DATABASE_URL from the .env file without polluting the environment.
# BN: .env থেকে DATABASE_URL পড়ি — environment pollute না করেই।
if [ ! -f "$ENV_FILE" ]; then
  fail "env file not found: $ENV_FILE"
fi
DATABASE_URL=$(grep -E '^DATABASE_URL=' "$ENV_FILE" | head -1 | cut -d= -f2-)
if [ -z "$DATABASE_URL" ]; then
  fail "DATABASE_URL missing from $ENV_FILE"
fi

STAMP=$(date '+%Y-%m-%d-%H%M')
OUT_FILE="$BACKUP_DIR/inochi-$STAMP.sql.gz"

log "starting backup → $OUT_FILE"

# EN: pg_dump → gzip in a pipe; bail on either step failing.
# BN: pg_dump → gzip pipe-এ; যেকোনো step fail করলে bail।
if ! pg_dump --no-owner --clean --if-exists "$DATABASE_URL" 2>>"$LOG_FILE" | gzip -9 > "$OUT_FILE" 2>>"$LOG_FILE"; then
  rm -f "$OUT_FILE"
  fail "pg_dump pipeline failed (see log above)"
fi

# EN: Sanity check the file size — a 0-byte gzip means the dump produced nothing.
# BN: File size sanity check — 0-byte gzip মানে dump কিছু produce করেনি।
SIZE=$(stat -c %s "$OUT_FILE" 2>/dev/null || echo 0)
if [ "$SIZE" -lt "$MIN_SIZE_BYTES" ]; then
  rm -f "$OUT_FILE"
  fail "backup file too small ($SIZE bytes) — likely empty"
fi

log "OK: $(du -h "$OUT_FILE" | cut -f1) saved"

# EN: Trim old backups. Use find -mtime so the rolling window matches mtime,
#     not filename — robust if the server clock or filename format changes.
# BN: পুরাতন backup মুছি। find -mtime ব্যবহার — rolling window mtime-এর সাথে
#     match করে, filename-এর সাথে না। Server clock বা filename format
#     বদলালেও safe।
find "$BACKUP_DIR" -maxdepth 1 -name 'inochi-*.sql.gz' -mtime +$RETENTION_DAYS -delete 2>>"$LOG_FILE"
log "retention sweep done (kept last $RETENTION_DAYS days)"

# EN: Clear the failure marker if it was set by a previous run — we recovered.
# BN: Previous run-এ marker সেট থাকলে clear — আমরা recover করেছি।
rm -f "$MARKER_FILE"

exit 0
