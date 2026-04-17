const API_BASE_URL = (window.BRANDRESAN_API_BASE_URL || "").replace(/\/$/, "");
const STATE_ENDPOINT = `${API_BASE_URL}/api/state`;
const SCHEDULE_ENDPOINT = `${STATE_ENDPOINT}?id=brandresan-schedule`;
const INSTRUCTORS_ENDPOINT = `${STATE_ENDPOINT}?id=brandresan-instructors`;
const REFRESH_INTERVAL_MS = 60 * 60 * 1000;
const DAY_ROLLOVER_CHECK_MS = 60 * 1000;

let lessons = [];
let instructors = [];
let selectedId = null;

function toIsoDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

let viewDate = toIsoDate(new Date());
let lastKnownToday = viewDate;
const countBadge = document.getElementById("countBadge");
const scheduleList = document.getElementById("scheduleList");
const emptyState = document.getElementById("emptyState");
const detailCard = document.getElementById("detailCard");
const detailTime = document.getElementById("detailTime");
const detailType = document.getElementById("detailType");
const detailTitle = document.getElementById("detailTitle");
const detailLocation = document.getElementById("detailLocation");
  const detailInstructorSection = document.getElementById("detailInstructorSection");
  const detailInstructorName = document.getElementById("detailInstructorName");
  const detailInstructorSignature = document.getElementById("detailInstructorSignature");
  const detailInstructorPhoto = document.getElementById("detailInstructorPhoto");
const equipmentList = document.getElementById("equipmentList");
const detailFocus = document.getElementById("detailFocus");
const equipmentSection = document.getElementById("equipmentSection");
const focusSection = document.getElementById("focusSection");
const breakSection = document.getElementById("breakSection");
const mapModal = document.getElementById("mapModal");
const openMapBtn = document.getElementById("openMapBtn");
const closeMapBtn = document.getElementById("closeMapBtn");

function isBreakLesson(lesson) {
  const type = String(lesson.type || "").trim().toLowerCase();
  const title = String(lesson.title || "").trim().toLowerCase();
  return type === "rast" || title === "rast";
}

function openMapModal() {
  mapModal.classList.remove("hidden");
}

function closeMapModal() {
  mapModal.classList.add("hidden");
}

function parseTime(input) {
  const [hours, minutes] = input.split(":").map(Number);
  return hours * 60 + minutes;
}

function nowMinutes() {
  const date = new Date();
  return date.getHours() * 60 + date.getMinutes();
}

function renderHeader() {
  renderDateNav();
}

function renderDateNav() {
  const d = new Date(viewDate + "T00:00:00");
  const todayStr = toIsoDate(new Date());
  const tomorrowStr = toIsoDate(new Date(new Date().setDate(new Date().getDate() + 1)));
  const yestStr = toIsoDate(new Date(new Date().setDate(new Date().getDate() - 1)));

  let relLabel = "";
  if (viewDate === todayStr) relLabel = "Idag";
  else if (viewDate === tomorrowStr) relLabel = "Imorgon";
  else if (viewDate === yestStr) relLabel = "Igår";

  const fullLabel = new Intl.DateTimeFormat("sv-SE", {
    weekday: "long",
    day: "numeric",
    month: "long"
  }).format(d);

  document.getElementById("dateRelLabel").textContent = relLabel;
  document.getElementById("dateFullLabel").textContent = fullLabel.charAt(0).toUpperCase() + fullLabel.slice(1);
}

