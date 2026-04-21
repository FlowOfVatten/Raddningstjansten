// Insatsledarvyn – Command Center

const API_BASE = window.location.origin;
const UPDATE_INTERVAL = 2000; // Poll every 2 seconds
const DEFAULT_CENTER = [59.3293, 18.0686]; // Stockholm

let map;
let markers = new Map();
let updateTimer;

// Initialize map
function initMap() {
  map = L.map("map").setView(DEFAULT_CENTER, 12);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap"
  }).addTo(map);
}

// Format timestamp
function formatTime(ms) {
  const now = new Date();
  const then = new Date(ms);
  const diff = now - then;

  if (diff < 10000) return "just nu";
  if (diff < 60000) return `${Math.round(diff / 1000)}s sedan`;
  if (diff < 3600000) return `${Math.round(diff / 60000)}m sedan`;
  return then.toLocaleTimeString("sv");
}

// Update firefighters display
async function updateFirefighters() {
  try {
    const response = await fetch(`${API_BASE}/api/positions`);
    if (!response.ok) {
      setStatus("Kunde inte hämta positioner");
      return;
    }

    const data = await response.json();
    const firefighters = data.firefighters || [];

    // Update map markers
    updateMarkers(firefighters);

    // Update sidebar list
    updateFirefighterList(firefighters);

    // Update header stats
    updateStats(firefighters);

    // Update timestamp
    document.getElementById("last-update").textContent = formatTime(data.timestamp);
  } catch (error) {
    console.error("Update failed:", error);
    setStatus("Anslutningsfel");
  }
}

function updateMarkers(firefighters) {
  const activIds = new Set(firefighters.map(f => f.id));

  // Remove markers for firefighters no longer active
  for (const [id, marker] of markers) {
    if (!activIds.has(id)) {
      map.removeLayer(marker);
      markers.delete(id);
    }
  }

  // Update or add markers
  for (const ff of firefighters) {
    const icon = ff.sos
      ? L.icon({
          iconUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect fill='%23ff4444' width='32' height='32' rx='4'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='white' font-size='18' font-weight='bold'%3ESOS%3C/text%3E%3C/svg%3E",
          iconSize: [40, 40],
          iconAnchor: [20, 20]
        })
      : L.icon({
          iconUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='14' fill='%230f766e'/%3E%3Ccircle cx='16' cy='16' r='10' fill='%2314b8a6'/%3E%3C/svg%3E",
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        });

    if (markers.has(ff.id)) {
      const marker = markers.get(ff.id);
      marker.setLatLng([ff.lat, ff.lon]);
    } else {
      const marker = L.marker([ff.lat, ff.lon], { icon })
        .bindPopup(`<strong>${ff.id}</strong><br/>SOS: ${ff.sos ? "✓" : "Nej"}`)
        .addTo(map);
      markers.set(ff.id, marker);
    }
  }

  // Fit bounds if we have markers
  if (markers.size > 0) {
    const bounds = L.latLngBounds(
      Array.from(markers.values()).map(m => m.getLatLng())
    );
    if (bounds.isValid()) {
      map.fitBounds(bounds.pad(0.1));
    }
  }
}

function updateFirefighterList(firefighters) {
  const list = document.getElementById("firefighter-list");

  if (firefighters.length === 0) {
    list.innerHTML = '<li class="empty">Väntar på positioner...</li>';
    return;
  }

  list.innerHTML = firefighters
    .map(
      ff => `
    <li class="${ff.sos ? "sos" : ""}">
      <span class="name">${escapeHtml(ff.id)}</span>
      <span class="distance">${formatTime(ff.lastUpdate)}</span>
      ${ff.sos ? '<span style="color: #ff4444; font-weight: 800;">🆘 SOS AKTIV</span>' : ""}
    </li>
  `
    )
    .join("");
}

function updateStats(firefighters) {
  const count = firefighters.length;
  const sosCount = firefighters.filter(f => f.sos).length;

  document.getElementById("fire-count").textContent = `${count} aktiv${count !== 1 ? "a" : ""}`;
  document.getElementById("sos-count").textContent = `${sosCount} SOS`;
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function setStatus(message) {
  console.log("[Status]", message);
}

// Button handlers
document.getElementById("refresh-btn").addEventListener("click", updateFirefighters);

document.getElementById("clear-btn").addEventListener("click", async () => {
  if (confirm("Rensa alla positioner?")) {
    // We would need a POST endpoint to clear all data
    // For now, just clear the view
    markers.forEach(marker => map.removeLayer(marker));
    markers.clear();
    document.getElementById("firefighter-list").innerHTML = '<li class="empty">Rensad</li>';
  }
});

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  initMap();
  updateFirefighters();
  updateTimer = setInterval(updateFirefighters, UPDATE_INTERVAL);
});

// Clean up on page unload
window.addEventListener("beforeunload", () => {
  if (updateTimer) clearInterval(updateTimer);
});
