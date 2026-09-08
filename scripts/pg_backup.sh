#!/bin/bash
# Daily production database backup. Replaces the old ad-hoc SQLite file copies.
#
# Cron (on the server, as root):
#   0 3 * * * /opt/minimart/scripts/pg_backup.sh >> /var/log/minimart-backup.log 2>&1
set -euo pipefail

cd /opt/minimart

BACKUP_DIR=/opt/minimart/backups
RETENTION_DAYS=14
STAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

# -Fc = custom format (compressed, restorable with pg_restore)
docker compose exec -T postgres pg_dump -U minimart -Fc minimart \
    > "$BACKUP_DIR/minimart_${STAMP}.dump"

echo "$(date -Iseconds) wrote minimart_${STAMP}.dump ($(du -h "$BACKUP_DIR/minimart_${STAMP}.dump" | cut -f1))"

# Prune old dumps
find "$BACKUP_DIR" -name 'minimart_*.dump' -mtime "+${RETENTION_DAYS}" -delete
