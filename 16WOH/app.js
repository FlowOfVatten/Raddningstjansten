const STORAGE_KEY = "wohStartDate";
const AUTH_STORAGE_KEY = "wohAuth";
const ACCOUNT_API = "/api/woh-account";
const PROGRAM_DAYS = 112;
const weekdayNames = ["Mån", "Tis", "Ons", "Tor", "Fre", "Lör", "Sön"];
const WGER_BASE = "https://wger.de";

// Fallback: svenska övningsnamn → wger exercise-ID (används när ExerciseDB proxy svarar 4xx/5xx)
const WGER_FALLBACK_IDS = {
  "flat maskinpress eller skivstångsbänkpress": 73,
  "armhävningar brett grepp": 73,
  "armhävningar lutande bänk": 73,
  "pec dec eller kabelfly": 73,
  "hammarcurl": 73,
  "ez-stångscurl": 73,
  "koncentrationscurl": 73,
  "stångcurl eller maskincurl": 73,
  "hip thrust skivstång eller maskin": 294,
  "hip thrust med hantel eller kroppsvikt": 294,
  "liggande eller stående bencurl": 364,
  "sittande bencurl": 364,
  "liggande bencurl med hälbänd": 364,
  "benspark leg extension": 369,
  "benpress": 371,
  "hackknäböj eller skivstångsknäböj": 371,
  "gångutfall hantlar": 371,
  "hängande benlyft eller dead bug": 376,
  "benlyft liggande": 376,
  "plankan": 458,
  "rack pull knähöjd": 507,
  "rumänskt marklyft rdl": 507,
  "rumänskt marklyft hantlar rdl": 507,
  "sidoplanka": 580,
  "militärpress skivstång eller hantlar": 687,
  "axelpress hantlar sittande": 687,
  "stående sidolyft hantlar": 687,
  "rear delt fly maskin eller böjd hantelvariant": 687,
  "upright row kabel": 687,
  "fst-stil sidolyft": 687,
  "latsdrag brett grepp": 921,
  "sittande kabelrodd smalt grepp": 921,
  "unilateral hantelrodd": 921,
  "kabeltryckning triceps handfäste": 1185,
  "tricepsdipar på stol": 1185,
  "skullcrusher eller triceps overhead": 1185,
  "lutande bänkpress hantel eller skivstång": 1277,
};
// Hemma-äkvilaenter för varje gymövning (lowercase) → ExerciseDB-slug
const EXERCISE_NAMES_HOME = {
  "kroppsviktssquats": "squat",
  "bulgariansk utfall": "bulgarian split squat",
  "gångutfall hantlar": "walking lunge",
  "hantelknäböj goblet squat": "dumbbell goblet squat",
  "benspark bodyweight": "squat",
  "nordic curl eller hälbänd": "nordic hamstring curl",
  "hip thrust med hantel eller kroppsvikt": "glute bridge",
  "rumänskt marklyft hantlar rdl": "dumbbell romanian deadlift",
  "liggande bencurl med hälbänd": "nordic hamstring curl",
  "armåtning hantel": "dumbbell one arm row",
  "liggande rodd under bord": "dumbbell one arm row",
  "band rodd": "resistance band pull apart",
  "pull-ups eller negativa chin-ups": "pull up",
  "marklyft hantlar": "dumbbell deadlift",
  "armhävningar brett grepp": "push up",
  "armhävningar lutande bänk": "incline push up",
  "hantelfly liggande": "dumbbell fly",
  "hammarcurl": "hammer curl",
  "hantelcurl": "dumbbell bicep curl",
  "koncentrationscurl": "concentration curl",
  "axelpress hantlar sittande": "dumbbell shoulder press",
  "sidolyft hantlar": "dumbbell lateral raise",
  "böjd flyover hantlar": "reverse fly",
  "upright row hantlar": "dumbbell upright row",
  "plankan": "plank",
  "benlyft liggande": "leg raise",
  "sidoplanka": "side plank",
  "tricepsdipar på stol": "triceps dip",
  "skull crusher hantlar": "dumbbell skull crusher",
  "hantelcurl växelvis": "dumbbell bicep curl",
  "tåhävningar kroppsvikt": "standing calf raise",
  "fst-stil sidolyft": "dumbbell lateral raise",
};

// Svenska övningsnamn (lowercase) → ExerciseDB nämnslugg (proxyas via /api/exercise-proxy)
const EXERCISE_NAMES = {
  "latsdrag brett grepp": "lat pulldown",
  "sittande kabelrodd smalt grepp": "seated cable row",
  "rack pull knähöjd": "rack pull",
  "unilateral hantelrodd": "dumbbell one arm row",
  "stående vadpress maskin": "standing calf raise",
  "sittande vadpress": "seated calf raise",
  "lutande bänkpress hantel eller skivstång": "incline dumbbell press",
  "flat maskinpress eller skivstångsbänkpress": "barbell bench press",
  "pec dec eller kabelfly": "pec deck fly",
  "hammarcurl": "hammer curl",
  "ez-stångscurl": "ez barbell curl",
  "koncentrationscurl": "concentration curl",
  "benpress": "leg press",
  "hackknäböj eller skivstångsknäböj": "hack squat",
  "gångutfall hantlar": "walking lunge",
  "benspark leg extension": "leg extension",
  "sittande bencurl": "seated leg curl",
  "liggande eller stående bencurl": "leg curl",
  "militärpress skivstång eller hantlar": "overhead press",
  "stående sidolyft hantlar": "dumbbell lateral raise",
  "rear delt fly maskin eller böjd hantelvariant": "reverse fly",
  "upright row kabel": "cable upright row",
  "plankan": "plank",
  "hängande benlyft eller dead bug": "hanging leg raise",
  "sidoplanka": "side plank",
  "rumänskt marklyft rdl": "romanian deadlift",
  "hip thrust skivstång eller maskin": "barbell hip thrust",
  "kabeltryckning triceps handfäste": "cable pushdown",
  "stångcurl eller maskincurl": "barbell curl",
  "skullcrusher eller triceps overhead": "skull crusher",
  "fst-stil sidolyft": "dumbbell lateral raise",
};

const breakfasts = [
  {
    key: "frukost-omelett",
    text: "Frukost: omelett (3 ägg) + spenat + avokado",
    ingredients: [
      { name: "Ägg", amount: 3, unit: "st" },
      { name: "Spenat", amount: 70, unit: "g" },
      { name: "Avokado", amount: 1, unit: "st" },
    ],
  },
  {
    key: "frukost-kvarg",
    text: "Frukost: kvarg med bär, chia och valnötter",
    ingredients: [
      { name: "Kvarg", amount: 250, unit: "g" },
      { name: "Bär", amount: 100, unit: "g" },
      { name: "Chiafrön", amount: 15, unit: "g" },
      { name: "Valnötter", amount: 20, unit: "g" },
    ],
  },
  {
    key: "frukost-gröt",
    text: "Frukost: havregrynsgröt med proteinpulver och blåbär",
    ingredients: [
      { name: "Havregryn", amount: 80, unit: "g" },
      { name: "Proteinpulver", amount: 30, unit: "g" },
      { name: "Blåbär", amount: 80, unit: "g" },
    ],
  },
  {
    key: "frukost-agg-kalkon",
    text: "Frukost: ägg, kalkon, tomat och grovt knäcke",
    ingredients: [
      { name: "Ägg", amount: 2, unit: "st" },
      { name: "Kalkonpålägg", amount: 80, unit: "g" },
      { name: "Tomat", amount: 1, unit: "st" },
      { name: "Knäckebröd", amount: 2, unit: "st" },
    ],
  },
  {
    key: "frukost-yoghurt",
    text: "Frukost: grekisk yoghurt med granola, hallon och pumpakärnor",
    ingredients: [
      { name: "Grekisk yoghurt", amount: 250, unit: "g" },
      { name: "Granola", amount: 45, unit: "g" },
      { name: "Hallon", amount: 80, unit: "g" },
      { name: "Pumpakärnor", amount: 15, unit: "g" },
    ],
  },
];

