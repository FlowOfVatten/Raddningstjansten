const SCB_WFS_URL = "https://geodata.scb.se/geoserver/stat/wfs";
const SCB_LAYER_NAME_OVERRIDE = "";

// Azure Maps is configured in config.js
const AZURE_MAPS_ISOCHRONE_URL = "https://atlas.microsoft.com/route/range/json";
const AZURE_MAPS_TILE_URL = "https://atlas.microsoft.com/map/tile?api-version=2024-04-01&tilesetId=microsoft.base.road&zoom={z}&x={x}&y={y}&tileSize=256&language=sv-SE&view=Auto&subscription-key=";
const MSB_FEATURE_SERVICE_URL = "https://gisapp.msb.se/arcgis/rest/services/Raddningstjanst/Km2_statistik_2024/FeatureServer/0";

const MSB_OVERLAY_CONFIGS = {
  2: {
    id: 2,
    title: "Karta 2: Olyckor/tillbud per km2",
    field: "Antal_OoT",
    where: "Antal_OoT > 0",
    unit: "antal/km2",
    breaks: [1, 3, 5, 10],
    colors: ["#fff3bf", "#ffec99", "#f59f00", "#f76707", "#d9480f"],
  },
  3: {
    id: 3,
    title: "Karta 3: Brand i byggnad per km2",
    field: "Antal_BIB",
    where: "Antal_BIB > 0",
    unit: "antal/km2",
    breaks: [1, 5, 10, 20],
    colors: ["#ffe3e3", "#ffc9c9", "#ff8787", "#fa5252", "#c92a2a"],
  },
  4: {
    id: 4,
    title: "Karta 4: Trafikolyckor per km2",
    field: "Antal_tr",
    where: "Antal_tr > 0",
    unit: "antal/km2",
    breaks: [5, 10, 25, 50],
    colors: ["#f3f0ff", "#e5dbff", "#b197fc", "#845ef7", "#5f3dc4"],
  },
  5: {
    id: 5,
    title: "Karta 5: Drunkningsolyckor per km2",
    field: "Antal_dr",
    where: "Antal_dr > 0",
    unit: "antal/km2",
    breaks: [1, 3, 5, 10],
    colors: ["#e7f5ff", "#d0ebff", "#74c0fc", "#339af0", "#1864ab"],
  },
  6: {
    id: 6,
    title: "Karta 6: Responstid 1:a resurs (min)",
    field: "RespM_1a",
    where: "RespM_1a > 0",
    unit: "min",
    breaks: [10, 12.5, 17.5, 20],
    colors: ["#d3f9d8", "#8ce99a", "#ffd43b", "#ffa94d", "#e03131"],
  },
  7: {
    id: 7,
    title: "Karta 7: Befolkning utan 10 min responstid",
    field: "POP",
    where: "RespM_1a > 10 AND POP > 0",
    unit: "personer/km2",
    breaks: [5, 10, 50, 100],
    colors: ["#e6fcf5", "#c3fae8", "#63e6be", "#20c997", "#0b7285"],
  },
};

const LAYER_NAME_HINTS = ["bef", "population", "deso", "regso", "ruta", "grid"];
const POP_FIELD_HINTS = [
  "bef",
  "befolkning",
  "folkmangd",
  "population",
  "tot",
  "sum",
  "antal",
  "pop",
];
const NON_POP_FIELD_HINTS = [
  "uuid",
  "objektid",
  "shape",
  "geom",
  "geometry",
  "area",
  "areal",
  "kod",
  "code",
  "nyckel",
  "lat",
  "lon",
  "latitude",
  "longitude",
  "year",
  "datum",
  "date",
  "version",
  "lopnr",
];
const NON_POP_FIELD_HINT_SET = new Set(NON_POP_FIELD_HINTS);
const MUNICIPALITY_ADMIN_LAYERS = ["stat:RegSO_2025", "stat:RegSO_2020", "stat:DeSO_2025", "stat:DeSO_2018"];
const MUNICIPALITY_BOUNDARY_CACHE_KEY = "karta-muni-bounds-v2";
const MUNICIPALITY_BOUNDARY_CACHE_TTL = 1000 * 60 * 60 * 24 * 7; // 7 days
const MUNICIPALITY_LOCAL_INDEX_URL = "data/municipality-index.json";
const MUNICIPALITY_LOCAL_BOUNDARY_DIR = "data/municipalities";
const MUNICIPALITY_LOCAL_SHP_URL = "data/shape_svenska_260225/kommun/Kommun_Sweref99TM.shp";
const MUNICIPALITY_LOCAL_DBF_URL = "data/shape_svenska_260225/kommun/Kommun_Sweref99TM.dbf";
const MUNICIPALITY_ARCGIS_LAYER_URL = "https://services9.arcgis.com/BH6j7VrWdIXhhNYw/arcgis/rest/services/Kommungränser_Lantmäteriet/FeatureServer/0";
const WILDLIFE_CSV_URL = "data/Rådata 2020-01-01 - 2024-02-29.csv";
const LOCAL_CACHE_PREFIX = "karta-msb-cache-v1";
const LOCAL_CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 14;

// Cache expensive municipality lookups and comparisons during the session.
const municipalityGeometryCache = new Map();
const municipalityComparisonCache = new Map();
const municipalityMsbBaselineCache = new Map();
const municipalityPopulationBaselineCache = new Map();

function keyTokens(key) {
  return String(key)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeMunicipalityCode(value) {
  if (value === null || value === undefined) return "";
  const text = String(value).trim();
  if (!text) return "";
  const numeric = safeParseFloat(text);
  if (numeric !== null && Number.isInteger(numeric)) {
    return String(Math.trunc(numeric)).padStart(4, "0");
  }
  return text;
}

function detectMunicipalityNameField(features, excludedKeys = []) {
  const excluded = new Set(excludedKeys.filter(Boolean));
  const keyStats = new Map();

  for (const feature of features) {
    const props = feature?.properties || {};
    for (const [key, value] of Object.entries(props)) {
      if (excluded.has(key)) continue;

      const text = String(value ?? "").trim();
      if (!text) continue;

      if (!keyStats.has(key)) {
        keyStats.set(key, {
          count: 0,
          textCount: 0,
          avgLengthSum: 0,
          distinctValues: new Set(),
        });
      }

      const stat = keyStats.get(key);
      stat.count += 1;

      const numeric = safeParseFloat(text);
      if (numeric === null) {
        stat.textCount += 1;
        stat.avgLengthSum += text.length;
      }

      stat.distinctValues.add(text);
    }
  }

  let bestField = null;
  let bestScore = -Infinity;

  for (const [key, stat] of keyStats.entries()) {
    if (stat.count < 5) continue;

    const lc = key.toLowerCase();
    let score = 0;

    if (lc.includes("kommunnamn") || lc.includes("knnamn") || lc.includes("namn")) score += 18;
    if (lc.includes("kommun") || lc.includes("muni")) score += 8;
    if (lc.includes("kod") || lc.includes("id")) score -= 10;

    const textRatio = stat.textCount / stat.count;
    score += textRatio * 20;

    const distinct = stat.distinctValues.size;
    if (distinct > 40 && distinct < 400) score += 8;
    if (distinct <= 3) score -= 20;

    const avgTextLength = stat.textCount > 0 ? stat.avgLengthSum / stat.textCount : 0;
    if (avgTextLength >= 4 && avgTextLength <= 22) score += 5;

    if (score > bestScore) {
      bestScore = score;
      bestField = key;
    }
  }

  return bestField;
}

function scoreMunicipalityNameValue(value) {
  const text = String(value ?? "").trim();
  if (!text) return -100;

  const lc = text.toLowerCase();
  let score = 0;

  if (/^se_[a-z0-9_]+$/i.test(text)) score -= 140;
  if (lc.includes("crs") || lc.includes("res") || lc.includes("grid") || lc.includes("ruta")) score -= 80;
  if (text.includes("_")) score -= 30;

  const digitCount = (text.match(/\d/g) || []).length;
  if (digitCount > 0) score -= Math.min(90, digitCount * 8);

  if (/[a-zA-ZåäöÅÄÖ]/.test(text)) score += 20;
  if (text.includes(" ")) score += 8;
  if (/^[A-Za-zÅÄÖåäö][A-Za-zÅÄÖåäö\-\s]{1,40}$/.test(text)) score += 55;
  if (text.length > 40) score -= 40;

  return score;
}

function extractBestMunicipalityNameFromProps(props, excludedKeys = []) {
  const excluded = new Set(excludedKeys.filter(Boolean));
  let bestName = "";
  let bestScore = -Infinity;

  for (const [key, value] of Object.entries(props || {})) {
    if (excluded.has(key)) continue;

    const text = String(value ?? "").trim();
    if (!text) continue;
    if (safeParseFloat(text) !== null) continue;

    const keyLc = String(key).toLowerCase();
    let score = scoreMunicipalityNameValue(text);

    if (keyLc.includes("kommunnamn") || keyLc.includes("knnamn")) score += 35;
    else if (keyLc.includes("namn") || keyLc.includes("name")) score += 12;
    if (keyLc.includes("id") || keyLc.includes("uuid") || keyLc.includes("code") || keyLc.includes("kod")) score -= 20;

    if (score > bestScore) {
      bestScore = score;
      bestName = text;
    }
  }

  return bestScore >= 5 ? bestName : "";
}

function estimateMunicipalityNameFieldQuality(features, codeField, nameField) {
  if (!Array.isArray(features) || !features.length || !codeField || !nameField) return -100;

  const codeNameCounts = new Map();
  let seen = 0;

  for (const feature of features) {
    if (seen >= 5000) break;
    const props = feature?.properties || {};
    const code = normalizeMunicipalityCode(props[codeField]);
    if (!code) continue;

    const name = String(props[nameField] ?? "").trim();
    if (!name) continue;

    if (!codeNameCounts.has(code)) {
      codeNameCounts.set(code, new Map());
    }
    const nameCounts = codeNameCounts.get(code);
    nameCounts.set(name, (nameCounts.get(name) || 0) + 1);
    seen += 1;
  }

  if (!codeNameCounts.size) return -100;

  let weightedScoreSum = 0;
  let weightedCount = 0;

  for (const nameCounts of codeNameCounts.values()) {
    for (const [name, count] of nameCounts.entries()) {
      weightedScoreSum += scoreMunicipalityNameValue(name) * count;
      weightedCount += count;
    }
  }

  if (!weightedCount) return -100;
  return weightedScoreSum / weightedCount;
}

function detectMunicipalityNameFieldForCode(features, codeField, excludedKeys = []) {
  const excluded = new Set([codeField, ...excludedKeys].filter(Boolean));
  const fieldCodeNameCounts = new Map();

  for (const feature of features) {
    const props = feature?.properties || {};
    const code = normalizeMunicipalityCode(props[codeField]);
    if (!code) continue;

    for (const [key, value] of Object.entries(props)) {
      if (excluded.has(key)) continue;

      const text = String(value ?? "").trim();
      if (!text) continue;
      if (safeParseFloat(text) !== null) continue;

      if (!fieldCodeNameCounts.has(key)) {
        fieldCodeNameCounts.set(key, new Map());
      }

      const codeNameCounts = fieldCodeNameCounts.get(key);
      if (!codeNameCounts.has(code)) {
        codeNameCounts.set(code, new Map());
      }

      const nameCounts = codeNameCounts.get(code);
      nameCounts.set(text, (nameCounts.get(text) || 0) + 1);
    }
  }

  let bestField = null;
  let bestScore = -Infinity;

  for (const [field, codeNameCounts] of fieldCodeNameCounts.entries()) {
    const codeCount = codeNameCounts.size;
    if (codeCount < 100) continue;

    const fieldLc = field.toLowerCase();
    let consistentCodes = 0;
    let dominantRatioSum = 0;
    const globalNames = new Set();

    for (const nameCounts of codeNameCounts.values()) {
      let total = 0;
      let maxCount = 0;

      for (const [name, count] of nameCounts.entries()) {
        globalNames.add(name);
        total += count;
        if (count > maxCount) maxCount = count;
      }

      if (nameCounts.size === 1) consistentCodes += 1;
      if (total > 0) dominantRatioSum += maxCount / total;
    }

    const consistentRatio = consistentCodes / codeCount;
    const dominantRatioAvg = dominantRatioSum / codeCount;
    const distinctGlobal = globalNames.size;

    let score = 0;
    if (fieldLc.includes("kommunnamn") || fieldLc.includes("knnamn") || fieldLc.includes("mun_name")) score += 45;
    if (fieldLc.includes("namn") || fieldLc.includes("name")) score += 18;

    score += consistentRatio * 120;
    score += dominantRatioAvg * 80;

    if (distinctGlobal >= 250 && distinctGlobal <= 400) score += 30;
    else if (distinctGlobal >= 180 && distinctGlobal <= 500) score += 12;
    else if (distinctGlobal > 800) score -= 35;

    if (score > bestScore) {
      bestScore = score;
      bestField = field;
    }
  }

  return bestField;
}

function detectMunicipalityCodeFieldForList(features, excludedKeys = []) {
  const excluded = new Set(excludedKeys.filter(Boolean));
  const keyStats = new Map();
  const preferredCodeFieldNames = [
    "kommunkod",
    "kommun_kod",
    "komkod",
    "kom_kod",
    "knkod",
    "kn_kod",
    "municipalitycode",
    "municipality_code",
  ];

  for (const feature of features) {
    const props = feature?.properties || {};
    for (const [key, value] of Object.entries(props)) {
      if (excluded.has(key)) continue;

      const text = String(value ?? "").trim();
      if (!text) continue;

      if (!keyStats.has(key)) {
        keyStats.set(key, {
          total: 0,
          numericCount: 0,
          distinctValues: new Set(),
        });
      }

      const stat = keyStats.get(key);
      stat.total += 1;
      if (safeParseFloat(text) !== null) stat.numericCount += 1;
      stat.distinctValues.add(normalizeMunicipalityCode(text));
    }
  }

  // Hard-prioritize common municipality code keys when they exist.
  for (const key of keyStats.keys()) {
    const lc = String(key).toLowerCase();
    if (preferredCodeFieldNames.includes(lc)) return key;
  }

  for (const key of keyStats.keys()) {
    const lc = String(key).toLowerCase();
    if (preferredCodeFieldNames.some((name) => lc.includes(name))) return key;
  }

  let bestField = null;
  let bestScore = -Infinity;

  for (const [key, stat] of keyStats.entries()) {
    if (stat.total < 100) continue;
    const lc = key.toLowerCase();
    const distinct = stat.distinctValues.size;
    const numericRatio = stat.numericCount / stat.total;

    let score = 0;
    if (lc.includes("kommunkod") || lc.includes("komkod") || lc.includes("knkod") || lc.includes("kn_kod")) score += 60;
    if (lc.includes("kommun")) score += 35;
    if (lc.includes("kod") || lc.includes("code") || lc.includes("muni")) score += 20;
    if (lc.includes("lan") || lc.includes("county") || lc.includes("region")) score -= 40;

    if (numericRatio > 0.95) score += 20;
    if (distinct >= 250 && distinct <= 400) score += 40;
    else if (distinct >= 180 && distinct <= 500) score += 15;
    else if (distinct > 1000) score -= 45;
    else if (distinct < 100) score -= 20;

    if (score > bestScore) {
      bestScore = score;
      bestField = key;
    }
  }

  return bestField;
}

function chooseMunicipalityLayerName(layerNames) {
  if (!Array.isArray(layerNames) || !layerNames.length) return null;

  const ranked = [...layerNames].sort((a, b) => {
    const score = (name) => {
      const lc = String(name || "").toLowerCase();
      let s = 0;
      if (lc.includes("kommun")) s += 120;
      if (lc.includes("grans") || lc.includes("boundary")) s += 60;
      if (lc.includes("yta") || lc.includes("polygon")) s += 20;
      if (lc.includes("deso") || lc.includes("regso")) s -= 40;
      if (lc.includes("ruta") || lc.includes("grid")) s -= 90;
      return s;
    };
    return score(b) - score(a);
  });

  return ranked[0] || null;
}

function getMunicipalityLayerCandidates(layerNames) {
  if (!Array.isArray(layerNames) || !layerNames.length) return [...MUNICIPALITY_ADMIN_LAYERS];

  const score = (name) => {
    const lc = String(name || "").toLowerCase();
    let s = 0;

    if (lc.includes("kommun")) s += 250;
    if (lc.includes("grans") || lc.includes("boundary") || lc.includes("polygon") || lc.includes("yta")) s += 120;
    if (lc.includes("admin") || lc.includes("administr")) s += 70;
    if (lc.includes("regso") || lc.includes("deso")) s -= 140;
    if (lc.includes("ruta") || lc.includes("grid")) s -= 220;
    if (lc.includes("tatort") || lc.includes("sm") || lc.includes("omr")) s -= 80;

    return s;
  };

  const dynamic = [...layerNames]
    .sort((a, b) => score(b) - score(a))
    .slice(0, 15);

  const merged = [...dynamic, ...MUNICIPALITY_ADMIN_LAYERS];
  return [...new Set(merged)];
}

function countDistinctValuesForField(features, field) {
  if (!Array.isArray(features) || !field) return 0;
  const distinct = new Set();
  for (const feature of features) {
    const props = feature?.properties || {};
    const value = normalizeMunicipalityCode(props[field]);
    if (!value) continue;
    distinct.add(value);
  }
  return distinct.size;
}

function scoreMunicipalityLayerCandidate(layerName, features, codeField, nameField) {
  const distinctCodeCount = countDistinctValuesForField(features, codeField);
  const averageFeaturesPerCode = distinctCodeCount > 0 ? features.length / distinctCodeCount : Number.POSITIVE_INFINITY;
  const nameFieldQuality = estimateMunicipalityNameFieldQuality(features, codeField, nameField);

  const lc = String(layerName || "").toLowerCase();
  let score = 0;

  score += Math.max(0, 80 - Math.abs(290 - distinctCodeCount) * 0.6);
  score += Math.max(-200, 80 - averageFeaturesPerCode * 3);
  score += nameFieldQuality * 1.8;

  if (lc.includes("kommun")) score += 80;
  if (lc.includes("grans") || lc.includes("boundary") || lc.includes("polygon")) score += 50;
  if (lc.includes("regso") || lc.includes("deso")) score -= 45;
  if (lc.includes("ruta") || lc.includes("grid")) score -= 120;

  const strictMunicipalityMatch =
    distinctCodeCount >= 200 &&
    distinctCodeCount <= 400 &&
    averageFeaturesPerCode <= 30 &&
    nameFieldQuality >= 5;

  return {
    score,
    strictMunicipalityMatch,
    distinctCodeCount,
    averageFeaturesPerCode,
    nameFieldQuality,
  };
}

function approxEqualCoords(a, b) {
  return Math.abs(a[0] - b[0]) < 1e-7 && Math.abs(a[1] - b[1]) < 1e-7;
}

function assembleOsmRings(ways) {
  const rings = [];
  if (!ways.length) return rings;
  const remaining = ways.map((w) => w.slice());

  while (remaining.length > 0) {
    let ring = remaining.splice(0, 1)[0];
    let grew = true;
    while (grew && remaining.length > 0) {
      grew = false;
      for (let i = 0; i < remaining.length; i++) {
        const way = remaining[i];
        const tail = ring[ring.length - 1];
        const head = ring[0];
        if (approxEqualCoords(tail, way[0])) {
          ring = ring.concat(way.slice(1));
          remaining.splice(i, 1);
          grew = true;
          break;
        }
        if (approxEqualCoords(tail, way[way.length - 1])) {
          ring = ring.concat(way.slice().reverse().slice(1));
          remaining.splice(i, 1);
          grew = true;
          break;
        }
        if (approxEqualCoords(head, way[way.length - 1])) {
          ring = way.concat(ring.slice(1));
          remaining.splice(i, 1);
          grew = true;
          break;
        }
        if (approxEqualCoords(head, way[0])) {
          ring = way.slice().reverse().concat(ring.slice(1));
          remaining.splice(i, 1);
          grew = true;
          break;
        }
      }
    }
    if (ring.length >= 4) {
      if (!approxEqualCoords(ring[0], ring[ring.length - 1])) ring.push(ring[0]);
      rings.push(ring);
    }
  }
  return rings;
}

async function loadMunicipalityBoundariesFromOverpass() {
  const query = `[out:json][timeout:90];
rel[boundary=administrative][admin_level=7]["ref:se:kommunid"](55.0,10.0,70.0,25.0);
out geom;`;
  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`);
  const data = await res.json();

  const entries = [];
  const featuresByCode = new Map();

  for (const element of data.elements || []) {
    if (element.type !== "relation") continue;
    const code = normalizeMunicipalityCode(element.tags?.["ref:se:kommunid"] || "");
    if (!code) continue;
    const name = String(element.tags?.["name"] || "")
      .replace(/ kommun$/i, "")
      .trim() || `Kommun ${code}`;

    const outerWays = (element.members || [])
      .filter((m) => m.type === "way" && m.role === "outer" && Array.isArray(m.geometry) && m.geometry.length >= 2)
      .map((m) => m.geometry.map((p) => [p.lon, p.lat]));
    if (!outerWays.length) continue;

    const rings = assembleOsmRings(outerWays);
    if (!rings.length) continue;

    const geometry =
      rings.length === 1
        ? { type: "Polygon", coordinates: [rings[0]] }
        : { type: "MultiPolygon", coordinates: rings.map((r) => [r]) };

    const feature = { type: "Feature", geometry, properties: { code, name } };
    entries.push({ code, name });
    featuresByCode.set(code, [feature]);
  }

  entries.sort((a, b) => a.name.localeCompare(b.name, "sv"));
  return { entries, featuresByCode };
}

function readMunicipalityBoundaryCache() {
  try {
    const raw = localStorage.getItem(MUNICIPALITY_BOUNDARY_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.savedAt || Date.now() - parsed.savedAt > MUNICIPALITY_BOUNDARY_CACHE_TTL) {
      localStorage.removeItem(MUNICIPALITY_BOUNDARY_CACHE_KEY);
      return null;
    }
    const featuresByCode = new Map(Object.entries(parsed.featuresByCode || {}));
    return { entries: parsed.entries || [], featuresByCode };
  } catch {
    return null;
  }
}

function writeMunicipalityBoundaryCache(entries, featuresByCode) {
  try {
    const fbcObj = {};
    for (const [code, features] of featuresByCode.entries()) {
      fbcObj[code] = features;
    }
    localStorage.setItem(
      MUNICIPALITY_BOUNDARY_CACHE_KEY,
      JSON.stringify({ savedAt: Date.now(), entries, featuresByCode: fbcObj }),
    );
  } catch {
    // Ignore quota/private-mode errors.
  }
}

function normalizeLocalMunicipalityIndexEntry(entry) {
  if (!entry || typeof entry !== "object") return null;
  const code = normalizeMunicipalityCode(entry.code);
  const name = String(entry.name || "").trim();
  const boundaryPath = String(entry.boundaryPath || `${MUNICIPALITY_LOCAL_BOUNDARY_DIR}/${code}.geojson`).trim();
  if (!code || !name || !boundaryPath) return null;
  return { code, name, boundaryPath };
}

async function loadMunicipalityIndexFromLocal() {
  const candidates = [MUNICIPALITY_LOCAL_INDEX_URL, `Karta/${MUNICIPALITY_LOCAL_INDEX_URL}`];
  let res = null;
  for (const path of candidates) {
    const attempt = await fetch(`${path}?v=1`, { cache: "no-store" });
    if (attempt.ok) {
      res = attempt;
      break;
    }
  }
  if (!res) throw new Error(`Kunde inte läsa ${MUNICIPALITY_LOCAL_INDEX_URL}.`);
  const json = await res.json();
  const rows = Array.isArray(json) ? json : Array.isArray(json?.municipalities) ? json.municipalities : [];
  const entries = rows
    .map(normalizeLocalMunicipalityIndexEntry)
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name, "sv"));
  if (!entries.length) throw new Error("Kommunindex är tomt.");
  return entries;
}

async function loadMunicipalityIndexFromLocalDbf() {
  const candidates = [MUNICIPALITY_LOCAL_DBF_URL, `Karta/${MUNICIPALITY_LOCAL_DBF_URL}`];
  let res = null;
  for (const path of candidates) {
    const attempt = await fetch(`${path}?v=1`, { cache: "force-cache" });
    if (attempt.ok) {
      res = attempt;
      break;
    }
  }
  if (!res) throw new Error(`Kunde inte läsa ${MUNICIPALITY_LOCAL_DBF_URL}.`);

  const dbfBuf = await res.arrayBuffer();
  const attrs = parseDbfRecords(dbfBuf);
  if (!attrs.length) throw new Error("DBF innehåller inga poster.");

  const sample = attrs.slice(0, 250).map((properties) => ({ properties }));
  const codeField =
    detectMunicipalityCodeFieldForList(sample, []) ||
    Object.keys(attrs[0] || {}).find((k) => k.toLowerCase().includes("kod")) ||
    "KOM_KOD";
  const nameField =
    detectMunicipalityNameFieldForCode(sample, codeField, []) ||
    detectMunicipalityNameField(sample, [codeField]) ||
    Object.keys(attrs[0] || {}).find((k) => k.toLowerCase().includes("namn")) ||
    "KOM_NAMN";

  const byCode = new Map();
  for (const row of attrs) {
    const code = normalizeMunicipalityCode(row[codeField]);
    if (!code) continue;

    const rawName = String(row[nameField] || "").trim();
    const fallbackName = Object.values(row)
      .map((v) => String(v || "").trim())
      .find((txt) => scoreMunicipalityNameValue(txt) >= 5) || "";
    const name = rawName || fallbackName || `Kommun ${code}`;

    if (!byCode.has(code)) {
      byCode.set(code, {
        code,
        name,
        boundaryPath: `${MUNICIPALITY_LOCAL_BOUNDARY_DIR}/${code}.geojson`,
      });
    }
  }

  const entries = [...byCode.values()].sort((a, b) => a.name.localeCompare(b.name, "sv"));
  if (!entries.length) throw new Error("Kunde inte bygga kommunlista från DBF.");
  return entries;
}

async function queryArcGisMunicipalities(params) {
  const url = `${MUNICIPALITY_ARCGIS_LAYER_URL}/query?${new URLSearchParams(params).toString()}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`ArcGIS kommunanrop misslyckades: HTTP ${res.status}`);
  const json = await res.json();
  if (json?.error) {
    throw new Error(`ArcGIS kommunanrop fel: ${json.error.message || "okänt fel"}`);
  }
  return json;
}

