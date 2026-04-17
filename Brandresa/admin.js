const API_BASE_URL = (window.BRANDRESAN_API_BASE_URL || "").replace(/\/$/, "");
const STATE_ENDPOINT = `${API_BASE_URL}/api/state`;
const API_URL = `${STATE_ENDPOINT}?id=brandresan-schedule`;
const INSTRUCTORS_URL = `${STATE_ENDPOINT}?id=brandresan-instructors`;

let lessons = [];
let instructors = [];
let editingInstructorId = null;
let removeInstructorPhotoRequested = false;

// === Calendar state ===
let calViewDate = new Date();
let selectedDate = toAdminIsoDate(new Date());

function toAdminIsoDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function calPrev() {
  calViewDate = new Date(calViewDate.getFullYear(), calViewDate.getMonth() - 1, 1);
  renderCalendar();
}

function calNext() {
  calViewDate = new Date(calViewDate.getFullYear(), calViewDate.getMonth() + 1, 1);
  renderCalendar();
}

function renderCalendar() {
  const year = calViewDate.getFullYear();
  const month = calViewDate.getMonth();

  const monthLabel = new Intl.DateTimeFormat("sv-SE", { month: "long", year: "numeric" }).format(calViewDate);
  document.getElementById("cal-title").textContent = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

  const grid = document.getElementById("cal-grid");
  grid.innerHTML = "";

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  let startDow = firstDay.getDay();
  startDow = startDow === 0 ? 6 : startDow - 1;

  for (let i = 0; i < startDow; i++) {
    const empty = document.createElement("div");
    empty.className = "cal-w-day is-empty";
    grid.appendChild(empty);
  }

  const todayIso = toAdminIsoDate(new Date());

  for (let day = 1; day <= lastDay.getDate(); day++) {
    const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "cal-w-day";
    cell.textContent = day;

    if (iso === todayIso) cell.classList.add("is-today");
    if (iso === selectedDate) cell.classList.add("is-selected");

    cell.addEventListener("click", () => {
      selectedDate = iso;
      renderCalendar();
    });

    grid.appendChild(cell);
  }

  const label = document.getElementById("cal-label");
  if (selectedDate) {
    const d = new Date(selectedDate + "T00:00:00");
    let text = new Intl.DateTimeFormat("sv-SE", { weekday: "long", day: "numeric", month: "long" }).format(d);
    label.textContent = text.charAt(0).toUpperCase() + text.slice(1);
    label.style.color = "var(--accent-2)";
  } else {
    label.textContent = "Inget datum valt";
    label.style.color = "";
  }
}

function showMessage(text, type = "info") {
  const container = document.getElementById("message");
  container.className = `message ${type}`;
  container.textContent = text;
  container.style.display = "block";

  if (type === "success") {
    setTimeout(() => {
      container.style.display = "none";
    }, 3000);
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

async function loadSchedule() {
  try {
    const response = await fetch(API_URL);
    const data = await readJson(response);

    if (Array.isArray(data) && data.length > 0) {
      const payload = data[0].payload;
      lessons = Array.isArray(payload) ? payload : [];
    } else {
      lessons = [];
    }

    renderLessonsList();
  } catch (error) {
    console.error("Failed to load schedule:", error);
    showMessage(
      `Kunde inte hämta schemauppgifter: ${error.message}. För GitHub Preview behöver du sätta BRANDRESAN_API_BASE_URL i config.js till din deployade backend-URL.`,
      "error"
    );
    renderLessonsList();
  }
}

async function loadInstructors() {
  try {
    const response = await fetch(INSTRUCTORS_URL);
    const data = await readJson(response);

    if (Array.isArray(data) && data.length > 0) {
      const payload = data[0].payload;
      instructors = Array.isArray(payload) ? payload : [];
    } else {
      instructors = [];
    }

    renderInstructorDropdown();
  } catch (error) {
    console.error("Failed to load instructors:", error);
    instructors = [];
    renderInstructorDropdown();
  }
}

async function saveInstructors() {
  try {
    const response = await fetch(STATE_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: "brandresan-instructors",
        payload: instructors
      })
    });

    await readJson(response);
  } catch (error) {
    console.error("Failed to save instructors:", error);
  }
}

