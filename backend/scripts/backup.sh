#!/bin/bash
set -euo pipefail

if [ -z "${MONGO_URI:-}" ]; then
  echo "MONGO_URI is required"
  exit 1
fi

DATE=$(date +"%Y%m%d_%H%M%S")
mkdir -p backups
mongodump --uri="$MONGO_URI" --archive="backups/lankaserve_$DATE.gz" --gzip

echo "Backup created: backups/lankaserve_$DATE.gz"
