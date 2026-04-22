const AZURE_MAPS_TILE_URL =
  "https://atlas.microsoft.com/map/tile?api-version=2024-04-01&tilesetId=microsoft.base.road&zoom={z}&x={x}&y={y}&tileSize=256&language=sv-SE&view=Auto&subscription-key=";
const AZURE_MAPS_ROUTE_URL = "https://atlas.microsoft.com/route/directions/json";
const IMAGE_VERSION = "20260421-stensunda-alsunda";

const DESTINATIONS = [
  {
    id: "fornbro",
    name: "Fornbro vattenpunkt",
    description: "Brandvattenpunkt vid Fornbro.",
    lat: 60.0618,
    lon: 18.218,
    image: `vendor/images/fornbro.jpg?v=${IMAGE_VERSION}`,
  },
  {
    id: "ekeby",
    name: "Ekeby vattenpunkt",
    description: "Brandvattenpunkt vid Ekeby.",
    lat: 60.0811,
    lon: 18.2272,
    image: `vendor/images/ekeby.jpg?v=${IMAGE_VERSION}`,
  },
  {
    id: "stensunda",
    name: "Stensunda vattenpunkt",
    description: "Brandvattenpunkt vid Stensunda.",
    lat: 60.0352,
    lon: 18.2286,
    image: `vendor/images/stensunda.jpg?v=${IMAGE_VERSION}`,
  },
  {
    id: "alsunda",
    name: "Alsunda vattenpunkt",
    description: "Brandvattenpunkt vid Alsunda.",
    lat: 60.0301,
    lon: 18.1823,
    image: `vendor/images/ålsunda.jpg?v=${IMAGE_VERSION}`,
  },
  {
    id: "testenbadet",
    name: "Testenbadet vattenpunkt",
    description: "Brandvattenpunkt vid Testenbadet.",
    lat: 59.9414,
    lon: 18.0729,
    image: `vendor/images/testenbadet.jpg?v=${IMAGE_VERSION}`,
  },
  {
    id: "spanga",
    name: "Spanga vattenpunkt",
    description: "Brandvattenpunkt vid Spanga.",
    lat: 60.034,
    lon: 18.039,
    image: `vendor/images/spanga.jpg?v=${IMAGE_VERSION}`,
  },
];

const mapViewEl = document.getElementById("map-view");
const listViewEl = document.getElementById("list-view");
const showMapViewBtn = document.getElementById("show-map-view");
const showListViewBtn = document.getElementById("show-list-view");
const locateBtn = document.getElementById("locate-btn");

const statusEl = document.getElementById("status");
const listStatusEl = document.getElementById("list-status");

const selectedCardEl = document.getElementById("selected-card");
const selectedImageEl = document.getElementById("selected-image");
const selectedNameEl = document.getElementById("selected-name");
const selectedCoordsEl = document.getElementById("selected-coords");
const selectedDescEl = document.getElementById("selected-desc");
const selectedMetaEl = document.getElementById("selected-meta");
const selectedRouteBtn = document.getElementById("selected-route-btn");
const selectedNavBtn = document.getElementById("selected-nav-btn");
const directionsEl = document.getElementById("directions");

const destinationListEl = document.getElementById("destination-list");

const destinationById = new Map(DESTINATIONS.map((d) => [d.id, d]));
const markerById = new Map();

let map = null;
let userMarker = null;
let routeLine = null;
let userPosition = null;
let selectedDestination = null;

function setStatus(text) {
  statusEl.textContent = text;
  listStatusEl.textContent = text;
}

function setActiveView(view) {
  const showMap = view === "map";
  mapViewEl.classList.toggle("view-active", showMap);
  listViewEl.classList.toggle("view-active", !showMap);

  showMapViewBtn.className = showMap ? "btn-primary" : "btn-secondary";
  showListViewBtn.className = showMap ? "btn-secondary" : "btn-primary";

  if (showMap && map) {
    setTimeout(() => map.invalidateSize(), 150);
  }
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
  return `${hours} h ${mins % 60} min`;
}

function formatCoords(destination) {
  return `GPS coord: ${destination.lat.toFixed(4)}, ${destination.lon.toFixed(4)}`;
}

function buildNavigationUrl(destination) {
  const destinationPoint = `${destination.lat},${destination.lon}`;
  if (!userPosition) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destinationPoint)}&travelmode=driving`;
  }

  const origin = `${userPosition.lat},${userPosition.lon}`;
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destinationPoint)}&travelmode=driving`;
}

function findNearestDestination(position) {
  let nearest = null;
  let nearestDistance = Infinity;

  for (const destination of DESTINATIONS) {
    const distance = haversineMeters(position.lat, position.lon, destination.lat, destination.lon);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = destination;
    }
  }

  return { destination: nearest, distanceMeters: nearestDistance };
}

function getSortedDestinations() {
  const rows = DESTINATIONS.map((destination) => {
    const distanceMeters = userPosition
      ? haversineMeters(userPosition.lat, userPosition.lon, destination.lat, destination.lon)
      : Number.POSITIVE_INFINITY;

    return { destination, distanceMeters };
  });

  rows.sort((a, b) => a.distanceMeters - b.distanceMeters);
  return rows;
}

function createPopupHtml(destination) {
  return `
    <img class="popup-image" src="${destination.image}" alt="Bild för ${destination.name}">
    <h3 class="popup-title">${destination.name}</h3>
    <p class="popup-text">${destination.description}</p>
    <div class="button-row">
      <button type="button" class="popup-btn btn-primary" data-show-route-id="${destination.id}">Visa rutt</button>
      <button type="button" class="popup-btn btn-secondary" data-nav-id="${destination.id}">Navigera</button>
    </div>
  `;
}

