const SCB_WFS_URL = "https://geodata.scb.se/geoserver/stat/wfs";
const SCB_LAYER_NAME_OVERRIDE = "";
const ORS_API_KEY = "2285d258b35548d7a081fd465b65cc47";
const ORS_API_URL = "https://api.openrouteservice.org/v2/isochrones";

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
  "objectid",
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

function keyTokens(key) {
  return String(key)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

const statusEl = document.getElementById("status");
const populationEl = document.getElementById("population");
const breakdownEl = document.getElementById("breakdown");
const metaEl = document.getElementById("meta");
const clearBtn = document.getElementById("clear-btn");
const modeInputs = Array.from(document.querySelectorAll('input[name="input-mode"]'));
const travelSettingsEl = document.getElementById("travel-settings");
const travelMinutesEl = document.getElementById("travel-minutes");
const travelKmhEl = document.getElementById("travel-kmh");

let selectedLayerName = null;
let selectedPopulationField = null;

function setStatus(text) {
  if (statusEl) statusEl.textContent = text;
}

function setMeta(lines) {
  if (metaEl) metaEl.innerHTML = lines.join("<br>");
}

function setBreakdown(lines) {
  if (!breakdownEl) return;
  breakdownEl.innerHTML = lines.join("<br>");
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
  setStatus("Hamta SCB capabilities...");
  const layerNames = await getCapabilities();
  const chosen = chooseLayerName(layerNames);
  if (!chosen) {
    throw new Error("Kunde inte hitta en passande SCB-layer automatiskt. Satt SCB_LAYER_NAME_OVERRIDE i app.js.");
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

  setStatus("Rakn ar befolkning inom omradet...");
  const bounds = layer.getBounds();

  const area = areaKm2(areaFeature);
  let layerName = await ensureLayerSelected();

  let evaluation = await evaluateLayerForPopulation(layerName, bounds, areaFeature);
  if (!evaluation) {
    populationEl.textContent = "0";
    setStatus("Inga SCB-features i valt bbox-omrade.");
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
    breakdownLines.push("Kon (uppskattat):");
    if (breakdown.male !== null) breakdownLines.push(`Man: ${Math.round(breakdown.male).toLocaleString("sv-SE")}`);
    if (breakdown.female !== null) breakdownLines.push(`Kvinna: ${Math.round(breakdown.female).toLocaleString("sv-SE")}`);
  }

  const ageWithValues = breakdown.age.filter((x) => x.value > 0.5);
  if (ageWithValues.length) {
    breakdownLines.push("Aldersspann (uppskattat):");
    for (const ageRow of ageWithValues) {
      breakdownLines.push(`${ageRow.label}: ${Math.round(ageRow.value).toLocaleString("sv-SE")}`);
    }
  }

  if (!breakdownLines.length) {
    breakdownLines.push("Kon/aldersfordelning finns inte i valt SCB-layer.");
  }
  setBreakdown(breakdownLines);

  setStatus("Klar.");

  setMeta([
    `Layer: ${evaluation.layerName}`,
    `Anvandt befolkningsfalt: ${evaluation.field || "okant"}`,
    `Features i bbox: ${evaluation.featureCount}`,
    `Features som bidrog till summa: ${evaluation.matched}`,
    "Obs: Delvis overlap viktas med areaandel.",
  ]);
}

function initMapApp() {
  const map = L.map("map").setView([59.86, 17.95], 10);
  const mapEl = map.getContainer();
  const drawnItems = new L.FeatureGroup();
  map.addLayer(drawnItems);
  let currentMode = "draw";
  let lastTravelLatLng = null;

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap",
  }).addTo(map);

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

  function getTravelMinutes() {
    const n = Number.parseFloat(travelMinutesEl?.value || "8");
    if (!Number.isFinite(n)) return 8;
    return Math.min(180, Math.max(1, n));
  }

  function getTravelKmh() {
    const n = Number.parseFloat(travelKmhEl?.value || "50");
    if (!Number.isFinite(n)) return 50;
    return Math.min(130, Math.max(5, n));
  }

  async function buildTravelAreaLayer(latlng) {
    const minutes = getTravelMinutes();
    const kmh = getTravelKmh();
    
    setStatus(`Hamtar vag-baserat omrade for ${minutes} minuter (via OpenRouteService)...`);
    
    const seconds = minutes * 60;
    const rangeInSeconds = [seconds];
    
    const isochroneUrl = `${ORS_API_URL}/driving-car`;
    const params = new URLSearchParams({
      locations: `${latlng.lng},${latlng.lat}`,
      range: rangeInSeconds.join(","),
      range_type: "time",
      API_key: ORS_API_KEY,
    });
    
    try {
      const isochroneUrl = `${ORS_API_URL}/driving-car`;
      const body = {
        locations: [[latlng.lng, latlng.lat]],
        range: [seconds],
        range_type: "time",
      };
      
      const allOriginsUrl = "https://api.allorigins.win/raw?url=" + encodeURIComponent(isochroneUrl);
      
      const response = await fetch(allOriginsUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ORS_API_KEY}`,
        },
        body: JSON.stringify(body),
      });
      
      if (!response.ok) throw new Error(`ORS HTTP ${response.status}`);
      const data = await response.json();
      
      if (!data.features || data.features.length === 0) {
        throw new Error("Ingen isochrone polygon mottagen fran OpenRouteService. Svar: " + JSON.stringify(data).substring(0, 200));
      }
      
      const isochrone = data.features[0];
      const layer = L.geoJSON(isochrone, {
        style: {
          color: "#0f766e",
          weight: 2,
          fillColor: "#14b8a6",
          fillOpacity: 0.18,
        },
      });
      
      setStatus(`Vag-baserat omrade laddat (${minutes} min)`);
      return { layer, minutes, kmh, geojson: isochrone };
    } catch (error) {
      setStatus(`Fel vid hämtning av OpenRouteService data: ${error.message}`);
      throw error;
    }
  }

  function setMode(nextMode) {
    currentMode = nextMode === "travel" ? "travel" : "draw";
    if (travelSettingsEl) {
      travelSettingsEl.classList.toggle("hidden", currentMode !== "travel");
    }
    mapEl.classList.toggle("travel-mode", currentMode === "travel");
    if (currentMode === "travel") {
      setStatus("Klicka pa kartan for att skapa ett restidsomrade.");
    } else {
      setStatus("Rita ett omrade pa kartan.");
    }
  }

  function handleNewShape(layer) {
    drawnItems.clearLayers();
    drawnItems.addLayer(layer);
    populationEl.textContent = "-";
    setBreakdown([]);
    setMeta([]);

    runPopulationEstimate(layer).catch((err) => {
      console.error(err);
      setStatus(`Fel: ${err.message}`);
      populationEl.textContent = "-";
      setMeta([
        "Tips:",
        "1) Denna version anvander endast direktanrop till SCB, ingen proxy.",
        "2) Om anrop blockeras av CORS/natpolicy kravs backendlosning pa servern.",
        "3) Satt korrekt SCB layer i SCB_LAYER_NAME_OVERRIDE i app.js vid behov.",
      ]);
    });
  }

  async function handleTravelClick(latlng) {
    try {
      const { layer, minutes, kmh, geojson } = await buildTravelAreaLayer(latlng);
      lastTravelLatLng = latlng;

      drawnItems.clearLayers();
      drawnItems.addLayer(layer);
      populationEl.textContent = "-";

      setMeta([
        `Restidslage: ${minutes} min (vag-baserat)`,
        `Data: OpenRouteService (car routing)`,
      ]);

      const polygonLayer = layer.getLayers()[0];
      if (polygonLayer) {
        runPopulationEstimate(polygonLayer).catch((err) => {
        console.error(err);
        setStatus(`Fel: ${err.message}`);
        populationEl.textContent = "-";
        setBreakdown([]);
      });
    }
    } catch (error) {
      console.error(error);
      setStatus(`Fel vid hämtning av restidslage: ${error.message}`);
      populationEl.textContent = "-";
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
  if (travelKmhEl) {
    travelKmhEl.addEventListener("change", rerunTravelIfNeeded);
  }

  clearBtn.addEventListener("click", () => {
    drawnItems.clearLayers();
    lastTravelLatLng = null;
    populationEl.textContent = "-";
    setBreakdown([]);
    setStatus(currentMode === "travel" ? "Klicka pa kartan for att skapa ett restidsomrade." : "Rita ett omrade pa kartan.");
    setMeta([]);
  });

  setMode("draw");
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
        "Testa att stanga och oppna Preview igen for att rensa cache.",
      ]);
      return;
    }

    setStatus("Vantar pa kartbibliotek...");
    setTimeout(tick, 100);
  }

  tick();
}

startWhenLibrariesReady();
