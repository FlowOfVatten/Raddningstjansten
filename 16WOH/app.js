const STORAGE_KEY = "wohStartDate";
const AUTH_STORAGE_KEY = "wohAuth";
const ACCOUNT_API = "/api/woh-account";

function loadRecipeOffsets(serverOffsets) {
  state.recipeOffsets = (serverOffsets && typeof serverOffsets === "object" && !Array.isArray(serverOffsets))
    ? { ...serverOffsets }
    : {};
}

async function persistRecipeOffsets() {
  if (!isLoggedIn()) return;
  try {
    await accountApi("saverecipeoffsets", {
      username: state.auth.username,
      token: state.auth.token,
      recipeOffsets: state.recipeOffsets,
    });
  } catch (_) {
    // Silent fail — offsets are still active for this session
  }
}

function clearRecipeOffsets() {
  state.recipeOffsets = {};
}
const PROGRAM_DAYS = 112;
const weekdayNames = ["Mån", "Tis", "Ons", "Tor", "Fre", "Lör", "Sön"];

const EXERCISE_GUIDES = window.EXERCISE_GUIDES || { gym: {}, hemma: {} };
const EXERCISE_GUIDE_ALIASES = {
  gym: {
    "latsdrag eller chins": "latsdrag brett grepp",
    "sittande rodd": "sittande kabelrodd smalt grepp",
    "rack pulls": "rack pull knahojd",
    "hangande benlyft": "hangande benlyft eller dead bug",
    "lutande hantelpress": "lutande bankpress hantel eller skivstang",
    "militarpress": "militarpress skivstang eller hantlar",
    "knaboj (prioritera fri stang)": "skivstångsknäböj",
    "gangutfall": "gangutfall hantlar",
    "benspark": "benspark leg extension",
    "staende sidolyft": "staende sidolyft hantlar",
    "rear delt flyes": "rear delt fly maskin eller bojd hantelvariant",
    "rumanska marklyft (rdl)": "rumänska marklyft (rdl)",
    "liggande bencurl": "liggande eller staende bencurl",
    "hip thrusts": "hip thrust skivstang eller maskin",
    "triceps overhead (eller sled push/assault bike)": "triceps overhead extension (kabel eller hantel)"
  },
  hemma: {
    "pull ups/chins eller bandchins": "pull ups eller negativa chin ups",
    "pull-ups/chins eller bandchins": "pull ups eller negativa chin ups",
    "sittande rodd med band eller hantelrodd": "band rodd",
    "rack pull variant med hantlar": "marklyft hantlar",
    "hangande benlyft eller liggande benlyft": "benlyft liggande",
    "lutande hantelpress": "hantelfly liggande",
    "militarpress hantlar": "axelpress hantlar sittande",
    "dips mellan stolar/bankar": "tricepsdipar pa stol",
    "gangutfall": "gangutfall hantlar",
    "goblet squat": "hantelknaboj goblet squat",
    "benspark bodyweight/band": "benspark bodyweight",
    "staende sidolyft": "sidolyft hantlar",
    "rear delt flyes": "bojd flyover hantlar",
    "rumanska marklyft (rdl)": "rumanskt marklyft hantlar rdl",
    "rdl med hantlar": "rumanskt marklyft hantlar rdl",
    "liggande bencurl med band/halduk": "liggande bencurl med halband",
    "hip thrust": "hip thrust med hantel eller kroppsvikt",
    "triceps overhead med hantel (eller sled/assault bike om tillgang finns)": "triceps overhead extension (kabel eller hantel)",
    "triceps overhead med hantel (eller sled/assault bike om tillgang)": "triceps overhead extension (kabel eller hantel)"
  }
};

function normalizeGuideKey(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function buildGuideIndex(guidesByMode) {
  const out = { gym: {}, hemma: {} };
  for (const mode of Object.keys(out)) {
    const source = guidesByMode?.[mode] || {};
    Object.keys(source).forEach((name) => {
      out[mode][normalizeGuideKey(name)] = source[name];
    });
  }
  return out;
}

const EXERCISE_GUIDE_INDEX = buildGuideIndex(EXERCISE_GUIDES);

function getCurrentTrainingMode() {
  return state?.auth?.profile?.trainingMode === "hemma" ? "hemma" : "gym";
}

function getExerciseGuide(svName, mode) {
  const normalized = normalizeGuideKey(svName);
  const direct = EXERCISE_GUIDE_INDEX?.[mode]?.[normalized];
  if (direct) {
    return direct;
  }

  const alias = EXERCISE_GUIDE_ALIASES?.[mode]?.[normalized];
  if (alias) {
    return EXERCISE_GUIDE_INDEX?.[mode]?.[normalizeGuideKey(alias)] || "";
  }

  return "";
}

function extractExerciseLinkParts(entry) {
  const colonIdx = entry.indexOf(":");
  if (colonIdx <= 0 || entry.startsWith("—")) {
    return null;
  }

  const label = entry.slice(0, colonIdx).trim();
  const restPart = entry.slice(colonIdx);
  const afterColon = entry.slice(colonIdx + 1).trim();

  if (/^finisher$/i.test(label)) {
    if (/burpees/i.test(afterColon)) return { linkText: "Burpees", guideName: "Burpees", restPart };
    if (/armh[aä]vningar/i.test(afterColon)) return { linkText: "Armhävningar", guideName: "Armhävningar", restPart };
    if (/mountain climbers/i.test(afterColon)) return { linkText: "Mountain climbers", guideName: "Mountain climbers", restPart };
    if (/kettlebell[-\s]?svingar/i.test(afterColon)) return { linkText: "Kettlebell-svingar", guideName: "Kettlebell-svingar", restPart };
    if (/maxrodd/i.test(afterColon)) return { linkText: "500 m maxrodd", guideName: "500 m maxrodd", restPart };
    if (/l[oö]pband/i.test(afterColon)) return { linkText: "Löpbandsintervall", guideName: "Löpbandsintervall", restPart };
  }

  if (/^test$/i.test(label)) {
    if (/max chins|pull-ups/i.test(afterColon)) return { linkText: "Chins/Pull-ups", guideName: "Chins/Pull-ups", restPart };
    if (/500\s*m\s*rodd/i.test(afterColon)) return { linkText: "500 m rodd", guideName: "500 m rodd", restPart };
    if (/farmers walk/i.test(afterColon)) return { linkText: "Farmers walk", guideName: "Farmers walk", restPart };
    if (/burpees/i.test(afterColon)) return { linkText: "Burpees", guideName: "Burpees", restPart };
    if (/5\s*km/i.test(afterColon)) return { linkText: "5 km gång/löpning", guideName: "5 km gång/löpning", restPart };
  }

  if (/^rpe$/i.test(label)) {
    return { linkText: "RPE", guideName: "RPE", restPart };
  }

  if (/^failure$/i.test(label)) {
    return { linkText: "Failure", guideName: "Failure", restPart };
  }

  if (/^ruck$/i.test(label)) {
    return { linkText: "Ruck", guideName: "Ruck", restPart };
  }

  if (/amrap/i.test(afterColon)) {
    return { linkText: "AMRAP", guideName: "AMRAP", restPart };
  }

  return { linkText: label, guideName: label, restPart };
}

const MEAL_RECIPES = window.MEAL_RECIPES || {};
const MEAL_RECIPE_CATALOG = window.MEAL_RECIPE_CATALOG || [];

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
  recipeCatalog: Array.isArray(MEAL_RECIPE_CATALOG) ? [...MEAL_RECIPE_CATALOG] : [],
  recipeOffsets: {},
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
  showBlockInfoBtn: document.getElementById("showBlockInfoBtn"),
  showFoodInfoBtn: document.getElementById("showFoodInfoBtn"),
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

  loadExternalRecipeCatalog();

  if (isLoggedIn()) {
    refreshSession();
  }
}