function renderInstructorDropdown() {
  const select = document.getElementById("instructorSelect");
  if (!select) return;

  select.innerHTML = '<option value="">-- Välj instruktör --</option>';

  instructors.forEach(instructor => {
    const option = document.createElement("option");
    option.value = instructor.id;
    option.textContent = `${instructor.name}${instructor.signature ? " (" + instructor.signature + ")" : ""}`;
    select.appendChild(option);
  });

  renderInstructorsList();
}

function renderInstructorsList() {
  const container = document.getElementById("instructorsList");
  if (!container) return;

  if (!Array.isArray(instructors) || instructors.length === 0) {
    container.innerHTML = '<p style="color: var(--ink-soft); margin: 0;">Inga instruktörer tillagda än.</p>';
    return;
  }

  const sorted = [...instructors].sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "sv"));
  container.innerHTML = sorted.map((instructor) => {
    const signature = String(instructor.signature || "").trim();
    return `
      <div class="instructor-item">
        <div class="instructor-item-info">
          <div class="instructor-item-name">${instructor.name}</div>
          <div class="instructor-item-meta">${signature ? "Signatur: " + signature : "Ingen signatur"}</div>
        </div>
        <div class="instructor-item-actions">
          <button class="btn-secondary btn-small" type="button" onclick="startEditInstructor(${instructor.id})">Redigera</button>
          <button class="btn-danger btn-small" type="button" onclick="deleteInstructor(${instructor.id})">Ta bort</button>
        </div>
      </div>
    `;
  }).join("");
}

function openAddInstructorModal() {
  const modal = document.getElementById("addInstructorModal");
  if (modal) {
    editingInstructorId = null;
    removeInstructorPhotoRequested = false;
    document.getElementById("instructorModalTitle").textContent = "Lägg till ny instruktör";
    document.getElementById("saveInstructorBtn").textContent = "Lägg till";
    modal.style.display = "flex";
    document.getElementById("newInstructorName").focus();
  }
}

function closeAddInstructorModal() {
  const modal = document.getElementById("addInstructorModal");
  if (modal) {
    modal.style.display = "none";
    editingInstructorId = null;
    removeInstructorPhotoRequested = false;
    document.getElementById("instructorModalTitle").textContent = "Lägg till ny instruktör";
    document.getElementById("saveInstructorBtn").textContent = "Lägg till";
    document.getElementById("newInstructorName").value = "";
    document.getElementById("newInstructorSignature").value = "";
    document.getElementById("newInstructorPhoto").value = "";
    document.getElementById("photoPreview").innerHTML = "";
    document.getElementById("photoPreview").style.display = "none";
  }
}

function startEditInstructor(id) {
  const instructor = instructors.find((item) => String(item.id) === String(id));
  if (!instructor) {
    showMessage("Instruktören hittades inte", "error");
    return;
  }

  editingInstructorId = instructor.id;
  removeInstructorPhotoRequested = false;
  document.getElementById("instructorModalTitle").textContent = "Redigera instruktör";
  document.getElementById("saveInstructorBtn").textContent = "Spara";
  document.getElementById("newInstructorName").value = instructor.name || "";
  document.getElementById("newInstructorSignature").value = instructor.signature || "";

  const preview = document.getElementById("photoPreview");
  if (instructor.photo) {
    preview.innerHTML = `<img src="${instructor.photo}" alt="Förhandsvisning" style="max-width:150px; max-height:150px; object-fit:cover; border-radius:8px;">`;
    preview.style.display = "block";
  } else {
    preview.innerHTML = "";
    preview.style.display = "none";
  }

  document.getElementById("newInstructorPhoto").value = "";
  document.getElementById("addInstructorModal").style.display = "flex";
  document.getElementById("newInstructorName").focus();
}

function removeInstructorPhoto() {
  const preview = document.getElementById("photoPreview");
  document.getElementById("newInstructorPhoto").value = "";
  preview.innerHTML = "";
  preview.style.display = "none";

  // In edit mode this marks existing photo for deletion when user clicks Save.
  removeInstructorPhotoRequested = true;
}