const lunches = [
  {
    key: "lunch-kyckling",
    text: "Lunch: kycklingfilé, quinoa, broccoli, olivolja",
    ingredients: [
      { name: "Kycklingfilé", amount: 180, unit: "g" },
      { name: "Quinoa (okokt)", amount: 70, unit: "g" },
      { name: "Broccoli", amount: 180, unit: "g" },
      { name: "Olivolja", amount: 1, unit: "msk" },
    ],
  },
  {
    key: "lunch-lax",
    text: "Lunch: lax, sötpotatis, sparris, citron",
    ingredients: [
      { name: "Laxfilé", amount: 180, unit: "g" },
      { name: "Sötpotatis", amount: 250, unit: "g" },
      { name: "Sparris", amount: 150, unit: "g" },
      { name: "Citron", amount: 0.5, unit: "st" },
    ],
  },
  {
    key: "lunch-notfars",
    text: "Lunch: nötfärsbiffar, blomkålsris, grönsallad",
    ingredients: [
      { name: "Nötfärs", amount: 180, unit: "g" },
      { name: "Blomkål", amount: 250, unit: "g" },
      { name: "Blandsallad", amount: 100, unit: "g" },
    ],
  },
  {
    key: "lunch-kalkonwok",
    text: "Lunch: kalkonwok med ris och cashewnötter",
    ingredients: [
      { name: "Kalkon", amount: 170, unit: "g" },
      { name: "Ris (okokt)", amount: 70, unit: "g" },
      { name: "Wokgrönsaker", amount: 220, unit: "g" },
      { name: "Cashewnötter", amount: 20, unit: "g" },
    ],
  },
];

const dinners = [
  {
    key: "middag-torsk",
    text: "Middag: torsk, ugnsrostade grönsaker, aioli på yoghurt",
    ingredients: [
      { name: "Torsk", amount: 180, unit: "g" },
      { name: "Ugnsgrönsaker", amount: 250, unit: "g" },
      { name: "Yoghurt", amount: 100, unit: "g" },
    ],
  },
  {
    key: "middag-kycklinggryta",
    text: "Middag: kycklinggryta med paprika, zucchini och bönpasta",
    ingredients: [
      { name: "Kycklingfilé", amount: 180, unit: "g" },
      { name: "Paprika", amount: 1, unit: "st" },
      { name: "Zucchini", amount: 0.5, unit: "st" },
      { name: "Bönpasta (okokt)", amount: 75, unit: "g" },
    ],
  },
  {
    key: "middag-halloumi",
    text: "Middag: halloumisallad med edamame och pumpakärnor",
    ingredients: [
      { name: "Halloumi", amount: 120, unit: "g" },
      { name: "Edamame", amount: 120, unit: "g" },
      { name: "Blandsallad", amount: 120, unit: "g" },
      { name: "Pumpakärnor", amount: 15, unit: "g" },
    ],
  },
  {
    key: "middag-tacobowl",
    text: "Middag: tacobowl med köttfärs, sallad, salsa, avokado",
    ingredients: [
      { name: "Köttfärs", amount: 170, unit: "g" },
      { name: "Blandsallad", amount: 120, unit: "g" },
      { name: "Salsa", amount: 60, unit: "g" },
      { name: "Avokado", amount: 1, unit: "st" },
    ],
  },
];

const snacks = [
  {
    key: "mellis-shake",
    text: "Mellanmål: proteinshake direkt efter pass",
    ingredients: [{ name: "Proteinpulver", amount: 30, unit: "g" }],
  },
  {
    key: "mellis-keso",
    text: "Mellanmål: keso + äpple + kanel",
    ingredients: [
      { name: "Keso", amount: 200, unit: "g" },
      { name: "Äpple", amount: 1, unit: "st" },
    ],
  },
  {
    key: "mellis-mandlar",
    text: "Mellanmål: handfull mandlar + päron",
    ingredients: [
      { name: "Mandlar", amount: 25, unit: "g" },
      { name: "Päron", amount: 1, unit: "st" },
    ],
  },
  {
    key: "mellis-kvarg",
    text: "Mellanmål: kvarg + jordgubbar",
    ingredients: [
      { name: "Kvarg", amount: 200, unit: "g" },
      { name: "Jordgubbar", amount: 120, unit: "g" },
    ],
  },
];

const state = {
  startDate: null,
  currentMonth: firstDayOfMonth(new Date()),
  selectedDate: stripTime(new Date()),
  authMode: "chooser",
  showRecovery: false,
  showProfile: false,
  loginInProgress: false,
  auth: {
    username: "",
    token: "",
    profile: null,
    checkins: [],
  },
};

const dom = {
  accountSection: document.getElementById("accountSection"),
  authChooser: document.getElementById("authChooser"),
  showLoginBtn: document.getElementById("showLoginBtn"),
  showRegisterBtn: document.getElementById("showRegisterBtn"),
  loginView: document.getElementById("loginView"),
  registerView: document.getElementById("registerView"),
  memberView: document.getElementById("memberView"),
  plannerLayout: document.getElementById("plannerLayout"),
  backFromLoginBtn: document.getElementById("backFromLoginBtn"),
  backFromRegisterBtn: document.getElementById("backFromRegisterBtn"),
  startInfo: document.getElementById("startInfo"),
  monthLabel: document.getElementById("monthLabel"),
  weekdayRow: document.getElementById("weekdayRow"),
  daysGrid: document.getElementById("daysGrid"),
  prevMonth: document.getElementById("prevMonth"),
  nextMonth: document.getElementById("nextMonth"),
  detailsTitle: document.getElementById("detailsTitle"),
  detailsSubtitle: document.getElementById("detailsSubtitle"),
  trainingList: document.getElementById("trainingList"),
  foodList: document.getElementById("foodList"),
  exportWeekPdf: document.getElementById("exportWeekPdf"),
  shoppingDays: document.getElementById("shoppingDays"),
  generateShopping: document.getElementById("generateShopping"),
  shoppingInfo: document.getElementById("shoppingInfo"),
  shoppingList: document.getElementById("shoppingList"),
  shoppingToggle: document.getElementById("shoppingToggle"),
  shoppingContent: document.getElementById("shoppingContent"),
  authStatus: document.getElementById("authStatus"),
  loginUsername: document.getElementById("loginUsername"),
  loginPassword: document.getElementById("loginPassword"),
  registerUsername: document.getElementById("registerUsername"),
  registerPassword: document.getElementById("registerPassword"),
  registerStartDate: document.getElementById("registerStartDate"),
  registerBreakfast: document.getElementById("registerBreakfast"),
  registerTrainingMode: document.getElementById("registerTrainingMode"),
  securityQuestion: document.getElementById("securityQuestion"),
  securityAnswer: document.getElementById("securityAnswer"),
  registerBtn: document.getElementById("registerBtn"),
  loginBtn: document.getElementById("loginBtn"),
  forgotBtn: document.getElementById("forgotBtn"),
  showProfileBtn: document.getElementById("showProfileBtn"),
  logoutBtn: document.getElementById("logoutBtn"),
  recoveryPanel: document.getElementById("recoveryPanel"),
  recoveryQuestion: document.getElementById("recoveryQuestion"),
  recoveryAnswer: document.getElementById("recoveryAnswer"),
  recoverPasswordBtn: document.getElementById("recoverPasswordBtn"),
  recoveryStatus: document.getElementById("recoveryStatus"),
  profilePanel: document.getElementById("profilePanel"),
  profileStartDate: document.getElementById("profileStartDate"),
  profileHeight: document.getElementById("profileHeight"),
  profileWeight: document.getElementById("profileWeight"),
  profileWaist: document.getElementById("profileWaist"),
  memberBreakfast: document.getElementById("memberBreakfast"),
  memberTrainingMode: document.getElementById("memberTrainingMode"),
  memberHeight: document.getElementById("memberHeight"),
  memberWeight: document.getElementById("memberWeight"),
  memberWaist: document.getElementById("memberWaist"),
  saveProfileBtn: document.getElementById("saveProfileBtn"),
  exerciseModal: document.getElementById("exerciseModal"),
  exerciseModalTitle: document.getElementById("exerciseModalTitle"),
  exerciseModalImages: document.getElementById("exerciseModalImages"),
  exerciseModalDesc: document.getElementById("exerciseModalDesc"),
  exerciseModalSource: document.getElementById("exerciseModalSource"),
  closeExerciseModalBtn: document.getElementById("closeExerciseModal"),
  checkinDate: document.getElementById("checkinDate"),
  checkinWeight: document.getElementById("checkinWeight"),
  checkinWaist: document.getElementById("checkinWaist"),
  saveCheckinBtn: document.getElementById("saveCheckinBtn"),
  checkinInfo: document.getElementById("checkinInfo"),
  checkinList: document.getElementById("checkinList"),
  progressGraph: document.getElementById("progressGraph"),
};

init();

function init() {
  populateBreakfastOptions();
  renderWeekdays();
  bindEvents();

  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    const parsed = parseDateInput(saved);
    if (parsed) {
      state.startDate = parsed;
      state.currentMonth = firstDayOfMonth(parsed);
      const today = stripTime(new Date());
      state.selectedDate = isBetweenProgramDates(today) ? today : stripTime(parsed);
    }
  }

  const rawAuth = localStorage.getItem(AUTH_STORAGE_KEY);
  if (rawAuth) {
    try {
      const parsed = JSON.parse(rawAuth);
      state.auth.username = String(parsed.username || "");
      state.auth.token = String(parsed.token || "");
      dom.loginUsername.value = state.auth.username;
    } catch (_err) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }

  renderAll();

  if (isLoggedIn()) {
    refreshSession();
  }
}