async function loadExternalRecipeCatalog() {
  try {
    const response = await fetch("recept.txt", { cache: "no-store" });
    if (!response.ok) {
      return;
    }

    const raw = await response.text();
    const parsed = parseRecipeCatalogText(raw);
    if (!parsed.length) {
      return;
    }

    state.recipeCatalog = parsed;
    window.MEAL_RECIPE_CATALOG = parsed;
    renderDetails();
  } catch (_err) {
    // Keep static fallback recipes if recept.txt cannot be loaded.
  }
}

function parseRecipeCatalogText(rawText) {
  const lines = String(rawText || "").split(/\r?\n/);
  const recipes = [];
  let current = null;
  let section = "";

  const pushCurrent = () => {
    if (!current || !current.title) {
      return;
    }
    if (!current.transcript.ingredients.length && !current.transcript.steps.length) {
      return;
    }
    recipes.push(current);
  };

  lines.forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line || line === "***") {
      return;
    }

    if (line.startsWith("## ")) {
      pushCurrent();
      const cleanTitle = cleanRecipeText(line.replace(/^##\s*/, "").replace(/^[^\p{L}\p{N}]+/u, ""));
      current = {
        title: cleanTitle,
        source: "Källa: recept.txt (uppladdad)",
        notes: "Automatiskt inläst från uppladdad receptfil.",
        transcript: {
          servings: "",
          ingredients: [],
          seasoning: [],
          steps: [],
        },
      };
      section = "";
      return;
    }

    if (!current) {
      return;
    }

    const servingsMatch = line.match(/^\*\*(.+)\*\*$/);
    if (servingsMatch && !current.transcript.servings) {
      current.transcript.servings = cleanRecipeText(servingsMatch[1]);
      return;
    }

    if (line.startsWith("### ")) {
      const heading = cleanRecipeText(line.replace(/^###\s*/, "")).toLowerCase();
      if (heading.includes("ingrediens")) {
        section = "ingredients";
      } else if (heading.includes("kryddor") || heading.includes("örter")) {
        section = "seasoning";
      } else if (heading.includes("gör så här")) {
        section = "steps";
      } else {
        section = "notes";
      }
      return;
    }

    if (line.startsWith("*")) {
      const item = cleanRecipeText(line.replace(/^\*\s+/, ""));
      if (!item) {
        return;
      }

      if (section === "seasoning") {
        current.transcript.seasoning.push(item);
      } else if (section === "steps") {
        current.transcript.steps.push(item);
      } else {
        current.transcript.ingredients.push(item);
      }
      return;
    }

    const plain = cleanRecipeText(line);
    if (!plain) {
      return;
    }

    if (section === "steps") {
      current.transcript.steps.push(plain);
    } else if (section === "seasoning") {
      current.transcript.seasoning.push(plain);
    } else if (section === "ingredients") {
      current.transcript.ingredients.push(plain);
    }
  });

  pushCurrent();
  return recipes;
}

function cleanRecipeText(value) {
  return String(value || "")
    .replace(/\*\*/g, "")
    .replace(/\s+/g, " ")
    .trim();
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
  dom.showBlockInfoBtn.addEventListener("click", openBlockInfoDetail);
  dom.showFoodInfoBtn.addEventListener("click", openFoodInfoDetail);
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
  renderFoodList(plan.food, plan.mealKeys);
}

function renderFoodList(foodLines, mealKeys) {
  let mealIdx = 0;
  foodLines.forEach((entry) => {
    if (entry === "__SEP__") {
      const hr = document.createElement("hr");
      hr.className = "food-divider";
      dom.foodList.appendChild(hr);
      return;
    }

    const isPrimaryMealLine = mealIdx < mealKeys.length;
    if (!isPrimaryMealLine) {
      addListItem(dom.foodList, entry);
      return;
    }

    const mealKey = mealKeys[mealIdx];
    mealIdx += 1;

    if (!mealKey.startsWith("lunch")) {
      addListItem(dom.foodList, entry);
      return;
    }

    // Use the recipe catalog title as the displayed name if available.
    const catalogEntry = getCatalogRecipeEntry(mealKey);
    const recipeName = catalogEntry?.title || entry.replace(/^Lunch:\s*/i, "");
    const displayText = `Lunch/middag: ${recipeName}`;

    const li = document.createElement("li");
    li.className = "food-recipe-row";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "exercise-link";
    btn.textContent = displayText;
    btn.setAttribute("title", "Klicka för recept");
    btn.addEventListener("click", () => openMealDetail(mealKey, displayText));

    const refreshBtn = document.createElement("button");
    refreshBtn.type = "button";
    refreshBtn.className = "recipe-refresh-btn";
    refreshBtn.setAttribute("title", "Byt recept för dagen");
    refreshBtn.setAttribute("aria-label", "Byt recept");
    refreshBtn.textContent = "↻";
    refreshBtn.addEventListener("click", () => {
      const dayIndex = state.startDate ? Math.max(0, diffDays(state.startDate, state.selectedDate)) : 0;
      state.recipeOffsets[dayIndex] = ((state.recipeOffsets[dayIndex] || 0) + 1);
      persistRecipeOffsets();
      renderDetails();
    });

    li.appendChild(btn);
    li.appendChild(refreshBtn);
    dom.foodList.appendChild(li);
  });
}

function resolveMealByKey(mealKey) {
  const key = String(mealKey || "");
  const baseKey = key.endsWith("-samma-som-lunch")
    ? key.slice(0, -"-samma-som-lunch".length)
    : key;

  const meal = [...breakfasts, ...lunches, ...dinners, ...snacks].find((m) => m.key === baseKey);
  return { meal, baseKey };
}

function getMealRecipeEntry(mealKey) {
  const value = MEAL_RECIPES?.[mealKey];
  if (typeof value === "string") {
    return { text: value };
  }
  if (value && typeof value === "object") {
    return value;
  }
  return null;
}

function getCatalogRecipeEntry(mealKey) {
  const key = String(mealKey || "");
  if (!key.startsWith("lunch") && !key.startsWith("middag")) return null;
  const dayIndex = state.startDate ? Math.max(0, diffDays(state.startDate, state.selectedDate)) : 0;
  return getCatalogRecipeEntryForDay(mealKey, dayIndex);
}

function getCatalogRecipeEntryForDay(mealKey, dayIndex) {
  if (!Array.isArray(state.recipeCatalog) || !state.recipeCatalog.length) {
    return null;
  }

  const key = String(mealKey || "");
  const isLunch = key.startsWith("lunch");
  const isDinner = key.startsWith("middag");
  if (!isLunch && !isDinner) {
    return null;
  }

  // Lunch and dinner always show the same recipe — cook once, eat twice.
  // recipeOffsets allows the user to cycle to a different recipe for a specific day.
  const offset = state.recipeOffsets?.[dayIndex] || 0;
  const index = (dayIndex + offset) % state.recipeCatalog.length;
  const recipe = state.recipeCatalog[index];

  return {
    title: recipe.title,
    source: recipe.source,
    notes: recipe.notes,
    transcript: recipe.transcript,
  };
}

function renderMealRecipeSection(title, items) {
  if (!Array.isArray(items) || !items.length) {
    return "";
  }

  return `
    <section class="recipe-section">
      <h4>${escapeHtml(title)}</h4>
      <ul>
        ${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
      </ul>
    </section>
  `;
}

function renderInfoCardHtml(chip, title, intro, sections) {
  return `
    <article class="recipe-card info-card">
      <header class="recipe-card-head">
        <span class="recipe-chip">${escapeHtml(chip)}</span>
        <h4>${escapeHtml(title)}</h4>
        <p>${escapeHtml(intro)}</p>
      </header>
      <div class="recipe-grid">
        ${sections.join("")}
      </div>
    </article>
  `;
}

function formatDefaultMealIngredients(meal) {
  const ingredients = Array.isArray(meal?.ingredients) ? meal.ingredients : [];
  return ingredients.map((it) => `${it.name}: ${it.amount} ${it.unit}`);
}

function formatMealRecipeHtml(title, meal, recipeEntry) {
  const intro = recipeEntry?.text || recipeEntry?.notes || "Recept hämtat från din uppladdade samling.";
  const transcript = recipeEntry?.transcript || null;
  const recipeTitle = recipeEntry?.title || title;
  const ingredients = transcript?.ingredients?.length ? transcript.ingredients : formatDefaultMealIngredients(meal);
  const seasoning = transcript?.seasoning || [];
  const steps = transcript?.steps || [];
  const servings = transcript?.servings;

  return `
    <article class="recipe-card">
      <header class="recipe-card-head">
        <span class="recipe-chip">Receptkort</span>
        <h4>${escapeHtml(recipeTitle)}</h4>
        <p>${escapeHtml(intro).replace(/\n/g, "<br>")}</p>
      </header>
      ${servings ? `<p class="recipe-servings"><strong>Portioner:</strong> ${escapeHtml(servings)}</p>` : ""}
      <div class="recipe-grid">
        ${renderMealRecipeSection("Ingredienser", ingredients)}
        ${renderMealRecipeSection("Kryddor & örter", seasoning)}
        ${renderMealRecipeSection("Gör så här", steps)}
      </div>
      <p class="recipe-footnote">Vald från full receptsamling för: ${escapeHtml(title)}</p>
    </article>
  `;
}

function renderMealRecipeImages(recipeEntry, title) {
  const imagePaths = [recipeEntry?.photoImage, recipeEntry?.detailImage].filter(Boolean);
  imagePaths.forEach((src, index) => {
    const img = document.createElement("img");
    img.src = src;
    img.alt = `${title} ${index === 0 ? "bild" : "receptkort"}`;
    img.loading = "lazy";
    dom.exerciseModalImages.appendChild(img);
  });
}

function openMealDetail(mealKey, displayText) {
  const { meal, baseKey } = resolveMealByKey(mealKey);
  const title = String(displayText || meal?.text || "Måltid");

  dom.exerciseModalTitle.textContent = title;
  dom.exerciseModalImages.innerHTML = "";
  dom.exerciseModalDesc.innerHTML = "";
  if (dom.exerciseModalSource) {
    dom.exerciseModalSource.textContent = "Källa: statisk måltidslista i appen";
  }
  dom.exerciseModal.hidden = false;

  const recipeEntry = getCatalogRecipeEntry(baseKey) || getMealRecipeEntry(baseKey);
  if (recipeEntry?.photoImage || recipeEntry?.detailImage) {
    renderMealRecipeImages(recipeEntry, title);
  }
  if (dom.exerciseModalSource && recipeEntry?.source) {
    dom.exerciseModalSource.textContent = recipeEntry.source;
  }
  dom.exerciseModalDesc.innerHTML = formatMealRecipeHtml(title, meal, recipeEntry);
}

function renderTrainingList(entries) {
  dom.trainingList.innerHTML = "";
  entries.forEach((entry) => {
    const li = document.createElement("li");

    const linkParts = extractExerciseLinkParts(entry);
    if (linkParts) {
      const { linkText, guideName, restPart } = linkParts;
      const mode = getCurrentTrainingMode();
      const details = getExerciseGuide(guideName, mode);
      if (details) {
        const btn = document.createElement("button");
        btn.className = "exercise-link";
        btn.textContent = linkText;
        btn.setAttribute("title", "Klicka för instruktioner");
        btn.addEventListener("click", () => openExerciseDetail(guideName));
        li.appendChild(btn);
        li.appendChild(document.createTextNode(restPart));
      } else {
        li.textContent = entry;
      }
    } else {
      li.textContent = entry;
    }

    dom.trainingList.appendChild(li);
  });
}


function renderGuideTextHtml(guideText) {
  const cleanedText = String(guideText || "")
    .split("\n")
    .filter((line) => !/^Rek(?:\/tempo)?(?:\s*\([^)]*\))?:/i.test(line.trim()))
    .join("\n");
  const escaped = escapeHtml(cleanedText).replace(/\n/g, "<br>");
  return `<p style="margin:0;line-height:1.7;white-space:normal">${escaped}</p>`;
}

