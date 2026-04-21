const statusEl = document.getElementById("status");
const ruleEl = document.getElementById("rule-explanation");
const resultsEl = document.getElementById("results");
const formEl = document.getElementById("search-form");
const locateBtn = document.getElementById("locate-btn");
const needSelect = document.getElementById("need");

const map = L.map("map").setView([59.3293, 18.0686], 12);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap"
}).addTo(map);

let userMarker = null;
let poiMarkers = [];
let userPosition = null;

const NEED_RULES = {
  tobacco: {
    fallback: {
      explanation: "Tobak saljs ofta i kiosk, convenience-butik eller supermarket beroende pa land.",
      overpass: [
        '["shop"~"convenience|supermarket|tobacco|kiosk"]',
        '["amenity"="fuel"]'
      ]
    },
    SE: {
      explanation: "I Sverige saljs tobak ofta i kiosk, mataffar och bensinstation.",
      overpass: ['["shop"~"convenience|supermarket|kiosk|tobacco"]', '["amenity"="fuel"]']
    },
    FI: {
      explanation: "I Finland saljs tobak vanligtvis i kiosk, supermarket och vissa bensinstationer.",
      overpass: ['["shop"~"kiosk|convenience|supermarket"]', '["amenity"="fuel"]']
    },
    US: {
      explanation: "I USA saljs tobak ofta i convenience stores, gas stations och liquor stores.",
      overpass: ['["shop"~"convenience"]', '["amenity"="fuel"]', '["shop"="alcohol"]']
    }
  },
  alcohol: {
    fallback: {
      explanation: "Alkohol saljs i specialbutik eller licensierad butik beroende pa lokala regler.",
      overpass: ['["shop"="alcohol"]', '["shop"="supermarket"]', '["amenity"="bar"]']
    },
    SE: {
      explanation: "I Sverige saljs starkare alkohol via Systembolaget. Ovrig dryck kan finnas i butik/restaurang.",
      overpass: ['["shop"="alcohol"]', '["amenity"="bar"]', '["amenity"="pub"]']
    },
    FI: {
      explanation: "I Finland saljs alkohol i Alko och viss dryck i supermarket.",
      overpass: ['["shop"="alcohol"]', '["shop"="supermarket"]', '["amenity"="bar"]']
    },
    US: {
      explanation: "I USA varierar regler per stat, men liquor stores och vissa supermarkets ar vanliga.",
      overpass: ['["shop"="alcohol"]', '["shop"="supermarket"]', '["amenity"="bar"]']
    }
  },
  pharmacy: {
    fallback: {
      explanation: "Apotek markeras normalt som pharmacy eller drugstore.",
      overpass: ['["amenity"="pharmacy"]', '["shop"="chemist"]']
    }
  },
  food: {
    fallback: {
      explanation: "Snabbmat hittas oftast via fast_food, restaurant och cafe.",
      overpass: ['["amenity"~"fast_food|restaurant|cafe"]']
    }
  },
  sim: {
    fallback: {
      explanation: "SIM-kort saljs ofta i telecom-butik, kiosk och convenience-butik.",
      overpass: ['["shop"~"mobile_phone|electronics|convenience|kiosk"]']
    }
  },
  toilet: {
    fallback: {
      explanation: "Publika toaletter och toaletter vid trafikpunkter visas har.",
      overpass: ['["amenity"="toilets"]', '["amenity"="fuel"]', '["amenity"="bus_station"]']
    }
  }
};

locateBtn.addEventListener("click", async () => {
  try {
    setStatus("Hamtar position...");
    const pos = await getCurrentPosition();
    userPosition = {
      lat: pos.coords.latitude,
      lon: pos.coords.longitude
    };
    placeUserMarker(userPosition.lat, userPosition.lon);
    setStatus("Position uppdaterad.");
  } catch (error) {
    setStatus("Kunde inte hamta position. Tillat platsatkomst i browsern.", true);
    console.error(error);
  }
});

