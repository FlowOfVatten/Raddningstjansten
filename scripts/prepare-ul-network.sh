#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CACHE_DIR="${ROOT_DIR}/.cache/ul-gtfs"
ZIP_PATH="${CACHE_DIR}/ul.zip"
EXTRACT_DIR="${CACHE_DIR}/extracted"
LOCAL_ZIP_PATH="${ROOT_DIR}/server/data/ul.zip"

API_KEY="${TRAFIKLAB_STATIC_KEY:-${TRAFIKLAB_KEY:-${TRAFIKLAB_RT_KEY:-}}}"

mkdir -p "${CACHE_DIR}"
rm -rf "${EXTRACT_DIR}"

if [[ -f "${LOCAL_ZIP_PATH}" ]]; then
  echo "Using repository UL zip: ${LOCAL_ZIP_PATH}"
  cp "${LOCAL_ZIP_PATH}" "${ZIP_PATH}"
else
  if [[ -z "${API_KEY}" ]]; then
    echo "No local UL zip and no Trafiklab key found; skipping UL static network generation."
    exit 0
  fi

  echo "Downloading UL static GTFS..."
  HTTP_CODE="$(
    curl --location --silent --show-error \
      --retry 2 \
      --retry-delay 1 \
      --user-agent "alunda-busspuls-deploy/1.0" \
      --header "Accept: application/zip, application/octet-stream, */*" \
      --write-out "%{http_code}" \
      --output "${ZIP_PATH}" \
      "https://opendata.samtrafiken.se/gtfs/ul/ul.zip?key=${API_KEY}" \
      || true
  )"

  if [[ "${HTTP_CODE}" != "200" ]]; then
    echo "UL static GTFS download skipped (HTTP ${HTTP_CODE})."
    echo "Likely causes: invalid key for static feed or temporary upstream rejection."
    echo "Continuing deploy with repository network.json."
    exit 0
  fi
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