async function deleteInstructor(id) {
  const instructor = instructors.find((item) => String(item.id) === String(id));
  if (!instructor) {
    showMessage("Instruktören hittades inte", "error");
    return;
  }

  const linkedLessons = lessons.filter((lesson) => lesson.instructor === instructor.name).length;
  const warning = linkedLessons > 0
    ? `\n\n${linkedLessons} lektion(er) använder denna instruktör och kommer att få tom instruktör.`
    : "";

  if (!confirm(`Ta bort instruktör ${instructor.name}?${warning}`)) {
    return;
  }

  instructors = instructors.filter((item) => String(item.id) !== String(id));

  if (linkedLessons > 0) {
    lessons = lessons.map((lesson) => {
      if (lesson.instructor === instructor.name) {
        return { ...lesson, instructor: "" };
      }
      return lesson;
    });
    renderLessonsList();
    await saveSchedule();
  }

  await saveInstructors();
  renderInstructorDropdown();
  showMessage(`Instruktör ${instructor.name} borttagen`, "success");
}

async function addNewInstructor() {
  const name = document.getElementById("newInstructorName").value.trim();
  const signature = document.getElementById("newInstructorSignature").value.trim();
  const photoFile = document.getElementById("newInstructorPhoto").files[0];

  if (!name) {
    showMessage("Fyll i instruktörens namn", "error");
    return;
  }

  const duplicate = instructors.find((item) => {
    if (editingInstructorId !== null && String(item.id) === String(editingInstructorId)) return false;
    return String(item.name || "").trim().toLowerCase() === name.toLowerCase();
  });

  if (duplicate) {
    showMessage("Det finns redan en instruktör med det namnet", "error");
    return;
  }

  let photoBase64 = "";

  if (editingInstructorId !== null) {
    const existing = instructors.find((item) => String(item.id) === String(editingInstructorId));
    if (!existing) {
      showMessage("Instruktören hittades inte", "error");
      return;
    }

    photoBase64 = removeInstructorPhotoRequested ? "" : (existing.photo || "");
    if (photoFile) {
      try {
        photoBase64 = await fileToBase64(photoFile);
      } catch (error) {
        showMessage("Kunde inte läsa fotofilen: " + error.message, "error");
        return;
      }
    }

    const oldName = existing.name;
    instructors = instructors.map((item) => {
      if (String(item.id) !== String(editingInstructorId)) return item;
      return {
        ...item,
        name,
        signature,
        photo: photoBase64
      };
    });

    if (oldName !== name) {
      lessons = lessons.map((lesson) => {
        if (lesson.instructor === oldName) {
          return { ...lesson, instructor: name };
        }
        return lesson;
      });
      renderLessonsList();
      await saveSchedule();
    }

    await saveInstructors();
    renderInstructorDropdown();
    closeAddInstructorModal();
    showMessage(`Instruktör ${name} uppdaterad`, "success");
    return;
  }

  if (photoFile) {
    try {
      photoBase64 = await fileToBase64(photoFile);
    } catch (error) {
      showMessage("Kunde inte läsa fotofilen: " + error.message, "error");
      return;
    }
  }

  const newInstructor = {
    id: Date.now(),
    name,
    signature,
    photo: photoBase64
  };

  instructors.push(newInstructor);
  await saveInstructors();
  renderInstructorDropdown();
  closeAddInstructorModal();
  showMessage(`Instruktör ${name} tillagd!`, "success");
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function handleInstructorPhotoUpload(input) {
  const file = input.files[0];
  const preview = document.getElementById("photoPreview");

  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      preview.innerHTML = `<img src="${e.target.result}" alt="Förhandsvisning" style="max-width:150px; max-height:150px; object-fit:cover; border-radius:8px;">`;
      preview.style.display = "block";
    };
    reader.readAsDataURL(file);
  } else {
    preview.innerHTML = "";
    preview.style.display = "none";
  }
}