async function loadMunicipalityIndexFromArcGis() {
  const pageSize = 2000;
  let offset = 0;
  const byCode = new Map();

  while (true) {
    const json = await queryArcGisMunicipalities({
      f: "json",
      where: "1=1",
      outFields: "KOMMUNNAMN,KOM_KOD,KOMMUNKOD",
      returnGeometry: "false",
      orderByFields: "KOMMUNNAMN ASC",
      resultOffset: String(offset),
      resultRecordCount: String(pageSize),
    });

    const features = Array.isArray(json?.features) ? json.features : [];
    for (const feature of features) {
      const attrs = feature?.attributes || {};
      const code = normalizeMunicipalityCode(attrs.KOM_KOD ?? attrs.KOMMUNKOD);
      const name = String(attrs.KOMMUNNAMN || "").trim();
      if (!code || !name) continue;
      if (!byCode.has(code)) byCode.set(code, { code, name });
    }

    if (features.length < pageSize || !json?.exceededTransferLimit) break;
    offset += features.length;
  }

  const entries = [...byCode.values()].sort((a, b) => a.name.localeCompare(b.name, "sv"));
  if (!entries.length) throw new Error("ArcGIS kommunindex är tomt.");
  return entries;
}

async function loadMunicipalityFeaturesForCodeFromArcGis(code) {
  const normalizedCode = normalizeMunicipalityCode(code);
  if (!normalizedCode) return [];

  const numericCode = Number.parseInt(normalizedCode, 10);
  const where = Number.isFinite(numericCode)
    ? `(KOM_KOD='${normalizedCode}' OR KOMMUNKOD=${numericCode})`
    : `KOM_KOD='${String(normalizedCode).replace(/'/g, "''")}'`;

  const json = await queryArcGisMunicipalities({
    f: "geojson",
    where,
    outFields: "KOMMUNNAMN,KOM_KOD,KOMMUNKOD,LANSNAMN,LANSKOD",
    outSR: "4326",
    returnGeometry: "true",
  });

  const features = Array.isArray(json?.features)
    ? json.features.filter((feature) => feature?.geometry)
    : [];

  for (const feature of features) {
    feature.properties = feature.properties || {};
    if (!feature.properties.code) {
      feature.properties.code = normalizeMunicipalityCode(
        feature.properties.KOM_KOD ?? feature.properties.KOMMUNKOD ?? normalizedCode,
      );
    }
    if (!feature.properties.name) {
      feature.properties.name = String(feature.properties.KOMMUNNAMN || `Kommun ${normalizedCode}`);
    }
  }

  return features;
}

function sweref99TmToWgs84(north, east) {
  const axis = 6378137.0;
  const flattening = 1.0 / 298.257222101;
  const centralMeridian = 15.0;
  const scale = 0.9996;
  const falseNorthing = 0.0;
  const falseEasting = 500000.0;

  const e2 = flattening * (2.0 - flattening);
  const n = flattening / (2.0 - flattening);
  const aRoof = axis / (1.0 + n) * (1.0 + (n * n) / 4.0 + (n ** 4) / 64.0);

  const beta1 = n / 2.0 - (2.0 * n * n) / 3.0 + (5.0 * n ** 3) / 16.0 + (41.0 * n ** 4) / 180.0;
  const beta2 = (13.0 * n * n) / 48.0 - (3.0 * n ** 3) / 5.0 + (557.0 * n ** 4) / 1440.0;
  const beta3 = (61.0 * n ** 3) / 240.0 - (103.0 * n ** 4) / 140.0;
  const beta4 = (49561.0 * n ** 4) / 161280.0;

  const delta1 = n / 2.0 - (2.0 * n * n) / 3.0 + (37.0 * n ** 3) / 96.0 - (n ** 4) / 360.0;
  const delta2 = (n * n) / 48.0 + (n ** 3) / 15.0 - (437.0 * n ** 4) / 1440.0;
  const delta3 = (17.0 * n ** 3) / 480.0 - (37.0 * n ** 4) / 840.0;
  const delta4 = (4397.0 * n ** 4) / 161280.0;

  const x = (north - falseNorthing) / (aRoof * scale);
  const y = (east - falseEasting) / (aRoof * scale);

  const xPrim = x
    - beta1 * Math.sin(2.0 * x) * Math.cosh(2.0 * y)
    - beta2 * Math.sin(4.0 * x) * Math.cosh(4.0 * y)
    - beta3 * Math.sin(6.0 * x) * Math.cosh(6.0 * y)
    - beta4 * Math.sin(8.0 * x) * Math.cosh(8.0 * y);

  const yPrim = y
    - beta1 * Math.cos(2.0 * x) * Math.sinh(2.0 * y)
    - beta2 * Math.cos(4.0 * x) * Math.sinh(4.0 * y)
    - beta3 * Math.cos(6.0 * x) * Math.sinh(6.0 * y)
    - beta4 * Math.cos(8.0 * x) * Math.sinh(8.0 * y);

  const phiStar = Math.asin(Math.sin(xPrim) / Math.cosh(yPrim));
  const deltaLambda = Math.atan(Math.sinh(yPrim) / Math.cos(xPrim));

  const lonRadian = (centralMeridian * Math.PI) / 180.0 + deltaLambda;
  const latRadian = phiStar + Math.sin(phiStar) * Math.cos(phiStar) * (
    delta1 +
    delta2 * Math.sin(phiStar) ** 2 +
    delta3 * Math.sin(phiStar) ** 4 +
    delta4 * Math.sin(phiStar) ** 6
  );

  return {
    lat: (latRadian * 180.0) / Math.PI,
    lon: (lonRadian * 180.0) / Math.PI,
  };
}

function parseDbfRecords(arrayBuffer) {
  const view = new DataView(arrayBuffer);
  const decoder = new TextDecoder("latin1");
  const recordCount = view.getUint32(4, true);
  const headerLength = view.getUint16(8, true);
  const recordLength = view.getUint16(10, true);

  const fields = [];
  let offset = 32;
  while (offset < headerLength - 1) {
    const firstByte = view.getUint8(offset);
    if (firstByte === 0x0d) break;
    const nameBytes = new Uint8Array(arrayBuffer, offset, 11);
    const zero = nameBytes.indexOf(0);
    const name = decoder.decode(zero >= 0 ? nameBytes.slice(0, zero) : nameBytes).trim();
    const type = String.fromCharCode(view.getUint8(offset + 11));
    const length = view.getUint8(offset + 16);
    fields.push({ name, type, length });
    offset += 32;
  }

  const records = [];
  for (let i = 0; i < recordCount; i += 1) {
    const recordStart = headerLength + i * recordLength;
    if (view.getUint8(recordStart) === 0x2a) continue;

    let pos = recordStart + 1;
    const row = {};
    for (const field of fields) {
      const bytes = new Uint8Array(arrayBuffer, pos, field.length);
      let text = decoder.decode(bytes).trim();
      if (field.type === "N" || field.type === "F") {
        const n = Number.parseFloat(text.replace(",", "."));
        row[field.name] = Number.isFinite(n) ? n : text;
      } else {
        row[field.name] = text;
      }
      pos += field.length;
    }
    records.push(row);
  }

  return records;
}

function parseShpPolygonRecords(arrayBuffer) {
  const view = new DataView(arrayBuffer);
  let offset = 100;
  const records = [];

  while (offset + 8 <= view.byteLength) {
    const contentLengthWords = view.getInt32(offset + 4, false);
    const contentBytes = contentLengthWords * 2;
    const contentStart = offset + 8;
    const contentEnd = contentStart + contentBytes;
    if (contentEnd > view.byteLength) break;

    const shapeType = view.getInt32(contentStart, true);
    if (shapeType === 5 || shapeType === 15) {
      const numParts = view.getInt32(contentStart + 36, true);
      const numPoints = view.getInt32(contentStart + 40, true);

      const parts = [];
      let pOff = contentStart + 44;
      for (let i = 0; i < numParts; i += 1) {
        parts.push(view.getInt32(pOff + i * 4, true));
      }

      const pointsStart = pOff + numParts * 4;
      const points = [];
      for (let i = 0; i < numPoints; i += 1) {
        const xyOff = pointsStart + i * 16;
        const east = view.getFloat64(xyOff, true);
        const north = view.getFloat64(xyOff + 8, true);
        const ll = sweref99TmToWgs84(north, east);
        points.push([ll.lon, ll.lat]);
      }

      const rings = [];
      for (let i = 0; i < parts.length; i += 1) {
        const start = parts[i];
        const end = i + 1 < parts.length ? parts[i + 1] : points.length;
        const ring = points.slice(start, end);
        if (ring.length >= 4) rings.push(ring);
      }
      records.push(rings);
    }

    offset = contentEnd;
  }

  return records;
}

function closeRingIfNeeded(ring) {
  if (!Array.isArray(ring) || ring.length < 3) return null;
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] === last[0] && first[1] === last[1]) return ring;
  return [...ring, first];
}

function ringSignedArea(ring) {
  let sum = 0;
  for (let i = 0; i < ring.length - 1; i += 1) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[i + 1];
    sum += x1 * y2 - x2 * y1;
  }
  return sum / 2;
}