function bindEvents() {
  dom.showLoginBtn.addEventListener("click", () => setAuthMode("login"));
  dom.showRegisterBtn.addEventListener("click", () => setAuthMode("register"));
  dom.backFromLoginBtn.addEventListener("click", () => setAuthMode("chooser"));
  dom.backFromRegisterBtn.addEventListener("click", () => setAuthMode("chooser"));

  dom.prevMonth.addEventListener("click", () => {
    state.currentMonth = addMonths(state.currentMonth, -1);
    renderCalendar();
  });

  dom.nextMonth.addEventListener("click", () => {
    state.currentMonth = addMonths(state.currentMonth, 1);
    renderCalendar();
  });

  dom.exportWeekPdf.addEventListener("click", exportWeekToPdf);
  dom.generateShopping.addEventListener("click", renderShoppingList);
  dom.shoppingDays.addEventListener("change", renderShoppingList);
  dom.shoppingToggle.addEventListener("click", () => {
    const expanded = dom.shoppingToggle.getAttribute("aria-expanded") === "true";
    dom.shoppingToggle.setAttribute("aria-expanded", String(!expanded));
    dom.shoppingContent.hidden = expanded;
    const arrow = dom.shoppingToggle.querySelector(".toggle-arrow");
    if (arrow) arrow.textContent = expanded ? "▼" : "▲";
  });

  dom.showProfileBtn.addEventListener("click", () => {
    state.showProfile = !state.showProfile;
    renderAccountSection();
  });
  dom.registerBtn.addEventListener("click", registerAccount);
  dom.loginBtn.addEventListener("click", loginAccount);
  const submitLoginOnEnter = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      loginAccount();
    }
  };
  dom.loginUsername.addEventListener("keydown", submitLoginOnEnter);
  dom.loginPassword.addEventListener("keydown", submitLoginOnEnter);
  dom.forgotBtn.addEventListener("click", requestForgotQuestion);
  dom.logoutBtn.addEventListener("click", logoutAccount);
  dom.recoverPasswordBtn.addEventListener("click", recoverPasswordFlow);
  dom.saveProfileBtn.addEventListener("click", saveProfile);
  dom.saveCheckinBtn.addEventListener("click", saveWeeklyCheckin);
  dom.closeExerciseModalBtn.addEventListener("click", () => { dom.exerciseModal.hidden = true; });
  dom.exerciseModal.addEventListener("click", (e) => {
    if (e.target === dom.exerciseModal) dom.exerciseModal.hidden = true;
  });
}

function renderAll() {
  renderStartInfo();
  renderAccountSection();
  renderCalendar();
  renderDetails();
  renderShoppingList();
  renderProgressGraph();
}

function populateBreakfastOptions() {
  const selects = [dom.registerBreakfast, dom.memberBreakfast];

  selects.forEach((select) => {
    if (!select) {
      return;
    }

    select.innerHTML = "";
    breakfasts.forEach((breakfast) => {
      const option = document.createElement("option");
      option.value = breakfast.key;
      option.textContent = breakfast.text.replace("Frukost: ", "");
      select.appendChild(option);
    });
  });
}

function renderStartInfo() {
  if (!state.startDate || !isLoggedIn()) {
    dom.startInfo.textContent = "Ingen start vald ännu.";
    return;
  }

  const start = formatLongDate(state.startDate);
  const end = formatLongDate(addDays(state.startDate, PROGRAM_DAYS - 1));
  dom.startInfo.textContent = `Programperiod: ${start} till ${end}. Kostläge: normal.`;
}

function setAuthMode(mode) {
  state.authMode = mode;
  state.showRecovery = false;
  if (mode === "register" && !dom.registerStartDate.value) {
    dom.registerStartDate.value = state.startDate
      ? formatDateInput(state.startDate)
      : formatDateInput(stripTime(new Date()));
  }
  dom.recoveryQuestion.textContent = "";
  dom.recoveryStatus.textContent = "";
  dom.recoveryAnswer.value = "";
  renderAccountSection();
}

function renderWeekdays() {
  dom.weekdayRow.innerHTML = "";
  weekdayNames.forEach((name) => {
    const el = document.createElement("div");
    el.className = "weekday";
    el.textContent = name;
    dom.weekdayRow.appendChild(el);
  });
}

function renderCalendar() {
  dom.daysGrid.innerHTML = "";
  dom.monthLabel.textContent = formatMonthYear(state.currentMonth);

  const year = state.currentMonth.getFullYear();
  const month = state.currentMonth.getMonth();
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leading = mondayFirstIndex(first);

  for (let i = 0; i < leading; i += 1) {
    const empty = document.createElement("div");
    empty.className = "day-cell empty";
    dom.daysGrid.appendChild(empty);
  }

  for (let d = 1; d <= daysInMonth; d += 1) {
    const date = stripTime(new Date(year, month, d));
    const cell = buildDayCell(date);
    dom.daysGrid.appendChild(cell);
  }
}

function buildDayCell(date) {
  const cell = document.createElement("button");
  cell.type = "button";
  cell.className = "day-cell";

  const dayNum = document.createElement("div");
  dayNum.className = "day-num";
  dayNum.textContent = date.getDate();

  const meta = document.createElement("div");
  meta.className = "day-meta";

  const today = stripTime(new Date());
  if (sameDate(date, today)) {
    cell.classList.add("today");
  }

  if (sameDate(date, state.selectedDate)) {
    cell.classList.add("selected");
  }

  if (!state.startDate) {
    meta.textContent = "-";
  } else {
    const dayIndex = diffDays(state.startDate, date);

    if (dayIndex < 0) {
      cell.classList.add("before-start");
      meta.textContent = "Inte startat";
    } else if (dayIndex >= PROGRAM_DAYS) {
      cell.classList.add("after-program");
      meta.textContent = "Klar";
    } else {
      cell.classList.add("in-program");
      const restDay = dayIndex % 7 === 6;
      if (restDay) {
        cell.classList.add("rest-day");
        meta.textContent = `Dag ${dayIndex + 1} · Vila`;
        const restPill = document.createElement("span");
        restPill.className = "day-pill rest-pill";
        restPill.textContent = "Vila";
        cell.appendChild(restPill);
      } else {
        meta.textContent = `Dag ${dayIndex + 1}`;
      }
    }
  }

  cell.append(dayNum, meta);
  cell.addEventListener("click", () => {
    state.selectedDate = date;
    dom.checkinDate.value = formatDateInput(date);
    renderCalendar();
    renderDetails();
    renderShoppingList();
    renderAccountSection();
  });

  return cell;
}

function renderDetails() {
  clearLists();

  if (!state.startDate) {
    dom.detailsTitle.textContent = "Välj ett startdatum";
    dom.detailsSubtitle.textContent = "Kalendern fylls när programmet är startat.";
    addListItem(dom.trainingList, "Ingen plan ännu.");
    addListItem(dom.foodList, "Välj datum för att skapa kostplan.");
    return;
  }

  const dayIndex = diffDays(state.startDate, state.selectedDate);
  dom.detailsTitle.textContent = formatLongDate(state.selectedDate);

  if (dayIndex < 0) {
    dom.detailsSubtitle.textContent = "Programmet har inte startat denna dag.";
    addListItem(dom.trainingList, "Vila eller valfri lätt promenad.");
    addListItem(dom.foodList, "Förbered matlådor och inköpslista.");
    return;
  }

  if (dayIndex >= PROGRAM_DAYS) {
    dom.detailsSubtitle.textContent = "16 veckor är genomförda. Bra jobbat!";
    addListItem(dom.trainingList, "Återhämtning eller fortsättningsprogram.");
    addListItem(dom.foodList, "Behåll dina basrutiner med hög proteinnivå.");
    return;
  }

  const plan = getDailyPlan(dayIndex, state.selectedDate);
  const kostInfo = getKostBlock(plan.week);
  dom.detailsSubtitle.textContent = `Vecka ${plan.week} av 16 · Dag ${dayIndex + 1} · ${kostInfo.blockType} (Block ${kostInfo.block})`;
  renderTrainingList(plan.training);
  plan.food.forEach((entry) => {
    if (entry === "__SEP__") {
      const hr = document.createElement("hr");
      hr.className = "food-divider";
      dom.foodList.appendChild(hr);
    } else {
      addListItem(dom.foodList, entry);
    }
  });
}