async function openExerciseDetail(svName) {
  dom.exerciseModalTitle.textContent = svName;
  dom.exerciseModalImages.innerHTML = "";
  dom.exerciseModalDesc.innerHTML = "";
  if (dom.exerciseModalSource) dom.exerciseModalSource.textContent = "Källa: statisk svensk lista i appen";
  dom.exerciseModal.hidden = false;

  try {
    const mode = getCurrentTrainingMode();
    const guideText = getExerciseGuide(svName, mode);
    if (!guideText) {
      dom.exerciseModalDesc.innerHTML = '<p class="muted">Instruktion saknas i den statiska listan.</p>';
      return;
    }

    dom.exerciseModalDesc.innerHTML = renderGuideTextHtml(guideText);
  } catch (err) {
    dom.exerciseModalDesc.innerHTML = `<p class="muted">${escapeHtml(err.message)}</p>`;
  }
}

function openInfoDetail(title, html, source) {
  dom.exerciseModalTitle.textContent = title;
  dom.exerciseModalImages.innerHTML = "";
  dom.exerciseModalDesc.innerHTML = html;
  if (dom.exerciseModalSource) {
    dom.exerciseModalSource.textContent = source || "Källa: 112DIB-regler i appen";
  }
  dom.exerciseModal.hidden = false;
}

