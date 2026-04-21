// Brandmannens vy – Firefighter Client

const API_BASE = window.location.origin;
const POSITION_UPDATE_INTERVAL = 5000; // Update every 5 seconds
const SOS_UPDATE_INTERVAL = 2000; // Update every 2 seconds in SOS mode

let firefighterId = localStorage.getItem("sos_id") || generateId();
let isSharing = false;
let isSOSActive = false;
let updateTimer;
let currentPosition;

// Generate unique ID for this firefighter
function generateId() {
  const id = `BM-${Math.random().toString(36).substring(7).toUpperCase()}`;
  localStorage.setItem("sos_id", id);
  return id;
}

// Get geolocation
async function getPosition() {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    });
  });
}

// Update position on server
async function updatePosition() {
  if (!isSharing) return;

  try {
    const position = await getPosition();
    currentPosition = {
      lat: position.coords.latitude,
      lon: position.coords.longitude,
      accuracy: position.coords.accuracy
    };

    const response = await fetch(`${API_BASE}/api/position`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: firefighterId,
        lat: currentPosition.lat,
        lon: currentPosition.lon,
        accuracy: currentPosition.accuracy,
        sos: isSOSActive
      })
    });

    if (!response.ok) {
      setStatus("Positionsuppdatering misslyckades", false);
      return;
    }

    setStatus(
      isSOSActive
        ? `🆘 SOS-läge aktivt – Position uppdaterad`
        : `Position uppdaterad`,
      true
    );

    updateDisplay();
  } catch (error) {
    setStatus("Kunde inte hämta position. Tillat GPS-åtkomst.", false);
    console.error(error);
  }
}

// Start position sharing
async function startSharing() {
  isSharing = true;
  updateStats(true, false);

  // First update
  await updatePosition();

  // Regular updates
  const interval = isSOSActive ? SOS_UPDATE_INTERVAL : POSITION_UPDATE_INTERVAL;
  updateTimer = setInterval(() => {
    updatePosition();
  }, interval);

  document.getElementById("share-btn").disabled = true;
}

// Activate SOS
function activateSOS() {
  if (!isSharing) {
    alert("Starta positionsdelning först!");
    return;
  }

  isSOSActive = true;
  updateStats(true, true);

  // Clear old timer and start faster updates
  if (updateTimer) clearInterval(updateTimer);
  updateTimer = setInterval(() => {
    updatePosition();
  }, SOS_UPDATE_INTERVAL);

  // Visual feedback
  document.body.style.background = "#ff4444";
  document.getElementById("sos-btn").style.opacity = "0.5";

  setTimeout(() => {
    alert("🆘 NÖDLÄGE AKTIVT\n\nInsatsledningen har mottagit din position och status.");
  }, 500);
}

// Update UI
function setStatus(message, isSuccess) {
  const statusEl = document.getElementById("status-text");
  const accuracyEl = document.getElementById("accuracy-text");

  statusEl.textContent = message;
  statusEl.style.color = isSuccess ? "#0b6e4f" : "#b42318";

  if (currentPosition) {
    const acc = currentPosition.accuracy
      ? `Noggrannhet: ±${Math.round(currentPosition.accuracy)}m`
      : "";
    accuracyEl.textContent = acc;
  }
}

function updateDisplay() {
  if (currentPosition) {
    const lat = currentPosition.lat.toFixed(6);
    const lon = currentPosition.lon.toFixed(6);
    document.getElementById("position-display").textContent = `${lat}, ${lon}`;
  }
}

function updateStats(sharing, sos) {
  const statusPanel = document.getElementById("status-panel");
  const statusText = document.getElementById("status-text");

  if (sos) {
    statusPanel.style.background = "#ffebee";
    statusText.style.color = "#ff4444";
    statusText.textContent = "🆘 NÖDLÄGE AKTIVT - Position uppdateras snabbt";
  } else if (sharing) {
    statusPanel.style.background = "linear-gradient(120deg, #e8f5f5, #f0faf8)";
    statusText.style.color = "#0b6e4f";
    statusText.textContent = "✓ Position delas";
  } else {
    statusPanel.style.background = "linear-gradient(120deg, #f0f0f0, #fafafa)";
    statusText.style.color = "#666";
    statusText.textContent = "Initierar...";
  }
}

// Event listeners
document.getElementById("share-btn").addEventListener("click", startSharing);
document.getElementById("sos-btn").addEventListener("click", activateSOS);

// Notify server when page closes
window.addEventListener("beforeunload", () => {
  if (isSharing) {
    navigator.sendBeacon(`${API_BASE}/api/position/${firefighterId}`, {});
  }
});

// Override unload to delete from tracking
window.addEventListener("unload", async () => {
  if (isSharing) {
    try {
      await fetch(`${API_BASE}/api/position/${firefighterId}`, {
        method: "DELETE"
      });
    } catch (e) {
      // Silently ignore
    }
  }
});

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  updateStats(false, false);
});
