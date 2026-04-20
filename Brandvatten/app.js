const AZURE_MAPS_TILE_URL =
  "https://atlas.microsoft.com/map/tile?api-version=2024-04-01&tilesetId=microsoft.base.road&zoom={z}&x={x}&y={y}&tileSize=256&language=sv-SE&view=Auto&subscription-key=";
const AZURE_MAPS_ROUTE_URL = "https://atlas.microsoft.com/route/directions/json";

const DESTINATIONS = [
  {
    id: "fornbro",
    name: "Fornbro vattenpunkt",
    description: "Brandvattenpunkt vid Fornbro.",
    lat: 60.0618,
    lon: 18.218,
    image: "vendor/images/fornbro.jpg",
  },
  {
    id: "ekeby",
    name: "Ekeby vattenpunkt",
    description: "Brandvattenpunkt vid Ekeby.",
    lat: 60.0811,
    lon: 18.2272,
    image: "vendor/images/ekeby.jpg",
  },
];

const statusEl = document.getElementById("status");
const locateBtn = document.getElementById("locate-btn");

const nearestCardEl = document.getElementById("nearest-card");
const nearestImageEl = document.getElementById("nearest-image");
const nearestNameEl = document.getElementById("nearest-name");
const nearestDescEl = document.getElementById("nearest-desc");
const nearestMetaEl = document.getElementById("nearest-meta");
const nearestRouteBtn = document.getElementById("nearest-route-btn");
const nearestNavBtn = document.getElementById("nearest-nav-btn");

const selectedCardEl = document.getElementById("selected-card");
const selectedImageEl = document.getElementById("selected-image");
const selectedNameEl = document.getElementById("selected-name");
const selectedDescEl = document.getElementById("selected-desc");
const selectedMetaEl = document.getElementById("selected-meta");
const selectedRouteBtn = document.getElementById("selected-route-btn");
const selectedNavBtn = document.getElementById("selected-nav-btn");
const directionsEl = document.getElementById("directions");

const destinationListEl = document.getElementById("destination-list");

const destinationById = new Map(DESTINATIONS.map((d) => [d.id, d]));

let map = null;
let userMarker = null;
let routeLine = null;
let userPosition = null;
let selectedDestination = null;
let nearestDestination = null;

function setStatus(text) {
  statusEl.textContent = text;
}

function haversineMeters(aLat, aLon, bLat, bLon) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371000;

  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);

  const aa =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
  return R * c;
}