async function addLesson() {
  const title = document.getElementById("title").value.trim();
  const instructorId = document.getElementById("instructorSelect").value;
  const instructor = instructorId ? instructors.find(i => i.id == instructorId)?.name : "";
  const startTime = document.getElementById("startTime").value;
  const endTime = document.getElementById("endTime").value;
  const location = document.getElementById("location").value.trim();
  const type = document.getElementById("type").value.trim();
  const focus = document.getElementById("focus").value.trim();

  if (!title || !instructor || !startTime || !endTime) {
    showMessage("Fyll i all obligatorisk information", "error");
    return;
  }

  if (!selectedDate) {
    showMessage("Välj ett datum i kalendern", "error");
    return;
  }

  const equipment = [];
  if (document.getElementById("equip-larmstall").checked) equipment.push("Larmställ");
  if (document.getElementById("equip-civila").checked) equipment.push("Civila kläder");
  if (document.getElementById("equip-understall").checked) equipment.push("Underställ");

  const newLesson = {
    id: lessons.length > 0 ? Math.max(...lessons.map((lesson) => lesson.id)) + 1 : 1,
    date: selectedDate,
    start: startTime,
    end: endTime,
    title,
    type: type || "Workshop",
    location,
    instructor,
    focus,
    equipment
  };

  lessons.push(newLesson);
  renderLessonsList();
  clearForm();
  await saveSchedule();
}

function addMinutesToTime(time, minutesToAdd) {
  const [h, m] = time.split(":").map(Number);
  const date = new Date(2000, 0, 1, h, m + minutesToAdd);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

async function addBreak() {
  const startTime = document.getElementById("startTime").value;
  const endTimeInput = document.getElementById("endTime").value;

  if (!selectedDate) {
    showMessage("Välj ett datum i kalendern", "error");
    return;
  }

  if (!startTime) {
    showMessage("Fyll i minst starttid för rast", "error");
    return;
  }

  const endTime = endTimeInput || addMinutesToTime(startTime, 15);

  const breakLesson = {
    id: lessons.length > 0 ? Math.max(...lessons.map((lesson) => lesson.id)) + 1 : 1,
    date: selectedDate,
    start: startTime,
    end: endTime,
    title: "Rast",
    type: "Rast",
    location: "",
    instructor: "",
    focus: "",
    equipment: []
  };

  lessons.push(breakLesson);
  renderLessonsList();
  clearForm();
  await saveSchedule();
}

function clearForm() {
  document.getElementById("title").value = "";
  document.getElementById("instructorSelect").value = "";
  document.getElementById("startTime").value = "";
  document.getElementById("endTime").value = "";
  document.getElementById("location").value = "";
  document.getElementById("type").value = "";
  document.getElementById("focus").value = "";
  document.getElementById("equip-larmstall").checked = false;
  document.getElementById("equip-civila").checked = false;
  document.getElementById("equip-understall").checked = false;
  renderCalendar();
}

function editLesson(id) {
  const lesson = lessons.find((item) => item.id === id);
  if (!lesson) {
    return;
  }

  document.getElementById("title").value = lesson.title;
  // Find instructor by name and set select value
  const instructor = instructors.find(i => i.name === lesson.instructor);
  document.getElementById("instructorSelect").value = instructor ? instructor.id : "";
  document.getElementById("startTime").value = lesson.start;
  document.getElementById("endTime").value = lesson.end;
  document.getElementById("location").value = lesson.location;
  document.getElementById("type").value = lesson.type;
  document.getElementById("focus").value = lesson.focus;
  document.getElementById("equip-larmstall").checked = lesson.equipment.includes("Larmställ");
  document.getElementById("equip-civila").checked = lesson.equipment.includes("Civila kläder");
  document.getElementById("equip-understall").checked = lesson.equipment.includes("Underställ");

  selectedDate = lesson.date || null;
  if (lesson.date) {
    calViewDate = new Date(lesson.date + "T00:00:00");
  }
  renderCalendar();

  lessons = lessons.filter((item) => item.id !== id);
  renderLessonsList();
  document.querySelector(".admin-form").scrollIntoView({ behavior: "smooth" });
  showMessage("Redigerar lektion. Lägg till igen för att spara ändringen.", "success");
}

async function deleteLesson(id) {
  if (!confirm("Är du säker på att du vill ta bort denna lektion?")) {
    return;
  }

  lessons = lessons.filter((lesson) => lesson.id !== id);
  renderLessonsList();
  await saveSchedule();
}

function renderLessonsList() {
  const container = document.getElementById("lessonsList");

  if (lessons.length === 0) {
    container.innerHTML = '<p style="color: var(--ink-soft); text-align: center;">Inga lektioner tillagda än</p>';
    return;
  }

  const sorted = [...lessons].sort((a, b) => {
    const da = a.date || "9999-99-99";
    const db = b.date || "9999-99-99";
    if (da !== db) return da.localeCompare(db);
    return (a.start || "").localeCompare(b.start || "");
  });

  container.innerHTML = sorted.map((lesson) => {
    let dateBadge = "";
    if (lesson.date) {
      const d = new Date(lesson.date + "T00:00:00");
      const dateStr = new Intl.DateTimeFormat("sv-SE", { weekday: "short", day: "numeric", month: "short" }).format(d);
      dateBadge = `<span style="background:#e8f0fa;color:#1a3a6e;padding:2px 8px;border-radius:99px;font-size:0.78rem;font-weight:700;margin-left:8px;">${dateStr}</span>`;
    } else {
      dateBadge = `<span style="background:#fff0ea;color:#9b3e2a;padding:2px 8px;border-radius:99px;font-size:0.78rem;font-weight:700;margin-left:8px;">Odaterad</span>`;
    }
    return `
    <div class="lesson-item">
      <div class="lesson-info">
        <div class="lesson-title">${lesson.title} ${dateBadge}</div>
        <div class="lesson-meta">${lesson.start} – ${lesson.end} | ${lesson.location} | ${lesson.instructor}</div>
        <div class="lesson-meta">${lesson.type}${lesson.equipment.length ? ` | ${lesson.equipment.join(", ")}` : ""}</div>
      </div>
      <div class="lesson-actions">
        <button class="btn-secondary" onclick="editLesson(${lesson.id})">Redigera</button>
        <button class="btn-danger" onclick="deleteLesson(${lesson.id})">Ta bort</button>
      </div>
    </div>
  `;
  }).join("");
}

async function saveSchedule() {
  try {
    const response = await fetch(STATE_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        id: "brandresan-schedule",
        payload: lessons
      })
    });

    await readJson(response);
    showMessage("Schemat sparades", "success");
  } catch (error) {
    console.error("Failed to save schedule:", error);
    showMessage(
      `Kunde inte spara schemat: ${error.message}. Kontrollera config.js och att backend-API är deployat.`,
      "error"
    );
  }
}