function renderTrainingList(entries) {
  dom.trainingList.innerHTML = "";
  entries.forEach((entry) => {
    const li = document.createElement("li");

    if (entry.includes("\u00d7")) {
      const colonIdx = entry.indexOf(":");
      if (colonIdx > 0) {
        const namePart = entry.slice(0, colonIdx).trim();
        const restPart = entry.slice(colonIdx);
        const isHome = state.auth.profile?.trainingMode === "hemma";
        const nameMap = isHome ? EXERCISE_NAMES_HOME : EXERCISE_NAMES;
        const exerciseSlug = nameMap[namePart.toLowerCase()];

        if (exerciseSlug) {
          const btn = document.createElement("button");
          btn.className = "exercise-link";
          btn.textContent = namePart;
          btn.setAttribute("title", "Klicka för instruktioner och bild");
          btn.addEventListener("click", () => openExerciseDetail(namePart, exerciseSlug));
          li.appendChild(btn);
          li.appendChild(document.createTextNode(restPart));
        } else {
          li.textContent = entry;
        }
      } else {
        li.textContent = entry;
      }
    } else {
      li.textContent = entry;
    }

    dom.trainingList.appendChild(li);
  });
}

async function openExerciseDetail(svName, exerciseSlug) {
  dom.exerciseModalTitle.textContent = svName;
  dom.exerciseModalImages.innerHTML = '<p class="muted">Laddar...</p>';
  dom.exerciseModalDesc.innerHTML = "";
  if (dom.exerciseModalSource) {
    dom.exerciseModalSource.textContent = "Källa: ExerciseDB via server-proxy";
  }
  dom.exerciseModal.hidden = false;

  try {
    const resp = await fetch(`/api/exercise-proxy?name=${encodeURIComponent(exerciseSlug)}`);
    if (!resp.ok) {
      let reason = `HTTP ${resp.status}`;
      try {
        const payload = await resp.json();
        if (payload?.error) {
          reason = `${reason}: ${payload.error}`;
        }
      } catch (_err) {
        // Ignore JSON parse errors and keep HTTP status reason.
      }
      throw new Error(`Proxyförfrågan misslyckades (${reason}).`);
    }
    const data = await resp.json();

    if (!data.found) {
      const usedFallback = await renderWgerFallback(svName);
      if (usedFallback) return;
      dom.exerciseModalImages.innerHTML = '<p class="muted">Ingen information hittades för denna övning.</p>';
      return;
    }

    // GIF från ExerciseDB
    const gifUrl = typeof data.gifUrl === "string" ? data.gifUrl : "";
    if (gifUrl) {
      dom.exerciseModalImages.innerHTML = `<img src="${escapeHtml(gifUrl)}" alt="${escapeHtml(svName)}" loading="lazy" style="height:220px;border-radius:10px">`;
    } else {
      dom.exerciseModalImages.innerHTML = '<p class="muted">Inga bilder tillgängliga i ExerciseDB för denna övning.</p>';
    }

    // Instruktioner som numrerad lista
    const instructions = Array.isArray(data.instructions)
      ? data.instructions.filter((s) => typeof s === "string" && s.trim())
      : [];
    const target = typeof data.target === "string" ? data.target : "okänd";
    const bodyPart = typeof data.bodyPart === "string" ? data.bodyPart : "okänd";

    if (instructions.length) {
      dom.exerciseModalDesc.innerHTML =
        `<p style="margin:0 0 8px;font-size:0.8rem;color:var(--muted)"><b>Muskel:</b> ${escapeHtml(target)} &mdash; <b>Del:</b> ${escapeHtml(bodyPart)}</p>` +
        "<ol style='padding-left:20px;line-height:1.75'>" +
        instructions.map((s) => `<li>${escapeHtml(s)}</li>`).join("") +
        "</ol>";
    } else {
      dom.exerciseModalDesc.innerHTML =
        `<p style="margin:0 0 8px;font-size:0.8rem;color:var(--muted)"><b>Muskel:</b> ${escapeHtml(target)} &mdash; <b>Del:</b> ${escapeHtml(bodyPart)}</p>` +
        '<p class="muted">Inga instruktioner tillgängliga.</p>';
    }
  } catch (err) {
    const usedFallback = await renderWgerFallback(svName);
    if (usedFallback) return;
    dom.exerciseModalImages.innerHTML = `<p class="muted">${escapeHtml(err.message)}</p>`;
  }
}

async function renderWgerFallback(svName) {
  const fallbackId = WGER_FALLBACK_IDS[svName.toLowerCase()];
  if (!fallbackId) {
    return false;
  }

  try {
    const infoResp = await fetch(`${WGER_BASE}/api/v2/exerciseinfo/${fallbackId}/?format=json`);
    if (!infoResp.ok) {
      return false;
    }

    const info = await infoResp.json();
    const images = (info.images || []).slice(0, 4);
    if (images.length) {
      dom.exerciseModalImages.innerHTML = images
        .map((img) => `<img src="${WGER_BASE}${img.image}" alt="${escapeHtml(svName)}" loading="lazy">`)
        .join("");
    } else {
      dom.exerciseModalImages.innerHTML = '<p class="muted">Inga bilder tillgängliga.</p>';
    }

    const enTranslation = (info.translations || []).find((t) => t.language === 2);
    if (enTranslation?.description?.trim()) {
      dom.exerciseModalDesc.innerHTML = enTranslation.description;
    } else {
      dom.exerciseModalDesc.innerHTML = '<p class="muted">Ingen textbeskrivning tillgänglig.</p>';
    }

    if (dom.exerciseModalSource) {
      dom.exerciseModalSource.textContent = "Källa: wger.de - fallback";
    }

    return true;
  } catch (_err) {
    return false;
  }
}

function getDailyPlan(dayIndex, date) {
  const week = Math.floor(dayIndex / 7) + 1;
  const dayInWeek = dayIndex % 7;
  const phase = getPhase(week);

  // 5 gympass varje vecka + extra gympass vecka 4/8/12/16 = 84 gympass totalt.
  let workoutType = "återhämtning";
  if (dayInWeek === 0) {
    workoutType = "rygg-vader";
  } else if (dayInWeek === 1) {
    workoutType = "bröst-biceps";
  } else if (dayInWeek === 2) {
    workoutType = "quads";
  } else if (dayInWeek === 3) {
    workoutType = "axlar-core";
  } else if (dayInWeek === 4) {
    workoutType = "hamstrings-armar";
  } else if (dayInWeek === 5) {
    workoutType = week % 4 === 0 ? "extra-gympass" : "aktiv-recovery";
  }

  const isHome = state.auth.profile?.trainingMode === "hemma";
  const training = isHome
    ? buildTrainingHome(workoutType, phase, week)
    : buildTraining(workoutType, phase, week);
  const foodPlan = buildFood(dayIndex, workoutType, phase);

  return {
    week,
    training,
    food: foodPlan.lines,
    mealKeys: foodPlan.mealKeys,
  };
}

function getPhase(week) {
  if (week <= 4) {
    return "grund";
  }
  if (week <= 8) {
    return "bygg";
  }
  if (week <= 12) {
    return "press";
  }
  return "final";
}

function getKostBlock(week) {
  // Vecka 1-4: Block 1 (proteinfaste), 5-8: Block 2 (deff), 9-12: Block 3 (proteinfaste), 13-16: Block 4 (deff)
  const block = Math.floor((week - 1) / 4) + 1;
  const blockType = block % 2 === 1 ? "Proteinfaste" : "Deficitperiod";
  return { block, blockType };
}