formEl.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!userPosition) {
    setStatus("Hamta forst din position.", true);
    return;
  }

  const need = needSelect.value;

  try {
    setStatus("Laddar landsinfo...");
    const countryCode = await reverseCountryCode(userPosition.lat, userPosition.lon);
    const rule = getRuleForNeed(need, countryCode);
    ruleEl.textContent = rule.explanation;

    setStatus("Soker relevanta platser i narheten...");
    const poi = await fetchPois(userPosition, rule.overpass);
    const sorted = poi
      .map((item) => ({
        ...item,
        distance: haversineMeters(userPosition.lat, userPosition.lon, item.lat, item.lon)
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 8);

    renderPoi(sorted);
    setStatus(sorted.length ? `Hittade ${sorted.length} forslag.` : "Inga traffar i omradet.", !sorted.length);
  } catch (error) {
    setStatus("Ett fel uppstod under sokning. Forsok igen om en stund.", true);
    console.error(error);
  }
});

function setStatus(text, isError = false) {
  statusEl.textContent = text;
  statusEl.style.color = isError ? "#b42318" : "#0b6e4f";
}

function getRuleForNeed(need, countryCode) {
  const needConfig = NEED_RULES[need];
  if (!needConfig) {
    return {
      explanation: "Ingen regel hittades for detta behov.",
      overpass: ['["shop"~"convenience|supermarket"]']
    };
  }

  return needConfig[countryCode] || needConfig.fallback;
}

function placeUserMarker(lat, lon) {
  if (userMarker) {
    userMarker.remove();
  }
  userMarker = L.marker([lat, lon]).addTo(map).bindPopup("Du ar har");
  map.setView([lat, lon], 14);
}

function clearPoiMarkers() {
  poiMarkers.forEach((marker) => marker.remove());
  poiMarkers = [];
}

function renderPoi(items) {
  clearPoiMarkers();
  resultsEl.innerHTML = "";

  if (!items.length) {
    const li = document.createElement("li");
    li.textContent = "Inga relevanta platser hittades inom sokradien.";
    resultsEl.appendChild(li);
    return;
  }

  items.forEach((item, index) => {
    const marker = L.marker([item.lat, item.lon]).addTo(map).bindPopup(item.name);
    poiMarkers.push(marker);

    const li = document.createElement("li");
    li.style.animationDelay = `${index * 60}ms`;
    const dist = formatDistance(item.distance);
    const routeUrl = `https://www.google.com/maps/dir/?api=1&destination=${item.lat},${item.lon}`;

    li.innerHTML = `
      <strong>${escapeHtml(item.name)}</strong>
      <span class="meta">${escapeHtml(item.tagText)} • ${dist}</span>
      <a href="${routeUrl}" target="_blank" rel="noopener noreferrer">Oppna vagbeskrivning</a>
    `;
    resultsEl.appendChild(li);
  });
}

function formatDistance(meters) {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 0
    });
  });
}

async function reverseCountryCode(lat, lon) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/json"
    }
  });
  if (!response.ok) {
    throw new Error("Reverse geocoding failed");
  }

  const data = await response.json();
  return (data.address?.country_code || "").toUpperCase();
}

async function fetchPois(position, selectors) {
  const radius = 2500;
  const selectorRows = selectors
    .map((selector) => `nwr${selector}(around:${radius},${position.lat},${position.lon});`)
    .join("\n");

  const query = `[out:json][timeout:25];\n(\n${selectorRows}\n);\nout center tags;`;

  const response = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    body: query
  });

  if (!response.ok) {
    throw new Error("Overpass request failed");
  }

  const data = await response.json();
  const dedup = new Map();

  for (const el of data.elements || []) {
    const lat = el.lat || el.center?.lat;
    const lon = el.lon || el.center?.lon;
    if (!lat || !lon) {
      continue;
    }

    const name = el.tags?.name || "Okand plats";
    const tagText = summarizeTags(el.tags || {});
    const key = `${name}-${lat.toFixed(5)}-${lon.toFixed(5)}`;

    if (!dedup.has(key)) {
      dedup.set(key, { name, lat, lon, tagText });
    }
  }

  return Array.from(dedup.values());
}

function summarizeTags(tags) {
  if (tags.shop) {
    return `shop: ${tags.shop}`;
  }
  if (tags.amenity) {
    return `amenity: ${tags.amenity}`;
  }
  return "oklassificerad";
}

function haversineMeters(lat1, lon1, lat2, lon2) {
  const r = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(a));
}

function toRad(deg) {
  return (deg * Math.PI) / 180;
}