function normalizeHeader(input) {
  return String(input || "")
    .toLowerCase()
    .replace(/[\s_-]+/g, "")
    .replace(/å/g, "a")
    .replace(/ä/g, "a")
    .replace(/ö/g, "o");
}

function pickValue(row, aliases) {
  for (const key of Object.keys(row)) {
    const normalized = normalizeHeader(key);
    if (aliases.includes(normalized)) {
      return row[key];
    }
  }
  return "";
}

function parseYesNo(value) {
  const v = String(value || "").trim().toLowerCase();
  return ["ja", "yes", "true", "1", "x"].includes(v);
}

function parseImportedDate(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    const base = new Date(Date.UTC(1899, 11, 30));
    base.setUTCDate(base.getUTCDate() + Math.floor(value));
    return `${base.getUTCFullYear()}-${String(base.getUTCMonth() + 1).padStart(2, "0")}-${String(base.getUTCDate()).padStart(2, "0")}`;
  }

  const raw = String(value || "").trim();
  if (!raw) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const slash = raw.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (slash) {
    const dd = String(Number(slash[1])).padStart(2, "0");
    const mm = String(Number(slash[2])).padStart(2, "0");
    const yyyy = slash[3];
    return `${yyyy}-${mm}-${dd}`;
  }

  const d = new Date(raw);
  if (!Number.isNaN(d.getTime())) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  return "";
}