function pointInRing(point, ring) {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersects = (yi > y) !== (yj > y) &&
      x < ((xj - xi) * (y - yi)) / ((yj - yi) || Number.EPSILON) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function buildPolygonCoordinatesFromRings(rawRings) {
  const prepared = rawRings
    .map(closeRingIfNeeded)
    .filter((ring) => Array.isArray(ring) && ring.length >= 4)
    .map((ring) => ({ ring, area: ringSignedArea(ring) }));

  if (!prepared.length) return [];

  // Esri shapefiler använder normalt medurs för ytterringar och moturs för hål.
  const outers = prepared.filter((item) => item.area < 0);
  const holes = prepared.filter((item) => item.area >= 0);

  if (!outers.length) {
    // Fallback om orientering saknas: behandla alla ringar som separata yttre delar.
    return prepared.map((item) => [item.ring]);
  }

  const polygons = outers.map((outer) => ({ outer: outer.ring, holes: [] }));

  for (const hole of holes) {
    const holePoint = hole.ring[0];
    let bestMatch = null;
    let bestArea = Number.POSITIVE_INFINITY;
    for (const polygon of polygons) {
      if (!pointInRing(holePoint, polygon.outer)) continue;
      const area = Math.abs(ringSignedArea(polygon.outer));
      if (area < bestArea) {
        bestArea = area;
        bestMatch = polygon;
      }
    }

    if (bestMatch) {
      bestMatch.holes.push(hole.ring);
    } else {
      polygons.push({ outer: hole.ring, holes: [] });
    }
  }

  return polygons.map((poly) => [poly.outer, ...poly.holes]);
}

async function loadMunicipalityBoundariesFromLocalShapefile() {
  const shpCandidates = [MUNICIPALITY_LOCAL_SHP_URL, `Karta/${MUNICIPALITY_LOCAL_SHP_URL}`];
  const dbfCandidates = [MUNICIPALITY_LOCAL_DBF_URL, `Karta/${MUNICIPALITY_LOCAL_DBF_URL}`];

  async function firstOk(paths) {
    for (const path of paths) {
      const res = await fetch(`${path}?v=1`, { cache: "force-cache" });
      if (res.ok) return res;
    }
    return null;
  }

  const [shpRes, dbfRes] = await Promise.all([firstOk(shpCandidates), firstOk(dbfCandidates)]);

  if (!shpRes || !dbfRes) {
    throw new Error("Kunde inte läsa lokal shape/dbf.");
  }

  const [shpBuf, dbfBuf] = await Promise.all([shpRes.arrayBuffer(), dbfRes.arrayBuffer()]);
  const records = parseShpPolygonRecords(shpBuf);
  const attrs = parseDbfRecords(dbfBuf);

  if (!records.length || !attrs.length) {
    throw new Error("Tom shape/dbf-data.");
  }

  const sample = attrs.slice(0, 100);
  const codeField = detectMunicipalityCodeFieldForList(sample.map((properties) => ({ properties }))) ||
    Object.keys(attrs[0] || {}).find((k) => k.toLowerCase().includes("kod")) ||
    "KOM_KOD";

  const nameField =
    detectMunicipalityNameFieldForCode(sample.map((properties) => ({ properties })), codeField, []) ||
    Object.keys(attrs[0] || {}).find((k) => k.toLowerCase().includes("namn")) ||
    "KOM_NAMN";

  const featuresByCode = new Map();
  const byCode = new Map();

  const len = Math.min(records.length, attrs.length);
  for (let i = 0; i < len; i += 1) {
    const props = attrs[i] || {};
    const code = normalizeMunicipalityCode(props[codeField]);
    if (!code) continue;

    const rawName = String(props[nameField] || "").trim();
    const name = rawName || `Kommun ${code}`;

    const rings = records[i] || [];
    const polygons = buildPolygonCoordinatesFromRings(rings);
    if (!polygons.length) continue;

    const geometry = polygons.length === 1
      ? { type: "Polygon", coordinates: polygons[0] }
      : { type: "MultiPolygon", coordinates: polygons };

    const feature = {
      type: "Feature",
      properties: { code, name },
      geometry,
    };

    if (!featuresByCode.has(code)) featuresByCode.set(code, []);
    featuresByCode.get(code).push(feature);
    if (!byCode.has(code)) byCode.set(code, { code, name });
  }

  const entries = [...byCode.values()].sort((a, b) => a.name.localeCompare(b.name, "sv"));
  return { entries, featuresByCode };
}

const statusEl = document.getElementById("status");
const populationEl = document.getElementById("population");
const breakdownEl = document.getElementById("breakdown");
const populationDetailsEl = document.getElementById("population-details");
const metaEl = document.getElementById("meta");
const clearBtn = document.getElementById("clear-btn");
const modeInputs = Array.from(document.querySelectorAll('input[name="input-mode"]'));
const travelSettingsEl = document.getElementById("travel-settings");
const travelMinutesEl = document.getElementById("travel-minutes");
const importSettingsEl = document.getElementById("import-settings");
const coordinateInputEl = document.getElementById("coordinate-input");
const coordinateFileEl = document.getElementById("coordinate-file");
const downloadTemplateBtn = document.getElementById("download-template-btn");
const buildCoordinatesBtn = document.getElementById("build-coordinates-btn");
const printBtn = document.getElementById("print-btn");
const msbOverlaySelectEl = document.getElementById("msb-overlay-select");
const msbStatsBoxEl = document.getElementById("msb-stats-box");
const msbStatsContentEl = document.getElementById("msb-stats-content");
const wildlifeStatsBoxEl = document.getElementById("wildlife-stats-box");
const wildlifeStatsContentEl = document.getElementById("wildlife-stats-content");
const panelHelpLinkEl = document.getElementById("panel-help-link");
const panelHelpPopupEl = document.getElementById("panel-help-popup");
const municipalityDropdownToggleEl = document.getElementById("municipality-dropdown-toggle");
const municipalityDropdownPanelEl = document.getElementById("municipality-dropdown-panel");
const municipalityFilterInputEl = document.getElementById("municipality-filter-input");
const municipalityCheckboxListEl = document.getElementById("municipality-checkbox-list");
const municipalitySelectionSummaryEl = document.getElementById("municipality-selection-summary");

let selectedLayerName = null;
let selectedPopulationField = null;
let lastMetaLines = [];
let currentMsbOverlayLabel = "";
let currentAreaStyle = "fill";
let currentAreaStrokeColor = "#0f766e";
let currentAreaFillColor = "#14b8a6";
let currentPopulationContext = null;
let refreshMsbStatsHandler = () => {};
let municipalityBoundaryMeta = null;
let municipalityEntries = [];
const selectedMunicipalityCodes = new Set();

function setStatus(text) {
  if (statusEl) statusEl.textContent = text;
}

function setMeta(lines) {
  lastMetaLines = Array.isArray(lines) ? lines : [];
  if (!metaEl) return;
  const merged = [...lastMetaLines];
  if (currentMsbOverlayLabel) {
    merged.push(`MSB-overlay: ${currentMsbOverlayLabel}`);
  }
  metaEl.innerHTML = merged.join("<br>");
}

function setCurrentMsbOverlayLabel(label) {
  currentMsbOverlayLabel = label || "";
  setMeta(lastMetaLines);
}

function setBreakdown(lines) {
  if (!breakdownEl) return;
  const hasLines = Array.isArray(lines) && lines.length > 0;
  breakdownEl.innerHTML = hasLines ? lines.join("<br>") : "";

  if (populationDetailsEl) {
    populationDetailsEl.classList.toggle("hidden", !hasLines);
    if (!hasLines) {
      populationDetailsEl.open = false;
    }
  }
}

function readLocalCache(cacheKey) {
  try {
    const raw = window.localStorage.getItem(`${LOCAL_CACHE_PREFIX}:${cacheKey}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    if (!parsed.savedAt || Date.now() - parsed.savedAt > LOCAL_CACHE_TTL_MS) {
      window.localStorage.removeItem(`${LOCAL_CACHE_PREFIX}:${cacheKey}`);
      return null;
    }
    return parsed.value ?? null;
  } catch {
    return null;
  }
}

function writeLocalCache(cacheKey, value) {
  try {
    window.localStorage.setItem(
      `${LOCAL_CACHE_PREFIX}:${cacheKey}`,
      JSON.stringify({ savedAt: Date.now(), value }),
    );
  } catch {
    // Ignore quota/private mode failures.
  }
}

function normalizeHeaderKey(text) {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function parseDelimitedLine(line, delimiter = ";") {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      const next = line[i + 1];
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === delimiter && !inQuotes) {
      result.push(current);
      current = "";
      continue;
    }

    current += ch;
  }

  result.push(current);
  return result;
}

function parseSwedishDecimal(value) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const normalized = text.replace(/\s/g, "").replace(",", ".");
  const n = Number.parseFloat(normalized);
  return Number.isFinite(n) ? n : null;
}

function decodeCsvBuffer(arrayBuffer) {
  const utf8Text = new TextDecoder("utf-8").decode(arrayBuffer);
  if (!utf8Text.includes("\uFFFD")) return utf8Text;
  return new TextDecoder("windows-1252").decode(arrayBuffer);
}

function setupPanelHelpPopup() {
  if (!panelHelpLinkEl || !panelHelpPopupEl) return;

  const closePopup = () => {
    panelHelpPopupEl.classList.add("hidden");
    panelHelpLinkEl.setAttribute("aria-expanded", "false");
  };

  panelHelpLinkEl.addEventListener("click", (event) => {
    event.preventDefault();
    const willShow = panelHelpPopupEl.classList.contains("hidden");
    panelHelpPopupEl.classList.toggle("hidden", !willShow);
    panelHelpLinkEl.setAttribute("aria-expanded", willShow ? "true" : "false");
  });

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Node)) return;
    if (panelHelpPopupEl.contains(target) || panelHelpLinkEl.contains(target)) return;
    closePopup();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closePopup();
    }
  });
}

function cleanWildlifeSpeciesName(value) {
  const text = String(value ?? "").trim().replace(/\s+/g, " ");
  return text || "Okänd art";
}

async function loadWildlifeAccidentData() {
  const response = await fetch(`${WILDLIFE_CSV_URL}?v=1`, { cache: "force-cache" });
  if (!response.ok) {
    throw new Error(`Kunde inte läsa viltdata (HTTP ${response.status})`);
  }

  const csvText = decodeCsvBuffer(await response.arrayBuffer());
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length <= 1) {
    return { records: [], speciesList: [] };
  }

  const header = parseDelimitedLine(lines[0], ";").map((cell) => String(cell || "").trim());
  const normalizedHeader = header.map((cell) => normalizeHeaderKey(cell));

  const speciesIndex = normalizedHeader.findIndex((key) => key.includes("viltslag"));
  const latIndex = normalizedHeader.findIndex((key) => key.includes("latwgs84"));
  const lonIndex = normalizedHeader.findIndex((key) => key.includes("longwgs84") || key.includes("lonwgs84"));

  if (speciesIndex < 0 || latIndex < 0 || lonIndex < 0) {
    throw new Error("Viltdata saknar nödvändiga kolumner (Viltslag, Lat WGS84, Long WGS84)");
  }

  const records = [];
  const speciesSet = new Set();

  for (let i = 1; i < lines.length; i += 1) {
    const cells = parseDelimitedLine(lines[i], ";");
    const lat = parseSwedishDecimal(cells[latIndex]);
    const lon = parseSwedishDecimal(cells[lonIndex]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    if (Math.abs(lat) > 90 || Math.abs(lon) > 180) continue;

    const species = cleanWildlifeSpeciesName(cells[speciesIndex]);
    speciesSet.add(species);

    records.push({
      species,
      lat,
      lon,
      point: turf.point([lon, lat]),
    });
  }

  const speciesList = [...speciesSet].sort((a, b) => a.localeCompare(b, "sv"));
  return { records, speciesList };
}

function summarizeWildlifeWithinAreas(records, areaFeatures) {
  if (!Array.isArray(records) || !records.length || !Array.isArray(areaFeatures) || !areaFeatures.length) {
    return { counts: new Map(), matchedRecords: [] };
  }

  const [minLon, minLat, maxLon, maxLat] = turf.bbox(turf.featureCollection(areaFeatures));
  const counts = new Map();
  const matchedRecords = [];

  for (const record of records) {
    if (!record || !Number.isFinite(record.lat) || !Number.isFinite(record.lon)) continue;
    if (record.lon < minLon || record.lon > maxLon || record.lat < minLat || record.lat > maxLat) continue;

    for (const areaFeature of areaFeatures) {
      if (!areaFeature?.geometry) continue;
      if (turf.booleanPointInPolygon(record.point, areaFeature)) {
        matchedRecords.push(record);
        counts.set(record.species, (counts.get(record.species) || 0) + 1);
        break;
      }
    }
  }

  return { counts, matchedRecords };
}

function parseCoordinatesFromText(text) {
  const rows = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const coordinates = [];
  for (const row of rows) {
    const numbers = row.match(/-?\d+(?:[.,]\d+)?/g);
    if (!numbers || numbers.length < 2) continue;

    const first = Number.parseFloat(numbers[0].replace(",", "."));
    const second = Number.parseFloat(numbers[1].replace(",", "."));
    if (!Number.isFinite(first) || !Number.isFinite(second)) continue;

    let lat = first;
    let lon = second;
    if (Math.abs(first) > 90 && Math.abs(first) <= 180 && Math.abs(second) <= 90) {
      lon = first;
      lat = second;
    }

    if (Math.abs(lat) > 90 || Math.abs(lon) > 180) continue;
    coordinates.push([lon, lat]);
  }

  return coordinates;
}

function coordinateRowsToText(rows) {
  if (!Array.isArray(rows) || !rows.length) return "";

  const firstRow = Array.isArray(rows[0]) ? rows[0] : [];
  const headers = firstRow.map((value) => String(value || "").trim().toLowerCase());
  const latHeaderIndex = headers.findIndex((value) => value.includes("lat"));
  const lonHeaderIndex = headers.findIndex((value) => value.includes("lon") || value.includes("lng"));

  let startIndex = 0;
  let latIndex = 0;
  let lonIndex = 1;

  if (latHeaderIndex >= 0 && lonHeaderIndex >= 0) {
    startIndex = 1;
    latIndex = latHeaderIndex;
    lonIndex = lonHeaderIndex;
  }

  const lines = [];
  for (let i = startIndex; i < rows.length; i += 1) {
    const row = rows[i];
    if (!Array.isArray(row)) continue;
    const lat = row[latIndex];
    const lon = row[lonIndex];
    if (lat === undefined || lon === undefined || lat === null || lon === null) continue;
    if (String(lat).trim() === "" || String(lon).trim() === "") continue;
    lines.push(`${lat}, ${lon}`);
  }

  return lines.join("\n");
}

function readCoordinateFile(file) {
  return new Promise((resolve, reject) => {
    const lowerName = (file?.name || "").toLowerCase();
    const isExcel = lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls");
    const reader = new FileReader();

    reader.onerror = () => reject(new Error("Kunde inte läsa filen."));

    if (isExcel) {
      reader.onload = () => {
        try {
          if (typeof XLSX === "undefined") {
            throw new Error("Excel-stöd kunde inte laddas. Uppdatera sidan och försök igen.");
          }
          const workbook = XLSX.read(reader.result, { type: "array" });
          const firstSheet = workbook.SheetNames[0];
          if (!firstSheet) throw new Error("Excel-filen saknar blad.");
          const worksheet = workbook.Sheets[firstSheet];
          const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true });
          const text = coordinateRowsToText(rows);
          if (!text.trim()) {
            throw new Error("Hittade inga koordinater i Excel-filen.");
          }
          resolve(text);
        } catch (error) {
          reject(error);
        }
      };
      reader.readAsArrayBuffer(file);
      return;
    }

    reader.onload = () => resolve(String(reader.result || ""));
    reader.readAsText(file);
  });
}

function layerFromCoordinatePolygon(coords) {
  if (coords.length < 3) {
    throw new Error("Minst 3 giltiga koordinater krävs.");
  }

  const ring = [...coords];
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    ring.push([first[0], first[1]]);
  }

  let polygonFeature = null;
  try {
    polygonFeature = turf.polygon([ring]);
    if (!Number.isFinite(turf.area(polygonFeature)) || turf.area(polygonFeature) <= 0) {
      polygonFeature = null;
    }
  } catch {
    polygonFeature = null;
  }

  // If the entered order creates an invalid polygon, fall back to a convex hull.
  if (!polygonFeature) {
    const pointsFc = turf.featureCollection(coords.map((c) => turf.point(c)));
    polygonFeature = turf.convex(pointsFc);
  }

  if (!polygonFeature || !polygonFeature.geometry) {
    throw new Error("Kunde inte bygga polygon av koordinaterna. Kontrollera format eller punktordning.");
  }

  const layer = L.geoJSON(polygonFeature, {
    style: {
      color: "#0f766e",
      weight: 2,
      fillColor: "#14b8a6",
      fillOpacity: 0.2,
    },
  });

  return layer;
}

async function fetchDirect(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`SCB-anrop misslyckades: HTTP ${response.status}`);
  }
  return response;
}

function safeParseFloat(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const normalized = value.replace(",", ".");
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function choosePopulationFieldFromFeatures(features) {
  const statsByKey = new Map();

  for (const feature of features) {
    const props = feature?.properties || {};
    for (const [key, value] of Object.entries(props)) {
      const n = safeParseFloat(value);
      if (n === null || !Number.isFinite(n) || n < 0) continue;

      if (!statsByKey.has(key)) {
        statsByKey.set(key, { count: 0, integerCount: 0, sum: 0, max: 0 });
      }
      const s = statsByKey.get(key);
      s.count += 1;
      if (Number.isInteger(n)) s.integerCount += 1;
      s.sum += n;
      if (n > s.max) s.max = n;
    }
  }

  let bestKey = null;
  let bestScore = -Infinity;

  for (const [key, s] of statsByKey.entries()) {
    if (s.count < 3) continue;

    const keyLc = key.toLowerCase();
    const tokens = keyTokens(keyLc);
    const mean = s.sum / s.count;
    const integerRatio = s.integerCount / s.count;

    let score = 0;

    if (POP_FIELD_HINTS.some((hint) => keyLc.includes(hint))) score += 100;
    if (tokens.some((token) => NON_POP_FIELD_HINT_SET.has(token))) score -= 120;

    if (integerRatio > 0.9) score += 10;
    if (mean > 0 && mean < 50000) score += 10;
    if (s.max > 2_000_000) score -= 80;
    if (mean > 200_000) score -= 60;

    if (score > bestScore) {
      bestScore = score;
      bestKey = key;
    }
  }

  if (bestKey) return bestKey;

  // Last-resort fallback: choose the most consistently numeric non-zero field.
  let fallbackKey = null;
  let fallbackScore = -1;
  for (const [key, s] of statsByKey.entries()) {
    if (s.count < 3) continue;
    const mean = s.sum / s.count;
    const integerRatio = s.integerCount / s.count;
    if (mean <= 0 || mean > 1_000_000) continue;
    const score = s.count * 2 + integerRatio * 10;
    if (score > fallbackScore) {
      fallbackScore = score;
      fallbackKey = key;
    }
  }

  return fallbackKey;
}

function detectDemographicFields(features, totalField) {
  const keyStats = new Map();
  for (const feature of features) {
    const props = feature?.properties || {};
    for (const [key, value] of Object.entries(props)) {
      const n = safeParseFloat(value);
      if (n === null || n < 0) continue;
      if (!keyStats.has(key)) keyStats.set(key, { count: 0 });
      keyStats.get(key).count += 1;
    }
  }

  const isNumericEnough = (key) => (keyStats.get(key)?.count || 0) >= 3;
  const keys = Array.from(keyStats.keys());

  const maleHints = ["man", "male", "menn", "bef_m", "tot_m"];
  const femaleHints = ["kvin", "female", "bef_k", "tot_k"];
  const genderExclude = ["kommun", "namn", "lan"];

  function pickFieldByHints(hints) {
    let best = null;
    let bestScore = -1;
    for (const key of keys) {
      if (!isNumericEnough(key)) continue;
      if (key === totalField) continue;
      const lc = key.toLowerCase();
      if (genderExclude.some((x) => lc.includes(x))) continue;
      if (!hints.some((h) => lc.includes(h))) continue;
      const score = (keyStats.get(key)?.count || 0) + (lc.includes("bef") ? 5 : 0);
      if (score > bestScore) {
        best = key;
        bestScore = score;
      }
    }
    return best;
  }

  const maleField = pickFieldByHints(maleHints);
  const femaleField = pickFieldByHints(femaleHints);

  const ageCandidates = [];
  for (const key of keys) {
    if (!isNumericEnough(key) || key === totalField || key === maleField || key === femaleField) continue;
    const lc = key.toLowerCase();

    const rangeMatch = lc.match(/(\d{1,2})\s*[-_]\s*(\d{1,2})/);
    const plusMatch = lc.match(/(\d{1,2})\s*(\+|plus|p\b)/);
    if (!rangeMatch && !plusMatch) continue;

    if (lc.includes("man") || lc.includes("kvin") || lc.includes("male") || lc.includes("female")) {
      continue;
    }

    let label = null;
    let sortAge = null;
    if (rangeMatch) {
      const a = Number.parseInt(rangeMatch[1], 10);
      const b = Number.parseInt(rangeMatch[2], 10);
      if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) continue;
      label = `${a}-${b}`;
      sortAge = a;
    } else if (plusMatch) {
      const a = Number.parseInt(plusMatch[1], 10);
      if (!Number.isFinite(a)) continue;
      label = `${a}+`;
      sortAge = a;
    }

    ageCandidates.push({ key, label, sortAge, count: keyStats.get(key)?.count || 0 });
  }

  ageCandidates.sort((a, b) => a.sortAge - b.sortAge || b.count - a.count);
  const ageFields = ageCandidates;

  return { maleField, femaleField, ageFields };
}

function calculateDemographicBreakdown(features, areaFeature, fields) {
  const totals = {
    male: null,
    female: null,
    age: [],
  };

  const ageSums = new Map();
  for (const entry of fields.ageFields || []) {
    ageSums.set(entry.key, 0);
  }

  let maleSum = 0;
  let femaleSum = 0;
  let maleSeen = false;
  let femaleSeen = false;

  for (const rawFeature of features) {
    const feature = turf.feature(rawFeature.geometry, rawFeature.properties || {});
    let intersection = null;
    try {
      intersection = turf.intersect(feature, areaFeature);
    } catch {
      try {
        intersection = turf.intersect(turf.featureCollection([feature, areaFeature]));
      } catch {
        intersection = null;
      }
    }
    if (!intersection) continue;

    const wholeArea = turf.area(feature);
    const cutArea = turf.area(intersection);
    if (wholeArea <= 0 || cutArea <= 0) continue;
    const ratio = Math.min(1, cutArea / wholeArea);

    if (fields.maleField) {
      const v = safeParseFloat(rawFeature.properties?.[fields.maleField]);
      if (v !== null) {
        maleSum += v * ratio;
        maleSeen = true;
      }
    }

    if (fields.femaleField) {
      const v = safeParseFloat(rawFeature.properties?.[fields.femaleField]);
      if (v !== null) {
        femaleSum += v * ratio;
        femaleSeen = true;
      }
    }

    for (const ageEntry of fields.ageFields || []) {
      const v = safeParseFloat(rawFeature.properties?.[ageEntry.key]);
      if (v === null) continue;
      ageSums.set(ageEntry.key, (ageSums.get(ageEntry.key) || 0) + v * ratio);
    }
  }

  if (maleSeen) totals.male = maleSum;
  if (femaleSeen) totals.female = femaleSum;
  totals.age = (fields.ageFields || []).map((entry) => ({
    label: entry.label,
    key: entry.key,
    value: ageSums.get(entry.key) || 0,
  }));

  return totals;
}

function detectMunicipalityField(features, excludedKeys = []) {
  const excluded = new Set(excludedKeys.filter(Boolean));
  const keyStats = new Map();

  for (const feature of features) {
    const props = feature?.properties || {};
    for (const [key, value] of Object.entries(props)) {
      if (excluded.has(key)) continue;
      if (!keyStats.has(key)) {
        keyStats.set(key, {
          count: 0,
          distinctValues: new Set(),
          numericCount: 0,
        });
      }
      const stat = keyStats.get(key);
      stat.count += 1;
      stat.distinctValues.add(String(value ?? "").trim());
      if (safeParseFloat(value) !== null) stat.numericCount += 1;
    }
  }

  const hints = ["kommun", "komkod", "kommunkod", "knkod", "kn_kod", "muni"];
  const disallow = ["lankommun", "lan_kommun", "county"];

  let bestField = null;
  let bestScore = -Infinity;

  for (const [key, stat] of keyStats.entries()) {
    if (stat.count < 3) continue;
    const lc = key.toLowerCase();
    if (!hints.some((h) => lc.includes(h))) continue;
    if (disallow.some((d) => lc.includes(d))) continue;

    const distinctCount = stat.distinctValues.size;
    if (distinctCount < 2) continue;

    let score = 0;
    if (lc.includes("kommunkod") || lc.includes("komkod") || lc.includes("knkod") || lc.includes("kn_kod")) score += 25;
    if (lc.includes("kommun")) score += 18;

    const numericRatio = stat.numericCount / stat.count;
    if (numericRatio > 0.8) score += 8;
    if (distinctCount <= 40) score += 5;
    if (distinctCount > 150) score -= 8;

    if (score > bestScore) {
      bestScore = score;
      bestField = key;
    }
  }

  return bestField;
}

function identifyMunicipalityValue(features, areaFeature, municipalityField) {
  if (!municipalityField) return null;
  const areaByMunicipality = new Map();

  for (const rawFeature of features) {
    const props = rawFeature?.properties || {};
    const muniValue = props[municipalityField];
    if (muniValue === null || muniValue === undefined || String(muniValue).trim() === "") continue;

    const feature = turf.feature(rawFeature.geometry, props);
    let intersection = null;
    try {
      intersection = turf.intersect(feature, areaFeature);
    } catch {
      try {
        intersection = turf.intersect(turf.featureCollection([feature, areaFeature]));
      } catch {
        intersection = null;
      }
    }
    if (!intersection) continue;

    const cutArea = turf.area(intersection);
    if (cutArea <= 0) continue;

    const key = String(muniValue);
    areaByMunicipality.set(key, (areaByMunicipality.get(key) || 0) + cutArea);
  }

  let bestValue = null;
  let bestArea = 0;
  for (const [value, coveredArea] of areaByMunicipality.entries()) {
    if (coveredArea > bestArea) {
      bestArea = coveredArea;
      bestValue = value;
    }
  }

  return bestValue;
}

function buildMunicipalityFilter(field, value) {
  if (value === null || value === undefined) return null;
  const numeric = safeParseFloat(value);
  if (numeric !== null && String(value).trim() === String(Math.trunc(numeric))) {
    return `${field}=${Math.trunc(numeric)}`;
  }

  const escaped = String(value).replace(/'/g, "''");
  return `${field}='${escaped}'`;
}

async function fetchFeaturesByFilter(layerName, filterExpression) {
  const params = new URLSearchParams({
    service: "WFS",
    version: "1.1.0",
    request: "GetFeature",
    typeName: layerName,
    outputFormat: "application/json",
    srsName: "EPSG:4326",
    maxFeatures: "50000",
  });

  if (filterExpression) {
    params.set("CQL_FILTER", filterExpression);
  }

  const url = `${SCB_WFS_URL}?${params.toString()}`;
  const res = await fetchDirect(url);
  const json = await res.json();
  return json.features || [];
}

function calculateMunicipalityGenderAverages(features, maleField, femaleField) {
  if (!maleField || !femaleField || !features.length) return null;

  let maleTotal = 0;
  let femaleTotal = 0;
  let seenAny = false;

  for (const feature of features) {
    const props = feature?.properties || {};
    const male = safeParseFloat(props[maleField]);
    const female = safeParseFloat(props[femaleField]);

    if (male === null && female === null) continue;
    seenAny = true;
    if (male !== null) maleTotal += male;
    if (female !== null) femaleTotal += female;
  }

  const genderTotal = maleTotal + femaleTotal;
  if (!seenAny || genderTotal <= 0) return null;

  return {
    maleTotal,
    femaleTotal,
    maleShare: (maleTotal / genderTotal) * 100,
    femaleShare: (femaleTotal / genderTotal) * 100,
  };
}

function formatSignedPe(value) {
  const rounded = Math.round(value * 10) / 10;
  if (rounded > 0) return `+${rounded.toLocaleString("sv-SE", { maximumFractionDigits: 1 })}`;
  return rounded.toLocaleString("sv-SE", { maximumFractionDigits: 1 });
}

function buildMsbColorScale(overlayConfig) {
  const breaks = overlayConfig.breaks || [];
  const colors = overlayConfig.colors || [];

  return (value) => {
    if (!Number.isFinite(value)) return "#d1d5db";
    for (let i = 0; i < breaks.length; i += 1) {
      if (value <= breaks[i]) return colors[i] || "#d1d5db";
    }
    return colors[colors.length - 1] || "#d1d5db";
  };
}

function formatLegendValue(value) {
  if (!Number.isFinite(value)) return "-";
  if (Number.isInteger(value)) return String(value);
  return value.toLocaleString("sv-SE", { maximumFractionDigits: 1 });
}

function buildMsbLegendItems(overlayConfig) {
  const breaks = overlayConfig.breaks || [];
  const colors = overlayConfig.colors || [];
  const items = [];

  if (!breaks.length || !colors.length) return items;

  items.push({ label: `<= ${formatLegendValue(breaks[0])}`, color: colors[0] });
  for (let i = 1; i < breaks.length; i += 1) {
    items.push({
      label: `${formatLegendValue(breaks[i - 1])}-${formatLegendValue(breaks[i])}`,
      color: colors[i],
    });
  }
  items.push({ label: `> ${formatLegendValue(breaks[breaks.length - 1])}`, color: colors[colors.length - 1] });

  return items;
}

async function fetchMsbFeaturesForBounds(bounds, overlayConfig, clipAreaFeatures = null) {
  const geometry = {
    xmin: bounds.getWest(),
    ymin: bounds.getSouth(),
    xmax: bounds.getEast(),
    ymax: bounds.getNorth(),
    spatialReference: { wkid: 4326 },
  };

  const statsFields = ["rut_id", "Antal_OoT", "Antal_BIB", "Antal_tr", "Antal_dr", "RespM_1a"];
  if (!statsFields.includes(overlayConfig.field)) statsFields.push(overlayConfig.field);

  const params = new URLSearchParams({
    f: "geojson",
    where: overlayConfig.where,
    outFields: statsFields.join(","),
    geometry: JSON.stringify(geometry),
    geometryType: "esriGeometryEnvelope",
    inSR: "4326",
    outSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    returnGeometry: "true",
    resultRecordCount: "5000",
  });

  const url = `${MSB_FEATURE_SERVICE_URL}/query?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`MSB-anrop misslyckades: HTTP ${res.status}`);
  }

  const json = await res.json();
  let features = Array.isArray(json?.features) ? json.features : [];

  const clippingAreas = Array.isArray(clipAreaFeatures)
    ? clipAreaFeatures.filter((feature) => feature?.geometry)
    : (clipAreaFeatures?.geometry ? [clipAreaFeatures] : []);

  if (clippingAreas.length && features.length) {
    features = features.filter((feature) => {
      try {
        const f = turf.feature(feature.geometry, feature.properties || {});
        return clippingAreas.some((areaFeature) => {
          let ix = null;
          try { ix = turf.intersect(f, areaFeature); } catch { /* ignore */ }
          if (!ix) try { ix = turf.intersect(turf.featureCollection([f, areaFeature])); } catch { /* ignore */ }
          return ix !== null;
        });
      } catch { return false; }
    });
  }

  return features;
}

async function fetchMsbStatsForPolygon(polygonFeature) {
  const [minLon, minLat, maxLon, maxLat] = turf.bbox(polygonFeature);
  const geometry = { xmin: minLon, ymin: minLat, xmax: maxLon, ymax: maxLat, spatialReference: { wkid: 4326 } };

  const params = new URLSearchParams({
    f: "geojson",
    where: "Antal_OoT > 0 OR Antal_BIB > 0 OR Antal_tr > 0 OR Antal_dr > 0 OR RespM_1a > 0",
    outFields: "rut_id,Antal_OoT,Antal_BIB,Antal_tr,Antal_dr,RespM_1a",
    geometry: JSON.stringify(geometry),
    geometryType: "esriGeometryEnvelope",
    inSR: "4326",
    outSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    returnGeometry: "true",
    resultRecordCount: "5000",
  });

  const url = `${MSB_FEATURE_SERVICE_URL}/query?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`MSB stats-anrop misslyckades: HTTP ${res.status}`);

  const json = await res.json();
  let features = Array.isArray(json?.features) ? json.features : [];

  if (features.length) {
    features = features.filter((feature) => {
      try {
        const f = turf.feature(feature.geometry, feature.properties || {});
        let ix = null;
        try { ix = turf.intersect(f, polygonFeature); } catch { /* ignore */ }
        if (!ix) try { ix = turf.intersect(turf.featureCollection([f, polygonFeature])); } catch { /* ignore */ }
        return ix !== null;
      } catch { return false; }
    });
  }

  return features;
}

async function fetchMsbStatsForAreas(areaFeatures) {
  if (!Array.isArray(areaFeatures) || !areaFeatures.length) return [];

  const [minLon, minLat, maxLon, maxLat] = turf.bbox(turf.featureCollection(areaFeatures));
  const geometry = { xmin: minLon, ymin: minLat, xmax: maxLon, ymax: maxLat, spatialReference: { wkid: 4326 } };

  const params = new URLSearchParams({
    f: "geojson",
    where: "Antal_OoT > 0 OR Antal_BIB > 0 OR Antal_tr > 0 OR Antal_dr > 0 OR RespM_1a > 0",
    outFields: "rut_id,Antal_OoT,Antal_BIB,Antal_tr,Antal_dr,RespM_1a",
    geometry: JSON.stringify(geometry),
    geometryType: "esriGeometryEnvelope",
    inSR: "4326",
    outSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    returnGeometry: "true",
    resultRecordCount: "5000",
  });

  const url = `${MSB_FEATURE_SERVICE_URL}/query?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`MSB stats-anrop misslyckades: HTTP ${res.status}`);

  const json = await res.json();
  const rawFeatures = Array.isArray(json?.features) ? json.features : [];

  return rawFeatures.filter((feature) => {
    try {
      const turfFeature = turf.feature(feature.geometry, feature.properties || {});
      return areaFeatures.some((areaFeature) => {
        let ix = null;
        try {
          ix = turf.intersect(turfFeature, areaFeature);
        } catch {
          try {
            ix = turf.intersect(turf.featureCollection([turfFeature, areaFeature]));
          } catch {
            ix = null;
          }
        }
        return ix !== null;
      });
    } catch {
      return false;
    }
  });
}