function getWorkoutTypeForDay(dayInWeek) {
  if (dayInWeek === 0) return "rygg-vader";
  if (dayInWeek === 1) return "bröst-biceps";
  if (dayInWeek === 2) return "quads";
  if (dayInWeek === 3) return "axlar-core";
  if (dayInWeek === 4) return "hamstrings-armar";
  if (dayInWeek === 5) return "aktiv-recovery";
  return "återhämtning";
}

function getTrainingStage(week) {
  if (week <= 4) return "fas1";
  if (week <= 8) return "fas2";
  if (week <= 12) return "fas3";
  if (week <= 15) return "fas4";
  return "test";
}

function getRestRules(stage) {
  return {
    restStandard: stage === "fas1" ? "60 sek" : stage === "test" ? "60 sek" : "45 sek",
    restHeavy: stage === "fas1" ? "max 90 sek" : stage === "fas4" ? "max 45 sek" : stage === "test" ? "max 90 sek" : "80-90 sek",
  };
}

function getProgramContext() {
  if (!state.startDate) {
    return null;
  }

  const dayIndex = diffDays(state.startDate, state.selectedDate);
  if (dayIndex < 0 || dayIndex >= PROGRAM_DAYS) {
    return null;
  }

  const week = Math.floor(dayIndex / 7) + 1;
  const dayInWeek = dayIndex % 7;
  const workoutType = getWorkoutTypeForDay(dayInWeek);
  const stage = getTrainingStage(week);
  const phase = getPhase(week);
  const kostInfo = getKostBlock(week);
  const trainingDay = workoutType !== "återhämtning" && workoutType !== "aktiv-recovery";

  return {
    dayIndex,
    week,
    phase,
    stage,
    kostInfo,
    workoutType,
    trainingDay,
  };
}

function getWorkoutTypeLabel(workoutType) {
  const labels = {
    "rygg-vader": "Måndag: Drag & bål",
    "bröst-biceps": "Tisdag: Press & armar",
    "quads": "Onsdag: Underkropp",
    "axlar-core": "Torsdag: Axlar & stabilitet",
    "hamstrings-armar": "Fredag: Bakre kedjan & puls",
    "aktiv-recovery": "Lördag: Aktiv återhämtning",
    "återhämtning": "Söndag: Vilodag",
  };
  return labels[workoutType] || "Dagens upplägg";
}

