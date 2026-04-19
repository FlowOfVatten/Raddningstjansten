#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CACHE_DIR="${ROOT_DIR}/.cache/ul-gtfs"
ZIP_PATH="${CACHE_DIR}/ul.zip"
EXTRACT_DIR="${CACHE_DIR}/extracted"

if [[ -z "${TRAFIKLAB_STATIC_KEY:-}" ]]; then
  echo "TRAFIKLAB_STATIC_KEY is not set; skipping UL static network generation."
  exit 0
fi

mkdir -p "${CACHE_DIR}"
rm -rf "${EXTRACT_DIR}"

echo "Downloading UL static GTFS..."
curl --fail --location --silent --show-error \
  "https://opendata.samtrafiken.se/gtfs/ul/ul.zip?key=${TRAFIKLAB_STATIC_KEY}" \
  --output "${ZIP_PATH}"

echo "Extracting UL static GTFS..."
unzip -oq "${ZIP_PATH}" -d "${EXTRACT_DIR}"

export GTFS_STATIC_DIR="${EXTRACT_DIR}"
export STATIC_GTFS_LINES="${STATIC_GTFS_LINES:-120,125}"

echo "Generating network for lines ${STATIC_GTFS_LINES}..."
npm run build:ul-network