#!/bin/sh
# Fail if the public Sanity API can read any order documents.
# No credentials. Safe to run before deploy and in the daily health job.

set -eu

PROJECT="${SANITY_PROJECT_ID:-6td8xalf}"
DATASET="${SANITY_DATASET:-production}"
URL="https://${PROJECT}.api.sanity.io/v2024-01-01/data/query/${DATASET}?query=count(*%5B_type==%22order%22%5D)"

RESP=$(curl -sS --globoff "$URL")
COUNT=$(printf '%s' "$RESP" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("result"))')

if [ "$COUNT" != "0" ]; then
  echo "FAIL: public dataset $PROJECT/$DATASET exposes $COUNT order document(s)"
  exit 1
fi

echo "OK: public $PROJECT/$DATASET order count is 0"
exit 0