function calculatePopulationWithinAreas(features, areaFeatures, populationField) {
  if (!Array.isArray(areaFeatures) || !areaFeatures.length) {
    return { total: 0, matched: 0, usedField: populationField };
  }

  let total = 0;
  let matched = 0;

  for (const rawFeature of features) {
    const feature = turf.feature(rawFeature.geometry, rawFeature.properties || {});
    const wholeArea = turf.area(feature);
    if (wholeArea <= 0) continue;

    let cutAreaTotal = 0;
    for (const areaFeature of areaFeatures) {
      let intersection = null;
      try {
        intersection = turf.intersect(feature, areaFeature);
      } catch {
        try {
          intersection = turf.intersect(turf.featureCollection([feature, areaFeature]));
        } catch {
          intersection = null;
        }
      }

      if (!intersection) continue;
      const cutArea = turf.area(intersection);
      if (cutArea > 0) cutAreaTotal += cutArea;
    }

    if (cutAreaTotal <= 0) continue;

    const popValue = safeParseFloat(rawFeature.properties?.[populationField]);
    if (popValue === null) continue;

    total += popValue * Math.min(1, cutAreaTotal / wholeArea);
    matched += 1;
  }

  return { total, matched, usedField: populationField };
}

function calculateMsbStatsForAreas(features, areaFeatures) {
  let totalOoT = 0, totalBIB = 0, totalTr = 0, totalDr = 0;
  const respSamples = [];

  const weightedMedian = (samples) => {
    if (!samples.length) return null;
    const sorted = [...samples]
      .filter((s) => Number.isFinite(s.value) && Number.isFinite(s.weight) && s.weight > 0)
      .sort((a, b) => a.value - b.value);
    if (!sorted.length) return null;

    const totalWeight = sorted.reduce((sum, s) => sum + s.weight, 0);
    if (totalWeight <= 0) return null;

    const midpoint = totalWeight / 2;
    let cumulative = 0;
    for (const sample of sorted) {
      cumulative += sample.weight;
      if (cumulative >= midpoint) return sample.value;
    }
    return sorted[sorted.length - 1].value;
  };

  for (const rawFeature of features) {
    const feature = turf.feature(rawFeature.geometry, rawFeature.properties || {});
    const wholeArea = turf.area(feature);
    if (wholeArea <= 0) continue;

    let cutAreaTotal = 0;
    for (const areaFeature of areaFeatures) {
      let intersection = null;
      try {
        intersection = turf.intersect(feature, areaFeature);
      } catch {
        try {
          intersection = turf.intersect(turf.featureCollection([feature, areaFeature]));
        } catch {
          intersection = null;
        }
      }
      if (!intersection) continue;
      const cutArea = turf.area(intersection);
      if (cutArea > 0) cutAreaTotal += cutArea;
    }

    if (cutAreaTotal <= 0) continue;
    const ratio = Math.min(1, cutAreaTotal / wholeArea);

    const props = rawFeature.properties || {};
    const oot = safeParseFloat(props.Antal_OoT);
    const bib = safeParseFloat(props.Antal_BIB);
    const tr = safeParseFloat(props.Antal_tr);
    const dr = safeParseFloat(props.Antal_dr);
    const resp = safeParseFloat(props.RespM_1a);

    if (oot !== null) totalOoT += oot * ratio;
    if (bib !== null) totalBIB += bib * ratio;
    if (tr !== null) totalTr += tr * ratio;
    if (dr !== null) totalDr += dr * ratio;
    if (resp !== null && resp > 0) {
      const incidentWeight = oot !== null && oot > 0 ? oot * ratio : 0;
      const sampleWeight = incidentWeight > 0 ? incidentWeight : cutAreaTotal;
      respSamples.push({ value: resp, weight: sampleWeight });
    }
  }

  const medianResp = weightedMedian(respSamples);
  const respWeightTotal = respSamples.reduce((sum, sample) => sum + sample.weight, 0);
  const meanResp = respWeightTotal > 0
    ? respSamples.reduce((sum, sample) => sum + sample.value * sample.weight, 0) / respWeightTotal
    : null;

  return { totalOoT, totalBIB, totalTr, totalDr, medianResp, meanResp };
}

function calculateMsbStats(features, areaFeature) {
  return calculateMsbStatsForAreas(features, [areaFeature]);
}

function sumAreaFeaturesKm2(areaFeatures) {
  if (!Array.isArray(areaFeatures) || !areaFeatures.length) return 0;
  return areaFeatures.reduce((sum, feature) => sum + turf.area(feature), 0) / 1_000_000;
}

function formatSignedPercent(value) {
  const rounded = Math.round(value * 10) / 10;
  if (rounded > 0) return `+${rounded.toLocaleString("sv-SE", { maximumFractionDigits: 1 })}`;
  return rounded.toLocaleString("sv-SE", { maximumFractionDigits: 1 });
}

