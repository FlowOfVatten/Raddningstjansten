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

// Cache expensive municipality lookups and comparisons during the session.
const municipalityGeometryCache = new Map();
const municipalityComparisonCache = new Map();

function keyTokens(key) {
  return String(key)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
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
const panelHelpLinkEl = document.getElementById("panel-help-link");
const panelHelpPopupEl = document.getElementById("panel-help-popup");

let selectedLayerName = null;
let selectedPopulationField = null;
let lastMetaLines = [];
let currentMsbOverlayLabel = "";
let currentAreaStyle = "fill";

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

async function fetchMsbFeaturesForBounds(bounds, overlayConfig, clipPolygon = null) {
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

  if (clipPolygon && features.length) {
    features = features.filter((feature) => {
      try {
        const f = turf.feature(feature.geometry, feature.properties || {});
        let ix = null;
        try { ix = turf.intersect(f, clipPolygon); } catch { /* ignore */ }
        if (!ix) try { ix = turf.intersect(turf.featureCollection([f, clipPolygon])); } catch { /* ignore */ }
        return ix !== null;
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

function calculateMsbStats(features, areaFeature) {
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
    let intersection = null;
    try {
      intersection = turf.intersect(feature, areaFeature);
    } catch {
      try { intersection = turf.intersect(turf.featureCollection([feature, areaFeature])); } catch { intersection = null; }
    }
    if (!intersection) continue;

    const wholeArea = turf.area(feature);
    const cutArea = turf.area(intersection);
    if (wholeArea <= 0 || cutArea <= 0) continue;
    const ratio = Math.min(1, cutArea / wholeArea);

    const props = rawFeature.properties || {};
    const oot = safeParseFloat(props.Antal_OoT);
    const bib = safeParseFloat(props.Antal_BIB);
    const tr  = safeParseFloat(props.Antal_tr);
    const dr  = safeParseFloat(props.Antal_dr);
    const resp = safeParseFloat(props.RespM_1a);

    if (oot  !== null) totalOoT += oot * ratio;
    if (bib  !== null) totalBIB += bib * ratio;
    if (tr   !== null) totalTr  += tr  * ratio;
    if (dr   !== null) totalDr  += dr  * ratio;
    if (resp !== null && resp > 0) {
      // Prefer incident-weighting for response time; fallback to overlap area where incident count is missing.
      const incidentWeight = oot !== null && oot > 0 ? oot * ratio : 0;
      const sampleWeight = incidentWeight > 0 ? incidentWeight : cutArea;
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

async function evaluateLayerForPopulation(layerName, bounds, areaFeature) {
  const features = await fetchFeaturesForBounds(layerName, bounds);
  if (!features.length) return null;

  const field = choosePopulationFieldFromFeatures(features);
  if (!field) return null;

  const result = calculatePopulationWithinPolygon(features, areaFeature, field);
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
  const areaFeature = geo.type === "Feature" ? geo : geo.features?.[0];
  if (!areaFeature) return;

  setStatus("Räknar befolkning inom området...");
  const bounds = layer.getBounds();

  const area = areaKm2(areaFeature);
  let layerName = await ensureLayerSelected();

  let evaluation = await evaluateLayerForPopulation(layerName, bounds, areaFeature);
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
      const candidateEvaluation = await evaluateLayerForPopulation(candidate, bounds, areaFeature);
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
  const breakdown = calculateDemographicBreakdown(evaluation.features, areaFeature, demographicFields);
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
    breakdown.female !== null
  ) {
    let municipalityField = detectMunicipalityField(evaluation.features, [evaluation.field]);
    if (!municipalityField) {
      municipalityReason = "saknar kommunkod/kommunfält i valt lager, provar RegSO/DeSO";
    }

    let municipalityValue = identifyMunicipalityValue(evaluation.features, areaFeature, municipalityField);
    let municipalityAreas = null;
    let municipalitySourceLayer = evaluation.layerName;

    if (!municipalityField || !municipalityValue) {
      const adminMatch = await findMunicipalityFromAdminLayers(areaFeature, bounds);
      if (adminMatch) {
        municipalityField = adminMatch.municipalityField;
        municipalityValue = adminMatch.municipalityValue;
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
          };
        } else {
          municipalityReason = "kommunfeatures saknar användbara könsvärden";
        }
      } catch (error) {
        municipalityReason = "anrop för kommunsnitt misslyckades";
        console.warn("Kunde inte beräkna kommunsnitt:", error);
      }
    }
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
    `Features i bbox: ${evaluation.featureCount}`,
    `Features som bidrog till summa: ${evaluation.matched}`,
    "Obs: Delvis överlapp viktas med areaandel.",
  ]);
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
  let currentMode = "draw";
  let lastTravelLatLng = null;
  let printViewState = null;

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

  const areaStyleControl = L.control({ position: "topleft" });
  areaStyleControl.onAdd = () => {
    const container = L.DomUtil.create("div", "area-style-map-control");
    container.innerHTML = `
      <div class="title">Områdesstil</div>
      <label><input type="radio" name="area-style-map" value="fill" checked> Fyllnad</label>
      <label><input type="radio" name="area-style-map" value="outline"> Kantlinje</label>
    `;

    L.DomEvent.disableClickPropagation(container);
    L.DomEvent.disableScrollPropagation(container);
    return container;
  };
  areaStyleControl.addTo(map);

  const areaStyleMapInputs = Array.from(document.querySelectorAll('input[name="area-style-map"]'));

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

  function showMsbStats(stats) {
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
    msbStatsContentEl.innerHTML = lines.join("<br>");
    msbStatsBoxEl.classList.remove("hidden");
  }

  function hideMsbStats() {
    if (msbStatsBoxEl) msbStatsBoxEl.classList.add("hidden");
  }

  async function loadMsbStatsForPolygon(polygonFeature) {
    if (!polygonFeature) { hideMsbStats(); return; }
    try {
      const features = await fetchMsbStatsForPolygon(polygonFeature);
      if (!features.length) { hideMsbStats(); return; }
      const stats = calculateMsbStats(features, polygonFeature);
      showMsbStats(stats);
    } catch (err) {
      console.error("MSB stats fel:", err);
      hideMsbStats();
    }
  }

  function refreshMsbStatsForCurrentPolygon() {
    if (!currentDrawnPolygon) {
      hideMsbStats();
      return;
    }
    loadMsbStatsForPolygon(currentDrawnPolygon).catch((err) => {
      console.error("MSB stats fel:", err);
      hideMsbStats();
    });
  }

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

    const polygonToClip = currentDrawnPolygon;
    let fetchBounds;
    if (polygonToClip) {
      const [minLon, minLat, maxLon, maxLat] = turf.bbox(polygonToClip);
      fetchBounds = { getWest: () => minLon, getSouth: () => minLat, getEast: () => maxLon, getNorth: () => maxLat };
    } else {
      fetchBounds = map.getBounds();
    }

    const features = await fetchMsbFeaturesForBounds(fetchBounds, overlayConfig, polygonToClip);
    if (msbOverlayLayer) {
      map.removeLayer(msbOverlayLayer);
      msbOverlayLayer = null;
    }

    if (!features.length) {
      setCurrentMsbOverlayLabel(`${overlayConfig.title} (0 objekt${polygonToClip ? " i markerat område" : " i vy"})`);
      setStatus(`${overlayConfig.title}: inga objekt${polygonToClip ? " i markerat område" : " i aktuell vy"}.`);
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
    setCurrentMsbOverlayLabel(`${overlayConfig.title} (${features.length} objekt${polygonToClip ? "" : " i vy"})`);
    setStatus(`${overlayConfig.title} laddad.`);
    refreshMsbStatsForCurrentPolygon();
  }

  function useFilledArea() {
    return currentAreaStyle !== "outline";
  }

  function applySelectedAreaStyle(layer) {
    if (!layer) return;

    const style = {
      color: "#0f766e",
      weight: 2.5,
      fillColor: "#14b8a6",
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
  }

  for (const input of areaStyleMapInputs) {
    input.addEventListener("change", () => {
      if (input.checked) {
        currentAreaStyle = input.value;
        refreshCurrentAreaStyle();
      }
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
    populationEl.textContent = "-";
    setBreakdown([]);
    setMeta([]);

    const geo = layer.toGeoJSON ? layer.toGeoJSON() : null;
    currentDrawnPolygon = geo?.type === "Feature" ? geo : (geo?.features?.[0] || null);
    refreshMsbStatsForCurrentPolygon();

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
      populationEl.textContent = "-";

      setMeta([
        `Restidsläge: ${minutes} min (vägbaserat)`,
        `Data: Azure Maps Routing API`,
      ]);

      const polygonLayer = layer.getLayers()[0];
      if (polygonLayer) {
        const geo = polygonLayer.toGeoJSON();
        currentDrawnPolygon = geo?.type === "Feature" ? geo : (geo?.features?.[0] || null);
        refreshMsbStatsForCurrentPolygon();

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
    populationEl.textContent = "-";
    setBreakdown([]);

    setMeta([
      `Importläge: ${coords.length} koordinater`,
      "Om koordinaterna inte var i ringordning användes en omslutande polygon.",
    ]);

    const polygonLayer = layer.getLayers()[0];
    if (polygonLayer) {
      const geo = polygonLayer.toGeoJSON();
      currentDrawnPolygon = geo?.type === "Feature" ? geo : (geo?.features?.[0] || null);
      refreshMsbStatsForCurrentPolygon();

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
      if (drawnItems.getLayers().length === 0) {
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
    lastTravelLatLng = null;
    currentDrawnPolygon = null;
    populationEl.textContent = "-";
    setBreakdown([]);
    setStatus(currentMode === "travel" ? "Klicka på kartan för att skapa ett restidsområde." : "Rita ett område på kartan.");
    setMeta([]);
    hideMsbStats();
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
    if (selectedValue === "none" || currentDrawnPolygon) return;
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