function buildTraining(type, phase, week) {
  const walkByPhase = {
    grund: "Power walk 45-60 min direkt på morgonen, gärna fastande",
    bygg: "Power walk 60 min direkt på morgonen, gärna fastande",
    press: "Power walk 60-75 min direkt på morgonen, gärna fastande",
    final: "Power walk 75 min direkt på morgonen, gärna fastande",
  };
  const pw = walkByPhase[phase];

  // Set-antal per fas
  const S = { grund: "3", bygg: "4", press: "4-5", final: "5" }[phase];

  if (type === "rygg-vader") {
    const rackReps = { grund: "8-10", bygg: "6-8", press: "5-7", final: "4-6" }[phase];
    return [
      pw,
      `— GYMPASS 1: Rygg & vader (60-75 min) —`,
      `Latsdrag brett grepp: ${S} set × 10-12 reps | 90 sek vila`,
      `Sittande kabelrodd smalt grepp: ${S} set × 10-12 reps | 90 sek vila`,
      `Rack pull knähöjd: 3 set × ${rackReps} reps | 2 min vila – tung, kontrollerad sänkning`,
      `Unilateral hantelrodd: 3 set × 12-15 reps per arm | 60 sek vila`,
      ...(phase === "press" || phase === "final"
        ? ["DROPSET latsdrag: direkt ned 2 viktssteg utan vila efter sista set"]
        : []),
      `Stående vadpress maskin: 4 set × 15-20 reps | 60 sek – full rörelse upp och ned`,
      `Sittande vadpress: 3 set × 20-25 reps | 60 sek – pausa 1 sek i topp`,
    ];
  }

  if (type === "bröst-biceps") {
    const pressReps = { grund: "10-12", bygg: "8-10", press: "8-10", final: "6-8" }[phase];
    return [
      pw,
      `— GYMPASS 2: Bröst & biceps (60-75 min) —`,
      `Lutande bänkpress hantel eller skivstång: ${S} set × ${pressReps} reps | 2 min vila`,
      `Flat maskinpress eller skivstångsbänkpress: ${S} set × 10-12 reps | 90 sek vila`,
      `Pec dec eller kabelfly: 3 set × 12-15 reps | 60 sek – känn full bröstkontraktionen`,
      ...(phase === "press" || phase === "final"
        ? ["DROPSET pec dec: kör direkt ned 2 viktssteg utan vila"]
        : []),
      `Hammarcurl: 3 set × 12 reps per arm | 60 sek vila`,
      `EZ-stångscurl: 3 set × 10-12 reps | 60 sek vila`,
      `Koncentrationscurl: 2 set × 15 reps per arm | 45 sek vila`,
    ];
  }

  if (type === "quads") {
    const pressReps = { grund: "12-15", bygg: "10-12", press: "10-12", final: "8-10" }[phase];
    const sqReps = { grund: "10-12", bygg: "8-10", press: "6-8", final: "6-8" }[phase];
    return [
      pw,
      `— GYMPASS 3: Framsida lår (60-75 min) —`,
      `Benpress: ${S} set × ${pressReps} reps | 90 sek vila – djup, kontrollerad rörelse`,
      `Hackknäböj eller skivstångsknäböj: ${S} set × ${sqReps} reps | 2 min vila`,
      `Gångutfall hantlar: 3 set × 12 steg per ben | 90 sek vila`,
      `Benspark leg extension: ${S} set × 12-15 reps | 60 sek – håll 1 sek i topp`,
      ...(phase === "press" || phase === "final"
        ? ["DROPSET benspark: 2 extra viktssteg direkt ned utan vila"]
        : []),
      `Sittande bencurl: 3 set × 15 reps | 60 sek (aktivt hamstringsarbete)`,
    ];
  }

  if (type === "axlar-core") {
    const pushReps = { grund: "10-12", bygg: "10-12", press: "8-10", final: "8-10" }[phase];
    const plankSec = { grund: "45", bygg: "50", press: "55", final: "60" }[phase];
    return [
      pw,
      `— GYMPASS 4: Axlar & core (55-70 min) —`,
      `Militärpress skivstång eller hantlar: ${S} set × ${pushReps} reps | 90 sek vila`,
      `Stående sidolyft hantlar: ${S} set × 15 reps | 60 sek – kontrollerad sänkning`,
      ...(phase === "final"
        ? ["FST-stil sidolyft: 5 set × 15 reps, 30 sek flex och stretch mellan varje set"]
        : []),
      `Rear delt fly maskin eller böjd hantelvariant: ${S} set × 15 reps | 60 sek vila`,
      `Upright row kabel: 3 set × 12 reps | 60 sek vila`,
      `Plankan: 3 × ${plankSec} sek | 45 sek vila`,
      `Hängande benlyft eller dead bug: 3 set × 15 reps | 45 sek vila`,
      `Sidoplanka: 2 × 30 sek per sida`,
    ];
  }

  if (type === "hamstrings-armar") {
    const rdlReps = { grund: "10-12", bygg: "10-12", press: "8-10", final: "8-10" }[phase];
    return [
      pw,
      `— GYMPASS 5: Baksida lår, säte & armar (60-75 min) —`,
      `Rumänskt marklyft RDL: ${S} set × ${rdlReps} reps | 2 min vila – känn hamstringsstretch`,
      `Liggande eller stående bencurl: ${S} set × 12-15 reps | 60 sek vila`,
      `Hip thrust skivstång eller maskin: ${S} set × 15 reps | 60 sek – blås ut i topp`,
      ...(phase === "press" || phase === "final"
        ? ["SUPERSET: kabeltryckning triceps + stångcurl – 3 rundor × 12 reps vardera utan vila emellan"]
        : [
            `Kabeltryckning triceps handfäste: 3 set × 12-15 reps | 60 sek vila`,
            `Stångcurl eller maskincurl: 3 set × 12 reps | 60 sek vila`,
          ]),
      `Skullcrusher eller triceps overhead: 3 set × 10-12 reps | 60 sek vila`,
      `Avsluta: 10 min lätt cykel eller rodd för cirkulation`,
    ];
  }

  if (type === "extra-gympass") {
    const extraReps = phase === "grund" || phase === "bygg" ? "10-15" : "8-12";
    return [
      pw,
      `— EXTRA GYMPASS vecka ${week}: Deload & pump (45-60 min) —`,
      `Välj 1 övning per muskelgrupp: 2-3 set × ${extraReps} reps, lätt till medel vikt`,
      "Fokus på teknik och full rörelseomfång – inte tyngd",
      "Avsluta: 12-15 min lågintensiv cykel eller rodd",
    ];
  }

  if (type === "aktiv-recovery") {
    return [
      pw,
      "— AKTIV RECOVERY —",
      "Lugn cykel eller crosstrainer: 25-35 min vid 55-65 % av max puls",
      "Rörlighet 20 min: höft, axlar, bröstrygg och vader",
      "Bålstabilitet: dead bug 3 × 10, glute bridge 3 × 15, sidoplanka 2 × 20 sek",
    ];
  }

  return [
    "— VILDAG —",
    "Aktiv återhämtning: 30-40 min lugn promenad utomhus",
    "Rörlighet eller yoga 20 min – fokus på senaste dagarnas muskelgrupper",
    "Foam rolling 10 min valfritt",
    "Prioritera sömn 7-9 timmar",
  ];
}

function getDailyMeals(dayIndex) {
  const breakfastKey = state.auth.profile?.breakfastKey || breakfasts[0].key;
  const selectedBreakfast = breakfasts.find((item) => item.key === breakfastKey) || breakfasts[0];
  const lunchMeal = lunches[(dayIndex + 1) % lunches.length];
  const dinnerMeal = {
    key: `${lunchMeal.key}-samma-som-lunch`,
    text: `Middag: samma matlåda som lunch (${lunchMeal.text.replace("Lunch: ", "")})`,
    ingredients: lunchMeal.ingredients,
  };

  return {
    breakfast: selectedBreakfast,
    lunch: lunchMeal,
    dinner: dinnerMeal,
    snack: snacks[(dayIndex + 3) % snacks.length],
  };
}