function renderDestinationList() {
  const rows = getSortedDestinations();

  destinationListEl.innerHTML = rows
    .map((row, index) => {
      const { destination, distanceMeters } = row;
      const distanceText = Number.isFinite(distanceMeters) ? formatDistance(distanceMeters) : "-";
      const nearestBadge = index === 0 && Number.isFinite(distanceMeters) ? "<span class=\"nearest-badge\">Narmast</span>" : "";

      return `
        <article class="destination-item">
          <h3>${destination.name}</h3>
          <div class="destination-coords">${formatCoords(destination)}</div>
          <p>${destination.description}</p>
          ${nearestBadge}
          <div class="destination-meta">Avstand: ${distanceText}</div>
          <div class="destination-actions">
            <button type="button" data-list-show-id="${destination.id}">Visa pa karta</button>
            <button type="button" class="btn-primary" data-list-nav-id="${destination.id}">Navigera</button>
          </div>
        </article>
      `;
    })
    .join("");
}

function setSelectedCard(destination, routeSummary, instructions) {
  if (!destination) return;

  selectedCardEl.classList.remove("hidden");
  selectedImageEl.src = destination.image;
  selectedNameEl.textContent = destination.name;
  selectedCoordsEl.textContent = formatCoords(destination);
  selectedDescEl.textContent = destination.description;

  if (routeSummary) {
    selectedMetaEl.textContent = `Vag: ${formatDistance(routeSummary.lengthInMeters)} | Tid: ${formatDuration(routeSummary.travelTimeInSeconds)}`;
  } else {
    selectedMetaEl.textContent = userPosition
      ? "Ingen vagbeskrivning kunde hamtas just nu."
      : "Aktivera position for att se vagbeskrivning.";
  }

  if (instructions && instructions.length) {
    const steps = instructions
      .slice(0, 6)
      .map((instruction) => `<li>${instruction.instruction || "Fortsatt fram"}</li>`)
      .join("");

    directionsEl.innerHTML = `<strong>Vagbeskrivning</strong><ol>${steps}</ol>`;
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
      map.fitBounds(group.getBounds().pad(0.2), {
        animate: true,
        paddingTopLeft: [10, 70],
        paddingBottomRight: [10, 220],
      });

      setSelectedCard(destination, route.summary, route.instructions);
      setStatus(fromAutoNearest ? "Narmaste vattenpunkt vald." : `Vald destination: ${destination.name}`);
      return;
    }

    map.setView([destination.lat, destination.lon], 14, { animate: true });
    setSelectedCard(destination, null, null);
    setStatus("Kunde inte hamta rutt, men destinationen ar vald.");
  } catch (error) {
    map.setView([destination.lat, destination.lon], 14, { animate: true });
    setSelectedCard(destination, null, null);
    setStatus(`Kunde inte hamta rutt: ${error.message}`);
  }
}

function bindUiEvents() {
  showMapViewBtn.addEventListener("click", () => {
    setActiveView("map");
  });

  showListViewBtn.addEventListener("click", () => {
    setActiveView("list");
  });

  locateBtn.addEventListener("click", () => {
    setActiveView("map");
    requestUserLocation(false, true);
  });

  destinationListEl.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const showId = target.getAttribute("data-list-show-id");
    if (showId) {
      const destination = destinationById.get(showId);
      if (!destination) return;
      showRouteTo(destination, false);
      setActiveView("map");
      return;
    }

    const navId = target.getAttribute("data-list-nav-id");
    if (navId) {
      const destination = destinationById.get(navId);
      if (!destination) return;
      openNavigation(destination);
    }
  });

  map.on("popupopen", () => {
    const navButtons = document.querySelectorAll(".popup-btn[data-nav-id]");
    const routeButtons = document.querySelectorAll(".popup-btn[data-show-route-id]");

    navButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const id = button.getAttribute("data-nav-id");
        const destination = id ? destinationById.get(id) : null;
        if (!destination) return;
        openNavigation(destination);
      });
    });

    routeButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const id = button.getAttribute("data-show-route-id");
        const destination = id ? destinationById.get(id) : null;
        if (!destination) return;
        showRouteTo(destination, false);
      });
    });
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

function requestUserLocation(initial, forceNearest = false) {
  if (!navigator.geolocation) {
    setStatus("Geolokalisering stods inte i denna enhet/webblasare.");
    renderDestinationList();
    return;
  }

  setStatus(initial ? "Hamtar telefonens position..." : forceNearest ? "Gar till narmaste punkt..." : "Uppdaterar position...");

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      userPosition = {
        lat: pos.coords.latitude,
        lon: pos.coords.longitude,
      };

      setUserMarker(userPosition);
      renderDestinationList();

      const nearest = findNearestDestination(userPosition);
      if (forceNearest || !selectedDestination || initial) {
        await showRouteTo(nearest.destination, true);
      } else {
        await showRouteTo(selectedDestination, false);
      }
    },
    (error) => {
      let msg = "Kunde inte hamta position.";
      if (error.code === error.PERMISSION_DENIED) {
        msg = "Tillat platsatkomst for att hitta narmaste vattenpunkt.";
      }
      setStatus(msg);
      renderDestinationList();
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
    const icon = L.divIcon({
      className: "destination-thumb-marker",
      html: `<img src="${destination.image}" alt="Miniatyr ${destination.name}">`,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      popupAnchor: [0, -18],
    });

    const marker = L.marker([destination.lat, destination.lon], { icon }).addTo(map);
    marker.bindPopup(createPopupHtml(destination));
    markerById.set(destination.id, marker);

    marker.on("click", () => {
      selectedDestination = destination;
      setSelectedCard(destination, null, null);
      setStatus(`Vald destination: ${destination.name}`);
    });
  });

  renderDestinationList();
  bindUiEvents();
  requestUserLocation(true);
}

initMap();