function buildBlockInfoHtml(context) {
  const activeContext = context || {
    week: 1,
    stage: "fas1",
    workoutType: "rygg-vader",
  };
  const { restStandard, restHeavy } = getRestRules(activeContext.stage);
  const stageTitle = {
    fas1: "Fas 1: Grund",
    fas2: "Fas 2: Bygg",
    fas3: "Fas 3: Press",
    fas4: "Fas 4: Final",
    test: "Vecka 16: Testvecka",
  }[activeContext.stage] || "Aktuellt block";

  const phaseRules = {
    fas1: [
      "RPE 7-8. Lämna 1-2 repetitioner i reserv i baslyften.",
      "Bygg teknik och rytm före viktökningar.",
    ],
    fas2: [
      "Håll samma struktur men arbeta tyngre och mer beslutsamt i varje set.",
      "På återhämtningsdagar kan 1-2 powerwalks per vecka bytas mot ruck med 10-15 kg.",
    ],
    fas3: [
      "Sista setet i varje övning är AMRAP, men stanna vid högst +2 repetitioner och bryt före teknisk kollaps.",
      "Lägg till ett extra krävande konditionspass en gång per vecka.",
      "På återhämtningsdagar kan 1-2 powerwalks per vecka bytas mot ruck med 10-15 kg.",
    ],
    fas4: [
      "Måndagspasset genomförs fastande.",
      "Torsdagspasset genomförs sent på kvällen.",
      "Farmers walk ska alltid nå minst 3 längder och finishers fullföljs alltid.",
      "Inga viktökningar i den här fasen. Behåll vikterna trots trötthet.",
    ],
    test: [
      "Testveckan körs med 3 x 6 före respektive testmoment.",
      "Fokusera på ren teknik, tydlig uppvärmning och logga varje resultat.",
    ],
  };

  const todayRules = {
    "aktiv-recovery": [
      "Ingen styrketräning i dag.",
      "Håll tempot lugnt och prioritera rörlighet, promenad eller lätt cykel/jogg.",
    ],
    "återhämtning": [
      "Ingen styrketräning i dag.",
      "Prioritera sömn, lugn promenad och rörlighet.",
    ],
  };

  const sections = [
    renderMealRecipeSection("Grundregler", [
      "Powerwalk 60 minuter per dag minst 5 dagar per vecka.",
      `Vilotid: ${restStandard} normalt, ${restHeavy} på tunga baslyft.`,
      "Failure används bara i kroppsviktsövningar och finishers, aldrig i baslyft.",
    ]),
    renderMealRecipeSection(stageTitle, phaseRules[activeContext.stage] || []),
    renderMealRecipeSection(getWorkoutTypeLabel(activeContext.workoutType), todayRules[activeContext.workoutType] || [
      "Följ dagens set, repetitioner och finisher enligt träningsplanen.",
      "Kvalitet går före tempo i varje repetition.",
    ]),
  ].filter(Boolean);

  return renderInfoCardHtml(
    "Info",
    `Blockinformation vecka ${activeContext.week}`,
    "Här ligger alla regler som gäller för blocket så att träningslistan kan vara ren och tydlig.",
    sections,
  );
}

function buildFoodInfoHtml(context) {
  const activeContext = context || {
    week: 1,
    phase: "grund",
    kostInfo: getKostBlock(1),
    trainingDay: true,
  };

  const carbRule = activeContext.trainingDay
    ? "Kolhydrater: 1-2 kupade händer till lunch och middag."
    : "Kolhydrater: 0,5-1 kupad hand till lunch och fokus på grönsaker till middag.";

  const hydration = activeContext.phase === "final"
    ? "Vätska: 3,0-3,5 liter vatten plus elektrolyter."
    : "Vätska: minst 2,5-3,0 liter vatten.";

  return renderInfoCardHtml(
    "Kost",
    `Instruktioner vecka ${activeContext.week}`,
    `Aktuellt kostblock: ${activeContext.kostInfo.blockType} (Block ${activeContext.kostInfo.block}).`,
    [
      renderMealRecipeSection("Basriktlinjer", [
        "Portionsguide: protein 2 handflator plus grönsaker 2 nävar per huvudmål.",
        carbRule,
        "Fettkälla: 1-2 tummar per huvudmål.",
        hydration,
        "Ätfönster: 10:00-18:00.",
      ]),
      renderMealRecipeSection("Viktigt att följa", [
        "Prioritera proteinet i varje måltid.",
        "Ta en proteinshake efter varje tyngre pass.",
        "Lyssna på kroppen: om du blir extremt yr eller tappar styrka på gymmet, öka portionerna något.",
        "Håll det sockerfritt: 112 är det nolltolerans som gäller för att maximera resultaten.",
      ]),
    ],
  );
}

function openBlockInfoDetail() {
  const context = getProgramContext();
  openInfoDetail("Blockinformation", buildBlockInfoHtml(context), "Källa: 112DIB träningsblock");
}

function openFoodInfoDetail() {
  const context = getProgramContext();
  openInfoDetail("Instruktioner", buildFoodInfoHtml(context), "Källa: 112DIB kostblock");
}

