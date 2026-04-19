const SCB_WFS_URL = "https://geo.scb.se/geoserver/ows";
const SCB_LAYER_NAME_OVERRIDE = "";

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

const statusEl = document.getElementById("status");
const populationEl = document.getElementById("population");
const metaEl = document.getElementById("meta");
const clearBtn = document.getElementById("clear-btn");

let selectedLayerName = null;
let selectedPopulationField = null;

function setStatus(text) {
  if (statusEl) statusEl.textContent = text;
}

function setMeta(lines) {
  if (metaEl) metaEl.innerHTML = lines.join("<br>");
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

function pickPopulationField(properties) {
  const entries = Object.entries(properties || {});
  if (!entries.length) return null;

  const hintMatch = entries.find(([key, value]) => {
    const keyLc = key.toLowerCase();
    const n = safeParseFloat(value);
    return n !== null && POP_FIELD_HINTS.some((hint) => keyLc.includes(hint));
  });
  if (hintMatch) return hintMatch[0];

  let bestKey = null;
  let bestScore = -1;
  for (const [key, value] of entries) {
    const n = safeParseFloat(value);
    if (n === null || n < 0) continue;
    const score = n;
    if (score > bestScore) {
      bestScore = score;
      bestKey = key;
    }
  }
  return bestKey;
}

async function getCapabilities() {
  const url = `${SCB_WFS_URL}?service=WFS&request=GetCapabilities`;
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
  const found = layerNames.find((name) => {
    const lc = name.toLowerCase();
    return LAYER_NAME_HINTS.some((hint) => lc.includes(hint));
  });
  return found || null;
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
    version: "2.0.0",
    request: "GetFeature",
    typeNames: layerName,
    outputFormat: "application/json",
    srsName: "EPSG:4326",
    bbox,
    count: "10000",
  });

  const url = `${SCB_WFS_URL}?${params.toString()}`;
  const res = await fetchDirect(url);
  const json = await res.json();
  return json.features || [];
}

function calculatePopulationWithinPolygon(features, areaFeature) {
  let total = 0;
  let matched = 0;
  let usedField = selectedPopulationField;

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

    if (!usedField) {
      usedField = pickPopulationField(rawFeature.properties || {});
    }
    if (!usedField) continue;

    const popValue = safeParseFloat(rawFeature.properties?.[usedField]);
    if (popValue === null) continue;

    const wholeArea = turf.area(feature);
    const cutArea = turf.area(intersection);
    if (wholeArea <= 0 || cutArea <= 0) continue;

    const ratio = Math.min(1, cutArea / wholeArea);
    total += popValue * ratio;
    matched += 1;
  }

  if (usedField) selectedPopulationField = usedField;
  return { total, matched, usedField };
}

async function runPopulationEstimate(layer) {
  const geo = layer.toGeoJSON();
  const areaFeature = geo.type === "Feature" ? geo : geo.features?.[0];
  if (!areaFeature) return;

  setStatus("Rakn ar befolkning inom omradet...");
  const bounds = layer.getBounds();

  const layerName = await ensureLayerSelected();
  const features = await fetchFeaturesForBounds(layerName, bounds);
  if (!features.length) {
    populationEl.textContent = "0";
    setStatus("Inga SCB-features i valt bbox-omrade.");
    setMeta([`Layer: ${layerName}`]);
    return;
  }

  const result = calculatePopulationWithinPolygon(features, areaFeature);
  const rounded = Math.round(result.total);
  populationEl.textContent = rounded.toLocaleString("sv-SE");
  setStatus("Klar.");

  setMeta([
    `Layer: ${layerName}`,
    `Anvandt befolkningsfalt: ${result.usedField || "okant"}`,
    `Features i bbox: ${features.length}`,
    `Features som bidrog till summa: ${result.matched}`,
    "Obs: Delvis overlap viktas med areaandel.",
  ]);
}

function initMapApp() {
  const map = L.map("map").setView([59.86, 17.95], 10);
  const drawnItems = new L.FeatureGroup();
  map.addLayer(drawnItems);

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

  function handleNewShape(layer) {
    drawnItems.clearLayers();
    drawnItems.addLayer(layer);
    populationEl.textContent = "-";
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

  map.on(L.Draw.Event.CREATED, (event) => {
    handleNewShape(event.layer);
  });

  map.on(L.Draw.Event.EDITED, (event) => {
    const layers = event.layers.getLayers();
    if (layers.length) handleNewShape(layers[0]);
  });

  clearBtn.addEventListener("click", () => {
    drawnItems.clearLayers();
    populationEl.textContent = "-";
    setStatus("Rita ett omrade pa kartan.");
    setMeta([]);
  });

  setStatus("Rita ett omrade pa kartan.");
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