function buildTrainingHome(type, phase, week) {
  const walkByPhase = {
    grund: "Power walk 45-60 min direkt på morgonen, gärna fastande",
    bygg: "Power walk 60 min direkt på morgonen, gärna fastande",
    press: "Power walk 60-75 min tidigt – högt tempo, minimal paus",
    final: "Power walk 75 min tidigt – maximal fettförbränning",
  };
  const pw = walkByPhase[phase];
  const S = { grund: "3", bygg: "4", press: "4-5", final: "5" }[phase];

  if (type === "rygg-vader") {
    return [
      pw,
      `— HEMMAPASS 1: Rygg & vader (50-65 min) —`,
      `Pull-ups eller negativa chin-ups: ${S} set × max reps | 90 sek vila`,
      `Arm åtning hantel: ${S} set × 12-15 reps per arm | 60 sek vila`,
      `Liggande rodd under bord: 3 set × 15 reps | 60 sek – slow eccentric`,
      `Marklyft hantlar: 3 set × 10-12 reps | 90 sek vila`,
      `Tåhävningar kroppsvikt: 4 set × 20-25 reps | 60 sek – pausa i topp`,
    ];
  }

  if (type === "bröst-biceps") {
    return [
      pw,
      `— HEMMAPASS 2: Bröst & biceps (50-65 min) —`,
      `Armhävningar lutande bänk: ${S} set × 10-15 reps | 90 sek vila`,
      `Armhävningar brett grepp: ${S} set × max reps | 90 sek vila`,
      `Hantelfly liggande: 3 set × 12-15 reps | 60 sek – full stretch i botten`,
      `Hammarcurl: 3 set × 12 reps per arm | 60 sek vila`,
      `Hantelcurl: 3 set × 10-12 reps | 60 sek vila`,
      `Koncentrationscurl: 2 set × 15 reps per arm | 45 sek vila`,
    ];
  }

  if (type === "quads") {
    const sqReps = { grund: "12-15", bygg: "10-12", press: "10-12", final: "8-10" }[phase];
    return [
      pw,
      `— HEMMAPASS 3: Framsida lår (50-65 min) —`,
      `Hantelknäböj goblet squat: ${S} set × ${sqReps} reps | 90 sek vila`,
      `Bulgariansk utfall: ${S} set × 10-12 reps per ben | 90 sek vila`,
      `Gångutfall hantlar: 3 set × 12 steg per ben | 90 sek vila`,
      `Benspark bodyweight: 3 set × 20 reps | 45 sek – håll 1 sek i topp`,
      `Nordic curl eller hälband: 3 set × 8-12 reps | 60 sek vila`,
    ];
  }

  if (type === "axlar-core") {
    const plankSec = { grund: "45", bygg: "50", press: "55", final: "60" }[phase];
    return [
      pw,
      `— HEMMAPASS 4: Axlar & core (50-65 min) —`,
      `Axelpress hantlar sittande: ${S} set × 10-12 reps | 90 sek vila`,
      `Sidolyft hantlar: ${S} set × 15 reps | 60 sek – kontrollerad sänkning`,
      ...(phase === "final"
        ? ["FST-stil sidolyft: 5 set × 15 reps, 30 sek flex och stretch mellan varje set"]
        : []),
      `Böjd flyover hantlar: ${S} set × 15 reps | 60 sek vila`,
      `Upright row hantlar: 3 set × 12 reps | 60 sek vila`,
      `Plankan: 3 × ${plankSec} sek | 45 sek vila`,
      `Benlyft liggande: 3 set × 15 reps | 45 sek vila`,
      `Sidoplanka: 2 × 30 sek per sida`,
    ];
  }

  if (type === "hamstrings-armar") {
    const rdlReps = { grund: "10-12", bygg: "10-12", press: "8-10", final: "8-10" }[phase];
    return [
      pw,
      `— HEMMAPASS 5: Baksida lår, säte & armar (50-65 min) —`,
      `Rumänskt marklyft hantlar RDL: ${S} set × ${rdlReps} reps | 90 sek vila`,
      `Liggande bencurl med hälband: ${S} set × 12-15 reps | 60 sek vila`,
      `Hip thrust med hantel eller kroppsvikt: ${S} set × 15 reps | 60 sek – blås ut i topp`,
      ...(phase === "press" || phase === "final"
        ? ["SUPERSET: tricepsdipar + hantelcurl – 3 rundor × 12 reps vardera utan vila emellan"]
        : [
            `Tricepsdipar på stol: 3 set × 12-15 reps | 60 sek vila`,
            `Hantelcurl växelvis: 3 set × 12 reps | 60 sek vila`,
          ]),
      `Skull crusher hantlar: 3 set × 10-12 reps | 60 sek vila`,
      `Avsluta: 10 min lätt jogg på stället eller hopprep`,
    ];
  }

  if (type === "extra-gympass") {
    return [
      pw,
      `— EXTRA HEMMAPASS vecka ${week}: Deload & rörlighet (40-50 min) —`,
      `Välj 1 övning per muskelgrupp: 2-3 set × 15 reps, lätt motstånd`,
      "Fokus på teknik och full rörelseomfång – inte tyngd",
      "Avsluta: 12-15 min jogg på stället eller en rask promenad",
    ];
  }

  if (type === "aktiv-recovery") {
    return [
      pw,
      "— AKTIV RECOVERY —",
      "Lugn promenad eller lätt jogg: 25-35 min vid låg ansträngning",
      "Rörlighet 20 min: höft, axlar, bröstrygg och vader",
      "Bålstabilitet: dead bug 3 × 10, glute bridge 3 × 15, sidoplanka 2 × 20 sek",
    ];
  }

  return [
    "— VILDAG —",
    "Aktiv återhämtning: 30-40 min lugn promenad utomhus",
    "Rörlighet eller yoga 20 min – fokus på senaste dagarnas muskelgrupper",
    "Foam rolling 10 min valfritt",
    "Prioritera sömn 7-9 timmar",
  ];
}

function buildFood(dayIndex, workoutType, phase) {
  const meals = getDailyMeals(dayIndex);
  const trainingDay = workoutType !== "återhämtning" && workoutType !== "aktiv-recovery";

  const carbRule = trainingDay
    ? "Kolhydrater: 1-2 kupade händer till lunch och middag"
    : "Kolhydrater: 0.5-1 kupad hand till lunch, fokus på grönsaker till middag";

  const hydration =
    phase === "final"
      ? "Vätska: 3.0-3.5 liter vatten + elektrolyter"
      : "Vätska: minst 2.5-3.0 liter vatten";

  const portionGuide =
    "Portionsguide: protein 2 handflator + grönsaker 2 nävar per huvudmål";

  const fatGuide = "Fettkälla: 1-2 tummar per huvudmål";

  return {
    lines: [
      meals.breakfast.text,
      meals.lunch.text,
      meals.dinner.text,
      meals.snack.text,
      "__SEP__",
      "Meal prep: lunch och middag är samma matlåda för enklare planering",
      portionGuide,
      carbRule,
      fatGuide,
      hydration,
    ],
    mealKeys: [meals.breakfast.key, meals.lunch.key, meals.dinner.key, meals.snack.key],
  };
}

function isLoggedIn() {
  return Boolean(state.auth.username && state.auth.token);
}

function persistAuth() {
  if (!isLoggedIn()) {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }

  localStorage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify({ username: state.auth.username, token: state.auth.token })
  );
}

function applyUserData(user) {
  state.auth.profile = user.profile || null;
  state.auth.checkins = Array.isArray(user.checkins) ? user.checkins : [];

  if (state.auth.profile) {
    const p = state.auth.profile;
    dom.memberBreakfast.value = p.breakfastKey || breakfasts[0].key;
    dom.memberTrainingMode.value = p.trainingMode || "gym";
    dom.memberHeight.value = p.heightCm ?? "";
    dom.memberWeight.value = p.startWeightKg ?? "";
    dom.memberWaist.value = p.startWaistCm ?? "";
    dom.profileStartDate.value = p.startDate ?? "";

    if (p.startDate) {
      const parsed = parseDateInput(p.startDate);
      if (parsed) {
        state.startDate = parsed;
        dom.registerStartDate.value = p.startDate;
        localStorage.setItem(STORAGE_KEY, p.startDate);
        if (!sameDate(state.selectedDate, parsed) && diffDays(parsed, state.selectedDate) < 0) {
          state.selectedDate = parsed;
        }
      }
    }
  }
}

async function accountApi(action, payload) {
  const response = await fetch(ACCOUNT_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
  });

  let body = null;
  try {
    body = await response.json();
  } catch (_err) {
    throw new Error("API svarade inte med JSON.");
  }

  if (!response.ok) {
    throw new Error(body.error || "Okänt API-fel.");
  }

  return body;
}

async function refreshSession() {
  try {
    const result = await accountApi("getSession", {
      username: state.auth.username,
      token: state.auth.token,
    });
    applyUserData(result.user || {});
    dom.authStatus.textContent = "";
    state.authMode = "member";
  } catch (err) {
    state.auth = { username: "", token: "", profile: null, checkins: [] };
    persistAuth();
    state.authMode = "chooser";
    dom.authStatus.textContent = err.message;
  } finally {
    renderAll();
  }
}

async function registerAccount() {
  try {
    const username = String(dom.registerUsername.value || "").trim().toLowerCase();
    const password = String(dom.registerPassword.value || "");
    const securityQuestion = String(dom.securityQuestion.value || "").trim();
    const securityAnswer = String(dom.securityAnswer.value || "").trim();
    const startDateValue = String(dom.registerStartDate.value || "");

    if (!startDateValue) {
      throw new Error("Välj startdatum först så startvärden sparas rätt.");
    }

    const picked = parseDateInput(startDateValue);
    if (!picked) {
      throw new Error("Välj ett giltigt startdatum.");
    }

    state.startDate = picked;
    state.currentMonth = firstDayOfMonth(picked);
    state.selectedDate = stripTime(picked);
    localStorage.setItem(STORAGE_KEY, formatDateInput(picked));

    const result = await accountApi("register", {
      username,
      password,
      securityQuestion,
      securityAnswer,
      breakfastKey: dom.registerBreakfast.value,
      trainingMode: dom.registerTrainingMode.value,
      heightCm: dom.profileHeight.value,
      startWeightKg: dom.profileWeight.value,
      startWaistCm: dom.profileWaist.value,
      startDate: formatDateInput(picked),
    });

    state.auth.username = username;
    state.auth.token = result.token;
    applyUserData(result.user || {});
    persistAuth();
    dom.loginUsername.value = username;
    dom.registerPassword.value = "";
    dom.securityAnswer.value = "";
    state.authMode = "member";
    dom.authStatus.textContent = "Konto skapat och inloggat.";
  } catch (err) {
    dom.authStatus.textContent = err.message;
  }

  renderAll();
}