function getDailyPlan(dayIndex, date) {
  const week = Math.floor(dayIndex / 7) + 1;
  const dayInWeek = dayIndex % 7;
  const phase = getPhase(week);

  // 5 styrkepass mån-fre. Ingen styrka på lör/sön.
  const workoutType = getWorkoutTypeForDay(dayInWeek);

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
  const stage = getTrainingStage(week);
  const { restStandard, restHeavy } = getRestRules(stage);

  if (stage === "test") {
    if (type === "rygg-vader") {
      return [
        "— VECKA 16 TEST: MÅNDAG —",
        "Latsdrag eller chins: 3 x 6",
        "Sittande rodd: 3 x 6",
        "Rack pulls: 3 x 6",
        "Hängande benlyft: 3 x 6",
        "Test: max chins",
      ];
    }

    if (type === "bröst-biceps") {
      return [
        "— VECKA 16 TEST: TISDAG —",
        "Lutande hantelpress: 3 x 6",
        "Militärpress: 3 x 6",
        "Dips: 3 x 6",
        "EZ-stångscurl: 3 x 6",
        "Test: 500 m rodd (tid)",
      ];
    }

    if (type === "quads") {
      return [
        "— VECKA 16 TEST: ONSDAG —",
        "Knäböj: 3 x 6",
        "Gångutfall: 3 x 6 steg per ben",
        "Benspark: 3 x 6",
        "Dragonflyes: 3 x 6",
        "Test: farmers walk max distans utan släpp",
      ];
    }

    if (type === "axlar-core") {
      return [
        "— VECKA 16 TEST: TORSDAG —",
        "Stående sidolyft: 3 x 6",
        "Rear delt flyes: 3 x 6",
        "Farmers walk: 3 längder",
        "Plankan: 3 x 60 sek",
        "Test: burpees 10 minuter totalt",
      ];
    }

    if (type === "hamstrings-armar") {
      return [
        "— VECKA 16 TEST: FREDAG —",
        "Rumänska marklyft (RDL): 3 x 6",
        "Liggande bencurl: 3 x 6",
        "Hip thrusts: 3 x 6",
        "Triceps overhead: 3 x 6",
        "Test: 5 km gång/löpning (valfritt)",
        "Avslut: lång powerwalk/ruck plus lätt helkroppscirkel",
      ];
    }
  }

  if (type === "rygg-vader") {
    const burpeeMinutes = stage === "fas1" ? 5 : stage === "fas2" ? 6 : 7;
    return [
      "— MÅNDAG: Drag & bål —",
      `Latsdrag eller chins: 6 x 6 | ${restStandard} vila`,
      `Sittande rodd: 6 x 6 | ${restStandard} vila`,
      `Rack pulls: 4 x 6 | ${restHeavy} vila`,
      `Hängande benlyft: 6 x 6 | ${restStandard} vila`,
      `Finisher: ${burpeeMinutes} minuter burpees (max antal)`,
    ];
  }

  if (type === "bröst-biceps") {
    return [
      "— TISDAG: Press & armar —",
      `Lutande hantelpress: 6 x 6 | ${restStandard} vila`,
      `Militärpress: 6 x 6 | ${restStandard} vila`,
      `Dips: 6 x 6 | ${restStandard} vila (varannan vecka superset med chins)`,
      `EZ-stångscurl: 6 x 6 | ${restStandard} vila`,
      "Finisher: armhävningar 3 set till total failure",
    ];
  }

  if (type === "quads") {
    const legFinisher = stage === "fas3" || stage === "fas4"
      ? "Finisher: 2 rundor 500 m maxrodd eller 2 min löpband på maxlutning/tempo"
      : stage === "fas2"
        ? "Finisher: 500 m maxrodd eller 2 min löpband, öka tempot 10-15 %"
        : "Finisher: 500 m maxrodd eller 2 min löpband på maxlutning/tempo";

    return [
      "— ONSDAG: Underkropp —",
      `Knäböj (prioritera fri stång): 6 x 6 | ${restHeavy} vila`,
      `Gångutfall: 6 x 6 steg per ben | ${restStandard} vila`,
      `Benspark: 4 x 6 | ${restStandard} vila`,
      `Dragonflyes: 6 x 6 | ${restStandard} vila`,
      legFinisher,
    ];
  }

  if (type === "axlar-core") {
    const climberSets = stage === "fas1" || stage === "fas2" ? "4 x 45 sek" : "5 x 45 sek";
    return [
      "— TORSDAG: Axlar & stabilitet (112DIB-special) —",
      `Stående sidolyft: 6 x 6 | ${restStandard} vila`,
      `Rear delt flyes: 6 x 6 | ${restStandard} vila`,
      "Farmers walk: 6 längder (så tungt att greppet utmanas)",
      `Plankan: 6 set x 1 minut | ${restStandard} vila`,
      `Finisher: mountain climbers ${climberSets}`,
    ];
  }

  if (type === "hamstrings-armar") {
    const swings = stage === "fas1" ? "4 x 20" : "5 x 20";
    return [
      "— FREDAG: Bakre kedjan & puls —",
      `Rumänska marklyft (RDL): 6 x 6 | ${restHeavy} vila`,
      `Liggande bencurl: 6 x 6 | ${restStandard} vila`,
      `Hip thrusts: 6 x 6 | ${restStandard} vila`,
      `Triceps overhead (eller sled push/assault bike): 6 x 6 | ${restStandard} vila`,
      `Finisher: kettlebell-svingar ${swings}`,
    ];
  }

  if (type === "aktiv-recovery") {
    return [
      "Powerwalk: 60 min i lugnt tempo.",
      "— AKTIV ÅTERHÄMTNING (LÖRDAG) —",
      "Ingen styrketräning i dag.",
      "Lugn cykel eller crosstrainer: 25-35 min i lugnt tempo",
      "Rörlighet 20 min: höft, axlar, bröstrygg och vader",
    ];
  }

  return [
    "— VILODAG (SÖNDAG) —",
    "Ingen styrketräning.",
    "Aktiv återhämtning: 30-40 min lugn promenad utomhus",
    "Rörlighet eller yoga 20 min",
    "Prioritera sömn 7-9 timmar",
  ];
}

function getDailyMeals(dayIndex) {
  const breakfastKey = state.auth.profile?.breakfastKey || breakfasts[0].key;
  const selectedBreakfast = breakfasts.find((item) => item.key === breakfastKey) || breakfasts[0];
  const lunchMeal = lunches[(dayIndex + 1) % lunches.length];

  return {
    breakfast: selectedBreakfast,
    lunch: lunchMeal,
    snack: snacks[(dayIndex + 3) % snacks.length],
  };
}