function formatDistance(meters) {
  if (!Number.isFinite(meters)) return "-";
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1).replace(".", ",")} km`;
}

function formatDuration(seconds) {
  if (!Number.isFinite(seconds)) return "-";
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  return `${hours} h ${rem} min`;
}

function buildNavigationUrl(destination) {
  const dest = `${destination.lat},${destination.lon}`;
  if (!userPosition) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}&travelmode=driving`;
  }

  const origin = `${userPosition.lat},${userPosition.lon}`;
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(dest)}&travelmode=driving`;
}

function findNearestDestination(position) {
  let best = null;
  let bestDist = Infinity;

  for (const destination of DESTINATIONS) {
    const dist = haversineMeters(position.lat, position.lon, destination.lat, destination.lon);
    if (dist < bestDist) {
      bestDist = dist;
      best = destination;
    }
  }

  return { destination: best, distanceMeters: bestDist };
}

function createPopupHtml(destination) {
  return `
    <img class="popup-image" src="${destination.image}" alt="Bild för ${destination.name}">
    <h3 class="popup-title">${destination.name}</h3>
    <p class="popup-text">${destination.description}</p>
    <button type="button" class="popup-btn btn-primary" data-nav-id="${destination.id}">Navigera hit</button>
  `;
}

function renderDestinationList() {
  destinationListEl.innerHTML = DESTINATIONS.map((destination) => {
    return `
      <div class="destination-item">
        <h3>${destination.name}</h3>
        <p>${destination.description}</p>
        <div class="destination-actions">
          <button type="button" data-show-id="${destination.id}">Visa</button>
          <button type="button" class="btn-primary" data-nav-id="${destination.id}">Navigera hit</button>
        </div>
      </div>
    `;
  }).join("");
}

function setNearestCard(destination, distanceMeters) {
  if (!destination) return;

  nearestCardEl.classList.remove("hidden");
  nearestImageEl.src = destination.image;
  nearestNameEl.textContent = destination.name;
  nearestDescEl.textContent = destination.description;
  nearestMetaEl.textContent = `Fagelvag: ${formatDistance(distanceMeters)}`;
}

function setSelectedCard(destination, routeSummary, instructions) {
  if (!destination) return;

  selectedCardEl.classList.remove("hidden");
  selectedImageEl.src = destination.image;
  selectedNameEl.textContent = destination.name;
  selectedDescEl.textContent = destination.description;

  if (routeSummary) {
    selectedMetaEl.textContent = `Vag: ${formatDistance(routeSummary.lengthInMeters)} | Tid: ${formatDuration(routeSummary.travelTimeInSeconds)}`;
  } else {
    selectedMetaEl.textContent = userPosition
      ? "Ingen vagbeskrivning kunde hamtas just nu."
      : "Aktivera position for att se vagbeskrivning.";
  }

  if (instructions && instructions.length) {
    const items = instructions
      .slice(0, 6)
      .map((instruction) => `<li>${instruction.instruction || "Fortsatt fram"}</li>`)
      .join("");

    directionsEl.innerHTML = `<strong>Vagbeskrivning</strong><ol>${items}</ol>`;
  } else {
    directionsEl.innerHTML = "";
  }
}

function openNavigation(destination) {
  window.open(buildNavigationUrl(destination), "_blank", "noopener,noreferrer");
}

function clearRouteLine() {
  if (!routeLine) return;
  map.removeLayer(routeLine);
  routeLine = null;
}

function setUserMarker(position) {
  const latlng = [position.lat, position.lon];
  if (!userMarker) {
    userMarker = L.circleMarker(latlng, {
      radius: 8,
      color: "#0f766e",
      weight: 2,
      fillColor: "#14b8a6",
      fillOpacity: 0.9,
    })
      .addTo(map)
      .bindTooltip("Din position", { permanent: false, direction: "top" });
    return;
  }

  userMarker.setLatLng(latlng);
}

async function fetchRouteTo(destination) {
  if (!AZURE_MAPS_KEY || !userPosition) return null;

  const query = `${userPosition.lat},${userPosition.lon}:${destination.lat},${destination.lon}`;
  const params = new URLSearchParams({
    "api-version": "1.0",
    query,
    travelMode: "car",
    routeType: "fastest",
    traffic: "true",
    language: "sv-SE",
    "subscription-key": AZURE_MAPS_KEY,
  });

  const response = await fetch(`${AZURE_MAPS_ROUTE_URL}?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Ruttanrop misslyckades (${response.status})`);
  }

  const data = await response.json();
  const route = data?.routes?.[0];
  if (!route) return null;

  const points = route.legs?.flatMap((leg) => leg.points || []) || [];
  const latLngs = points.map((point) => [point.latitude, point.longitude]);
  const instructions = route.guidance?.instructions || [];

  return {
    latLngs,
    summary: route.summary,
    instructions,
  };
}

async function showRouteTo(destination, fromAutoNearest = false) {
  if (!destination) return;
  selectedDestination = destination;

  setStatus(fromAutoNearest ? "Ritar rutt till narmaste punkt..." : `Ritar rutt till ${destination.name}...`);

  try {
    const route = await fetchRouteTo(destination);
    clearRouteLine();

    if (route && route.latLngs.length) {
      routeLine = L.polyline(route.latLngs, {
        color: "#0f766e",
        weight: 5,
        opacity: 0.85,
      }).addTo(map);

      const group = L.featureGroup([routeLine, userMarker].filter(Boolean));
      map.fitBounds(group.getBounds().pad(0.25), { animate: true });
      setSelectedCard(destination, route.summary, route.instructions);
      setStatus(fromAutoNearest ? "Narmaste vattenpunkt vald." : `Vald destination: ${destination.name}`);
      return;
    }

    setSelectedCard(destination, null, null);
    setStatus("Kunde inte hamta rutt, men destinationen ar vald.");
  } catch (error) {
    setSelectedCard(destination, null, null);
    setStatus(`Kunde inte hamta rutt: ${error.message}`);
  }
}

function bindUiEvents() {
  locateBtn.addEventListener("click", () => {
    requestUserLocation(false);
  });

  destinationListEl.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const showId = target.getAttribute("data-show-id");
    if (showId) {
      const destination = destinationById.get(showId);
      if (!destination) return;
      map.setView([destination.lat, destination.lon], Math.max(map.getZoom(), 13), { animate: true });
      showRouteTo(destination, false);
      return;
    }

    const navId = target.getAttribute("data-nav-id");
    if (navId) {
      const destination = destinationById.get(navId);
      if (!destination) return;
      openNavigation(destination);
    }
  });

  map.on("popupopen", () => {
    const popupBtns = document.querySelectorAll(".popup-btn[data-nav-id]");
    popupBtns.forEach((button) => {
      button.addEventListener("click", () => {
        const navId = button.getAttribute("data-nav-id");
        const destination = navId ? destinationById.get(navId) : null;
        if (!destination) return;
        openNavigation(destination);
      });
    });
  });

  nearestRouteBtn.addEventListener("click", () => {
    if (!nearestDestination) return;
    showRouteTo(nearestDestination, true);
  });

  nearestNavBtn.addEventListener("click", () => {
    if (!nearestDestination) return;
    openNavigation(nearestDestination);
  });

  selectedRouteBtn.addEventListener("click", () => {
    if (!selectedDestination) return;
    showRouteTo(selectedDestination, false);
  });

  selectedNavBtn.addEventListener("click", () => {
    if (!selectedDestination) return;
    openNavigation(selectedDestination);
  });
}

function requestUserLocation(initial) {
  if (!navigator.geolocation) {
    setStatus("Geolokalisering stods inte i denna enhet/webblasare.");
    return;
  }

  setStatus(initial ? "Hamtar telefonens position..." : "Uppdaterar position...");

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      userPosition = {
        lat: pos.coords.latitude,
        lon: pos.coords.longitude,
      };

      setUserMarker(userPosition);

      const nearest = findNearestDestination(userPosition);
      nearestDestination = nearest.destination;
      setNearestCard(nearest.destination, nearest.distanceMeters);

      if (!selectedDestination || initial) {
        showRouteTo(nearest.destination, true);
      } else {
        showRouteTo(selectedDestination, false);
      }
    },
    (error) => {
      let msg = "Kunde inte hamta position.";
      if (error.code === error.PERMISSION_DENIED) {
        msg = "Tillat platsatkomst for att hitta narmaste vattenpunkt.";
      }
      setStatus(msg);
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 15000,
    },
  );
}

function initMap() {
  map = L.map("map", {
    zoomControl: true,
  }).setView([60.0715, 18.2226], 12);

  const baseLayer = AZURE_MAPS_KEY
    ? L.tileLayer(`${AZURE_MAPS_TILE_URL}${encodeURIComponent(AZURE_MAPS_KEY)}`, {
        maxZoom: 22,
        attribution:
          '&copy; <a href="https://www.microsoft.com/maps" target="_blank" rel="noreferrer">Microsoft Azure Maps</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>',
      })
    : L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 22,
        attribution: "&copy; OpenStreetMap",
      });

  baseLayer.addTo(map);

  DESTINATIONS.forEach((destination) => {
    const marker = L.marker([destination.lat, destination.lon]).addTo(map);
    marker.bindPopup(createPopupHtml(destination));

    marker.on("click", () => {
      showRouteTo(destination, false);
    });
  });

  renderDestinationList();
  bindUiEvents();
  requestUserLocation(true);
}

initMap();