async function requestForgotQuestion() {
  try {
    const username = String(dom.loginUsername.value || "").trim().toLowerCase();
    if (!username) {
      throw new Error("Fyll i användarnamn först.");
    }

    const result = await accountApi("getSecurityQuestion", { username });
    state.showRecovery = true;
    dom.recoveryQuestion.textContent = `Säkerhetsfråga: ${result.securityQuestion}`;
    dom.recoveryStatus.textContent = "Svara på frågan och klicka på Visa lösenord.";
    dom.recoveryAnswer.value = "";
  } catch (err) {
    dom.recoveryQuestion.textContent = "";
    dom.recoveryStatus.textContent = err.message;
  }

  renderAccountSection();
}

async function recoverPasswordFlow() {
  try {
    const username = String(dom.loginUsername.value || "").trim().toLowerCase();
    const securityAnswer = String(dom.recoveryAnswer.value || "").trim();

    if (!username) {
      throw new Error("Fyll i användarnamn först.");
    }

    const result = await accountApi("recoverPassword", { username, securityAnswer });
    dom.recoveryStatus.textContent = `Ditt lösenord är: ${result.password}`;
  } catch (err) {
    dom.recoveryStatus.textContent = err.message;
  }

  renderAccountSection();
}

async function loginAccount() {
  if (state.loginInProgress) {
    return;
  }

  state.loginInProgress = true;
  const oldLoginButtonText = dom.loginBtn.textContent;
  dom.loginBtn.disabled = true;
  dom.loginBtn.textContent = "Loggar in...";
  dom.authStatus.textContent = "Loggar in... väntar på svar från databasen.";

  try {
    const username = String(dom.loginUsername.value || "").trim().toLowerCase();
    const password = String(dom.loginPassword.value || "");
    const result = await accountApi("login", { username, password });

    state.auth.username = username;
    state.auth.token = result.token;
    applyUserData(result.user || {});
    persistAuth();
    dom.loginPassword.value = "";
    state.authMode = "member";
    dom.authStatus.textContent = "Inloggning lyckades.";
  } catch (err) {
    dom.authStatus.textContent = err.message;
  } finally {
    state.loginInProgress = false;
    dom.loginBtn.disabled = false;
    dom.loginBtn.textContent = oldLoginButtonText;
  }

  renderAll();
}

function logoutAccount() {
  state.auth = { username: "", token: "", profile: null, checkins: [] };
  state.authMode = "chooser";
  state.showRecovery = false;
  state.showProfile = false;
  persistAuth();
  dom.loginPassword.value = "";
  dom.authStatus.textContent = "Utloggad.";
  renderAll();
}

async function saveProfile() {
  if (!isLoggedIn()) {
    dom.authStatus.textContent = "Logga in först.";
    return;
  }

  try {
    const profileStart = parseDateInput(dom.profileStartDate.value);
    if (!profileStart) {
      throw new Error("Välj ett giltigt startdatum i profilen.");
    }

    state.startDate = profileStart;
    state.currentMonth = firstDayOfMonth(profileStart);
    localStorage.setItem(STORAGE_KEY, formatDateInput(profileStart));

    const result = await accountApi("saveProfile", {
      username: state.auth.username,
      token: state.auth.token,
      breakfastKey: dom.memberBreakfast.value,
      trainingMode: dom.memberTrainingMode.value,
      heightCm: dom.memberHeight.value,
      startWeightKg: dom.memberWeight.value,
      startWaistCm: dom.memberWaist.value,
      startDate: formatDateInput(profileStart),
    });

    applyUserData(result.user || {});
    dom.authStatus.textContent = "Profil sparad.";
  } catch (err) {
    dom.authStatus.textContent = err.message;
  }

  renderAll();
}

async function saveWeeklyCheckin() {
  if (!isLoggedIn()) {
    dom.authStatus.textContent = "Logga in först.";
    return;
  }

  try {
    const checkinDate = dom.checkinDate.value || formatDateInput(state.selectedDate);
    const result = await accountApi("addCheckin", {
      username: state.auth.username,
      token: state.auth.token,
      checkinDate,
      weightKg: dom.checkinWeight.value,
      waistCm: dom.checkinWaist.value,
    });

    applyUserData(result.user || {});
    dom.authStatus.textContent = "Veckouppföljning sparad.";
  } catch (err) {
    dom.authStatus.textContent = err.message;
  }

  renderAll();
}

function renderAccountSection() {
  const loggedIn = isLoggedIn();
  dom.authChooser.style.display = !loggedIn && state.authMode === "chooser" ? "block" : "none";
  dom.loginView.style.display = !loggedIn && state.authMode === "login" ? "block" : "none";
  dom.registerView.style.display = !loggedIn && state.authMode === "register" ? "block" : "none";
  dom.memberView.style.display = loggedIn ? "block" : "none";
  dom.profilePanel.style.display = loggedIn && state.showProfile ? "block" : "none";
  dom.showProfileBtn.textContent = state.showProfile ? "Dölj profil" : "Min profil";
  dom.recoveryPanel.style.display = !loggedIn && state.authMode === "login" && state.showRecovery ? "block" : "none";
  dom.plannerLayout.style.display = loggedIn ? "grid" : "none";

  if (!dom.checkinDate.value) {
    dom.checkinDate.value = formatDateInput(state.selectedDate);
  }

  dom.checkinList.innerHTML = "";

  if (!loggedIn) {
    if (!dom.authStatus.textContent || dom.authStatus.textContent === "Utloggad.") {
      dom.authStatus.textContent = "Skapa konto eller logga in för att spara vikt och mått.";
    }
    dom.checkinInfo.textContent = "";
    dom.progressGraph.innerHTML = '<div class="graph-empty">Grafen visas när du har loggat in och sparat veckouppföljningar.</div>';
    return;
  }

  if (!dom.memberBreakfast.value && state.auth.profile?.breakfastKey) {
    dom.memberBreakfast.value = state.auth.profile.breakfastKey;
  }

  const checkins = [...state.auth.checkins].sort((a, b) => (a.weekIndex || 0) - (b.weekIndex || 0));
  if (!checkins.length) {
    dom.checkinInfo.textContent = "Ingen uppföljning registrerad ännu.";
    renderProgressGraph();
    return;
  }

  const latest = checkins[checkins.length - 1];
  const nextDate = addDays(parseDateInput(latest.date), 7);
  dom.checkinInfo.textContent = `Senaste vecka ${latest.weekIndex}: ${latest.weightKg} kg, ${latest.waistCm} cm. Nästa uppföljning: ${formatShortDate(nextDate)}.`;

  checkins
    .slice()
    .reverse()
    .forEach((entry) => {
      addListItem(
        dom.checkinList,
        `Vecka ${entry.weekIndex} (${entry.date}): ${entry.weightKg} kg, ${entry.waistCm} cm`
      );
    });
}

