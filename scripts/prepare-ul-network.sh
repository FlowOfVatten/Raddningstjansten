#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CACHE_DIR="${ROOT_DIR}/.cache/ul-gtfs"
ZIP_PATH="${CACHE_DIR}/ul.zip"
EXTRACT_DIR="${CACHE_DIR}/extracted"

API_KEY="${TRAFIKLAB_STATIC_KEY:-${TRAFIKLAB_KEY:-${TRAFIKLAB_RT_KEY:-}}}"

if [[ -z "${API_KEY}" ]]; then
  echo "No Trafiklab key found (TRAFIKLAB_STATIC_KEY/TRAFIKLAB_KEY/TRAFIKLAB_RT_KEY); skipping UL static network generation."
  exit 0
fi

mkdir -p "${CACHE_DIR}"
rm -rf "${EXTRACT_DIR}"

echo "Downloading UL static GTFS..."
HTTP_CODE="$({
  curl --location --silent --show-error \
    --retry 2 \
    --retry-delay 1 \
    --user-agent "alunda-busspuls-deploy/1.0" \
    --header "Accept: application/zip, application/octet-stream, */*" \
    --write-out "%{http_code}" \
    --output "${ZIP_PATH}" \
    "https://opendata.samtrafiken.se/gtfs/ul/ul.zip?key=${API_KEY}" \
    || true
}" )"

if [[ "${HTTP_CODE}" != "200" ]]; then
  echo "UL static GTFS download skipped (HTTP ${HTTP_CODE})."
  echo "Likely causes: invalid key for static feed or temporary upstream rejection."
  echo "Continuing deploy with repository network.json."
  exit 0
fi

echo "Extracting UL static GTFS..."
if ! unzip -oq "${ZIP_PATH}" -d "${EXTRACT_DIR}"; then
  echo "Failed to extract UL GTFS archive; continuing deploy with repository network.json."
  exit 0
fi

export GTFS_STATIC_DIR="${EXTRACT_DIR}"
export STATIC_GTFS_LINES="${STATIC_GTFS_LINES:-120,125}"

echo "Generating network for lines ${STATIC_GTFS_LINES}..."
npm run build:ul-network