#!/bin/sh
# Daily database backup. Add to crontab on the server:
#   0 2 * * * cd /opt/pharmalive && ./scripts/backup.sh
set -e
mkdir -p backups
docker compose exec -T db pg_dump -U pharmalive pharmalive | gzip > "backups/pharmalive-$(date +%F).sql.gz"
# keep the last 30 days
find backups -name '*.sql.gz' -mtime +30 -delete