function renderSchedule() {
  const now = nowMinutes();
  scheduleList.innerHTML = "";

  const dayLessons = lessons.filter((l) => !l.date || l.date === viewDate);
  const sortedDayLessons = [...dayLessons].sort((a, b) => {
    const aStart = String(a.start || "");
    const bStart = String(b.start || "");
    return aStart.localeCompare(bStart);
  });

  countBadge.textContent = `${sortedDayLessons.length} pass`;

  if (sortedDayLessons.length === 0) {
    scheduleList.innerHTML = '<p style="color:var(--ink-soft);text-align:center;padding:20px 0;">Inga lektioner planerade för detta datum.</p>';
    return;
  }

  sortedDayLessons.forEach((lesson) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "lesson";

    if (selectedId === lesson.id) {
      button.classList.add("active");
    }

    if (now >= parseTime(lesson.start) && now <= parseTime(lesson.end)) {
      button.classList.add("current");
    }

    const metaParts = [lesson.type, lesson.location].filter((value) => String(value || "").trim().length > 0);

    button.innerHTML = `
      <p class="lesson-time">${lesson.start} - ${lesson.end}</p>
      <p class="lesson-title">${lesson.title}</p>
      <p class="lesson-meta">${metaParts.join(" | ")}</p>
    `;

    button.addEventListener("click", () => {
      selectedId = lesson.id;
      renderSchedule();
      renderDetail();
    });

    scheduleList.appendChild(button);
  });
}

async function renderDetail() {
  const lesson = lessons.find((item) => item.id === selectedId);

  if (!lesson) {
    detailCard.classList.add("hidden");
    emptyState.classList.remove("hidden");
    return;
  }

  emptyState.classList.add("hidden");
  detailCard.classList.remove("hidden");

  detailTime.textContent = `${lesson.start} - ${lesson.end}`;
  detailType.textContent = lesson.type;
  detailTitle.textContent = lesson.title;
  const isBreak = isBreakLesson(lesson);

  if (isBreak) {
    detailLocation.classList.add("hidden");
    detailInstructorSection.classList.add("hidden");
    equipmentSection.classList.add("hidden");
    focusSection.classList.add("hidden");
    breakSection.classList.remove("hidden");
    return;
  }

  breakSection.classList.add("hidden");

  if (String(lesson.location || "").trim()) {
    detailLocation.textContent = `Plats: ${lesson.location}`;
    detailLocation.classList.remove("hidden");
  } else {
    detailLocation.classList.add("hidden");
  }

  if (String(lesson.instructor || "").trim()) {
    const instructor = instructors.find(i => i.name === lesson.instructor);
    detailInstructorName.textContent = lesson.instructor;
    if (instructor && instructor.photo) {
      detailInstructorPhoto.src = instructor.photo;
      detailInstructorPhoto.classList.remove("hidden");
    } else {
      detailInstructorPhoto.classList.add("hidden");
    }
    if (instructor && instructor.signature) {
      detailInstructorSignature.textContent = instructor.signature;
      detailInstructorSignature.classList.remove("hidden");
    } else {
      detailInstructorSignature.classList.add("hidden");
    }
    detailInstructorSection.classList.remove("hidden");
  } else {
    detailInstructorSection.classList.add("hidden");
  }

  equipmentList.innerHTML = "";
  const equipment = Array.isArray(lesson.equipment) ? lesson.equipment.filter((item) => String(item || "").trim()) : [];
  if (equipment.length > 0) {
    equipment.forEach((item) => {
      const listItem = document.createElement("li");
      listItem.textContent = item;
      equipmentList.appendChild(listItem);
    });
    equipmentSection.classList.remove("hidden");
  } else {
    equipmentSection.classList.add("hidden");
  }

  const focus = String(lesson.focus || "").trim();
  if (focus) {
    detailFocus.textContent = focus;
    focusSection.classList.remove("hidden");
  } else {
    detailFocus.textContent = "";
    focusSection.classList.add("hidden");
  }
}

async function readJson(response) {
  const bodyText = await response.text();

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  try {
    return bodyText ? JSON.parse(bodyText) : [];
  } catch {
    if (bodyText.trim().startsWith("<!DOCTYPE") || bodyText.trim().startsWith("<html")) {
      throw new Error("API svarade med HTML i stället för JSON. Om du kör via Live Server lokalt behöver config.js peka på den deployade backend-URL:en.");
    }

    throw new Error("API svarade inte med giltig JSON.");
  }
}

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];

    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }

  values.push(current.trim());
  return values;
}

