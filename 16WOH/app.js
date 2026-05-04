const STORAGE_KEY = "wohStartDate";
const PROGRAM_DAYS = 112;
const weekdayNames = ["Mån", "Tis", "Ons", "Tor", "Fre", "Lör", "Sön"];

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
};

const dom = {
  startDate: document.getElementById("startDate"),
  saveStart: document.getElementById("saveStart"),
  clearStart: document.getElementById("clearStart"),
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
  focusList: document.getElementById("focusList"),
  exportWeekPdf: document.getElementById("exportWeekPdf"),
  shoppingDays: document.getElementById("shoppingDays"),
  generateShopping: document.getElementById("generateShopping"),
  shoppingInfo: document.getElementById("shoppingInfo"),
  shoppingList: document.getElementById("shoppingList"),
};

init();

function init() {
  renderWeekdays();
  bindEvents();

  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    const parsed = parseDateInput(saved);
    if (parsed) {
      state.startDate = parsed;
      state.currentMonth = firstDayOfMonth(parsed);
      dom.startDate.value = saved;
      const today = stripTime(new Date());
      state.selectedDate = isBetweenProgramDates(today) ? today : stripTime(parsed);
    }
  }

  renderAll();
}

function bindEvents() {
  dom.saveStart.addEventListener("click", () => {
    const raw = dom.startDate.value;
    const picked = parseDateInput(raw);

    if (!picked) {
      dom.startInfo.textContent = "Välj ett giltigt datum för att starta.";
      return;
    }

    state.startDate = picked;
    state.currentMonth = firstDayOfMonth(picked);
    state.selectedDate = stripTime(picked);
    localStorage.setItem(STORAGE_KEY, formatDateInput(picked));
    renderAll();
  });

  dom.clearStart.addEventListener("click", () => {
    state.startDate = null;
    state.currentMonth = firstDayOfMonth(new Date());
    state.selectedDate = stripTime(new Date());
    dom.startDate.value = "";
    localStorage.removeItem(STORAGE_KEY);
    renderAll();
  });

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
}

function renderAll() {
  renderStartInfo();
  renderCalendar();
  renderDetails();
  renderShoppingList();
}

function renderStartInfo() {
  if (!state.startDate) {
    dom.startInfo.textContent = "Ingen start vald ännu.";
    return;
  }

  const start = formatLongDate(state.startDate);
  const end = formatLongDate(addDays(state.startDate, PROGRAM_DAYS - 1));
  dom.startInfo.textContent = `Programperiod: ${start} till ${end}. Kostläge: normal.`;
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
      meta.textContent = `Dag ${dayIndex + 1}`;
    }
  }

  cell.append(dayNum, meta);
  cell.addEventListener("click", () => {
    state.selectedDate = date;
    renderCalendar();
    renderDetails();
    renderShoppingList();
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
    addListItem(dom.focusList, "Planera handling och meal prep för veckan.");
    return;
  }

  const dayIndex = diffDays(state.startDate, state.selectedDate);
  dom.detailsTitle.textContent = formatLongDate(state.selectedDate);

  if (dayIndex < 0) {
    dom.detailsSubtitle.textContent = "Programmet har inte startat denna dag.";
    addListItem(dom.trainingList, "Vila eller valfri lätt promenad.");
    addListItem(dom.foodList, "Förbered matlådor och inköpslista.");
    addListItem(dom.focusList, "Sov 7-8 timmar och planera starten.");
    return;
  }

  if (dayIndex >= PROGRAM_DAYS) {
    dom.detailsSubtitle.textContent = "16 veckor är genomförda. Bra jobbat!";
    addListItem(dom.trainingList, "Återhämtning eller fortsättningsprogram.");
    addListItem(dom.foodList, "Behåll dina basrutiner med hög proteinnivå.");
    addListItem(dom.focusList, "Utvärdera resultat och sätt nya mål.");
    return;
  }

  const plan = getDailyPlan(dayIndex, state.selectedDate);
  dom.detailsSubtitle.textContent = `Vecka ${plan.week} av 16 · Dag ${dayIndex + 1}`;
  plan.training.forEach((entry) => addListItem(dom.trainingList, entry));
  plan.food.forEach((entry) => addListItem(dom.foodList, entry));
  plan.focus.forEach((entry) => addListItem(dom.focusList, entry));
}