function renderProgressGraph() {
  if (!isLoggedIn()) {
    dom.progressGraph.innerHTML = '<div class="graph-empty">Grafen visas när du har loggat in och sparat veckouppföljningar.</div>';
    return;
  }

  const checkins = [...state.auth.checkins]
    .filter((entry) => Number.isFinite(Number(entry.weightKg)) && Number.isFinite(Number(entry.waistCm)))
    .sort((a, b) => (a.weekIndex || 0) - (b.weekIndex || 0));

  if (!checkins.length) {
    dom.progressGraph.innerHTML = '<div class="graph-empty">Lägg in minst en veckouppföljning för att se grafen.</div>';
    return;
  }

  const width = 720;
  const height = 280;
  const padding = { top: 20, right: 18, bottom: 36, left: 18 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const xStep = checkins.length === 1 ? innerWidth / 2 : innerWidth / (checkins.length - 1);
  const weightValues = checkins.map((entry) => Number(entry.weightKg));
  const waistValues = checkins.map((entry) => Number(entry.waistCm));

  const weightBounds = getChartBounds(weightValues);
  const waistBounds = getChartBounds(waistValues);

  const buildPath = (values, bounds) =>
    values
      .map((value, index) => {
        const x = padding.left + (checkins.length === 1 ? innerWidth / 2 : xStep * index);
        const y = mapValueToY(value, bounds.min, bounds.max, padding.top, innerHeight);
        return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(" ");

  const weightPath = buildPath(weightValues, weightBounds);
  const waistPath = buildPath(waistValues, waistBounds);

  const dots = checkins
    .map((entry, index) => {
      const x = padding.left + (checkins.length === 1 ? innerWidth / 2 : xStep * index);
      const weightY = mapValueToY(Number(entry.weightKg), weightBounds.min, weightBounds.max, padding.top, innerHeight);
      const waistY = mapValueToY(Number(entry.waistCm), waistBounds.min, waistBounds.max, padding.top, innerHeight);
      const weekLabel = `v${entry.weekIndex}`;

      return `
        <circle class="graph-dot-weight" cx="${x.toFixed(2)}" cy="${weightY.toFixed(2)}" r="4"></circle>
        <circle class="graph-dot-waist" cx="${x.toFixed(2)}" cy="${waistY.toFixed(2)}" r="4"></circle>
        <text class="graph-label" x="${x.toFixed(2)}" y="${height - 12}" text-anchor="middle">${escapeHtml(weekLabel)}</text>
      `;
    })
    .join("");

  dom.progressGraph.innerHTML = `
    <div class="graph-legend">
      <span><i style="background:#f7a521"></i>Vikt (kg)</span>
      <span><i style="background:#cf2f24"></i>Midja (cm)</span>
    </div>
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Graf över vikt och midjemått per vecka">
      <line class="graph-axis" x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${padding.top + innerHeight}"></line>
      <line class="graph-axis" x1="${padding.left}" y1="${padding.top + innerHeight}" x2="${padding.left + innerWidth}" y2="${padding.top + innerHeight}"></line>
      <path class="graph-weight" d="${weightPath}"></path>
      <path class="graph-waist" d="${waistPath}"></path>
      ${dots}
      <text class="graph-label" x="${padding.left}" y="14">Vikt ${weightBounds.min}-${weightBounds.max} kg</text>
      <text class="graph-label" x="${width - padding.right}" y="14" text-anchor="end">Midja ${waistBounds.min}-${waistBounds.max} cm</text>
    </svg>
  `;
}

function getChartBounds(values) {
  const min = Math.min(...values);
  const max = Math.max(...values);

  if (min === max) {
    return { min: Number((min - 1).toFixed(1)), max: Number((max + 1).toFixed(1)) };
  }

  const padding = (max - min) * 0.12;
  return {
    min: Number((min - padding).toFixed(1)),
    max: Number((max + padding).toFixed(1)),
  };
}

function mapValueToY(value, min, max, top, innerHeight) {
  const ratio = (value - min) / (max - min || 1);
  return top + innerHeight - ratio * innerHeight;
}

function renderShoppingList() {
  dom.shoppingList.innerHTML = "";

  if (!state.startDate) {
    dom.shoppingInfo.textContent = "Välj startdatum för att skapa inköpslista.";
    addListItem(dom.shoppingList, "Ingen inköpslista ännu.");
    return;
  }

  const spanDays = Number(dom.shoppingDays.value || 7);
  const endDate = addDays(state.selectedDate, spanDays - 1);
  dom.shoppingInfo.textContent = `Vald period: ${formatShortDate(state.selectedDate)} - ${formatShortDate(endDate)}.`;

  const shoppingMap = new Map();

  for (let i = 0; i < spanDays; i += 1) {
    const currentDate = addDays(state.selectedDate, i);
    const dayIndex = diffDays(state.startDate, currentDate);

    if (dayIndex < 0 || dayIndex >= PROGRAM_DAYS) {
      continue;
    }

    const meals = getDailyMeals(dayIndex);
    [meals.breakfast, meals.lunch, meals.dinner, meals.snack].forEach((meal) => {
      meal.ingredients.forEach((ingredient) => {
        const mapKey = `${ingredient.name}|${ingredient.unit}`;
        if (!shoppingMap.has(mapKey)) {
          shoppingMap.set(mapKey, {
            name: ingredient.name,
            unit: ingredient.unit,
            amount: 0,
          });
        }

        const existing = shoppingMap.get(mapKey);
        existing.amount += ingredient.amount;
      });
    });
  }

  if (shoppingMap.size === 0) {
    addListItem(
      dom.shoppingList,
      "Inga planerade programdagar i vald period. Flytta vald dag eller ändra period."
    );
    return;
  }

  const sorted = [...shoppingMap.values()].sort((a, b) => a.name.localeCompare(b.name, "sv"));

  sorted.forEach((item) => {
    const rounded = Number.isInteger(item.amount) ? item.amount : item.amount.toFixed(1);
    addListItem(dom.shoppingList, `${item.name}: ca ${rounded} ${item.unit}`);
  });
}

function exportWeekToPdf() {
  if (!state.startDate) {
    dom.detailsSubtitle.textContent = "Välj startdatum innan du exporterar PDF.";
    return;
  }

  const weekStart = addDays(state.selectedDate, -mondayFirstIndex(state.selectedDate));
  const weekEnd = addDays(weekStart, 6);
  const rows = [];

  for (let i = 0; i < 7; i += 1) {
    const date = addDays(weekStart, i);
    const dayIndex = diffDays(state.startDate, date);

    if (dayIndex < 0) {
      rows.push(renderPrintDay(date, ["Programmet har inte startat."], ["Förbered måltider och inköp."]));
      continue;
    }

    if (dayIndex >= PROGRAM_DAYS) {
      rows.push(renderPrintDay(date, ["Programmet är klart."], ["Behåll normal kost och proteinfokus."]));
      continue;
    }

    const plan = getDailyPlan(dayIndex, date);
    rows.push(renderPrintDay(date, plan.training, plan.food));
  }

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    dom.detailsSubtitle.textContent = "Kunde inte öppna utskriftsfönster. Tillåt popup-fönster och försök igen.";
    return;
  }

  const html = `
    <!doctype html>
    <html lang="sv">
      <head>
        <meta charset="UTF-8" />
        <title>112 Dagar i beredskap</title>
        <style>
          body { font-family: Arial, sans-serif; color: #222; margin: 24px; }
          h1 { margin: 0 0 4px; }
          .meta { color: #555; margin: 0 0 16px; }
          .day { border: 1px solid #ddd; border-radius: 10px; padding: 12px; margin-bottom: 10px; }
          .day h2 { margin: 0 0 8px; font-size: 18px; }
          .row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
          h3 { margin: 0 0 6px; font-size: 14px; color: #0d6b60; }
          ul { margin: 0; padding-left: 16px; }
          li { margin-bottom: 4px; font-size: 12px; }
          @media print { .day { break-inside: avoid; } }
        </style>
      </head>
      <body>
        <h1>112 Dagar i beredskap</h1>
        <p class="meta">Period: ${formatShortDate(weekStart)} - ${formatShortDate(weekEnd)} | Kost: normal | Träning: gym</p>
        ${rows.join("")}
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

function renderPrintDay(date, training, food) {
  return `
    <article class="day">
      <h2>${formatLongDate(date)}</h2>
      <div class="row">
        <section>
          <h3>Träning</h3>
          <ul>${training.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
        </section>
        <section>
          <h3>Mat</h3>
          <ul>${food.map((item) => item === "__SEP__" ? `</ul><hr style="border:0;border-top:1px solid #ccc;margin:6px 0"/><ul>` : `<li>${escapeHtml(item)}</li>`).join("")}</ul>
        </section>
      </div>
    </article>
  `;
}

function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function isBetweenProgramDates(date) {
  if (!state.startDate) {
    return false;
  }
  const idx = diffDays(state.startDate, date);
  return idx >= 0 && idx < PROGRAM_DAYS;
}

function addListItem(list, text) {
  const li = document.createElement("li");
  li.textContent = text;
  list.appendChild(li);
}

function clearLists() {
  dom.trainingList.innerHTML = "";
  dom.foodList.innerHTML = "";
}

function parseDateInput(value) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const [year, month, day] = value.split("-").map(Number);
  const dt = new Date(year, month - 1, day);
  return Number.isNaN(dt.getTime()) ? null : stripTime(dt);
}

function formatDateInput(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function stripTime(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function firstDayOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addDays(date, days) {
  const out = new Date(date);
  out.setDate(out.getDate() + days);
  return stripTime(out);
}

function addMonths(date, months) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function diffDays(from, to) {
  const ms = stripTime(to) - stripTime(from);
  return Math.floor(ms / 86400000);
}

function sameDate(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function mondayFirstIndex(date) {
  return (date.getDay() + 6) % 7;
}

function formatMonthYear(date) {
  return new Intl.DateTimeFormat("sv-SE", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatLongDate(date) {
  return new Intl.DateTimeFormat("sv-SE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatShortDate(date) {
  return new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