function parseImportedTime(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    const minutes = Math.round(value * 24 * 60);
    const hh = String(Math.floor(minutes / 60) % 24).padStart(2, "0");
    const mm = String(minutes % 60).padStart(2, "0");
    return `${hh}:${mm}`;
  }

  const raw = String(value || "").trim();
  if (!raw) return "";

  const dotMatch = raw.match(/^(\d{1,2})[.:](\d{2})$/);
  if (dotMatch) {
    return `${String(Number(dotMatch[1])).padStart(2, "0")}:${dotMatch[2]}`;
  }

  return raw;
}

function parseCsvLineAdmin(line, delimiter) {
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
    } else if (ch === delimiter && !inQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }

  values.push(current.trim());
  return values;
}

function rowsToLessons(rows) {
  const imported = [];

  rows.forEach((row) => {
    const date = parseImportedDate(pickValue(row, ["datum", "date"]));
    const start = parseImportedTime(pickValue(row, ["starttid", "start", "from", "fran"]));
    const end = parseImportedTime(pickValue(row, ["sluttid", "slut", "end", "to", "till"]));
    const title = String(pickValue(row, ["lektionsnamn", "lektion", "title", "namn"])).trim();

    if (!date || !start || !end || !title) {
      return;
    }

    const equipment = [];
    if (parseYesNo(pickValue(row, ["larmstall"]))) equipment.push("Larmställ");
    if (parseYesNo(pickValue(row, ["civilaklader", "civila"]))) equipment.push("Civila kläder");
    if (parseYesNo(pickValue(row, ["understall"]))) equipment.push("Underställ");

    imported.push({
      id: imported.length + 1,
      date,
      start,
      end,
      title,
      instructor: String(pickValue(row, ["instruktor", "instructor", "larare"])).trim(),
      location: String(pickValue(row, ["plats", "location"])).trim(),
      type: String(pickValue(row, ["typ", "type"])).trim() || "Workshop",
      focus: String(pickValue(row, ["info", "fokus", "focus", "beskrivning"])).trim(),
      equipment
    });
  });

  return imported;
}

function parseCsvTextToRows(csvText) {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2) return [];

  const delimiter = (lines[0].match(/;/g) || []).length > (lines[0].match(/,/g) || []).length ? ";" : ",";
  const headers = parseCsvLineAdmin(lines[0], delimiter);

  return lines.slice(1).map((line) => {
    const cols = parseCsvLineAdmin(line, delimiter);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = cols[index] || "";
    });
    return row;
  });
}

async function importScheduleFile() {
  const input = document.getElementById("importFile");
  const file = input.files?.[0];

  if (!file) {
    showMessage("Välj en fil först", "error");
    return;
  }

  try {
    let rows = [];
    const name = file.name.toLowerCase();

    if (name.endsWith(".csv")) {
      const csvText = await file.text();
      rows = parseCsvTextToRows(csvText);
    } else {
      if (typeof XLSX === "undefined") {
        throw new Error("Excel-bibliotek kunde inte laddas.");
      }

      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[firstSheetName];
      rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    }

    const importedLessons = rowsToLessons(rows);

    if (importedLessons.length === 0) {
      showMessage("Inga giltiga rader hittades. Kontrollera att mallen innehåller minst Datum, Starttid, Sluttid och Lektionsnamn.", "error");
      return;
    }

    if (!confirm(`Importera ${importedLessons.length} pass och ersätta nuvarande schema?`)) {
      return;
    }

    lessons = importedLessons;
    selectedDate = importedLessons[0].date;
    calViewDate = new Date(selectedDate + "T00:00:00");
    renderCalendar();
    renderLessonsList();
    await saveSchedule();

    input.value = "";
    showMessage(`Import klar: ${importedLessons.length} pass sparades`, "success");
  } catch (error) {
    console.error("Import failed:", error);
    showMessage(`Import misslyckades: ${error.message}`, "error");
  }
}

function lessonsToExportRows(sourceLessons) {
  return sourceLessons.map((lesson) => {
    const equipment = Array.isArray(lesson.equipment) ? lesson.equipment : [];
    return {
      Datum: lesson.date || "",
      Starttid: lesson.start || "",
      Sluttid: lesson.end || "",
      Lektionsnamn: lesson.title || "",
      "Instruktör": lesson.instructor || "",
      Plats: lesson.location || "",
      Typ: lesson.type || "",
      Info: lesson.focus || "",
      "Larmställ": equipment.includes("Larmställ") ? "X" : "",
      "Civila kläder": equipment.includes("Civila kläder") ? "X" : "",
      "Underställ": equipment.includes("Underställ") ? "X" : ""
    };
  });
}