function getDailyPlan(dayIndex, date) {
  const week = Math.floor(dayIndex / 7) + 1;
  const dayInWeek = dayIndex % 7;
  const phase = getPhase(week);

  const programByDay = [
    "styrka-a",
    "intervaller",
    "styrka-b",
    "lång-promenad",
    "styrka-c",
    "kondition",
    "återhämtning",
  ];

  const workoutType = programByDay[dayInWeek];
  const training = buildTraining(workoutType, phase, week);
  const foodPlan = buildFood(dayIndex, workoutType, phase);
  const focus = buildFocus(week, date, workoutType, phase);

  return {
    week,
    training,
    food: foodPlan.lines,
    mealKeys: foodPlan.mealKeys,
    focus,
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

function buildTraining(type, phase, week) {
  const walkByPhase = {
    grund: "45-60 min power walk",
    bygg: "60 min power walk",
    press: "60-75 min power walk",
    final: "75 min power walk",
  };

  if (type === "styrka-a") {
    return [
      `${walkByPhase[phase]} direkt på morgonen, gärna fastande`,
      "Styrka A (gym): benpress, utfall, bröstpress, rodd, plankor (45-55 min)",
      "Styrka A (hemma): goblet squats, utfall, armhävningar, gummibandsrodd, plankor (45-55 min)",
      "Avsluta med 10 min rörlighet för höft och bröstrygg",
    ];
  }

  if (type === "styrka-b") {
    return [
      `${walkByPhase[phase]} direkt på morgonen, gärna fastande`,
      "Styrka B (gym): marklyftvariant, axelpress, latsdrag, split squats, core (45-55 min)",
      "Styrka B (hemma): rumänska marklyft med hantlar, axelpress, gummibandsdrag, split squats, core (45-55 min)",
      phase === "press" || phase === "final"
        ? "Lägg till 10 min intervallcykel (gym) eller intervallhopp/step-ups (hemma)"
        : "Lugn nedvarvning 8-10 min",
    ];
  }

  if (type === "styrka-c") {
    return [
      `${walkByPhase[phase]} direkt på morgonen, gärna fastande`,
      "Styrka C (gym/hemma): helkroppscirkel 5 varv, 8-12 reps per övning",
      week % 2 === 0
        ? "Avsluta med farmers walk 6 x 40 meter (gym) eller tung bärning med hantlar/ryggsäck (hemma)"
        : "Avsluta med sled push/trappmaskin (gym) eller trappintervaller (hemma) 12 min",
    ];
  }

  if (type === "intervaller") {
    return [
      `${walkByPhase[phase]} direkt på morgonen, gärna fastande`,
      phase === "grund"
        ? "Intervaller (gym/ute/hemma): 8 x 30 sek snabbt / 90 sek lugnt"
        : "Intervaller (gym/ute/hemma): 10-12 x 40 sek snabbt / 80 sek lugnt",
      "10 min rörlighet och andningsfokus",
    ];
  }

  if (type === "lång-promenad") {
    return [
      "Långpromenad direkt på morgonen, gärna fastande",
      phase === "grund" ? "75 min rask promenad" : "90 min rask promenad",
      "Lätt cirkulation: 15 min stretch + minibandsövningar",
      "Stegmålsfokus: minst 12 000 steg",
    ];
  }

  if (type === "kondition") {
    return [
      `${walkByPhase[phase]} direkt på morgonen, gärna fastande`,
      phase === "grund"
        ? "Konditionsblock 30 min i prattempo (rodd/cykel/löpning eller hemmacykel)"
        : "Konditionsblock 35-45 min i varierat tempo (gymmaskin eller utepass)",
      "Core: dead bug, sidoplanka, hollow hold (3 varv)",
    ];
  }

  return [
    "Aktiv återhämtning: 30-40 min lugn promenad",
    "20 min rörlighet eller yoga",
    "Valfri lätt massage/foam rolling 10 min",
  ];
}

function getDailyMeals(dayIndex) {
  return {
    breakfast: breakfasts[dayIndex % breakfasts.length],
    lunch: lunches[(dayIndex + 1) % lunches.length],
    dinner: dinners[(dayIndex + 2) % dinners.length],
    snack: snacks[(dayIndex + 3) % snacks.length],
  };
}

function buildFood(dayIndex, workoutType, phase) {
  const meals = getDailyMeals(dayIndex);
  const trainingDay = workoutType !== "återhämtning";

  const carbRule = trainingDay
    ? "Kolhydrater: 1-2 kupade händer till lunch och middag"
    : "Kolhydrater: 0.5-1 kupad hand till lunch, fokus på grönsaker till middag";

  const hydration =
    phase === "final"
      ? "Vätska: 3.0-3.5 liter vatten + elektrolyter"
      : "Vätska: minst 2.5-3.0 liter vatten";

  return {
    lines: [
      meals.breakfast.text,
      meals.lunch.text,
      meals.dinner.text,
      meals.snack.text,
      carbRule,
      hydration,
      "Basregler: hög proteinmängd, minimera socker och alkohol (normal kost)",
    ],
    mealKeys: [meals.breakfast.key, meals.lunch.key, meals.dinner.key, meals.snack.key],
  };
}

function buildFocus(week, date, workoutType, phase) {
  const weekday = new Intl.DateTimeFormat("sv-SE", { weekday: "long" }).format(date);
  const focus = [
    `Dagens fokus (${weekday}): håll måltiderna jämna och planerade`,
    "Meal prep: laga minst 2 mål extra till nästa dag",
    "Sömn: sikta på 7.5+ timmar inatt",
    "Inga exakta klockslag behövs, följ ordningen morgon -> pass -> måltider",
  ];

  if (workoutType === "återhämtning") {
    focus.push("Återhämtning: prioritera rörlighet och stressreducering");
  }

  if (phase === "final") {
    focus.push("Finalfas: var extra noga med teknik och återhämtning");
  }

  if (week % 4 === 0) {
    focus.push("Veckocheck: mät framsteg och justera inköpslista");
  }

  return focus;
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
      rows.push(renderPrintDay(date, ["Programmet har inte startat."], ["Förbered måltider och inköp."], ["Lätt aktivitet eller vila."]));
      continue;
    }

    if (dayIndex >= PROGRAM_DAYS) {
      rows.push(renderPrintDay(date, ["Programmet är klart."], ["Behåll normal kost och proteinfokus."], ["Sätt nästa mål."]));
      continue;
    }

    const plan = getDailyPlan(dayIndex, date);
    rows.push(renderPrintDay(date, plan.training, plan.food, plan.focus));
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
        <title>16WOH veckoplan</title>
        <style>
          body { font-family: Arial, sans-serif; color: #222; margin: 24px; }
          h1 { margin: 0 0 4px; }
          .meta { color: #555; margin: 0 0 16px; }
          .day { border: 1px solid #ddd; border-radius: 10px; padding: 12px; margin-bottom: 10px; }
          .day h2 { margin: 0 0 8px; font-size: 18px; }
          .row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
          h3 { margin: 0 0 6px; font-size: 14px; color: #0d6b60; }
          ul { margin: 0; padding-left: 16px; }
          li { margin-bottom: 4px; font-size: 12px; }
          @media print { .day { break-inside: avoid; } }
        </style>
      </head>
      <body>
        <h1>16WOH veckoplan</h1>
        <p class="meta">Period: ${formatShortDate(weekStart)} - ${formatShortDate(weekEnd)} | Kost: normal | Träning: gym + hemma</p>
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

function renderPrintDay(date, training, food, focus) {
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
          <ul>${food.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
        </section>
        <section>
          <h3>Fokus</h3>
          <ul>${focus.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
        </section>
      </div>
    </article>
  `;
}

function escapeHtml(text) {
  return text
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
  dom.focusList.innerHTML = "";
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