function parseCsvSchedule(csvText) {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2) {
    return [];
  }

  const headers = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const cols = parseCsvLine(line);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = cols[index] || "";
    });
    return row;
  });

  return rows.map((row, index) => {
    const [start = "", end = ""] = (row.Tid || "").split("-").map((time) => time.trim());
    const equipment = [];

    if ((row["Larmställ"] || "").toUpperCase() === "JA") equipment.push("Larmställ");
    if ((row["Civila kläder"] || "").toUpperCase() === "JA") equipment.push("Civila kläder");
    if ((row["Underställ"] || "").toUpperCase() === "JA") equipment.push("Underställ");

    return {
      id: index + 1,
      start,
      end,
      title: row.Lektionsnamn || "",
      type: row.Typ || "Workshop",
      location: row.Plats || "",
      instructor: row["Instruktör"] || "",
      focus: row.Info || "",
      equipment
    };
  });
}

async function loadScheduleFromCsvFallback() {
  const response = await fetch("schedule.csv");
  if (!response.ok) {
    throw new Error(`CSV fallback error: ${response.status}`);
  }

  const csvText = await response.text();
  lessons = parseCsvSchedule(csvText);
  selectedId = lessons[0]?.id ?? null;
}

async function loadInstructors() {
  try {
    const response = await fetch(INSTRUCTORS_ENDPOINT);
    const data = await readJson(response);

    if (Array.isArray(data) && data.length > 0) {
      const payload = data[0].payload;
      instructors = Array.isArray(payload) ? payload : [];
    } else {
      instructors = [];
    }
  } catch (error) {
    console.error("Failed to load instructors:", error);
    instructors = [];
  }
}

async function loadSchedule() {
  try {
    const response = await fetch(SCHEDULE_ENDPOINT);
    const data = await readJson(response);

    if (Array.isArray(data) && data.length > 0) {
      const payload = data[0].payload;
      lessons = Array.isArray(payload) ? payload : [];
      selectedId = lessons[0]?.id ?? null;
    } else {
      lessons = [];
      selectedId = null;
    }
  } catch (error) {
    try {
      await loadScheduleFromCsvFallback();
      emptyState.innerHTML = `
        <h2>Visar lokal fallback-data</h2>
        <p>API var inte tillgängligt (${error.message}). Data visas från schedule.csv.</p>
      `;
    } catch (fallbackError) {
      lessons = [];
      selectedId = null;
      emptyState.innerHTML = `
        <h2>Kunde inte läsa schema</h2>
        <p>API-fel: ${error.message}</p>
        <p>Fallback-fel: ${fallbackError.message}</p>
      `;
    }
  }

  renderHeader();
  renderSchedule();
  renderDetail();
}

async function handleDayRollover() {
  const today = toIsoDate(new Date());

  if (today === lastKnownToday) {
    return;
  }

  // Only auto-advance when the board is currently following "today".
  if (viewDate === lastKnownToday) {
    lastKnownToday = today;
    viewDate = today;
    selectedId = null;
    await loadSchedule();
    return;
  }

  lastKnownToday = today;
}

renderHeader();
renderSchedule();
renderDetail();
loadSchedule();
setInterval(loadSchedule, REFRESH_INTERVAL_MS);
setInterval(handleDayRollover, DAY_ROLLOVER_CHECK_MS);

loadInstructors();

document.getElementById("prevDay").addEventListener("click", () => {
  const d = new Date(viewDate + "T00:00:00");
  d.setDate(d.getDate() - 1);
  viewDate = toIsoDate(d);
  selectedId = null;
  renderDateNav();
  renderSchedule();
  renderDetail();
});

document.getElementById("nextDay").addEventListener("click", () => {
  const d = new Date(viewDate + "T00:00:00");
  d.setDate(d.getDate() + 1);
  viewDate = toIsoDate(d);
  selectedId = null;
  renderDateNav();
  renderSchedule();
  renderDetail();
});

openMapBtn.addEventListener("click", openMapModal);
closeMapBtn.addEventListener("click", closeMapModal);

mapModal.addEventListener("click", (event) => {
  if (event.target === mapModal) {
    closeMapModal();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !mapModal.classList.contains("hidden")) {
    closeMapModal();
  }
});