function downloadCsv(filename, csvText) {
  const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function exportScheduleFile() {
  if (!Array.isArray(lessons) || lessons.length === 0) {
    showMessage("Det finns inga lektioner att exportera", "error");
    return;
  }

  const sorted = [...lessons].sort((a, b) => {
    const da = String(a.date || "");
    const db = String(b.date || "");
    if (da !== db) return da.localeCompare(db);
    return String(a.start || "").localeCompare(String(b.start || ""));
  });

  const rows = lessonsToExportRows(sorted);
  const header = [
    "Datum",
    "Starttid",
    "Sluttid",
    "Lektionsnamn",
    "Instruktör",
    "Plats",
    "Typ",
    "Info",
    "Larmställ",
    "Civila kläder",
    "Underställ"
  ];

  try {
    if (typeof XLSX !== "undefined") {
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(rows, { header });
      XLSX.utils.book_append_sheet(workbook, worksheet, "Schema");
      XLSX.writeFile(workbook, `brandresa-schema-export-${toAdminIsoDate(new Date())}.xlsx`);
      showMessage(`Export klar: ${rows.length} pass`, "success");
      return;
    }

    const csvRows = rows.map((row) => header.map((key) => {
      const value = String(row[key] || "");
      return `"${value.replace(/"/g, '""')}"`;
    }).join(","));

    downloadCsv(
      `brandresa-schema-export-${toAdminIsoDate(new Date())}.csv`,
      [header.join(","), ...csvRows].join("\n")
    );
    showMessage(`CSV-export klar: ${rows.length} pass`, "success");
  } catch (error) {
    console.error("Export failed:", error);
    showMessage(`Kunde inte exportera fil: ${error.message}`, "error");
  }
}

function downloadTemplate() {
  const templateRows = [
    {
      Datum: toAdminIsoDate(new Date()),
      Starttid: "08:00",
      Sluttid: "09:30",
      Lektionsnamn: "Rokdykning - grundteknik",
      "Instruktör": "Anna Berg",
      Plats: "Övningsfält A",
      Typ: "Praktik",
      Info: "Fokus på sökmönster och kommunikation.",
      "Larmställ": "X",
      "Civila kläder": "",
      "Underställ": "X"
    }
  ];

  try {
    if (typeof XLSX !== "undefined") {
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(templateRows, {
        header: [
          "Datum",
          "Starttid",
          "Sluttid",
          "Lektionsnamn",
          "Instruktör",
          "Plats",
          "Typ",
          "Info",
          "Larmställ",
          "Civila kläder",
          "Underställ"
        ]
      });
      XLSX.utils.book_append_sheet(workbook, worksheet, "SchemaMall");
      XLSX.writeFile(workbook, "brandresa-schema-mall.xlsx");
      showMessage("Excel-mall nedladdad", "success");
      return;
    }

    const csv = [
      "Datum,Starttid,Sluttid,Lektionsnamn,Instruktör,Plats,Typ,Info,Larmställ,Civila kläder,Underställ",
      `${templateRows[0].Datum},08:00,09:30,Rokdykning - grundteknik,Anna Berg,Övningsfält A,Praktik,Fokus på sökmönster och kommunikation.,X,,X`
    ].join("\n");

    downloadCsv("brandresa-schema-mall.csv", csv);
    showMessage("CSV-mall nedladdad", "success");
  } catch (error) {
    console.error("Template download failed:", error);
    showMessage(`Kunde inte skapa mall: ${error.message}`, "error");
  }
}

loadSchedule().then(() => {
  renderCalendar();
  loadInstructors();
});

document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("addInstructorModal");
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeAddInstructorModal();
    });
  }
  document.addEventListener("keydown", (e) => {
    const modal = document.getElementById("addInstructorModal");
    if (e.key === "Escape" && modal && modal.style.display === "flex") {
      closeAddInstructorModal();
    }
  });
});