function buildMsbRiskComparisonLines(areaStats, municipalityBaseline, areaPopulation, areaAreaKm2) {
  if (!municipalityBaseline || !Number.isFinite(areaPopulation) || areaPopulation <= 0) return [];

  const compareRows = [
    { label: "Olyckor/tillbud", observed: areaStats.totalOoT, municipality: municipalityBaseline.stats.totalOoT },
    { label: "Brand i byggnad", observed: areaStats.totalBIB, municipality: municipalityBaseline.stats.totalBIB },
    { label: "Trafikolyckor", observed: areaStats.totalTr, municipality: municipalityBaseline.stats.totalTr },
    { label: "Drunkningsolyckor", observed: areaStats.totalDr, municipality: municipalityBaseline.stats.totalDr },
  ];

  const lines = ["<span class=\"msb-stats-section-title\">Avvikelse mot kommunsnitt</span>"];

  for (const row of compareRows) {
    const expectedByPopulation = municipalityBaseline.populationTotal > 0
      ? row.municipality * (areaPopulation / municipalityBaseline.populationTotal)
      : 0;
    const expectedByArea = municipalityBaseline.areaKm2 > 0
      ? row.municipality * (areaAreaKm2 / municipalityBaseline.areaKm2)
      : 0;

    if (expectedByPopulation <= 0 && expectedByArea <= 0) continue;

    const popDelta = expectedByPopulation > 0
      ? ((row.observed / expectedByPopulation) - 1) * 100
      : null;
    const areaDelta = expectedByArea > 0
      ? ((row.observed / expectedByArea) - 1) * 100
      : null;

    const parts = [];
    if (popDelta !== null) {
      parts.push(`${formatSignedPercent(popDelta)}% per 1 000 inv.`);
    }
    if (areaDelta !== null) {
      parts.push(`${formatSignedPercent(areaDelta)}% per km²`);
    }

    if (parts.length) {
      lines.push(`${row.label}: ${parts.join(" | ")}`);
    }
  }

  if (lines.length === 1) {
    return [];
  }

  lines.push("<span class=\"msb-stats-footnote\">Befolkningsjusterat först, yta som stöd.</span>");
  return lines;
}

async function getMunicipalityPopulationBaseline(populationContext) {
  const municipality = populationContext?.municipality;
  if (!municipality?.areas?.length) return null;

  const cacheKey = [
    populationContext.layerName,
    populationContext.populationField,
    municipality.sourceLayer,
    municipality.field,
    municipality.value,
  ].join("|");

  const inMemory = municipalityPopulationBaselineCache.get(cacheKey);
  if (inMemory) return inMemory;

  const local = readLocalCache(`population:${cacheKey}`);
  if (local) {
    municipalityPopulationBaselineCache.set(cacheKey, local);
    return local;
  }

  const municipalityBbox = turf.bbox(turf.featureCollection(municipality.areas));
  const municipalityPopulationFeatures = await fetchFeaturesForBbox(populationContext.layerName, municipalityBbox, 50000);
  const populationResult = calculatePopulationWithinAreas(
    municipalityPopulationFeatures,
    municipality.areas,
    populationContext.populationField,
  );

  const value = {
    populationTotal: populationResult.total,
    featureCount: municipalityPopulationFeatures.length,
  };
  municipalityPopulationBaselineCache.set(cacheKey, value);
  writeLocalCache(`population:${cacheKey}`, value);
  return value;
}

async function getMunicipalityMsbBaseline(populationContext) {
  const municipality = populationContext?.municipality;
  if (!municipality?.areas?.length) return null;

  const cacheKey = [municipality.sourceLayer, municipality.field, municipality.value].join("|");

  const inMemory = municipalityMsbBaselineCache.get(cacheKey);
  if (inMemory) return inMemory;

  const local = readLocalCache(`msb:${cacheKey}`);
  if (local) {
    municipalityMsbBaselineCache.set(cacheKey, local);
    return local;
  }

  const municipalityMsbFeatures = await fetchMsbStatsForAreas(municipality.areas);
  const stats = calculateMsbStatsForAreas(municipalityMsbFeatures, municipality.areas);
  const populationBaseline = await getMunicipalityPopulationBaseline(populationContext);
  if (!populationBaseline || populationBaseline.populationTotal <= 0) return null;

  const value = {
    stats,
    populationTotal: populationBaseline.populationTotal,
    areaKm2: sumAreaFeaturesKm2(municipality.areas),
  };

  municipalityMsbBaselineCache.set(cacheKey, value);
  writeLocalCache(`msb:${cacheKey}`, value);
  return value;
}

async function getCapabilities() {
  const url = `${SCB_WFS_URL}?service=WFS&version=1.1.0&request=GetCapabilities`;
  const res = await fetchDirect(url);
  const text = await res.text();
  const xml = new DOMParser().parseFromString(text, "text/xml");
  const names = Array.from(xml.getElementsByTagName("FeatureType"))
    .map((node) => node.getElementsByTagName("Name")[0]?.textContent?.trim())
    .filter(Boolean);
  return names;
}

function chooseLayerName(layerNames) {
  if (SCB_LAYER_NAME_OVERRIDE) return SCB_LAYER_NAME_OVERRIDE;
  const ranked = rankLayerNames(layerNames);
  return ranked[0] || null;
}

function rankLayerNames(layerNames) {
  return [...layerNames].sort((a, b) => {
    const aLc = a.toLowerCase();
    const bLc = b.toLowerCase();

    const score = (lc) => {
      let s = 0;
      if (lc.includes("bef") || lc.includes("befolk")) s += 80;
      if (lc.includes("pop")) s += 50;
      if (lc.includes("ruta") || lc.includes("grid") || lc.includes("km") || lc.includes("250m")) s += 100;
      if (lc.includes("deso") || lc.includes("regso")) s -= 10;
      if (lc.includes("grans") || lc.includes("boundary")) s -= 30;
      return s;
    };

    return score(bLc) - score(aLc);
  });
}

function areaKm2(feature) {
  return turf.area(feature) / 1_000_000;
}

async function evaluateLayerForPopulation(layerName, bounds, areaFeatures) {
  const features = await fetchFeaturesForBounds(layerName, bounds);
  if (!features.length) return null;

  const field = choosePopulationFieldFromFeatures(features);
  if (!field) return null;

  const result = calculatePopulationWithinAreas(features, areaFeatures, field);
  return {
    layerName,
    field,
    total: result.total,
    matched: result.matched,
    featureCount: features.length,
    features,
  };
}

async function ensureLayerSelected() {
  if (selectedLayerName) return selectedLayerName;
  setStatus("Hämtar SCB capabilities...");
  const layerNames = await getCapabilities();
  const chosen = chooseLayerName(layerNames);
  if (!chosen) {
    throw new Error("Kunde inte hitta en passande SCB-layer automatiskt. Sätt SCB_LAYER_NAME_OVERRIDE i app.js.");
  }
  selectedLayerName = chosen;
  return chosen;
}

async function fetchFeaturesForBounds(layerName, bounds) {
  const bbox = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth(), "EPSG:4326"].join(",");

  const params = new URLSearchParams({
    service: "WFS",
    version: "1.1.0",
    request: "GetFeature",
    typeName: layerName,
    outputFormat: "application/json",
    srsName: "EPSG:4326",
    bbox,
    maxFeatures: "10000",
  });

  const url = `${SCB_WFS_URL}?${params.toString()}`;
  const res = await fetchDirect(url);
  const json = await res.json();
  return json.features || [];
}

async function fetchFeaturesForBbox(layerName, bboxArray, maxFeatures = 10000) {
  const bbox = [bboxArray[0], bboxArray[1], bboxArray[2], bboxArray[3], "EPSG:4326"].join(",");

  const params = new URLSearchParams({
    service: "WFS",
    version: "1.1.0",
    request: "GetFeature",
    typeName: layerName,
    outputFormat: "application/json",
    srsName: "EPSG:4326",
    bbox,
    maxFeatures: String(maxFeatures),
  });

  const url = `${SCB_WFS_URL}?${params.toString()}`;
  const res = await fetchDirect(url);
  const json = await res.json();
  return json.features || [];
}

function buildMunicipalityAreasFromFeatures(adminFeatures, municipalityField, municipalityValue) {
  const muniKey = String(municipalityValue);
  return adminFeatures
    .filter((feature) => String(feature?.properties?.[municipalityField]) === muniKey)
    .map((feature) => turf.feature(feature.geometry, feature.properties || {}));
}

function calculateDemographicBreakdownForAreas(features, areaFeatures, fields) {
  if (!Array.isArray(areaFeatures) || !areaFeatures.length) {
    return {
      male: null,
      female: null,
      age: (fields.ageFields || []).map((entry) => ({ label: entry.label, key: entry.key, value: 0 })),
    };
  }

  const totals = {
    male: null,
    female: null,
    age: [],
  };

  const ageSums = new Map();
  for (const entry of fields.ageFields || []) {
    ageSums.set(entry.key, 0);
  }

  let maleSum = 0;
  let femaleSum = 0;
  let maleSeen = false;
  let femaleSeen = false;

  for (const rawFeature of features) {
    const feature = turf.feature(rawFeature.geometry, rawFeature.properties || {});
    const wholeArea = turf.area(feature);
    if (wholeArea <= 0) continue;

    let cutAreaTotal = 0;
    for (const areaFeature of areaFeatures) {
      let intersection = null;
      try {
        intersection = turf.intersect(feature, areaFeature);
      } catch {
        try {
          intersection = turf.intersect(turf.featureCollection([feature, areaFeature]));
        } catch {
          intersection = null;
        }
      }
      if (!intersection) continue;

      const cutArea = turf.area(intersection);
      if (cutArea > 0) cutAreaTotal += cutArea;
    }

    if (cutAreaTotal <= 0) continue;
    const ratio = Math.min(1, cutAreaTotal / wholeArea);

    if (fields.maleField) {
      const v = safeParseFloat(rawFeature.properties?.[fields.maleField]);
      if (v !== null) {
        maleSum += v * ratio;
        maleSeen = true;
      }
    }

    if (fields.femaleField) {
      const v = safeParseFloat(rawFeature.properties?.[fields.femaleField]);
      if (v !== null) {
        femaleSum += v * ratio;
        femaleSeen = true;
      }
    }

    for (const ageEntry of fields.ageFields || []) {
      const v = safeParseFloat(rawFeature.properties?.[ageEntry.key]);
      if (v === null) continue;
      ageSums.set(ageEntry.key, (ageSums.get(ageEntry.key) || 0) + v * ratio);
    }
  }

  if (maleSeen) totals.male = maleSum;
  if (femaleSeen) totals.female = femaleSum;
  totals.age = (fields.ageFields || []).map((entry) => ({
    label: entry.label,
    key: entry.key,
    value: ageSums.get(entry.key) || 0,
  }));

  return totals;
}

async function findMunicipalityFromAdminLayers(areaFeature, bounds) {
  for (const adminLayer of MUNICIPALITY_ADMIN_LAYERS) {
    try {
      const candidates = await fetchFeaturesForBounds(adminLayer, bounds);
      if (!candidates.length) continue;

      const municipalityField = detectMunicipalityField(candidates, []);
      if (!municipalityField) continue;

      const municipalityValue = identifyMunicipalityValue(candidates, areaFeature, municipalityField);
      if (!municipalityValue) continue;

      const geometryCacheKey = `${adminLayer}|${municipalityField}|${municipalityValue}`;
      let municipalityAreas = municipalityGeometryCache.get(geometryCacheKey) || null;

      if (!municipalityAreas) {
        const filter = buildMunicipalityFilter(municipalityField, municipalityValue);
        const municipalityFeatures = await fetchFeaturesByFilter(adminLayer, filter);
        municipalityAreas = buildMunicipalityAreasFromFeatures(
          municipalityFeatures,
          municipalityField,
          municipalityValue,
        );
        if (municipalityAreas.length) {
          municipalityGeometryCache.set(geometryCacheKey, municipalityAreas);
        }
      }

      if (!municipalityAreas.length) continue;

      return {
        adminLayer,
        municipalityField,
        municipalityValue,
        municipalityAreas,
      };
    } catch (error) {
      console.warn(`Adminlager misslyckades: ${adminLayer}`, error);
    }
  }

  return null;
}

function calculatePopulationWithinPolygon(features, areaFeature, populationField) {
  let total = 0;
  let matched = 0;

  for (const rawFeature of features) {
    const feature = turf.feature(rawFeature.geometry, rawFeature.properties || {});
    let intersection = null;
    try {
      intersection = turf.intersect(feature, areaFeature);
    } catch {
      try {
        intersection = turf.intersect(turf.featureCollection([feature, areaFeature]));
      } catch {
        intersection = null;
      }
    }

    if (!intersection) continue;

    const popValue = safeParseFloat(rawFeature.properties?.[populationField]);
    if (popValue === null) continue;

    const wholeArea = turf.area(feature);
    const cutArea = turf.area(intersection);
    if (wholeArea <= 0 || cutArea <= 0) continue;

    const ratio = Math.min(1, cutArea / wholeArea);
    total += popValue * ratio;
    matched += 1;
  }

  return { total, matched, usedField: populationField };
}

async function runPopulationEstimate(layer) {
  const geo = layer.toGeoJSON();
  const areaFeatures = geo.type === "FeatureCollection"
    ? (geo.features || []).filter((feature) => feature?.geometry)
    : (geo?.geometry ? [geo] : []);
  if (!areaFeatures.length) return;
  const primaryAreaFeature = areaFeatures[0];

  setStatus("Räknar befolkning inom området...");
  const bounds = layer.getBounds();

  const area = sumAreaFeaturesKm2(areaFeatures);
  currentPopulationContext = null;
  let layerName = await ensureLayerSelected();

  let evaluation = await evaluateLayerForPopulation(layerName, bounds, areaFeatures);
  if (!evaluation) {
    populationEl.textContent = "0";
    setStatus("Inga SCB-features i valt bbox-område.");
    setMeta([`Layer: ${layerName}`]);
    return;
  }

  const initialDensity = area > 0 ? evaluation.total / area : 0;
  const initialLayerLc = evaluation.layerName.toLowerCase();
  const shouldTryAlternatives =
    !SCB_LAYER_NAME_OVERRIDE &&
    area > 0 &&
    initialDensity < 50 &&
    !(initialLayerLc.includes("ruta") || initialLayerLc.includes("grid"));

  if (shouldTryAlternatives) {
    const allLayers = rankLayerNames(await getCapabilities());
    const alternatives = allLayers
      .filter((name) => name !== evaluation.layerName)
      .filter((name) => {
        const lc = name.toLowerCase();
        return lc.includes("ruta") || lc.includes("grid") || lc.includes("km");
      })
      .slice(0, 8);

    for (const candidate of alternatives) {
      const candidateEvaluation = await evaluateLayerForPopulation(candidate, bounds, areaFeatures);
      if (!candidateEvaluation) continue;
      const candidateDensity = area > 0 ? candidateEvaluation.total / area : 0;
      if (candidateDensity > initialDensity * 1.5 && candidateEvaluation.total > evaluation.total) {
        evaluation = candidateEvaluation;
        break;
      }
    }
  }

  selectedLayerName = evaluation.layerName;
  selectedPopulationField = evaluation.field;

  const rounded = Math.round(evaluation.total);
  populationEl.textContent = rounded.toLocaleString("sv-SE");

  const demographicFields = detectDemographicFields(evaluation.features, evaluation.field);
  const breakdown = calculateDemographicBreakdownForAreas(evaluation.features, areaFeatures, demographicFields);
  const breakdownLines = [];

  if (breakdown.male !== null || breakdown.female !== null) {
    breakdownLines.push("Kön (uppskattat):");
    if (breakdown.male !== null) breakdownLines.push(`Man: ${Math.round(breakdown.male).toLocaleString("sv-SE")}`);
    if (breakdown.female !== null) breakdownLines.push(`Kvinna: ${Math.round(breakdown.female).toLocaleString("sv-SE")}`);
  }

  let municipalityContext = null;
  let municipalityReason = "okänd orsak";
  if (
    demographicFields.maleField &&
    demographicFields.femaleField &&
    breakdown.male !== null &&
    breakdown.female !== null &&
    areaFeatures.length === 1
  ) {
    let municipalityField = detectMunicipalityField(evaluation.features, [evaluation.field]);
    if (!municipalityField) {
      municipalityReason = "saknar kommunkod/kommunfält i valt lager, provar RegSO/DeSO";
    }

    let municipalityValue = identifyMunicipalityValue(evaluation.features, primaryAreaFeature, municipalityField);
    let municipalityAreas = null;
    let municipalitySourceLayer = evaluation.layerName;

    if (!municipalityField || !municipalityValue) {
      const adminMatch = await findMunicipalityFromAdminLayers(primaryAreaFeature, bounds);
      if (adminMatch) {
        municipalityField = adminMatch.municipalityField;
        municipalityValue = adminMatch.municipalityValue;
        municipalityAreas = adminMatch.municipalityAreas;
        municipalitySourceLayer = adminMatch.adminLayer;
      }
    }

    if (municipalityField && municipalityValue && (!municipalityAreas || !municipalityAreas.length)) {
      const adminMatch = await findMunicipalityFromAdminLayers(primaryAreaFeature, bounds);
      if (adminMatch && String(adminMatch.municipalityValue) === String(municipalityValue)) {
        municipalityAreas = adminMatch.municipalityAreas;
        municipalitySourceLayer = adminMatch.adminLayer;
      }
    }

    if (municipalityField && !municipalityValue) {
      municipalityReason = "kunde inte avgöra kommun för markerad yta";
    }

    if (municipalityField && municipalityValue) {
      try {
        setStatus("Hämtar kommunsnitt för jämförelse...");
        let municipalityAverages = null;
        let municipalityFeatureCount = 0;

        const comparisonCacheKey = [
          evaluation.layerName,
          municipalitySourceLayer,
          municipalityField,
          municipalityValue,
          demographicFields.maleField,
          demographicFields.femaleField,
        ].join("|");

        const cachedComparison = municipalityComparisonCache.get(comparisonCacheKey);
        if (cachedComparison) {
          setStatus("Använder cache för kommunsnitt...");
          municipalityAverages = cachedComparison.averages;
          municipalityFeatureCount = cachedComparison.featureCount;
        }

        if (!cachedComparison && municipalityAreas && municipalityAreas.length) {
          const municipalityBbox = turf.bbox(turf.featureCollection(municipalityAreas));
          const municipalityPopulationFeatures = await fetchFeaturesForBbox(evaluation.layerName, municipalityBbox, 50000);
          municipalityFeatureCount = municipalityPopulationFeatures.length;

          const municipalityBreakdown = calculateDemographicBreakdownForAreas(
            municipalityPopulationFeatures,
            municipalityAreas,
            demographicFields,
          );
          const municipalityGenderTotal = (municipalityBreakdown.male || 0) + (municipalityBreakdown.female || 0);
          if (municipalityBreakdown.male !== null && municipalityBreakdown.female !== null && municipalityGenderTotal > 0) {
            municipalityAverages = {
              maleTotal: municipalityBreakdown.male,
              femaleTotal: municipalityBreakdown.female,
              maleShare: (municipalityBreakdown.male / municipalityGenderTotal) * 100,
              femaleShare: (municipalityBreakdown.female / municipalityGenderTotal) * 100,
            };
          }
        } else if (!cachedComparison) {
          const filter = buildMunicipalityFilter(municipalityField, municipalityValue);
          const municipalityFeatures = await fetchFeaturesByFilter(evaluation.layerName, filter);
          municipalityFeatureCount = municipalityFeatures.length;
          municipalityAverages = calculateMunicipalityGenderAverages(
            municipalityFeatures,
            demographicFields.maleField,
            demographicFields.femaleField,
          );
        }

        if (!cachedComparison && municipalityAverages) {
          municipalityComparisonCache.set(comparisonCacheKey, {
            averages: municipalityAverages,
            featureCount: municipalityFeatureCount,
          });
        }

        if (!municipalityFeatureCount) {
          municipalityReason = "hittade inga features för identifierad kommun";
        }

        const selectedGenderTotal = breakdown.male + breakdown.female;
        if (municipalityAverages && selectedGenderTotal > 0) {
          const selectedMaleShare = (breakdown.male / selectedGenderTotal) * 100;
          const selectedFemaleShare = (breakdown.female / selectedGenderTotal) * 100;
          const maleDiffPe = selectedMaleShare - municipalityAverages.maleShare;
          const femaleDiffPe = selectedFemaleShare - municipalityAverages.femaleShare;

          breakdownLines.push("Avvikelse mot kommunsnitt (kön):");
          breakdownLines.push(
            `Man: ${selectedMaleShare.toFixed(1).replace(".", ",")}% (kommun ${municipalityAverages.maleShare.toFixed(1).replace(".", ",")}% | ${formatSignedPe(maleDiffPe)} p.e.)`,
          );
          breakdownLines.push(
            `Kvinna: ${selectedFemaleShare.toFixed(1).replace(".", ",")}% (kommun ${municipalityAverages.femaleShare.toFixed(1).replace(".", ",")}% | ${formatSignedPe(femaleDiffPe)} p.e.)`,
          );

          municipalityContext = {
            field: municipalityField,
            value: municipalityValue,
            features: municipalityFeatureCount,
            sourceLayer: municipalitySourceLayer,
            areas: municipalityAreas || [],
          };
        } else {
          municipalityReason = "kommunfeatures saknar användbara könsvärden";
        }
      } catch (error) {
        municipalityReason = "anrop för kommunsnitt misslyckades";
        console.warn("Kunde inte beräkna kommunsnitt:", error);
      }
    }
  } else if (areaFeatures.length > 1) {
    municipalityReason = "flera kommunytor valda";
  } else {
    municipalityReason = "saknar könsfält eller könsvärden i vald yta";
  }

  const ageWithValues = breakdown.age.filter((x) => x.value > 0.5);
  if (ageWithValues.length) {
    breakdownLines.push("Åldersspann (uppskattat):");
    for (const ageRow of ageWithValues) {
      breakdownLines.push(`${ageRow.label}: ${Math.round(ageRow.value).toLocaleString("sv-SE")}`);
    }
  }

  if (!breakdownLines.length) {
    breakdownLines.push("Köns-/åldersfördelning finns inte i valt SCB-layer.");
  }
  setBreakdown(breakdownLines);

  setStatus("Klar.");

  setMeta([
    `Layer: ${evaluation.layerName}`,
    `Använt befolkningsfält: ${evaluation.field || "okänt"}`,
    municipalityContext
      ? `Kommunjämförelse: ${municipalityContext.field}=${municipalityContext.value} (${municipalityContext.features} features, källa ${municipalityContext.sourceLayer})`
      : `Kommunjämförelse: kunde inte beräknas (${municipalityReason})`,
    areaFeatures.length > 1 ? `Valda kommunytor: ${areaFeatures.length}` : "",
    `Features i bbox: ${evaluation.featureCount}`,
    `Features som bidrog till summa: ${evaluation.matched}`,
    "Obs: Delvis överlapp viktas med areaandel.",
  ].filter(Boolean));

  currentPopulationContext = {
    layerName: evaluation.layerName,
    populationField: evaluation.field,
    areaPopulation: evaluation.total,
    areaKm2: area,
    municipality: municipalityContext,
  };

  refreshMsbStatsHandler();
}

