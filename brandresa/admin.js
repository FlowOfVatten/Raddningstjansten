const API_BASE_URL = (window.BRANDRESAN_API_BASE_URL || "").replace(/\/$/, "");
const API_URL = `${API_BASE_URL}/api/brandresan-schedule`;
const ADMIN_API_URL = `${API_BASE_URL}/api/brandresan-schedule-admin`;

let lessons = [];

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

function addLesson() {
  const title = document.getElementById("title").value.trim();
  const instructor = document.getElementById("instructor").value.trim();
  const startTime = document.getElementById("startTime").value;
  const endTime = document.getElementById("endTime").value;
  const location = document.getElementById("location").value.trim();
  const type = document.getElementById("type").value.trim();
  const focus = document.getElementById("focus").value.trim();

  if (!title || !instructor || !startTime || !endTime) {
    showMessage("Fyll i all obligatorisk information", "error");
    return;
  }

  const equipment = [];
  if (document.getElementById("equip-larmstall").checked) equipment.push("Larmställ");
  if (document.getElementById("equip-civila").checked) equipment.push("Civila kläder");
  if (document.getElementById("equip-understall").checked) equipment.push("Underställ");

  const newLesson = {
    id: lessons.length > 0 ? Math.max(...lessons.map((lesson) => lesson.id)) + 1 : 1,
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
  showMessage("Lektion tillagd", "success");
}

function clearForm() {
  document.getElementById("title").value = "";
  document.getElementById("instructor").value = "";
  document.getElementById("startTime").value = "";
  document.getElementById("endTime").value = "";
  document.getElementById("location").value = "";
  document.getElementById("type").value = "";
  document.getElementById("focus").value = "";
  document.getElementById("equip-larmstall").checked = false;
  document.getElementById("equip-civila").checked = false;
  document.getElementById("equip-understall").checked = false;
}

function editLesson(id) {
  const lesson = lessons.find((item) => item.id === id);
  if (!lesson) {
    return;
  }

  document.getElementById("title").value = lesson.title;
  document.getElementById("instructor").value = lesson.instructor;
  document.getElementById("startTime").value = lesson.start;
  document.getElementById("endTime").value = lesson.end;
  document.getElementById("location").value = lesson.location;
  document.getElementById("type").value = lesson.type;
  document.getElementById("focus").value = lesson.focus;
  document.getElementById("equip-larmstall").checked = lesson.equipment.includes("Larmställ");
  document.getElementById("equip-civila").checked = lesson.equipment.includes("Civila kläder");
  document.getElementById("equip-understall").checked = lesson.equipment.includes("Underställ");

  lessons = lessons.filter((item) => item.id !== id);
  renderLessonsList();
  document.querySelector(".admin-form").scrollIntoView({ behavior: "smooth" });
  showMessage("Redigerar lektion. Lägg till igen för att spara ändringen.", "success");
}

function deleteLesson(id) {
  if (!confirm("Är du säker på att du vill ta bort denna lektion?")) {
    return;
  }

  lessons = lessons.filter((lesson) => lesson.id !== id);
  renderLessonsList();
  showMessage("Lektion borttagen", "success");
}

function renderLessonsList() {
  const container = document.getElementById("lessonsList");

  if (lessons.length === 0) {
    container.innerHTML = '<p style="color: var(--ink-soft); text-align: center;">Inga lektioner tillagda än</p>';
    return;
  }

  container.innerHTML = lessons.map((lesson) => `
    <div class="lesson-item">
      <div class="lesson-info">
        <div class="lesson-title">${lesson.title}</div>
        <div class="lesson-meta">${lesson.start} - ${lesson.end} | ${lesson.location} | ${lesson.instructor}</div>
        <div class="lesson-meta">${lesson.type}${lesson.equipment.length ? ` | ${lesson.equipment.join(", ")}` : ""}</div>
      </div>
      <div class="lesson-actions">
        <button class="btn-secondary" onclick="editLesson(${lesson.id})">Redigera</button>
        <button class="btn-danger" onclick="deleteLesson(${lesson.id})">Ta bort</button>
      </div>
    </div>
  `).join("");
}

async function saveSchedule() {
  try {
    const response = await fetch(ADMIN_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ lessons })
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

loadSchedule();