function buildTrainingHome(type, phase, week) {
  const stage = getTrainingStage(week);
  const { restStandard, restHeavy } = getRestRules(stage);

  if (stage === "test") {
    if (type === "rygg-vader") {
      return [
        "— HEMMA TESTVECKA: MÅNDAG —",
        "Pull-ups/chins eller bandchins: 3 x 6",
        "Enarmsrodd med hantel: 3 x 6 per arm",
        "Rack pull-variant med hantlar: 3 x 6",
        "Hängande benlyft: 3 x 6",
        "Test: max chins/pull-ups",
      ];
    }
    if (type === "bröst-biceps") {
      return [
        "— HEMMA TESTVECKA: TISDAG —",
        "Lutande hantelpress: 3 x 6",
        "Militärpress hantlar: 3 x 6",
        "Dips mellan stolar/bankar: 3 x 6",
        "EZ-ersättning: hantelcurl strikt: 3 x 6",
        "Test: 500 m rodd eller 2 min max assault bike/löpning",
      ];
    }
    if (type === "quads") {
      return [
        "— HEMMA TESTVECKA: ONSDAG —",
        "Goblet squat: 3 x 6",
        "Gångutfall: 3 x 6 steg per ben",
        "Benspark bodyweight/band: 3 x 6",
        "Dragonflyes: 3 x 6",
        "Test: farmers walk max distans utan släpp",
      ];
    }
    if (type === "axlar-core") {
      return [
        "— HEMMA TESTVECKA: TORSDAG —",
        "Stående sidolyft: 3 x 6",
        "Rear delt flyes: 3 x 6",
        "Farmers walk: 3 längder",
        "Plankan: 3 x 60 sek",
        "Test: burpees 10 minuter totalt",
      ];
    }
    if (type === "hamstrings-armar") {
      return [
        "— HEMMA TESTVECKA: FREDAG —",
        "RDL med hantlar: 3 x 6",
        "Liggande bencurl med band/handduk: 3 x 6",
        "Hip thrust: 3 x 6",
        "Triceps overhead med hantel: 3 x 6",
        "Test: 5 km gång/löpning (valfritt)",
      ];
    }
  }

  if (type === "rygg-vader") {
    const burpeeMinutes = stage === "fas1" ? 5 : stage === "fas2" ? 6 : 7;
    return [
      "— HEMMA MÅNDAG: Drag & bål —",
      `Pull-ups/chins eller bandchins: 6 x 6 | ${restStandard} vila`,
      `Sittande rodd med band eller hantelrodd: 6 x 6 | ${restStandard} vila`,
      `Rack pull-variant med hantlar: 4 x 6 | ${restHeavy} vila`,
      `Hängande benlyft eller liggande benlyft: 6 x 6 | ${restStandard} vila`,
      `Finisher: ${burpeeMinutes} minuter burpees (max antal)`,
    ];
  }

  if (type === "bröst-biceps") {
    return [
      "— HEMMA TISDAG: Press & armar —",
      `Lutande hantelpress: 6 x 6 | ${restStandard} vila`,
      `Militärpress hantlar: 6 x 6 | ${restStandard} vila`,
      `Dips mellan stolar/bankar: 6 x 6 | ${restStandard} vila (varannan vecka superset med chins)`,
      `Hantelcurl strikt: 6 x 6 | ${restStandard} vila`,
      "Finisher: armhävningar 3 set till total failure",
    ];
  }

  if (type === "quads") {
    const legFinisher = stage === "fas3" || stage === "fas4"
      ? "Finisher: 2 rundor 500 m maxrodd eller 2 min löpband på maxlutning/tempo"
      : stage === "fas2"
        ? "Finisher: 500 m maxrodd/löpband, öka tempot 10-15 %"
        : "Finisher: 500 m maxrodd eller 2 min löpband på maxlutning/tempo";

    return [
      "— HEMMA ONSDAG: Underkropp —",
      `Goblet squat: 6 x 6 | ${restHeavy} vila`,
      `Gångutfall: 6 x 6 steg per ben | ${restStandard} vila`,
      `Benspark bodyweight/band: 4 x 6 | ${restStandard} vila`,
      `Dragonflyes: 6 x 6 | ${restStandard} vila`,
      legFinisher,
    ];
  }

  if (type === "axlar-core") {
    const climberSets = stage === "fas1" || stage === "fas2" ? "4 x 45 sek" : "5 x 45 sek";
    return [
      "— HEMMA TORSDAG: Axlar & stabilitet —",
      `Stående sidolyft: 6 x 6 | ${restStandard} vila`,
      `Rear delt flyes: 6 x 6 | ${restStandard} vila`,
      "Farmers walk: 6 längder med tung vikt",
      `Plankan: 6 set x 1 minut | ${restStandard} vila`,
      `Finisher: mountain climbers ${climberSets}`,
    ];
  }

  if (type === "hamstrings-armar") {
    const swings = stage === "fas1" ? "4 x 20" : "5 x 20";
    return [
      "— HEMMA FREDAG: Bakre kedjan & puls —",
      `RDL med hantlar: 6 x 6 | ${restHeavy} vila`,
      `Liggande bencurl med band/handduk: 6 x 6 | ${restStandard} vila`,
      `Hip thrust: 6 x 6 | ${restStandard} vila`,
      `Triceps overhead med hantel (eller sled/assault bike om tillgång finns): 6 x 6 | ${restStandard} vila`,
      `Finisher: kettlebell-svingar ${swings}`,
    ];
  }

  if (type === "aktiv-recovery") {
    return [
      "Powerwalk: 60 min i lugnt tempo.",
      "— AKTIV ÅTERHÄMTNING (LÖRDAG) —",
      "Ingen styrketräning i dag.",
      "Lugn promenad eller lätt jogg: 25-35 min vid låg ansträngning",
      "Rörlighet 20 min: höft, axlar, bröstrygg och vader",
    ];
  }

  return [
    "— VILODAG (SÖNDAG) —",
    "Ingen styrketräning.",
    "Aktiv återhämtning: 30-40 min lugn promenad utomhus",
    "Rörlighet eller yoga 20 min",
    "Prioritera sömn 7-9 timmar",
  ];
}