function initMapApp() {
  const map = L.map("map").setView([59.86, 17.95], 10);
  const mapEl = map.getContainer();
  const drawnItems = new L.FeatureGroup();
  map.addLayer(drawnItems);
  map.createPane("msbOverlayPane");
  map.getPane("msbOverlayPane").style.zIndex = "350";

  let msbOverlayLayer = null;
  let msbLegendControl = null;
  let currentDrawnPolygon = null;
  let currentAreaFeatures = [];
  let currentMode = "draw";
  let lastTravelLatLng = null;
  let printViewState = null;
  let municipalitySelectionLayer = null;
  let searchResultMarker = null;
  let wildlifeDataPromise = null;
  let wildlifeRecords = [];
  let wildlifeSpecies = [];
  let wildlifeInAreaCounts = new Map();
  let wildlifeInAreaRecords = [];
  const selectedWildlifeSpecies = new Set();
  const wildlifeMarkersLayer = L.layerGroup().addTo(map);
  let wildlifePanelEl = null;
  let wildlifeToggleEl = null;
  let wildlifeListEl = null;

  const azureTileAttribution =
    '&copy; <a href="https://www.microsoft.com/maps" target="_blank" rel="noreferrer">Microsoft Azure Maps</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>';

  function createAzureBaseLayer(tilesetId, options = {}) {
    const requestTileSize = options.requestTileSize || 256;
    const layerOptions = { ...options };
    delete layerOptions.requestTileSize;

    return L.tileLayer(
      `${AZURE_MAPS_TILE_URL.replace("microsoft.base.road", tilesetId).replace("tileSize=256", `tileSize=${requestTileSize}`)}${encodeURIComponent(AZURE_MAPS_KEY)}`,
      {
        maxZoom: 22,
        attribution: azureTileAttribution,
        ...layerOptions,
      },
    );
  }

  const baseLayers = AZURE_MAPS_KEY
    ? {
        Vägar: createAzureBaseLayer("microsoft.base.road"),
        Satellit: createAzureBaseLayer("microsoft.imagery", { maxNativeZoom: 19 }),
        Hybrid: createAzureBaseLayer("microsoft.base.hybrid.road"),
        "Mörk grå": createAzureBaseLayer("microsoft.base.darkgrey"),
      }
    : {
        OpenStreetMap: L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 22,
          attribution: "&copy; OpenStreetMap",
        }),
      };

  const defaultBaseLayer = Object.values(baseLayers)[0];
  defaultBaseLayer.addTo(map);
  L.control.layers(baseLayers, null, { position: "topright", collapsed: true }).addTo(map);

  async function searchWithAzureMaps(query) {
    if (!AZURE_MAPS_KEY) return null;
    const params = new URLSearchParams({
      "api-version": "1.0",
      query,
      limit: "1",
      countrySet: "SE",
      "subscription-key": AZURE_MAPS_KEY,
      language: "sv-SE",
    });
    const res = await fetch(`https://atlas.microsoft.com/search/address/json?${params.toString()}`);
    if (!res.ok) return null;
    const data = await res.json();
    const first = data?.results?.[0];
    if (!first?.position) return null;

    const lat = first.position.lat;
    const lon = first.position.lon;
    const viewport = first.viewport || null;
    const bounds = viewport
      ? L.latLngBounds(
          [viewport.btmRightPoint.lat, viewport.topLeftPoint.lon],
          [viewport.topLeftPoint.lat, viewport.btmRightPoint.lon],
        )
      : null;

    return { lat, lon, label: first.address?.freeformAddress || query, bounds };
  }

  async function searchWithNominatim(query) {
    const params = new URLSearchParams({
      format: "jsonv2",
      limit: "1",
      countrycodes: "se",
      q: query,
    });
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`);
    if (!res.ok) return null;
    const data = await res.json();
    const first = Array.isArray(data) ? data[0] : null;
    if (!first) return null;

    const lat = Number.parseFloat(first.lat);
    const lon = Number.parseFloat(first.lon);
    const bbox = Array.isArray(first.boundingbox) ? first.boundingbox : null;
    const bounds = bbox && bbox.length === 4
      ? L.latLngBounds(
          [Number.parseFloat(bbox[0]), Number.parseFloat(bbox[2])],
          [Number.parseFloat(bbox[1]), Number.parseFloat(bbox[3])],
        )
      : null;

    return {
      lat,
      lon,
      label: first.display_name || query,
      bounds,
    };
  }

  async function searchLocation(query) {
    const azureResult = await searchWithAzureMaps(query);
    if (azureResult) return azureResult;
    return searchWithNominatim(query);
  }

  const searchMarkerIcon = L.divIcon({
    html: '<div style="background: #ef4444; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 6px rgba(0,0,0,0.5);"></div>',
    iconSize: [16, 16],
    className: 'custom-search-marker',
  });

  function clearSearchResultMarker() {
    if (!searchResultMarker) return;
    map.removeLayer(searchResultMarker);
    searchResultMarker = null;
  }

  function getWildlifeSpeciesColor(species) {
    const palette = ["#14532d", "#1d4ed8", "#be123c", "#854d0e", "#6d28d9", "#0f766e", "#9f1239", "#1f2937"];
    let hash = 0;
    const text = String(species || "");
    for (let i = 0; i < text.length; i += 1) {
      hash = ((hash << 5) - hash) + text.charCodeAt(i);
      hash |= 0;
    }
    return palette[Math.abs(hash) % palette.length];
  }

  function hideWildlifeStats() {
    wildlifeInAreaCounts = new Map();
    wildlifeInAreaRecords = [];
    wildlifeMarkersLayer.clearLayers();
    if (wildlifeStatsBoxEl) wildlifeStatsBoxEl.classList.add("hidden");
    if (wildlifeStatsContentEl) wildlifeStatsContentEl.innerHTML = "";
  }

  function renderWildlifeStats() {
    if (!wildlifeStatsBoxEl || !wildlifeStatsContentEl) return;
    if (!wildlifeInAreaCounts.size) {
      wildlifeStatsContentEl.innerHTML = "Inga viltolyckor hittades i markerat område.";
      wildlifeStatsBoxEl.classList.remove("hidden");
      return;
    }

    const rows = [...wildlifeInAreaCounts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "sv"))
      .map(([species, count]) => `${escapeHtml(species)}: <strong>${count.toLocaleString("sv-SE")}</strong>`);

    wildlifeStatsContentEl.innerHTML = rows.join("<br>");
    wildlifeStatsBoxEl.classList.remove("hidden");
  }

  function renderWildlifeMarkersForSelection() {
    wildlifeMarkersLayer.clearLayers();
    if (!wildlifeInAreaRecords.length || !selectedWildlifeSpecies.size) return;

    const selectedRecords = wildlifeInAreaRecords.filter((record) => selectedWildlifeSpecies.has(record.species));
    for (const record of selectedRecords) {
      L.circleMarker([record.lat, record.lon], {
        radius: 4,
        weight: 1,
        color: "#ffffff",
        fillColor: getWildlifeSpeciesColor(record.species),
        fillOpacity: 0.88,
      })
        .bindPopup(`<strong>${escapeHtml(record.species)}</strong><br>Lat: ${record.lat.toFixed(5)}<br>Lon: ${record.lon.toFixed(5)}`)
        .addTo(wildlifeMarkersLayer);
    }
  }

  function renderWildlifeFilterOptions() {
    if (!wildlifeListEl) return;
    if (!wildlifeSpecies.length) {
      wildlifeListEl.innerHTML = '<div class="hint">Ingen viltdata laddad.</div>';
      return;
    }

    wildlifeListEl.innerHTML = wildlifeSpecies
      .map((species) => {
        const checked = selectedWildlifeSpecies.has(species) ? "checked" : "";
        return `<label class="wildlife-option"><input type="checkbox" data-wildlife-species="${escapeHtml(species)}" ${checked}> ${escapeHtml(species)}</label>`;
      })
      .join("");
  }

  async function ensureWildlifeDataLoaded() {
    if (wildlifeRecords.length) return;
    if (!wildlifeDataPromise) {
      wildlifeDataPromise = loadWildlifeAccidentData()
        .then((data) => {
          wildlifeRecords = data.records;
          wildlifeSpecies = data.speciesList;
          selectedWildlifeSpecies.clear();
          for (const species of wildlifeSpecies) {
            selectedWildlifeSpecies.add(species);
          }
          renderWildlifeFilterOptions();
        })
        .catch((error) => {
          wildlifeDataPromise = null;
          throw error;
        });
    }
    await wildlifeDataPromise;
  }

  async function refreshWildlifeForCurrentArea() {
    if (!Array.isArray(currentAreaFeatures) || !currentAreaFeatures.length) {
      hideWildlifeStats();
      return;
    }

    try {
      await ensureWildlifeDataLoaded();
      const summary = summarizeWildlifeWithinAreas(wildlifeRecords, currentAreaFeatures);
      wildlifeInAreaCounts = summary.counts;
      wildlifeInAreaRecords = summary.matchedRecords;
      renderWildlifeStats();
      renderWildlifeMarkersForSelection();
    } catch (error) {
      console.error("Fel vid viltdata:", error);
      wildlifeMarkersLayer.clearLayers();
      if (wildlifeStatsBoxEl) wildlifeStatsBoxEl.classList.add("hidden");
      setStatus(`Fel vid viltdata: ${error.message}`);
    }
  }

  const mapSearchControl = L.control({ position: "topright" });
  mapSearchControl.onAdd = () => {
    const container = L.DomUtil.create("div", "map-search-control map-search-wrapper");
    container.innerHTML = `
      <form class="map-search-form">
        <input type="search" placeholder="Sök plats på kartan" aria-label="Sök plats på kartan" />
        <button type="submit">Sök</button>
      </form>
    `;

    const form = container.querySelector("form");
    const input = container.querySelector("input");

    if (form && input) {
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const query = String(input.value || "").trim();
        if (!query) return;

        try {
          setStatus(`Söker efter: ${query}...`);
          const hit = await searchLocation(query);
          if (!hit || !Number.isFinite(hit.lat) || !Number.isFinite(hit.lon)) {
            setStatus(`Ingen träff för \"${query}\".`);
            return;
          }

          clearSearchResultMarker();
          searchResultMarker = L.marker([hit.lat, hit.lon], { icon: searchMarkerIcon }).addTo(map).bindPopup(escapeHtml(hit.label));
          searchResultMarker.on("popupclose", (event) => {
            if (event?.target !== searchResultMarker) return;
            clearSearchResultMarker();
            setStatus("Sökmarkering borttagen.");
          });

          if (hit.bounds && hit.bounds.isValid()) {
            map.fitBounds(hit.bounds, { padding: [30, 30] });
          } else {
            map.setView([hit.lat, hit.lon], 13);
          }

          searchResultMarker.openPopup();
          setStatus(`Sökresultat: ${hit.label}`);
          input.value = "";
        } catch (error) {
          console.error("Sökfel:", error);
          setStatus(`Fel vid sökning: ${error.message}`);
        }
      });

      input.addEventListener("input", () => {
        if (!input.value && searchResultMarker) {
          clearSearchResultMarker();
          setStatus("Sökmarkering borttagen.");
        }
      });
    }

    L.DomEvent.disableClickPropagation(container);
    L.DomEvent.disableScrollPropagation(container);
    return container;
  };
  mapSearchControl.addTo(map);

  const drawControl = new L.Control.Draw({
    edit: { featureGroup: drawnItems },
    draw: {
      polygon: true,
      rectangle: true,
      circle: false,
      marker: false,
      circlemarker: false,
      polyline: false,
    },
  });
  map.addControl(drawControl);

  const areaStyleControl = L.control({ position: "topright" });
  let areaStylePanelEl = null;
  let areaStyleToggleEl = null;
  let areaStyleMapInputs = [];
  let areaStrokeColorInputEl = null;
  let areaFillColorInputEl = null;
  let areaStylePresetButtons = [];

  areaStyleControl.onAdd = () => {
    const container = L.DomUtil.create("div", "area-style-map-control");
    container.innerHTML = `
      <button type="button" class="area-style-toggle" aria-expanded="false" aria-controls="area-style-panel-map" title="Omradesstil" aria-label="Omradesstil"><span aria-hidden="true">&#x1F58C;</span></button>
      <div id="area-style-panel-map" class="area-style-panel hidden">
        <div class="title">Områdesstil</div>
        <label><input type="radio" name="area-style-map" value="fill" checked> Fyllnad</label>
        <label><input type="radio" name="area-style-map" value="outline"> Kantlinje</label>
        <div class="area-style-presets">
          <button type="button" class="area-style-preset-btn" data-preset="soft">Diskret</button>
          <button type="button" class="area-style-preset-btn" data-preset="contrast">Kontrast</button>
          <button type="button" class="area-style-preset-btn" data-preset="print">Printvanlig</button>
        </div>
        <label class="color-picker-row">Kantfarg <input type="color" id="area-stroke-color-map" value="#0f766e" aria-label="Valj kantfarg" /></label>
        <label class="color-picker-row">Fyllfarg <input type="color" id="area-fill-color-map" value="#14b8a6" aria-label="Valj fyllfarg" /></label>
      </div>
    `;

    areaStylePanelEl = container.querySelector("#area-style-panel-map");
    areaStyleToggleEl = container.querySelector(".area-style-toggle");
    areaStyleMapInputs = Array.from(container.querySelectorAll('input[name="area-style-map"]'));
    areaStrokeColorInputEl = container.querySelector("#area-stroke-color-map");
    areaFillColorInputEl = container.querySelector("#area-fill-color-map");
    areaStylePresetButtons = Array.from(container.querySelectorAll(".area-style-preset-btn"));

    if (areaStyleToggleEl && areaStylePanelEl) {
      areaStyleToggleEl.addEventListener("click", () => {
        const willOpen = areaStylePanelEl.classList.contains("hidden");
        areaStylePanelEl.classList.toggle("hidden", !willOpen);
        areaStyleToggleEl.setAttribute("aria-expanded", willOpen ? "true" : "false");
      });
    }

    L.DomEvent.disableClickPropagation(container);
    L.DomEvent.disableScrollPropagation(container);
    return container;
  };
  areaStyleControl.addTo(map);

  const wildlifeControl = L.control({ position: "topright" });
  wildlifeControl.onAdd = () => {
    const container = L.DomUtil.create("div", "wildlife-map-control");
    container.innerHTML = `
      <button type="button" class="wildlife-toggle" aria-expanded="false" aria-controls="wildlife-panel-map" title="Viltolyckor" aria-label="Viltolyckor">V</button>
      <div id="wildlife-panel-map" class="wildlife-panel hidden">
        <div class="title">Viltolyckor</div>
        <div class="hint">Välj vilka djurarter som ska visas på kartan.</div>
        <div class="wildlife-list"><div class="hint">Läser viltdata...</div></div>
      </div>
    `;

    wildlifePanelEl = container.querySelector("#wildlife-panel-map");
    wildlifeToggleEl = container.querySelector(".wildlife-toggle");
    wildlifeListEl = container.querySelector(".wildlife-list");

    if (wildlifeToggleEl && wildlifePanelEl) {
      wildlifeToggleEl.addEventListener("click", async () => {
        const willOpen = wildlifePanelEl.classList.contains("hidden");
        wildlifePanelEl.classList.toggle("hidden", !willOpen);
        wildlifeToggleEl.setAttribute("aria-expanded", willOpen ? "true" : "false");
        if (!willOpen) return;

        try {
          await ensureWildlifeDataLoaded();
          renderWildlifeFilterOptions();
          renderWildlifeMarkersForSelection();
        } catch (error) {
          if (wildlifeListEl) {
            wildlifeListEl.innerHTML = `<div class="hint">Fel: ${escapeHtml(error.message)}</div>`;
          }
        }
      });
    }

    if (wildlifeListEl) {
      wildlifeListEl.addEventListener("change", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement)) return;
        if (target.type !== "checkbox") return;
        const species = target.dataset.wildlifeSpecies || "";
        if (!species) return;

        if (target.checked) selectedWildlifeSpecies.add(species);
        else selectedWildlifeSpecies.delete(species);

        renderWildlifeMarkersForSelection();
      });
    }

    L.DomEvent.disableClickPropagation(container);
    L.DomEvent.disableScrollPropagation(container);
    return container;
  };
  wildlifeControl.addTo(map);

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Node)) return;
    if (!areaStylePanelEl || !areaStyleToggleEl) return;
    if (areaStylePanelEl.contains(target) || areaStyleToggleEl.contains(target)) return;
    areaStylePanelEl.classList.add("hidden");
    areaStyleToggleEl.setAttribute("aria-expanded", "false");
  });

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Node)) return;
    if (!wildlifePanelEl || !wildlifeToggleEl) return;
    if (wildlifePanelEl.contains(target) || wildlifeToggleEl.contains(target)) return;
    wildlifePanelEl.classList.add("hidden");
    wildlifeToggleEl.setAttribute("aria-expanded", "false");
  });

  function setCurrentAreaFromLayer(layer) {
    const geo = layer?.toGeoJSON ? layer.toGeoJSON() : null;
    const areaFeatures = geo?.type === "FeatureCollection"
      ? (geo.features || []).filter((feature) => feature?.geometry)
      : (geo?.geometry ? [geo] : []);

    currentAreaFeatures = areaFeatures;
    currentDrawnPolygon = areaFeatures[0] || null;
  }

  function updateMunicipalitySummary() {
    if (!municipalitySelectionSummaryEl || !municipalityDropdownToggleEl) return;

    if (!selectedMunicipalityCodes.size) {
      municipalitySelectionSummaryEl.textContent = "Inga valda kommuner.";
      municipalityDropdownToggleEl.textContent = "Välj kommuner";
      return;
    }

    const selectedNames = municipalityEntries
      .filter((entry) => selectedMunicipalityCodes.has(entry.code))
      .map((entry) => entry.name);

    municipalityDropdownToggleEl.textContent = `Valda kommuner (${selectedMunicipalityCodes.size})`;
    const preview = selectedNames.slice(0, 3).join(", ");
    municipalitySelectionSummaryEl.textContent = selectedNames.length > 3
      ? `${preview} + ${selectedNames.length - 3} till.`
      : preview;
  }

  async function ensureMunicipalityFeaturesForCode(code) {
    if (!municipalityBoundaryMeta || !code) return [];

    const cached = municipalityBoundaryMeta.featuresByCode.get(code) || [];
    if (cached.length) return cached;

    if (
      (municipalityBoundaryMeta.source === "local-shapefile" || municipalityBoundaryMeta.source === "local-shapefile-lazy") &&
      !municipalityBoundaryMeta.localShapeLoaded
    ) {
      try {
        setStatus("Läser lokal kommungeometri...");
        const localShape = await loadMunicipalityBoundariesFromLocalShapefile();
        for (const [shapeCode, features] of localShape.featuresByCode.entries()) {
          municipalityBoundaryMeta.featuresByCode.set(shapeCode, features);
        }
        municipalityBoundaryMeta.localShapeLoaded = true;
        const ready = municipalityBoundaryMeta.featuresByCode.get(code) || [];
        if (ready.length) return ready;
      } catch (error) {
        console.warn("Kunde inte läsa lokal shapefile-geometri:", error);
      }
    }

    const localBoundaryPath = municipalityBoundaryMeta.boundaryPathByCode?.get(code);
    if (localBoundaryPath) {
      try {
        const res = await fetch(`${localBoundaryPath}?v=1`, { cache: "force-cache" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const geo = await res.json();
        const loadedFeatures = geo?.type === "FeatureCollection"
          ? (geo.features || []).filter((feature) => feature?.geometry)
          : geo?.geometry
            ? [geo]
            : [];
        if (!loadedFeatures.length) {
          setStatus(`Ingen geometri i lokal fil för kommun ${code}.`);
          // Fall through to SCB fetch below when local file is empty.
        } else {
          municipalityBoundaryMeta.featuresByCode.set(code, loadedFeatures);
          municipalityBoundaryMeta.dissolvedByCode.delete(code);
          return loadedFeatures;
        }
      } catch (error) {
        console.warn(`Kunde inte läsa lokal kommunfil för ${code}:`, localBoundaryPath, error);
        setStatus(`Saknar lokal kommunfil: ${localBoundaryPath}`);
      }
    } else {
      setStatus(`Saknar sökväg för lokal kommunfil: ${code}`);
    }

    if (municipalityBoundaryMeta.source === "arcgis-feature-service") {
      try {
        const features = await loadMunicipalityFeaturesForCodeFromArcGis(code);
        municipalityBoundaryMeta.featuresByCode.set(code, features);
        municipalityBoundaryMeta.dissolvedByCode.delete(code);
        return features;
      } catch (error) {
        console.warn(`Kunde inte hämta kommungeometri från ArcGIS för ${code}:`, error);
        return cached;
      }
    }

    if (municipalityBoundaryMeta.source !== "scb-wfs" && municipalityBoundaryMeta.source !== "hybrid-local-scb") return cached;
    if (!municipalityBoundaryMeta.layerName || !municipalityBoundaryMeta.codeField) return cached;

    try {
      const filter = buildMunicipalityFilter(municipalityBoundaryMeta.codeField, code);
      const fetched = await fetchFeaturesByFilter(municipalityBoundaryMeta.layerName, filter);
      const valid = fetched.filter((feature) => feature?.geometry);
      municipalityBoundaryMeta.featuresByCode.set(code, valid);
      municipalityBoundaryMeta.dissolvedByCode.delete(code);
      return valid;
    } catch (error) {
      console.warn(`Kunde inte hämta full kommungeometri för ${code}:`, error);
      return cached;
    }
  }

  async function renderMunicipalitySelectionOnMap(options = {}) {
    const shouldFitBounds = Boolean(options.fitBounds);

    if (municipalitySelectionLayer) {
      map.removeLayer(municipalitySelectionLayer);
      municipalitySelectionLayer = null;
    }

    if (!municipalityBoundaryMeta || !selectedMunicipalityCodes.size) {
      return null;
    }

    const selectedFeatures = [];
    for (const code of selectedMunicipalityCodes) {
      const group = await ensureMunicipalityFeaturesForCode(code);
      if (!group.length) continue;

      // Render all municipality sub-areas directly to avoid geometry loss from union failures.
      selectedFeatures.push(...group.filter((feature) => feature?.geometry));
    }

    if (!selectedFeatures.length) return null;

    municipalitySelectionLayer = L.geoJSON(
      { type: "FeatureCollection", features: selectedFeatures },
      {
        style: {
          color: currentAreaStrokeColor,
          weight: 2.5,
          fillColor: currentAreaFillColor,
          fillOpacity: useFilledArea() ? 0.2 : 0,
          opacity: 1,
        },
      },
    ).addTo(map);

    if (shouldFitBounds) {
      const bounds = municipalitySelectionLayer.getBounds();
      if (bounds?.isValid()) {
        map.fitBounds(bounds, { padding: [25, 25] });
      }
    }

    return municipalitySelectionLayer;
  }

  function resetResultBoxesForNewSelection() {
    currentPopulationContext = null;
    populationEl.textContent = "-";
    setBreakdown([]);
    setMeta([]);
  }

  async function applyMunicipalitySelectionAsArea(options = {}) {
    const selectedLayer = await renderMunicipalitySelectionOnMap(options);
    if (!selectedLayer) {
      currentAreaFeatures = [];
      currentDrawnPolygon = null;
      resetResultBoxesForNewSelection();
      hideMsbStats();
      hideWildlifeStats();
      const msbKey = msbOverlaySelectEl?.value || "none";
      if (msbKey !== "none") {
        renderMsbOverlay(msbKey).catch((err) => {
          console.error(err);
          setStatus(`Fel vid MSB-overlay: ${err.message}`);
        });
      }
      return;
    }

    setCurrentAreaFromLayer(selectedLayer);
    resetResultBoxesForNewSelection();
    refreshWildlifeForCurrentArea().catch((err) => {
      console.error("Viltdatafel:", err);
    });

    const msbKey = msbOverlaySelectEl?.value || "none";
    if (msbKey !== "none") {
      renderMsbOverlay(msbKey).catch((err) => {
        console.error(err);
        setStatus(`Fel vid MSB-overlay: ${err.message}`);
      });
    } else {
      refreshMsbStatsForCurrentPolygon();
    }

    runPopulationEstimate(selectedLayer).catch((err) => {
      console.error(err);
      setStatus(`Fel: ${err.message}`);
      populationEl.textContent = "-";
      setBreakdown([]);
    });
  }

  function renderMunicipalityOptions(filterValue = "") {
    if (!municipalityCheckboxListEl) return;
    const filter = String(filterValue || "").trim().toLowerCase();

    const visible = municipalityEntries.filter((entry) => {
      if (!filter) return true;
      return entry.name.toLowerCase().includes(filter) || entry.code.includes(filter);
    });

    if (!visible.length) {
      municipalityCheckboxListEl.innerHTML = '<div class="hint">Inga kommuner matchar sökningen.</div>';
      return;
    }

    municipalityCheckboxListEl.innerHTML = visible
      .map(
        (entry) =>
          `<label class="municipality-option"><input type="checkbox" data-municipality-code="${escapeHtml(entry.code)}" ${selectedMunicipalityCodes.has(entry.code) ? "checked" : ""}> ${escapeHtml(entry.name)} (${escapeHtml(entry.code)})</label>`,
      )
      .join("");
  }

  async function loadMunicipalityOptions() {
    if (!municipalityCheckboxListEl) return;

    municipalityCheckboxListEl.innerHTML = '<div class="hint">Läser lokal kommundata...</div>';

    try {
      // 0) Primary source: ArcGIS kommungränser (Lantmäteriet).
      try {
        municipalityCheckboxListEl.innerHTML = '<div class="hint">Läser kommunlista från ArcGIS...</div>';
        const arcgisEntries = await loadMunicipalityIndexFromArcGis();
        if (arcgisEntries.length >= 250) {
          municipalityEntries = arcgisEntries;
          municipalityBoundaryMeta = {
            source: "arcgis-feature-service",
            boundaryPathByCode: new Map(),
            layerName: null,
            codeField: null,
            featuresByCode: new Map(),
            dissolvedByCode: new Map(),
            localShapeLoaded: false,
          };

          renderMunicipalityOptions("");
          updateMunicipalitySummary();
          setStatus("Redo.");
          return;
        }
      } catch (arcgisError) {
        console.warn("Kunde inte läsa kommunlista från ArcGIS, provar lokal data:", arcgisError);
      }

      // 1) Fast path: local index file with all municipality names.
      try {
        const localIndex = await loadMunicipalityIndexFromLocal();
        if (localIndex.length >= 250) {
          municipalityEntries = localIndex.map(({ code, name }) => ({ code, name }));
          municipalityBoundaryMeta = {
            source: "local-index-files",
            boundaryPathByCode: new Map(localIndex.map((entry) => [entry.code, entry.boundaryPath])),
            layerName: null,
            codeField: null,
            featuresByCode: new Map(),
            dissolvedByCode: new Map(),
            localShapeLoaded: false,
          };

          renderMunicipalityOptions("");
          updateMunicipalitySummary();
          setStatus("Redo.");
          return;
        }
      } catch (localIndexError) {
        console.warn("Kunde inte läsa komplett lokal kommunindex:", localIndexError);
      }

      // 2) Fast fallback: parse local DBF for names only (quick), defer geometry parsing.
      try {
        const dbfEntries = await loadMunicipalityIndexFromLocalDbf();
        if (dbfEntries.length >= 250) {
          municipalityEntries = dbfEntries.map(({ code, name }) => ({ code, name }));
          municipalityBoundaryMeta = {
            source: "local-shapefile-lazy",
            boundaryPathByCode: new Map(dbfEntries.map((entry) => [entry.code, entry.boundaryPath])),
            layerName: null,
            codeField: null,
            featuresByCode: new Map(),
            dissolvedByCode: new Map(),
            localShapeLoaded: false,
          };

          renderMunicipalityOptions("");
          updateMunicipalitySummary();
          setStatus("Redo.");
          return;
        }
      } catch (shapeIndexError) {
        console.warn("Kunde inte läsa lokal DBF-index, använder fallback:", shapeIndexError);
      }

      // 3) Last local fallback: parse full local SHP/DBF (heavier, but still offline/local).
      try {
        setStatus("Läser lokala kommungränser (full data)...");
        const localShape = await loadMunicipalityBoundariesFromLocalShapefile();
        if (localShape.entries.length >= 250) {
          municipalityEntries = localShape.entries;
          municipalityBoundaryMeta = {
            source: "local-shapefile",
            boundaryPathByCode: new Map(),
            layerName: null,
            codeField: null,
            featuresByCode: localShape.featuresByCode,
            dissolvedByCode: new Map(),
            localShapeLoaded: true,
          };

          renderMunicipalityOptions("");
          updateMunicipalitySummary();
          setStatus("Redo.");
          return;
        }
      } catch (localShapeError) {
        console.warn("Kunde inte läsa lokal shapefile som fallback:", localShapeError);
      }

      municipalityCheckboxListEl.innerHTML = '<div class="hint">Kunde inte läsa lokal kommunlista. Kontrollera data-filerna i data/shape_svenska_260225/kommun.</div>';
      setStatus("Fel: lokal kommundata saknas eller kunde inte läsas.");
      return;
    } catch (error) {
      console.error("Kunde inte läsa kommuner:", error);
      municipalityCheckboxListEl.innerHTML = '<div class="hint">Fel vid hämtning av kommunlista.</div>';
    }
  }

  function setupMunicipalityDropdown() {
    if (!municipalityDropdownToggleEl || !municipalityDropdownPanelEl || !municipalityCheckboxListEl) return;
    let municipalityOptionsLoaded = false;

    municipalityDropdownToggleEl.addEventListener("click", () => {
      const willOpen = municipalityDropdownPanelEl.classList.contains("hidden");
      municipalityDropdownPanelEl.classList.toggle("hidden", !willOpen);
      municipalityDropdownToggleEl.setAttribute("aria-expanded", willOpen ? "true" : "false");
      if (willOpen && !municipalityOptionsLoaded) {
        municipalityOptionsLoaded = true;
        loadMunicipalityOptions().catch((error) => {
          console.error("Kommunlistan kunde inte startas:", error);
          municipalityOptionsLoaded = false;
        });
      }
      if (willOpen && municipalityFilterInputEl) {
        municipalityFilterInputEl.focus();
      }
    });

    document.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (municipalityDropdownPanelEl.contains(target) || municipalityDropdownToggleEl.contains(target)) return;
      municipalityDropdownPanelEl.classList.add("hidden");
      municipalityDropdownToggleEl.setAttribute("aria-expanded", "false");
    });

    municipalityCheckboxListEl.addEventListener("change", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;
      if (target.type !== "checkbox") return;

      const code = target.dataset.municipalityCode || "";
      if (!code) return;

      if (target.checked) {
        selectedMunicipalityCodes.add(code);
      } else {
        selectedMunicipalityCodes.delete(code);
      }

      updateMunicipalitySummary();
      applyMunicipalitySelectionAsArea({ fitBounds: true }).catch((error) => {
        console.error("Kunde inte applicera kommunval:", error);
      });
    });

    if (municipalityFilterInputEl) {
      municipalityFilterInputEl.addEventListener("input", () => {
        renderMunicipalityOptions(municipalityFilterInputEl.value);
      });
    }

    updateMunicipalitySummary();
  }

  setupMunicipalityDropdown();

  function clearMsbOverlay() {
    if (msbOverlayLayer) {
      map.removeLayer(msbOverlayLayer);
      msbOverlayLayer = null;
    }
    if (msbLegendControl) {
      map.removeControl(msbLegendControl);
      msbLegendControl = null;
    }
    setCurrentMsbOverlayLabel("");
  }

  function renderMsbLegend(overlayConfig) {
    if (msbLegendControl) {
      map.removeControl(msbLegendControl);
      msbLegendControl = null;
    }

    const items = buildMsbLegendItems(overlayConfig);
    if (!items.length) return;

    msbLegendControl = L.control({ position: "bottomright" });
    msbLegendControl.onAdd = () => {
      const container = L.DomUtil.create("div", "msb-legend");
      const rows = items
        .map(
          (item) =>
            `<div class="msb-legend-row"><span class="msb-legend-swatch" style="background:${item.color}"></span><span>${item.label}</span></div>`,
        )
        .join("");

      container.innerHTML = `
        <div class="msb-legend-title">${overlayConfig.title}</div>
        <div class="msb-legend-unit">${overlayConfig.unit || ""}</div>
        ${rows}
      `;

      return container;
    };

    msbLegendControl.addTo(map);
  }

  function showMsbStats(stats, comparisonLines = []) {
    if (!msbStatsBoxEl || !msbStatsContentEl) return;
    const fmt = (n) => Math.round(n).toLocaleString("sv-SE");
    const fmtF = (n) => n.toLocaleString("sv-SE", { maximumFractionDigits: 1 });
    const lines = [
      `Olyckor och tillbud: <strong>${fmt(stats.totalOoT)}</strong>`,
      `Brand i byggnad: <strong>${fmt(stats.totalBIB)}</strong>`,
      `Trafikolyckor: <strong>${fmt(stats.totalTr)}</strong>`,
      `Drunkningsolyckor: <strong>${fmt(stats.totalDr)}</strong>`,
    ];
    if (stats.medianResp !== null) {
      lines.push(`Median responstid 1:a resurs: <strong>${fmtF(stats.medianResp)} min</strong>`);
    }
    if (stats.meanResp !== null) {
      lines.push(`Medel responstid 1:a resurs: <strong>${fmtF(stats.meanResp)} min</strong>`);
    }
    if (comparisonLines.length) {
      lines.push(...comparisonLines);
    }
    msbStatsContentEl.innerHTML = lines.join("<br>");
    msbStatsBoxEl.classList.remove("hidden");
  }

  function hideMsbStats() {
    if (msbStatsBoxEl) msbStatsBoxEl.classList.add("hidden");
  }

  async function loadMsbStatsForAreas(areaFeatures) {
    if (!Array.isArray(areaFeatures) || !areaFeatures.length) { hideMsbStats(); return; }
    try {
      const features = areaFeatures.length === 1
        ? await fetchMsbStatsForPolygon(areaFeatures[0])
        : await fetchMsbStatsForAreas(areaFeatures);
      if (!features.length) { hideMsbStats(); return; }
      const stats = calculateMsbStatsForAreas(features, areaFeatures);
      let comparisonLines = [];
      if (currentPopulationContext?.municipality?.areas?.length) {
        try {
          const municipalityBaseline = await getMunicipalityMsbBaseline(currentPopulationContext);
          comparisonLines = buildMsbRiskComparisonLines(
            stats,
            municipalityBaseline,
            currentPopulationContext.areaPopulation,
            currentPopulationContext.areaKm2,
          );
        } catch (comparisonError) {
          console.warn("Kunde inte räkna MSB kommunsnitt:", comparisonError);
        }
      }
      showMsbStats(stats, comparisonLines);
    } catch (err) {
      console.error("MSB stats fel:", err);
      hideMsbStats();
    }
  }

  function refreshMsbStatsForCurrentPolygon() {
    if (!currentAreaFeatures.length) {
      hideMsbStats();
      return;
    }
    loadMsbStatsForAreas(currentAreaFeatures).catch((err) => {
      console.error("MSB stats fel:", err);
      hideMsbStats();
    });
  }

  refreshMsbStatsHandler = refreshMsbStatsForCurrentPolygon;

  async function renderMsbOverlay(overlayKey) {
    if (!overlayKey || overlayKey === "none") {
      clearMsbOverlay();
      refreshMsbStatsForCurrentPolygon();
      return;
    }

    const overlayConfig = MSB_OVERLAY_CONFIGS[overlayKey];
    if (!overlayConfig) {
      clearMsbOverlay();
      refreshMsbStatsForCurrentPolygon();
      return;
    }

    setStatus(`Laddar ${overlayConfig.title}...`);

    const areaFeaturesToClip = currentAreaFeatures;
    let fetchBounds;
    if (areaFeaturesToClip.length) {
      const [minLon, minLat, maxLon, maxLat] = turf.bbox(turf.featureCollection(areaFeaturesToClip));
      fetchBounds = { getWest: () => minLon, getSouth: () => minLat, getEast: () => maxLon, getNorth: () => maxLat };
    } else {
      fetchBounds = map.getBounds();
    }

    const features = await fetchMsbFeaturesForBounds(fetchBounds, overlayConfig, areaFeaturesToClip);
    if (msbOverlayLayer) {
      map.removeLayer(msbOverlayLayer);
      msbOverlayLayer = null;
    }

    if (!features.length) {
      setCurrentMsbOverlayLabel(`${overlayConfig.title} (0 objekt${areaFeaturesToClip.length ? " i markerat område" : " i vy"})`);
      setStatus(`${overlayConfig.title}: inga objekt${areaFeaturesToClip.length ? " i markerat område" : " i aktuell vy"}.`);
      refreshMsbStatsForCurrentPolygon();
      return;
    }

    const colorScale = buildMsbColorScale(overlayConfig);
    msbOverlayLayer = L.geoJSON(
      { type: "FeatureCollection", features },
      {
        pane: "msbOverlayPane",
        interactive: false,
        style: (feature) => {
          const value = safeParseFloat(feature?.properties?.[overlayConfig.field]);
          return {
            color: "#6b7280",
            weight: 0.35,
            fillColor: colorScale(value),
            fillOpacity: 0.45,
          };
        },
      },
    );

    msbOverlayLayer.addTo(map);
    renderMsbLegend(overlayConfig);
    setCurrentMsbOverlayLabel(`${overlayConfig.title} (${features.length} objekt${areaFeaturesToClip.length ? "" : " i vy"})`);
    setStatus(`${overlayConfig.title} laddad.`);
    refreshMsbStatsForCurrentPolygon();
  }

  function useFilledArea() {
    return currentAreaStyle !== "outline";
  }

  function setAreaModeInput(mode) {
    for (const input of areaStyleMapInputs) {
      input.checked = input.value === mode;
    }
  }

  function applyAreaStylePreset(presetKey) {
    const presets = {
      soft: { stroke: "#0f766e", fill: "#14b8a6", mode: "fill" },
      contrast: { stroke: "#9f1239", fill: "#f59e0b", mode: "fill" },
      print: { stroke: "#111827", fill: "#ffffff", mode: "outline" },
    };

    const preset = presets[presetKey];
    if (!preset) return;

    currentAreaStrokeColor = preset.stroke;
    currentAreaFillColor = preset.fill;
    currentAreaStyle = preset.mode;

    if (areaStrokeColorInputEl) areaStrokeColorInputEl.value = currentAreaStrokeColor;
    if (areaFillColorInputEl) areaFillColorInputEl.value = currentAreaFillColor;
    setAreaModeInput(currentAreaStyle);
    refreshCurrentAreaStyle();
  }

  function applySelectedAreaStyle(layer) {
    if (!layer) return;

    const style = {
      color: currentAreaStrokeColor,
      weight: 2.5,
      fillColor: currentAreaFillColor,
      fillOpacity: useFilledArea() ? 0.2 : 0,
      opacity: 1,
    };

    if (typeof layer.setStyle === "function") {
      layer.setStyle(style);
    }

    if (typeof layer.eachLayer === "function") {
      layer.eachLayer((innerLayer) => {
        if (typeof innerLayer.setStyle === "function") {
          innerLayer.setStyle(style);
        }
      });
    }
  }

  function refreshCurrentAreaStyle() {
    drawnItems.eachLayer((layer) => applySelectedAreaStyle(layer));
    if (municipalitySelectionLayer) {
      applySelectedAreaStyle(municipalitySelectionLayer);
    }
  }

  for (const input of areaStyleMapInputs) {
    input.addEventListener("change", () => {
      if (input.checked) {
        currentAreaStyle = input.value;
        refreshCurrentAreaStyle();
      }
    });
  }

  for (const btn of areaStylePresetButtons) {
    btn.addEventListener("click", () => {
      const preset = btn.dataset.preset || "";
      applyAreaStylePreset(preset);
    });
  }

  if (areaStrokeColorInputEl) {
    areaStrokeColorInputEl.value = currentAreaStrokeColor;
    areaStrokeColorInputEl.addEventListener("input", () => {
      currentAreaStrokeColor = areaStrokeColorInputEl.value || "#0f766e";
      refreshCurrentAreaStyle();
    });
  }

  if (areaFillColorInputEl) {
    areaFillColorInputEl.value = currentAreaFillColor;
    areaFillColorInputEl.addEventListener("input", () => {
      currentAreaFillColor = areaFillColorInputEl.value || "#14b8a6";
      refreshCurrentAreaStyle();
    });
  }

  function fitMapForPrint() {
    if (!printViewState) {
      printViewState = {
        center: map.getCenter(),
        zoom: map.getZoom(),
      };
    }

    map.invalidateSize({ pan: false, animate: false });
    map.setView(printViewState.center, printViewState.zoom, { animate: false });
    map.invalidateSize({ pan: false, animate: false });
  }

  function getTravelMinutes() {
    const n = Number.parseFloat(travelMinutesEl?.value || "8");
    if (!Number.isFinite(n)) return 8;
    return Math.min(180, Math.max(1, n));
  }

  async function buildTravelAreaLayer(latlng) {
    if (!AZURE_MAPS_KEY) {
      throw new Error("Azure Maps API-nyckel är inte konfigurerad. Se config.js");
    }
    
    const minutes = getTravelMinutes();
    
    setStatus(`Hämtar vägbaserat område för ${minutes} minuter (via Azure Maps)...`);
    
    const seconds = minutes * 60;
    
    const params = new URLSearchParams({
      "api-version": "1.0",
      query: `${latlng.lat},${latlng.lng}`,
      timeBudgetInSec: String(seconds),
      travelMode: "car",
      traffic: "true",
      "subscription-key": AZURE_MAPS_KEY,
    });
    
    try {
      const response = await fetch(`${AZURE_MAPS_ISOCHRONE_URL}?${params.toString()}`);
      if (!response.ok) throw new Error(`Azure Maps HTTP ${response.status}`);
      
      const data = await response.json();
      
      if (!data.reachableRange || !data.reachableRange.boundary || data.reachableRange.boundary.length === 0) {
        throw new Error("Ingen isochrone polygon mottagen från Azure Maps.");
      }
      
      const boundaryCoordinates = data.reachableRange.boundary.map((point) => [point.longitude, point.latitude]);
      if (boundaryCoordinates.length > 2) {
        const first = boundaryCoordinates[0];
        const last = boundaryCoordinates[boundaryCoordinates.length - 1];
        if (first[0] !== last[0] || first[1] !== last[1]) {
          boundaryCoordinates.push([first[0], first[1]]);
        }
      }

      const geojson = {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: {
              type: "Polygon",
              coordinates: [boundaryCoordinates],
            },
            properties: {},
          },
        ],
      };
      
      const layer = L.geoJSON(geojson, {
        style: {
          color: "#0f766e",
          weight: 2,
          fillColor: "#14b8a6",
          fillOpacity: 0.18,
        },
      });
      
      setStatus(`Vägbaserat område laddat (${minutes} min)`);
      return { layer, minutes };
    } catch (error) {
      setStatus(`Fel vid hämtning av Azure Maps data: ${error.message}`);
      throw error;
    }
  }

  function setMode(nextMode) {
    currentMode = ["draw", "travel", "import"].includes(nextMode) ? nextMode : "draw";
    if (travelSettingsEl) {
      travelSettingsEl.classList.toggle("hidden", currentMode !== "travel");
    }
    if (importSettingsEl) {
      importSettingsEl.classList.toggle("hidden", currentMode !== "import");
    }
    mapEl.classList.toggle("draw-disabled", currentMode !== "draw");
    if (currentMode === "travel") {
      setStatus("Klicka på kartan för att skapa ett restidsområde.");
    } else if (currentMode === "import") {
      setStatus("Klistra in eller importera koordinater och klicka på knappen för att skapa område.");
    } else {
      setStatus("Rita ett område på kartan.");
    }
  }

  function handleNewShape(layer) {
    drawnItems.clearLayers();
    drawnItems.addLayer(layer);
    applySelectedAreaStyle(layer);
    currentPopulationContext = null;
    populationEl.textContent = "-";
    setBreakdown([]);
    setMeta([]);

    const geo = layer.toGeoJSON ? layer.toGeoJSON() : null;
    currentDrawnPolygon = geo?.type === "Feature" ? geo : (geo?.features?.[0] || null);
    setCurrentAreaFromLayer(layer);
    refreshMsbStatsForCurrentPolygon();
    refreshWildlifeForCurrentArea().catch((err) => {
      console.error("Viltdatafel:", err);
    });

    const msbKey = msbOverlaySelectEl?.value || "none";
    if (msbKey !== "none") {
      renderMsbOverlay(msbKey).catch((err) => {
        console.error(err);
        setStatus(`Fel vid MSB-overlay: ${err.message}`);
      });
    }

    runPopulationEstimate(layer).catch((err) => {
      console.error(err);
      setStatus(`Fel: ${err.message}`);
      populationEl.textContent = "-";
      setMeta([
        "Tips:",
        "1) Denna version använder endast direktanrop till SCB, ingen proxy.",
        "2) Om anrop blockeras av CORS/nätpolicy krävs backendlösning på servern.",
        "3) Sätt korrekt SCB-layer i SCB_LAYER_NAME_OVERRIDE i app.js vid behov.",
      ]);
    });
  }

  async function handleTravelClick(latlng) {
    try {
      const { layer, minutes } = await buildTravelAreaLayer(latlng);
      lastTravelLatLng = latlng;

      drawnItems.clearLayers();
      drawnItems.addLayer(layer);
      applySelectedAreaStyle(layer);
      currentPopulationContext = null;
      populationEl.textContent = "-";

      setMeta([
        `Restidsläge: ${minutes} min (vägbaserat)`,
        `Data: Azure Maps Routing API`,
      ]);

      const polygonLayer = layer.getLayers()[0];
      if (polygonLayer) {
        setCurrentAreaFromLayer(polygonLayer);
        refreshMsbStatsForCurrentPolygon();
        refreshWildlifeForCurrentArea().catch((err) => {
          console.error("Viltdatafel:", err);
        });

        const msbKey = msbOverlaySelectEl?.value || "none";
        if (msbKey !== "none") {
          renderMsbOverlay(msbKey).catch((err) => {
            console.error(err);
            setStatus(`Fel vid MSB-overlay: ${err.message}`);
          });
        }

        runPopulationEstimate(polygonLayer).catch((err) => {
          console.error(err);
          setStatus(`Fel: ${err.message}`);
          populationEl.textContent = "-";
          setBreakdown([]);
        });
      }
    } catch (error) {
      console.error(error);
      setStatus(`Fel vid hämtning av restidsläge: ${error.message}`);
      populationEl.textContent = "-";
    }
  }

  function handleCoordinateImport() {
    const coords = parseCoordinatesFromText(coordinateInputEl?.value || "");
    const layer = layerFromCoordinatePolygon(coords);

    drawnItems.clearLayers();
    drawnItems.addLayer(layer);
    applySelectedAreaStyle(layer);
    currentPopulationContext = null;
    populationEl.textContent = "-";
    setBreakdown([]);

    setMeta([
      `Importläge: ${coords.length} koordinater`,
      "Om koordinaterna inte var i ringordning användes en omslutande polygon.",
    ]);

    const polygonLayer = layer.getLayers()[0];
    if (polygonLayer) {
      setCurrentAreaFromLayer(polygonLayer);
      refreshMsbStatsForCurrentPolygon();
      refreshWildlifeForCurrentArea().catch((err) => {
        console.error("Viltdatafel:", err);
      });

      const msbKey = msbOverlaySelectEl?.value || "none";
      if (msbKey !== "none") {
        renderMsbOverlay(msbKey).catch((err) => {
          console.error(err);
          setStatus(`Fel vid MSB-overlay: ${err.message}`);
        });
      }

      runPopulationEstimate(polygonLayer).catch((err) => {
        console.error(err);
        setStatus(`Fel: ${err.message}`);
        populationEl.textContent = "-";
        setBreakdown([]);
      });
    }
  }

  map.on(L.Draw.Event.CREATED, (event) => {
    if (currentMode !== "draw") return;
    handleNewShape(event.layer);
  });

  map.on(L.Draw.Event.EDITED, (event) => {
    if (currentMode !== "draw") return;
    const layers = event.layers.getLayers();
    if (layers.length) handleNewShape(layers[0]);
  });

  map.on("click", (event) => {
    if (currentMode !== "travel") return;
    handleTravelClick(event.latlng).catch((err) => {
      console.error(err);
      setStatus(`Fel: ${err.message}`);
    });
  });

  for (const input of modeInputs) {
    input.addEventListener("change", () => {
      if (!input.checked) return;
      setMode(input.value);
    });
  }

  function rerunTravelIfNeeded() {
    if (currentMode !== "travel" || !lastTravelLatLng) return;
    handleTravelClick(lastTravelLatLng).catch((err) => {
      console.error(err);
      setStatus(`Fel: ${err.message}`);
    });
  }

  if (travelMinutesEl) {
    travelMinutesEl.addEventListener("change", rerunTravelIfNeeded);
  }

  if (buildCoordinatesBtn) {
    buildCoordinatesBtn.addEventListener("click", () => {
      try {
        handleCoordinateImport();
      } catch (error) {
        console.error(error);
        setStatus(`Fel: ${error.message}`);
      }
    });
  }

  if (coordinateFileEl && coordinateInputEl) {
    coordinateFileEl.addEventListener("change", async () => {
      const file = coordinateFileEl.files?.[0];
      if (!file) return;

      try {
        const text = await readCoordinateFile(file);
        coordinateInputEl.value = text;
        setStatus(`Fil inläst: ${file.name}. Klicka på "Skapa område från koordinater".`);
      } catch (error) {
        console.error(error);
        setStatus(`Fel vid filimport: ${error.message}`);
      }
    });
  }

  if (downloadTemplateBtn) {
    downloadTemplateBtn.addEventListener("click", () => {
      const templateCsv = [
        "lat,lon",
        "60.21603492250861,17.72232191679509",
        "60.22000000000000,17.76000000000000",
        "60.20500000000000,17.81000000000000",
      ].join("\n");

      const blob = new Blob([templateCsv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "koordinatmall.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setStatus("Mallen laddades ner.");
    });
  }

  if (printBtn) {
    printBtn.addEventListener("click", () => {
      if (!Array.isArray(currentAreaFeatures) || currentAreaFeatures.length === 0) {
        setStatus("Skapa först ett område innan utskrift.");
        return;
      }

      printViewState = {
        center: map.getCenter(),
        zoom: map.getZoom(),
      };
      fitMapForPrint();
      setStatus("Öppnar utskriftsvy...");
      setTimeout(() => {
        fitMapForPrint();
        window.print();
      }, 320);
    });
  }

  window.addEventListener("beforeprint", () => {
    setTimeout(() => fitMapForPrint(), 40);
  });

  window.addEventListener("afterprint", () => {
    setTimeout(() => {
      if (printViewState) {
        map.setView(printViewState.center, printViewState.zoom, { animate: false });
      }
      map.invalidateSize({ pan: false, animate: false });
      printViewState = null;
    }, 100);
  });

  clearBtn.addEventListener("click", () => {
    drawnItems.clearLayers();
    if (searchResultMarker) {
      map.removeLayer(searchResultMarker);
      searchResultMarker = null;
    }
    if (municipalitySelectionLayer) {
      map.removeLayer(municipalitySelectionLayer);
      municipalitySelectionLayer = null;
    }
    selectedMunicipalityCodes.clear();
    if (municipalityFilterInputEl) {
      municipalityFilterInputEl.value = "";
    }
    if (municipalityDropdownPanelEl && municipalityDropdownToggleEl) {
      municipalityDropdownPanelEl.classList.add("hidden");
      municipalityDropdownToggleEl.setAttribute("aria-expanded", "false");
    }
    renderMunicipalityOptions("");
    updateMunicipalitySummary();

    lastTravelLatLng = null;
    currentDrawnPolygon = null;
    currentAreaFeatures = [];
    currentPopulationContext = null;
    populationEl.textContent = "-";
    setBreakdown([]);
    setStatus(currentMode === "travel" ? "Klicka på kartan för att skapa ett restidsområde." : "Rita ett område på kartan.");
    setMeta([]);
    hideMsbStats();
    hideWildlifeStats();
  });

  if (msbOverlaySelectEl) {
    msbOverlaySelectEl.addEventListener("change", () => {
      const selectedValue = msbOverlaySelectEl.value;
      renderMsbOverlay(selectedValue).catch((error) => {
        console.error(error);
        setStatus(`Fel vid laddning av MSB-overlay: ${error.message}`);
      });
    });
  }

  map.on("moveend", () => {
    const selectedValue = msbOverlaySelectEl?.value || "none";
    if (selectedValue === "none" || currentAreaFeatures.length) return;
    renderMsbOverlay(selectedValue).catch((error) => {
      console.error(error);
      setStatus(`Fel vid uppdatering av MSB-overlay: ${error.message}`);
    });
  });

  setMode("draw");
  refreshCurrentAreaStyle();
}

function startWhenLibrariesReady(maxWaitMs = 10000) {
  const start = Date.now();

  function tick() {
    if (typeof L !== "undefined" && typeof turf !== "undefined") {
      initMapApp();
      return;
    }

    if (Date.now() - start >= maxWaitMs) {
      setStatus("Fel: Kartbibliotek kunde inte laddas i Preview.");
      setMeta([
        "Kontrollera att index.html refererar till vendor/leaflet.js, vendor/leaflet.draw.js och vendor/turf.min.js.",
        "Testa att stänga och öppna Preview igen för att rensa cache.",
      ]);
      return;
    }

    setStatus("Väntar på kartbibliotek...");
    setTimeout(tick, 100);
  }

  tick();
}

startWhenLibrariesReady();
setupPanelHelpPopup();
