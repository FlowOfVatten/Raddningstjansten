const API_BASE_URL = (window.BRANDRESAN_API_BASE_URL || "").replace(/\/$/, "");
const SCHEDULE_ENDPOINT = `${API_BASE_URL}/api/brandresan-schedule`;

let lessons = [];
let selectedId = null;

const todayLabel = document.getElementById("todayLabel");
const countBadge = document.getElementById("countBadge");
const scheduleList = document.getElementById("scheduleList");
const emptyState = document.getElementById("emptyState");
const detailCard = document.getElementById("detailCard");
const detailTime = document.getElementById("detailTime");
const detailType = document.getElementById("detailType");
const detailTitle = document.getElementById("detailTitle");
const detailLocation = document.getElementById("detailLocation");
const detailInstructor = document.getElementById("detailInstructor");
const equipmentList = document.getElementById("equipmentList");
const detailFocus = document.getElementById("detailFocus");

function parseTime(input) {
  const [hours, minutes] = input.split(":").map(Number);
  return hours * 60 + minutes;
}

function nowMinutes() {
  const date = new Date();
  return date.getHours() * 60 + date.getMinutes();
}

function renderHeader() {
  const text = new Intl.DateTimeFormat("sv-SE", {
    weekday: "long",
    day: "numeric",
    month: "long"
  }).format(new Date());

  todayLabel.textContent = text.charAt(0).toUpperCase() + text.slice(1);
  countBadge.textContent = `${lessons.length} pass`;
}

function renderSchedule() {
  const now = nowMinutes();
  scheduleList.innerHTML = "";

  lessons.forEach((lesson) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "lesson";

    if (selectedId === lesson.id) {
      button.classList.add("active");
    }

    if (now >= parseTime(lesson.start) && now <= parseTime(lesson.end)) {
      button.classList.add("current");
    }

    button.innerHTML = `
      <p class="lesson-time">${lesson.start} - ${lesson.end}</p>
      <p class="lesson-title">${lesson.title}</p>
      <p class="lesson-meta">${lesson.type} | ${lesson.location}</p>
    `;

    button.addEventListener("click", () => {
      selectedId = lesson.id;
      renderSchedule();
      renderDetail();
    });

    scheduleList.appendChild(button);
  });
}

function renderDetail() {
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
  detailLocation.textContent = `Plats: ${lesson.location}`;
  detailInstructor.textContent = `Instruktor: ${lesson.instructor}`;
  detailFocus.textContent = lesson.focus;

  equipmentList.innerHTML = "";
  lesson.equipment.forEach((item) => {
    const listItem = document.createElement("li");
    listItem.textContent = item;
    equipmentList.appendChild(listItem);
  });
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
    lessons = [];
    selectedId = null;
    emptyState.innerHTML = `
      <h2>Kunde inte läsa schema</h2>
      <p>${error.message}</p>
    `;
  }

  renderHeader();
  renderSchedule();
  renderDetail();
}

renderHeader();
renderSchedule();
renderDetail();
loadSchedule();