function buildFood(dayIndex, workoutType, phase) {
  const meals = getDailyMeals(dayIndex);

  return {
    lines: [
      meals.breakfast.text,
      meals.lunch.text,
      meals.snack.text,
    ],
    mealKeys: [meals.breakfast.key, meals.lunch.key, meals.snack.key],
  };
}

function isLoggedIn() {
  return Boolean(state.auth.username && state.auth.token);
}

function persistAuth() {
  if (!isLoggedIn()) {
    clearRecipeOffsets();
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
  loadRecipeOffsets(user.recipeOffsets);

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

async function deleteWeeklyCheckin(weekIndex) {
  if (!isLoggedIn()) {
    dom.authStatus.textContent = "Logga in först.";
    return;
  }

  if (!Number.isFinite(Number(weekIndex))) {
    dom.authStatus.textContent = "Ogiltig vecka för radering.";
    return;
  }

  const confirmed = window.confirm(`Radera veckouppföljning för vecka ${weekIndex}?`);
  if (!confirmed) {
    return;
  }

  try {
    const result = await accountApi("deleteCheckin", {
      username: state.auth.username,
      token: state.auth.token,
      weekIndex: Number(weekIndex),
    });

    applyUserData(result.user || {});
    dom.authStatus.textContent = `Veckouppföljning för vecka ${weekIndex} raderad.`;
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
      const li = document.createElement("li");
      li.className = "checkin-item";

      const text = document.createElement("span");
      text.className = "checkin-item-text";
      text.textContent = `Vecka ${entry.weekIndex} (${entry.date}): ${entry.weightKg} kg, ${entry.waistCm} cm`;

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "btn btn-ghost checkin-delete-btn";
      deleteBtn.textContent = "Ta bort";
      deleteBtn.setAttribute("aria-label", `Radera uppföljning vecka ${entry.weekIndex}`);
      deleteBtn.addEventListener("click", () => deleteWeeklyCheckin(entry.weekIndex));

      li.append(text, deleteBtn);
      dom.checkinList.appendChild(li);
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

  // Structured ingredients (breakfast + snack) – summed across days.
  const structuredMap = new Map();
  // Recipe ingredients (lunch/dinner from catalog) – text strings, deduplicated.
  const recipeIngredients = new Set();
  const recipeSeasonings = new Set();
  const seenRecipes = new Set();

  for (let i = 0; i < spanDays; i += 1) {
    const currentDate = addDays(state.selectedDate, i);
    const dayIndex = diffDays(state.startDate, currentDate);

    if (dayIndex < 0 || dayIndex >= PROGRAM_DAYS) {
      continue;
    }

    const meals = getDailyMeals(dayIndex);

    // Breakfast and snack use structured ingredients that can be summed.
    [meals.breakfast, meals.snack].forEach((meal) => {
      if (!meal) return;
      meal.ingredients.forEach((ingredient) => {
        const mapKey = `${ingredient.name}|${ingredient.unit}`;
        if (!structuredMap.has(mapKey)) {
          structuredMap.set(mapKey, { name: ingredient.name, unit: ingredient.unit, amount: 0 });
        }
        structuredMap.get(mapKey).amount += ingredient.amount;
      });
    });

    // Lunch/dinner: pull ingredients from catalog recipe for this day.
    const catalogEntry = getCatalogRecipeEntryForDay(meals.lunch.key, dayIndex);
    if (catalogEntry) {
      if (!seenRecipes.has(catalogEntry.title)) {
        seenRecipes.add(catalogEntry.title);
        (catalogEntry.transcript?.ingredients || []).forEach((s) => recipeIngredients.add(s));
        (catalogEntry.transcript?.seasoning || []).forEach((s) => recipeSeasonings.add(s));
      }
    } else {
      // Fallback: use generic lunch ingredients from meals array.
      meals.lunch.ingredients.forEach((ingredient) => {
        const mapKey = `${ingredient.name}|${ingredient.unit}`;
        if (!structuredMap.has(mapKey)) {
          structuredMap.set(mapKey, { name: ingredient.name, unit: ingredient.unit, amount: 0 });
        }
        structuredMap.get(mapKey).amount += ingredient.amount;
      });
    }
  }

  if (structuredMap.size === 0 && recipeIngredients.size === 0) {
    addListItem(
      dom.shoppingList,
      "Inga planerade programdagar i vald period. Flytta vald dag eller ändra period."
    );
    return;
  }

  // Render recipe ingredients first (most useful for meal prep).
  if (recipeIngredients.size > 0) {
    const recipeHeader = document.createElement("li");
    recipeHeader.style.cssText = "font-weight:700;color:var(--accent);list-style:none;margin-top:4px";
    recipeHeader.textContent = `Recept (${[...seenRecipes].join(", ")})`;
    dom.shoppingList.appendChild(recipeHeader);
    [...recipeIngredients].forEach((s) => addListItem(dom.shoppingList, s));
  }

  if (recipeSeasonings.size > 0) {
    const seasHeader = document.createElement("li");
    seasHeader.style.cssText = "font-weight:700;color:var(--accent);list-style:none;margin-top:6px";
    seasHeader.textContent = "Kryddor & örter";
    dom.shoppingList.appendChild(seasHeader);
    [...recipeSeasonings].forEach((s) => addListItem(dom.shoppingList, s));
  }

  if (structuredMap.size > 0) {
    const otherHeader = document.createElement("li");
    otherHeader.style.cssText = "font-weight:700;color:var(--accent);list-style:none;margin-top:6px";
    otherHeader.textContent = "Frukost & mellanmål";
    dom.shoppingList.appendChild(otherHeader);
    const sorted = [...structuredMap.values()].sort((a, b) => a.name.localeCompare(b.name, "sv"));
    sorted.forEach((item) => {
      const rounded = Number.isInteger(item.amount) ? item.amount : item.amount.toFixed(1);
      addListItem(dom.shoppingList, `${item.name}: ca ${rounded} ${item.unit}`);
    });
  }
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
