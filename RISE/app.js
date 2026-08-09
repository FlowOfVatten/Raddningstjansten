/* -- RISE Login ------------------------------------------------ */
const API_BASE = '/api/rise-login';

const loginOverlay   = document.getElementById('loginOverlay');
const appMain        = document.getElementById('appMain');
const loginStep      = document.getElementById('loginStep');
const passwordStep   = document.getElementById('passwordStep');
const setPasswordStep= document.getElementById('setPasswordStep');
const loginUsername  = document.getElementById('loginUsername');
const loginPassword  = document.getElementById('loginPassword');
const newPassword    = document.getElementById('newPassword');
const confirmPassword= document.getElementById('confirmPassword');
const loginError     = document.getElementById('loginError');
const passwordError  = document.getElementById('passwordError');
const setPasswordError=document.getElementById('setPasswordError');

let _loginUsername = '';
let _sessionToken  = '';

const LEGACY_UNIT_TO_IMAGE = {
  Yellow: 'archer',
  Green: 'goblin',
  Blue: 'ice',
  Red: 'fire',
  image0: 'archer',
  image1: 'goblin',
  image2: 'ice',
  image3: 'fire'
};

function normalizeUnitValue(rawUnit) {
  if (!rawUnit) return '';
  if (LEGACY_UNIT_TO_IMAGE[rawUnit]) return LEGACY_UNIT_TO_IMAGE[rawUnit];
  if (/^(archer|goblin|ice|fire)$/.test(rawUnit)) return rawUnit;
  return '';
}

function getTroopUnit(troopId) {
  const active = document.querySelector(`.troop-unit-picker[data-troop="${troopId}"] .unit-option-btn.active`);
  return active ? active.dataset.unit : '';
}

function setTroopUnit(troopId, unitValue) {
  const normalized = normalizeUnitValue(unitValue);
  const options = document.querySelectorAll(`.troop-unit-picker[data-troop="${troopId}"] .unit-option-btn`);
  options.forEach(btn => {
    const isActive = normalized && btn.dataset.unit === normalized;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });
}

function showLoginError(el, msg) { el.textContent = msg; el.hidden = false; }
function clearLoginError(el) { el.hidden = true; }

async function riseApi(body) {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function onLoginSuccess(token, isAdmin) {
  _sessionToken = token;
  loginOverlay.remove();
  appMain.style.display = '';
  document.getElementById('welcomeMsg').textContent =
    `Welcome ${_loginUsername}, a proud member of RISE.`;
  if (isAdmin && window._riseShowAdminBtn) window._riseShowAdminBtn();
  await loadTroopsFromDB();
}

// -- Load saved troops from DB --
async function loadTroopsFromDB() {
  try {
    const data = await riseApi({ action: 'loadTroops', username: _loginUsername, token: _sessionToken });
    if (!data.troops) return;
    Object.entries(data.troops).forEach(([t, troop]) => {
      const powerEl = document.querySelector(`.troop-power-input[data-troop="${t}"]`);
      if (powerEl && troop.power !== undefined) powerEl.value = troop.power;
      if (troop.unit !== undefined) setTroopUnit(t, troop.unit);
    });
    recalcTotal();
  } catch { /* non-critical, ignore */ }
}

// -- Auto-save troops to DB (debounced 1.5s) --
let _saveTimer = null;
function scheduleSave() {
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(saveTroopsToDB, 1500);
}

async function saveTroopsToDB() {
  if (!_sessionToken) return;
  const troops = {};
  document.querySelectorAll('.troop-power-input').forEach(input => {
    const t = input.dataset.troop;
    troops[t] = { power: input.value, unit: getTroopUnit(t) };
  });
  try {
    await riseApi({ action: 'saveTroops', username: _loginUsername, token: _sessionToken, troops });
  } catch { /* non-critical */ }
}

document.getElementById('loginNextBtn').addEventListener('click', async () => {
  clearLoginError(loginError);
  const username = loginUsername.value.trim();
  if (!username) { showLoginError(loginError, 'Please enter your username.'); return; }
  try {
    const data = await riseApi({ action: 'check', username });
    if (data.error) { showLoginError(loginError, data.error); return; }
    _loginUsername = username;
    if (data.mustChangePassword) { loginStep.hidden = true; setPasswordStep.hidden = false; }
    else { loginStep.hidden = true; passwordStep.hidden = false; loginPassword.focus(); }
  } catch { showLoginError(loginError, 'Could not reach the server. Please try again.'); }
});

loginUsername.addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('loginNextBtn').click(); });

document.getElementById('loginSubmitBtn').addEventListener('click', async () => {
  clearLoginError(passwordError);
  const password = loginPassword.value;
  if (!password) { showLoginError(passwordError, 'Please enter your password.'); return; }
  try {
    const data = await riseApi({ action: 'login', username: _loginUsername, password });
    if (data.error) { showLoginError(passwordError, data.error); return; }
    if (data.mustChangePassword) { passwordStep.hidden = true; setPasswordStep.hidden = false; return; }
    await onLoginSuccess(data.token, data.isAdmin);
  } catch { showLoginError(passwordError, 'Could not reach the server. Please try again.'); }
});

loginPassword.addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('loginSubmitBtn').click(); });

document.getElementById('setPasswordBtn').addEventListener('click', async () => {
  clearLoginError(setPasswordError);
  const pw = newPassword.value, pw2 = confirmPassword.value;
  if (pw.length < 8) { showLoginError(setPasswordError, 'Password must be at least 8 characters.'); return; }
  if (pw !== pw2)    { showLoginError(setPasswordError, 'Passwords do not match.'); return; }
  try {
    const data = await riseApi({ action: 'setPassword', username: _loginUsername, newPassword: pw });
    if (data.error) { showLoginError(setPasswordError, data.error); return; }
    await onLoginSuccess(data.token, data.isAdmin);
  } catch { showLoginError(setPasswordError, 'Could not reach the server. Please try again.'); }
});
/* -------------------------------------------------------------- */

/* -- RISE Troop Manager ---------------------------------------- */
function recalcTotal() {
  let total = 0;
  document.querySelectorAll('.troop-power-input').forEach(input => {
    const v = parseFloat(input.value);
    if (!isNaN(v) && v > 0) total += v;
  });
  document.getElementById('totalPowerDisplay').textContent = total.toLocaleString('en-US');
}

document.querySelectorAll('.troop-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    const t = btn.dataset.troop;
    document.querySelectorAll('.troop-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.troop-panel').forEach(p => { p.hidden = p.dataset.troop !== t; });
  });
});

document.querySelectorAll('.troop-power-input').forEach(input => {
  input.addEventListener('input', () => { recalcTotal(); scheduleSave(); });
});

document.querySelectorAll('.unit-option-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const troopId = btn.closest('.troop-unit-picker')?.dataset.troop;
    if (!troopId) return;
    setTroopUnit(troopId, btn.dataset.unit);
    scheduleSave();
  });
});
/* -------------------------------------------------------------- */
const imageInput = document.getElementById("imageInput");
const useSampleBtn = document.getElementById("useSampleBtn");
const analyzeBtn = document.getElementById("analyzeBtn");
const preview = document.getElementById("preview");
const statusEl = document.getElementById("status");
const progressBar = document.getElementById("progressBar");

const resultsEmpty = document.getElementById("resultsEmpty");
const results = document.getElementById("results");
const nameValue = document.getElementById("nameValue");
const powerValue = document.getElementById("powerValue");
const troopsGrid = document.getElementById("troopsGrid");

const SAMPLE_IMAGE = "original-C26D3549-8172-4216-B32C-F306D3176885.jpeg";
let selectedImageSrc = "";
let selectedImageName = "";

const TESSERACT_SOURCES = [
  "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js",
  "https://unpkg.com/tesseract.js@5/dist/tesseract.min.js"
];


function setStatus(text) {
  statusEl.textContent = text;
}

function setProgress(value) {
  const v = Math.max(0, Math.min(100, value));
  progressBar.style.width = `${v}%`;
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error(`Kunde inte ladda: ${src}`));
    document.head.appendChild(script);
  });
}

async function ensureTesseractLoaded() {
  if (window.Tesseract) {
    return true;
  }

  for (const src of TESSERACT_SOURCES) {
    try {
      await loadScript(src);
      if (window.Tesseract) {
        return true;
      }
    } catch {
      // Try next CDN source.
    }
  }

  return false;
}

function showResults(data) {
  resultsEmpty.hidden = true;
  results.hidden = false;

  nameValue.textContent = data.name || "Kunde inte lÃ¤sa namn";
  powerValue.textContent = data.power || "Kunde inte lÃ¤sa power";

  troopsGrid.innerHTML = "";
  if (!data.troops.length) {
    const emptyItem = document.createElement("div");
    emptyItem.className = "troop-item";
    emptyItem.textContent = "Inga trupper hittades.";
    troopsGrid.appendChild(emptyItem);
    return;
  }

  data.troops.forEach((troop) => {
    const item = document.createElement("div");
    item.className = "troop-item";
    item.innerHTML = `<strong>Troop ${troop.number}</strong><span>${troop.value}</span>`;
    troopsGrid.appendChild(item);
  });
}

function formatDigits(digits) {
  const clean = digits.replace(/^0+(?=\d)/, "");
  if (!clean) {
    return "";
  }

  return clean.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function sanitizeDigits(rawValue, keepLastDigits = 0) {
  let digits = rawValue.replace(/[^0-9]/g, "");
  if (!digits) {
    return "";
  }

  if (keepLastDigits > 0 && digits.length > keepLastDigits) {
    digits = digits.slice(-keepLastDigits);
  }

  return digits;
}

function sanitizeWithOcrFixes(rawValue) {
  return (rawValue || "")
    .replace(/[Oo]/g, "0")
    .replace(/[Il]/g, "1");
}

function normalizeName(rawName) {
  if (!rawName) {
    return "";
  }

  let name = rawName
    .replace(/[|!]/g, "I")
    .replace(/[^A-Za-z0-9]/g, "");

  // This game font renders uppercase T as "il" or "ll" in OCR output.
  // Replace any "il" or "ll" that appears mid-word between uppercase-style contexts.
  name = name.replace(/([A-Z][a-z]+)(?:il|ll)([a-z]+)/g, (_, pre, post) => pre + "T" + post);

  return name;
}

function getBestNameFromLines(lines) {
  const skipWords = new Set([
    "STATS",
    "POWER",
    "POWERDETAILS",
    "STAGE",
    "IMPROVE",
    "GETSTRONGER",
    "TROOP"
  ]);

  for (const line of lines) {
    const cleaned = normalizeName(line);
    if (cleaned.length < 4 || /\d/.test(cleaned)) {
      continue;
    }

    if (!skipWords.has(cleaned.toUpperCase())) {
      return cleaned;
    }
  }

  return "";
}

const NAME_CROP_VARIANTS = [
  // Original screenshots: name sits in middle-left of stats panel.
  { x: 0.24, y: 0.24, w: 0.36, h: 0.08, scale: 4 },
  { x: 0.15, y: 0.16, w: 0.45, h: 0.12, scale: 4 },
  { x: 0.22, y: 0.22, w: 0.35, h: 0.09, scale: 5 },
  // Portrait-style screenshots: name sits to the right of the portrait icon.
  { x: 0.22, y: 0.27, w: 0.55, h: 0.09, scale: 4 },
  { x: 0.20, y: 0.25, w: 0.58, h: 0.11, scale: 4 },
  { x: 0.22, y: 0.30, w: 0.52, h: 0.09, scale: 4 }
];

const NAME_FILTERS = [
  "grayscale(100%) contrast(250%) brightness(120%)",
  "grayscale(100%) contrast(340%) brightness(140%)",
  "contrast(250%) saturate(0%) brightness(150%)"
];

function scoreNameCandidate(name) {
  if (!name || /\d/.test(name)) {
    return -100;
  }

  const upper = name.toUpperCase();
  const disallow = new Set([
    "STATS",
    "POWER",
    "DETAILS",
    "TROOP",
    "STAGE",
    "IMPROVE",
    "GET",
    "STRONGER"
  ]);

  if (disallow.has(upper)) {
    return -100;
  }

  let score = 0;
  if (name.length >= 5 && name.length <= 10) {
    score += 4;
  } else if (name.length >= 4 && name.length <= 14) {
    score += 2;
  }

  // Require at least 4 chars for the "clean word" bonus.
  if (name.length >= 4 && /^[A-Z][a-z]+$/.test(name)) {
    score += 4;
  }

  // Extra bonus for CamelCase names (e.g. NightBane, BiggTazz).
  if (/^[A-Z][a-z]+[A-Z][a-z]+/.test(name)) {
    score += 3;
  }

  if (/^[A-Za-z]+$/.test(name)) {
    score += 2;
  }

  if (!/[AEIOUYaeiouy]/.test(name)) {
    score -= 2;
  }

  if (/(.)\1\1/.test(name)) {
    score -= 2;
  }

  return score;
}

function pickBestName(candidates) {
  if (!candidates.length) {
    return "";
  }

  const unique = [...new Set(candidates.map((candidate) => normalizeName(candidate)).filter(Boolean))];
  unique.sort((a, b) => {
    const scoreDiff = scoreNameCandidate(b) - scoreNameCandidate(a);
    if (scoreDiff !== 0) {
      return scoreDiff;
    }

    if (a.length !== b.length) {
      return a.length - b.length;
    }

    return a.localeCompare(b);
  });

  return unique[0] || "";
}

function sumDigits(values) {
  if (!values.length) {
    return "";
  }

  const total = values.reduce((acc, value) => acc + BigInt(value), 0n);
  return String(total);
}

function findHeaderPowerDigits(text) {
  const headerText = text.split(/TROOP/i)[0] || text;
  const numberCandidates = headerText.match(/[0-9][0-9\s,\.\/'`]{10,}/g) || [];
  const normalized = numberCandidates
    .map((candidate) => sanitizeDigits(candidate, 14))
    .filter(Boolean);

  if (!normalized.length) {
    return "";
  }

  return normalized.reduce((maxValue, currentValue) => {
    if (!maxValue) {
      return currentValue;
    }

    return BigInt(currentValue) > BigInt(maxValue) ? currentValue : maxValue;
  }, "");
}

function splitToTripletGroups(token) {
  if (!token) {
    return [];
  }

  if (token.length <= 3) {
    return [token];
  }

  const groups = [];
  let firstSize = token.length % 3;
  if (firstSize === 0) {
    firstSize = 3;
  }

  groups.push(token.slice(0, firstSize));
  for (let i = firstSize; i < token.length; i += 3) {
    groups.push(token.slice(i, i + 3));
  }

  return groups.filter(Boolean);
}

function cleanCurrencyNoise(groups) {
  if (!groups.length) {
    return groups;
  }

  const cleaned = [...groups];

  if (["44", "344", "444"].includes(cleaned[0])) {
    cleaned.shift();
  }

  if (!cleaned.length) {
    return cleaned;
  }

  if (/^44\d{1,3}$/.test(cleaned[0])) {
    cleaned[0] = cleaned[0].slice(2);
  }

  if (/^344\d{1,3}$/.test(cleaned[0])) {
    cleaned[0] = cleaned[0].slice(3);
  }

  // Strip leading "41" OCR artifact (currency icon read as 41).
  if (/^41\d{1,3}$/.test(cleaned[0])) {
    cleaned[0] = cleaned[0].slice(2);
  }

  return cleaned.filter(Boolean);
}

function buildNumericCandidates(expandedGroups) {
  const candidates = [];

  for (let start = 0; start < expandedGroups.length; start += 1) {
    const sequence = expandedGroups.slice(start);
    if (!sequence.length) {
      continue;
    }

    if (sequence[0].length < 1 || sequence[0].length > 3) {
      continue;
    }

    const validTail = sequence.slice(1).every((group) => group.length === 3);
    if (!validTail) {
      continue;
    }

    const digits = sequence.join("");
    if (digits.length >= 12 && digits.length <= 14) {
      candidates.push(digits);
    }
  }

  return candidates;
}

function scoreNumericCandidate(digits) {
  let score = 0;
  if (digits.length === 14) {
    score += 4;
  } else if (digits.length === 13) {
    score += 3;
  } else if (digits.length === 12) {
    score += 1;
  }

  if (!digits.startsWith("0")) {
    score += 1;
  }

  return score;
}

function pickBestNumericValueFromRaw(rawValue) {
  const fixed = sanitizeWithOcrFixes(rawValue);
  const tokens = fixed.match(/\d+/g) || [];
  if (!tokens.length) {
    return "";
  }

  const cleanedTokens = cleanCurrencyNoise(tokens);
  const expanded = cleanedTokens.flatMap((token) => splitToTripletGroups(token));
  const candidates = buildNumericCandidates(expanded);

  if (!candidates.length) {
    return sanitizeDigits(fixed, 14);
  }

  candidates.sort((a, b) => {
    const scoreDiff = scoreNumericCandidate(b) - scoreNumericCandidate(a);
    if (scoreDiff !== 0) {
      return scoreDiff;
    }

    if (BigInt(b) > BigInt(a)) {
      return 1;
    }

    if (BigInt(b) < BigInt(a)) {
      return -1;
    }

    return 0;
  });

  return candidates[0];
}

function parseTroopMapFromText(text) {
  // Split into the label-pass (before ---VALUES---) and the digit-only pass (after).
  const [labelSection, valueSection = ""] = text.split("---VALUES---");

  // Extract digit-only values from the value-pass in order (top to bottom).
  // Accept 12-15 digit troop values.
  const digitOnlyValues = [];
  for (const line of valueSection.split("\n").map((l) => l.trim()).filter(Boolean)) {
    const v = pickBestNumericValueFromRaw(line);
    if (v && v.length >= 12 && v.length <= 15) {
      digitOnlyValues.push(v);
    }
  }

  const troopMap = new Map();
  const lines = labelSection
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  // Track which digit-only value index maps to which troop number (in encounter order).
  let digitOnlyIndex = 0;

  for (const line of lines) {
    let number = 0;
    let valueSlice = line;
    const lineMatch = line.match(/TROOPS?\s*([0-9]{1,2})/i);

    if (lineMatch) {
      number = Number(lineMatch[1]);
      if (number > 9) {
        number = Number(String(number).slice(-1));
      }

      const labelIndex = line.toUpperCase().indexOf(lineMatch[0].toUpperCase());
      const valueStart = labelIndex >= 0 ? labelIndex + lineMatch[0].length : 0;
      valueSlice = line.slice(valueStart);
    } else if (/TROOPS\b/i.test(line)) {
      // OCR confusion: "Troops" without number often means Troop 4 in these screenshots.
      number = 4;
      const marker = line.toUpperCase().indexOf("TROOPS");
      valueSlice = marker >= 0 ? line.slice(marker + "TROOPS".length) : line;
    } else {
      continue;
    }

    if (number < 1 || number > 5) {
      continue;
    }

    const existing = troopMap.get(number) || [];

    // Prefer the digit-only pass value for this position when available.
    if (digitOnlyIndex < digitOnlyValues.length) {
      existing.push(digitOnlyValues[digitOnlyIndex]);
      digitOnlyIndex += 1;
    }

    // Also add the value from the label-pass as a fallback candidate.
    const fallbackDigits = pickBestNumericValueFromRaw(valueSlice);
    if (fallbackDigits) {
      existing.push(fallbackDigits);
    }

    if (existing.length) {
      troopMap.set(number, existing);
    }
  }

  return troopMap;
}

function findTotalHeroPowerDigits(text) {
  const totalMatch = text.match(/TOTAL\s*HERO\s*POWER[^0-9]*([0-9][0-9\s,\.,]{6,})/i);
  if (!totalMatch) {
    return "";
  }

  return pickBestNumericValueFromRaw(totalMatch[1]);
}

function pickBestTroopValue(candidates) {
  if (!candidates?.length) {
    return "";
  }

  const unique = [...new Set(candidates)];

  const candidates13 = unique.filter((value) => value.length === 13);
  const hasLeading4Candidate14 = unique.some((value) => value.length === 14 && value.startsWith("4"));

  if (hasLeading4Candidate14 && candidates13.length) {
    candidates13.sort((a, b) => (BigInt(b) > BigInt(a) ? 1 : -1));
    return candidates13[0];
  }

  // Common OCR artifact: a leading "4" is sometimes prepended.
  for (const value of unique) {
    if (value.length === 14 && value.startsWith("4")) {
      const trimmed = value.slice(1);
      if (unique.includes(trimmed)) {
        return trimmed;
      }
    }
  }

  unique.sort((a, b) => {
    const scoreA = a.length === 14 ? 4 : a.length === 13 ? 3 : a.length === 12 ? 1 : 0;
    const scoreB = b.length === 14 ? 4 : b.length === 13 ? 3 : b.length === 12 ? 1 : 0;
    if (scoreA !== scoreB) {
      return scoreB - scoreA;
    }

    return BigInt(b) > BigInt(a) ? 1 : -1;
  });

  return unique[0] || "";
}

function mergeTroopCandidates(...maps) {
  const merged = new Map();

  maps.forEach((sourceMap) => {
    sourceMap.forEach((values, number) => {
      const current = merged.get(number) || [];
      merged.set(number, current.concat(values));
    });
  });

  const finalMap = new Map();
  merged.forEach((values, number) => {
    const best = pickBestTroopValue(values);
    if (best) {
      finalMap.set(number, best);
    }
  });

  return finalMap;
}

function parseFromText(rawText, croppedName = "", troopText = "") {
  const text = rawText
    .replace(/[|]/g, "I")
    .replace(/[â€œâ€]/g, '"')
    .replace(/\r/g, "\n");

  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  let name = normalizeName(croppedName);
  if (!name) {
    name = getBestNameFromLines(lines);
  }

  const fullTroops = parseTroopMapFromText(text);
  const cropTroops = parseTroopMapFromText(troopText);
  const troopMap = mergeTroopCandidates(fullTroops, cropTroops);

  // Keep rawTroopDigits sorted by troop number so index 0=Troop1 â€¦ 4=Troop5.
  const troopDigitValues = Array.from(troopMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([, v]) => v);
  const troopSumDigits = sumDigits(troopDigitValues);

  // Total power = sum of all 5 troops when available, otherwise fall back to OCR-read header.
  const powerDigits = troopMap.size >= 5
    ? troopSumDigits
    : (findTotalHeroPowerDigits(text) || findHeaderPowerDigits(text) || troopSumDigits);

  const troops = Array.from(troopMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([number, value]) => ({ number, value: formatDigits(value) }));

  const power = formatDigits(powerDigits);

  return { name, power, troops, rawTroopDigits: troopDigitValues };
}

function buildTroopCandidates(digits) {
  const set = new Set([digits]);

  // Leading 1 â†” 7.
  if (digits[0] === "1") set.add("7" + digits.slice(1));
  if (digits[0] === "7") set.add("1" + digits.slice(1));

  // Dropped leading digit (value one digit too short).
  if (digits.length === 12) {
    for (let d = 1; d <= 9; d++) set.add(String(d) + digits);
  }

  // Single 5 â†” 6 swap at every position, plus all pairs within same value.
  const fiveOrSixPos = [];
  for (let i = 0; i < digits.length; i++) {
    if (digits[i] === "5" || digits[i] === "6") {
      fiveOrSixPos.push(i);
      const sw = digits[i] === "5" ? "6" : "5";
      set.add(digits.slice(0, i) + sw + digits.slice(i + 1));
    }
  }
  for (let a = 0; a < fiveOrSixPos.length; a++) {
    for (let b = a + 1; b < fiveOrSixPos.length; b++) {
      const ia = fiveOrSixPos[a], ib = fiveOrSixPos[b];
      const swA = digits[ia] === "5" ? "6" : "5";
      const swB = digits[ib] === "5" ? "6" : "5";
      set.add(digits.slice(0, ia) + swA + digits.slice(ia + 1, ib) + swB + digits.slice(ib + 1));
    }
  }

  // Adjacent digit transposition at every position (catches 14â†”41, 17â†”71, etc.).
  for (let i = 0; i < digits.length - 1; i++) {
    if (digits[i] !== digits[i + 1]) {
      set.add(digits.slice(0, i) + digits[i + 1] + digits[i] + digits.slice(i + 2));
    }
  }

  return [...set];
}

function absBigIntDiff(a, b) {
  return a > b ? a - b : b - a;
}

function isAmbiguousDigitPair(a, b) {
  return (a === "1" && b === "7") ||
    (a === "7" && b === "1") ||
    (a === "5" && b === "6") ||
    (a === "6" && b === "5");
}

function isPlausibleTemplateCorrection(ocrVal, tmVal) {
  if (!ocrVal || !tmVal || ocrVal.length !== tmVal.length) {
    return false;
  }

  const mismatches = [];
  for (let i = 0; i < ocrVal.length; i += 1) {
    if (ocrVal[i] !== tmVal[i]) {
      mismatches.push(i);
    }
  }

  if (mismatches.length === 0) {
    return false;
  }

  // Accept exactly one adjacent transposition (e.g. 14 <-> 41).
  if (mismatches.length === 2) {
    const [a, b] = mismatches;
    if (b === a + 1) {
      return ocrVal[a] === tmVal[b] && ocrVal[b] === tmVal[a];
    }
  }

  // Accept up to 2 ambiguous digit flips (1<->7, 5<->6).
  if (mismatches.length <= 2) {
    return mismatches.every((idx) => isAmbiguousDigitPair(ocrVal[idx], tmVal[idx]));
  }

  return false;
}

function shouldAcceptDigitSwap(ocrDigit, tmDigit, score) {
  if (!ocrDigit || !tmDigit || ocrDigit === tmDigit) {
    return false;
  }

  // Only allow known ambiguous OCR pairs.
  return isAmbiguousDigitPair(ocrDigit, tmDigit) && score >= 0.78;
}

function decodeTroopsFromTemplateMatrix(matrix, expectedLens, minScore = 0.78) {
  if (!Array.isArray(matrix)) {
    return { troops: Array(5).fill(null), completeRows: 0 };
  }

  const out = [];
  let completeRows = 0;

  for (let i = 0; i < 5; i += 1) {
    const row = matrix[i];
    const expLen = expectedLens[i] || 13;
    if (!row || row.length !== expLen) {
      out.push(null);
      continue;
    }

    let digits = "";
    let ok = true;
    for (let j = 0; j < expLen; j += 1) {
      const pred = row[j];
      if (!pred?.digit || typeof pred.score !== "number" || pred.score < minScore) {
        ok = false;
        break;
      }
      digits += pred.digit;
    }

    if (!ok || digits.length !== expLen) {
      out.push(null);
      continue;
    }

    out.push(digits);
    completeRows += 1;
  }

  return { troops: out, completeRows };
}


function repairTroopsWithTotalPower(result) {
  if (!result.rawTotalPowerDigits || result.rawTroopDigits.length !== 5) {
    return result;
  }

  try {
    const total = BigInt(result.rawTotalPowerDigits);
    const tolerance = total / 200n; // 0.5%

    const calcSum = (vals) => vals.reduce((acc, v) => acc + BigInt(v), 0n);
    const absDiff = (a, b) => a > b ? a - b : b - a;

    const currentSum = calcSum(result.rawTroopDigits);
    const currentDiff = absDiff(currentSum, total);

    // Already within tolerance â€“ nothing to do.
    if (currentDiff <= tolerance) {
      return result;
    }

    // OCR total too far off (>50%) â€“ it's probably from the wrong image area. Trust sum.
    if (currentDiff > currentSum / 2n) {
      return { ...result, power: formatDigits(String(currentSum)) };
    }

    // Greedy single-troop repair: in each pass find the one troop+candidate that
    // most reduces the diff, apply it, repeat up to 5 times.
    let working = [...result.rawTroopDigits];
    const repairedSet = new Set();

    for (let pass = 0; pass < 5; pass++) {
      const workingSum = calcSum(working);
      const workingDiff = absDiff(workingSum, total);
      if (workingDiff <= tolerance) break;

      let bestDiff = workingDiff;
      let bestTroopIdx = -1;
      let bestCandidate = "";

      for (let i = 0; i < 5; i++) {
        for (const candidate of buildTroopCandidates(working[i])) {
          if (candidate === working[i]) continue;
          const newVals = working.map((v, j) => (j === i ? candidate : v));
          try {
            const d = absDiff(calcSum(newVals), total);
            if (d < bestDiff) {
              bestDiff = d;
              bestTroopIdx = i;
              bestCandidate = candidate;
            }
          } catch { /* skip */ }
        }
      }

      if (bestTroopIdx === -1) break; // No improvement found.
      working[bestTroopIdx] = bestCandidate;
      repairedSet.add(result.troops[bestTroopIdx].number);
    }

    const finalSum = calcSum(working);
    const finalDiff = absDiff(finalSum, total);

    // Only accept if we actually improved AND end up within tolerance.
    if (finalDiff > tolerance) {
      return { ...result, power: formatDigits(String(currentSum)) };
    }

    const newTroops = result.troops.map((t, i) => ({
      ...t,
      value: formatDigits(working[i])
    }));

    return {
      ...result,
      power: formatDigits(result.rawTotalPowerDigits),
      troops: newTroops,
      rawTroopDigits: working,
      repairedTroops: [...repairedSet]
    };
  } catch {
    // Leave result unchanged.
  }

  return result;
}

const MAX_OCR_ATTEMPTS = 5;

function isTroopSumConsistent(result) {
  if (result.rawTroopDigits.length < 5) {
    return false;
  }

  // All 5 troop numbers 1-5 must be present.
  const numbers = result.troops.map((t) => t.number).sort((a, b) => a - b);
  if (JSON.stringify(numbers) !== JSON.stringify([1, 2, 3, 4, 5])) {
    return false;
  }

  if (!result.rawTotalPowerDigits) {
    // No extracted total power â€” fall back to digit-length check only.
    return result.rawTroopDigits.every((digits) => {
      return digits.length >= 12 && digits.length <= 14 && digits[0] !== "0";
    });
  }

  // Primary check: troop sum must match OCR-read total power within 0.5% tolerance.
  try {
    const troopSum = result.rawTroopDigits.reduce(
      (acc, value) => acc + BigInt(value),
      0n
    );
    const total = BigInt(result.rawTotalPowerDigits);

    if (total === 0n) {
      return false;
    }

    const diff = troopSum > total ? troopSum - total : total - troopSum;
    const tolerance = total / 200n; // 0.5%

    return diff <= tolerance;
  } catch {
    return false;
  }
}

async function loadImageElement(imageSrc) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = imageSrc;
  });
}

function cropImageToDataUrl(img, box, scale = 4, filter = "grayscale(100%) contrast(250%) brightness(120%)") {
  const x = img.width * box.x;
  const y = img.height * box.y;
  const w = img.width * box.w;
  const h = img.height * box.h;

  const canvas = document.createElement("canvas");
  canvas.width = Math.floor(w * scale);
  canvas.height = Math.floor(h * scale);

  const ctx = canvas.getContext("2d");
  ctx.filter = filter;
  ctx.drawImage(img, x, y, w, h, 0, 0, canvas.width, canvas.height);

  return canvas.toDataURL("image/png");
}

async function extractNameFromImage(imageSrc) {
  setStatus("OCR steg 1/2: lÃ¤ser namn...");

  const img = await loadImageElement(imageSrc);
  const candidates = [];

  for (const variant of NAME_CROP_VARIANTS) {
    for (const filter of NAME_FILTERS) {
      const nameCrop = cropImageToDataUrl(
        img,
        {
          x: variant.x,
          y: variant.y,
          w: variant.w,
          h: variant.h
        },
        variant.scale,
        filter
      );

      const result = await Tesseract.recognize(nameCrop, "eng");
      const lines = result.data.text
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

      for (const line of lines) {
        const tokenCandidates = line.match(/[A-Za-z][A-Za-z0-9]{2,14}/g) || [];
        tokenCandidates.forEach((token) => candidates.push(token));
      }

      const lineBest = getBestNameFromLines(lines);
      if (lineBest) {
        candidates.push(lineBest);
      }
    }
  }

  return pickBestName(candidates);
}

async function extractTroopTextFromImage(imageSrc) {
  const img = await loadImageElement(imageSrc);

  // Pass 1: full area with letters+digits to capture "Troop N" labels.
  const fullBox = { x: 0.38, y: 0.33, w: 0.57, h: 0.38 };
  const fullCrop = cropImageToDataUrl(img, fullBox);
  const fullResult = await Tesseract.recognize(fullCrop, "eng");

  // Pass 2: right ~55% of same area (numeric value column only),
  // with digit-only whitelist to avoid 1/7 and other letter/digit confusion.
  const valueBox = { x: 0.53, y: 0.33, w: 0.42, h: 0.38 };
  const valueCrop = cropImageToDataUrl(img, valueBox, 4,
    "grayscale(100%) contrast(320%) brightness(130%)");
  const valueResult = await Tesseract.recognize(valueCrop, "eng", {
    tessedit_char_whitelist: "0123456789,. $'"
  });

  // Return both passes concatenated so parseTroopMapFromText can use line-level merging.
  return fullResult.data.text + "\n---VALUES---\n" + valueResult.data.text;
}

// The big POWER number lives in the stats-panel header (top-right area of the panel).
// OCR picks it up with separators like 27/996'596'617:786 â€” strip non-digits and we get the total.
async function extractTotalPowerFromImage(imageSrc) {
  const img = await loadImageElement(imageSrc);

  const POWER_BOXES = [
    { x: 0.50, y: 0.28, w: 0.45, h: 0.10 },
    { x: 0.45, y: 0.26, w: 0.50, h: 0.12 }
  ];

  const POWER_FILTERS = [
    "grayscale(100%) contrast(300%) brightness(120%)",
    "grayscale(100%) contrast(400%) brightness(150%)"
  ];

  for (const box of POWER_BOXES) {
    for (const filter of POWER_FILTERS) {
      const cropUrl = cropImageToDataUrl(img, box, 4, filter);
      const result = await Tesseract.recognize(cropUrl, "eng");
      const raw = result.data.text.replace(/[^0-9]/g, "");

      // Find the longest consecutive digit sequence of 13â€“14 digits.
      const matches = result.data.text.match(/[0-9][0-9\s,\./'`:']{10,}/g) || [];
      for (const m of matches) {
        const digits = m.replace(/[^0-9]/g, "");
        if (digits.length === 14 || digits.length === 13) {
          return digits;
        }
      }
    }
  }

  return "";
}

async function extractTextFromImage(imageSrc) {
  setStatus("OCR steg 2/2: lÃ¤ser power och trupper...");
  setProgress(1);

  const result = await Tesseract.recognize(imageSrc, "eng", {
    logger: (m) => {
      if (m.status === "recognizing text") {
        setProgress(Math.round((m.progress || 0) * 100));
      }
    }
  });

  setProgress(100);
  return result.data.text;
}

// â”€â”€â”€ Banner-read for single-troop-tab screenshots â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function setPreview(src, fileName = "") {
  selectedImageSrc = src;
  selectedImageName = fileName;
  preview.src = src;
  preview.style.display = "block";
}

async function readTroopBannerDigits(imageSrc) {
  const img = await loadImageElement(imageSrc);
  // The troop count banner sits roughly at y 11-19%, x 15-88% of the image.
  const boxes = [
    { x: 0.15, y: 0.11, w: 0.73, h: 0.08 },
    { x: 0.10, y: 0.09, w: 0.80, h: 0.10 },
  ];
  for (const box of boxes) {
    const crop = cropImageToDataUrl(img, box, 3,
      "grayscale(100%) contrast(300%) brightness(120%)");
    const result = await Tesseract.recognize(crop, "eng", {
      tessedit_char_whitelist: "0123456789,."
    });
    const raw = result.data.text;
    // Strip everything except digits, look for a 12-14 digit run.
    const matches = raw.match(/[0-9][0-9,\.]{9,}/g) || [];
    for (const m of matches) {
      const digits = m.replace(/[^0-9]/g, "");
      if (digits.length >= 12 && digits.length <= 15) {
        // Trim to 13-14 if longer (leading icon pixel artifacts).
        return digits.length > 14 ? digits.slice(-14) : digits;
      }
    }
  }
  return null;
}

// â”€â”€â”€ Mode state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
let currentMode = "overview"; // "overview" | "troops"
const troopImageSrcs = {}; // { 1: objectUrl, 2: ..., ... }
let nameImageSrc = null;

// â”€â”€â”€ Mode tab switching â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
document.querySelectorAll(".mode-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".mode-tab").forEach((t) => {
      t.classList.remove("active");
      t.setAttribute("aria-selected", "false");
    });
    tab.classList.add("active");
    tab.setAttribute("aria-selected", "true");
    currentMode = tab.dataset.mode;
    document.getElementById("modeOverview").hidden = currentMode !== "overview";
    document.getElementById("modeTroops").hidden = currentMode !== "troops";
    document.getElementById("previewPanel").hidden = currentMode !== "overview";
    setStatus("VÃ¤ntar pÃ¥ bild...");
    setProgress(0);
  });
});

// â”€â”€â”€ Overview mode: single image â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
imageInput.addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  const objectUrl = URL.createObjectURL(file);
  setPreview(objectUrl, file.name);
  setStatus(`Vald bild: ${file.name}`);
});

useSampleBtn.addEventListener("click", () => {
  setPreview(SAMPLE_IMAGE, SAMPLE_IMAGE);
  setStatus("Exempelbild laddad.");
});

// â”€â”€â”€ Troops mode: 5 individual images â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
document.querySelectorAll(".troop-input").forEach((input) => {
  input.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const n = Number(input.dataset.troop);
    const url = URL.createObjectURL(file);
    troopImageSrcs[n] = url;

    const slot = input.closest(".troop-slot");
    const label = slot.querySelector(".slot-file-label");
    const placeholder = slot.querySelector(".slot-placeholder");
    const previewImg = slot.querySelector(".slot-preview");

    label.classList.add("has-image");
    placeholder.textContent = file.name.slice(0, 18) + (file.name.length > 18 ? "â€¦" : "");
    previewImg.src = url;
    previewImg.hidden = false;

    setStatus(`Troop ${n} vald: ${file.name}`);
  });
});

document.getElementById("nameImageInput")?.addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  nameImageSrc = URL.createObjectURL(file);
  setStatus(`Namnbild vald: ${file.name}`);
});

// â”€â”€â”€ Analyze button â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
analyzeBtn.addEventListener("click", async () => {
  analyzeBtn.disabled = true;
  if (useSampleBtn) useSampleBtn.disabled = true;

  try {
    const hasTesseract = await ensureTesseractLoaded();
    if (!hasTesseract) {
      setStatus("OCR-biblioteket kunde inte laddas. Kontrollera internet eller kÃ¶r via localhost/Live Server.");
      return;
    }

    if (currentMode === "troops") {
      await analyzeTroopImages();
    } else {
      await analyzeOverviewImage();
    }
  } catch (error) {
    console.error(error);
    setStatus("Ett fel uppstod vid OCR. Kontrollera internetanslutning och fÃ¶rsÃ¶k igen.");
  } finally {
    analyzeBtn.disabled = false;
    if (useSampleBtn) useSampleBtn.disabled = false;
  }
});

// â”€â”€â”€ Troop-tab mode analysis â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function analyzeTroopImages() {
  const slots = Object.keys(troopImageSrcs).map(Number).sort((a, b) => a - b);
  if (!slots.length) {
    setStatus("Ladda upp minst en truppbild.");
    return;
  }

  setStatus(`LÃ¤ser ${slots.length} truppbild${slots.length > 1 ? "er" : ""}...`);
  setProgress(0);

  const rawTroopDigits = {};
  for (let i = 0; i < slots.length; i++) {
    const n = slots[i];
    setStatus(`LÃ¤ser Troop ${n} (${i + 1}/${slots.length})...`);
    setProgress(Math.round(((i + 0.5) / slots.length) * 90));
    const digits = await readTroopBannerDigits(troopImageSrcs[n]);
    if (digits) rawTroopDigits[n] = digits;
  }

  setProgress(95);

  // Read name if a name image was provided, otherwise try from first troop image.
  let name = "";
  const nameSource = nameImageSrc || troopImageSrcs[slots[0]];
  if (nameSource) {
    name = await extractNameFromImage(nameSource);
  }

  setProgress(100);

  const troopDigitValues = Array.from({ length: 5 }, (_, i) => rawTroopDigits[i + 1] || null)
    .filter(Boolean);

  const troops = Object.entries(rawTroopDigits)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([number, digits]) => ({ number: Number(number), value: formatDigits(digits) }));

  let powerDigits = "";
  try {
    powerDigits = String(Object.values(rawTroopDigits).reduce((acc, v) => acc + BigInt(v), 0n));
  } catch { /* leave empty */ }

  const resultData = {
    name,
    power: formatDigits(powerDigits),
    troops,
    rawTroopDigits: troopDigitValues,
    rawTotalPowerDigits: ""
  };

  showResults(resultData);
  const loaded = troops.length;
  if (loaded < 5) {
    setStatus(`Klar! ${loaded}/5 trupper inlÃ¤sta. Ladda upp fler bilder fÃ¶r full summering.`);
  } else {
    setStatus("Klar! Alla 5 trupper inlÃ¤sta.");
  }
}

// â”€â”€â”€ Overview (stats-panel) mode analysis â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function analyzeOverviewImage() {
  if (!selectedImageSrc) {
    setStatus("VÃ¤lj en bild fÃ¶rst.");
    return;
  }

  let resultData = null;
  let attempt = 0;

  setStatus("Laddar siffrematching...");
  await ensureDigitLib();

  while (attempt < MAX_OCR_ATTEMPTS) {
    attempt += 1;
    if (attempt > 1) {
      setStatus(`Kontroll misslyckades â€“ kÃ¶r OCR igen (fÃ¶rsÃ¶k ${attempt}/${MAX_OCR_ATTEMPTS})...`);
    }

    const [nameFromCrop, text, troopText, rawTotalPowerDigits] = await Promise.all([
      extractNameFromImage(selectedImageSrc),
      extractTextFromImage(selectedImageSrc),
      extractTroopTextFromImage(selectedImageSrc),
      extractTotalPowerFromImage(selectedImageSrc)
    ]);

    const parsed = parseFromText(text, nameFromCrop, troopText);
    parsed.rawTotalPowerDigits = rawTotalPowerDigits;

    const ocrLens = parsed.rawTroopDigits.map((d) => d.length >= 13 ? d.length : 13);
    const ocrDigits = Array.from({ length: 5 }, (_, i) => parsed.rawTroopDigits[i] || null);
    const expectedLens = Array.from({ length: 5 }, (_, i) => ocrLens[i] || 13);

    const { matrix: tmMatrix, log: tmLog } = await tmMatchDigitMatrix(
      selectedImageSrc, expectedLens
    );

    const decoded = tmMatrix
      ? decodeTroopsFromTemplateMatrix(tmMatrix, expectedLens, 0.78)
      : { troops: Array(5).fill(null), completeRows: 0 };

    const mergedDigits = Array.from({ length: 5 }, (_, i) =>
      decoded.troops[i] || ocrDigits[i] || null
    );

    const mergedTroops = mergedDigits.map((digits, i) => ({
      number: i + 1,
      value: digits ? formatDigits(digits) : "-"
    })).filter((t) => t.value !== "-");

    if (mergedDigits.some(Boolean)) {
      parsed.rawTroopDigits = mergedDigits.filter(Boolean);
      parsed.troops = mergedTroops;
      try {
        const mergedSum = mergedDigits.filter(Boolean).reduce((acc, v) => acc + BigInt(v), 0n);
        parsed.power = formatDigits(String(mergedSum));
      } catch { /* keep original */ }
    }

    console.debug("[DigitMatcher]", tmLog);

    if (isTroopSumConsistent(parsed)) {
      resultData = parsed;
      break;
    }

    if (!resultData || parsed.troops.length >= (resultData.troops?.length ?? 0)) {
      resultData = parsed;
    }
  }

  if (!isTroopSumConsistent(resultData)) {
    resultData = repairTroopsWithTotalPower(resultData);
  }

  showResults(resultData);

  if (!resultData.name && !resultData.power && !resultData.troops.length) {
    setStatus("OCR klar, men ingen matchande data hittades. Testa en tydligare bild.");
  } else if (resultData.repairedTroops?.length) {
    const label = resultData.repairedTroops.map((n) => `Troop ${n}`).join(", ");
    setStatus(`Klar! ${label} reparerades automatiskt.`);
  } else if (!isTroopSumConsistent(resultData)) {
    setStatus(`Klar (${MAX_OCR_ATTEMPTS} fÃ¶rsÃ¶k) â€“ truppernas summa matchar inte total power, siffrorna kan vara osÃ¤kra.`);
  } else {
    setStatus("Klar! Truppernas summa stÃ¤mmer med total power.");
  }
}

// â”€â”€â”€ Init â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
setPreview(SAMPLE_IMAGE, SAMPLE_IMAGE);
if (window.location.protocol === "file:") {
  setStatus("Tips: kÃ¶r via localhost/Live Server fÃ¶r stabil OCR.");
} else {
  setStatus("VÃ¤lj lÃ¤ge och ladda upp bild/bilder.");
}

/* -- Admin Panel ----------------------------------------------- */
(function () {
  var adminModal   = document.getElementById('adminModal');
  var adminBtn     = document.getElementById('adminBtn');
  var chartModal   = document.getElementById('chartModal');
  var chartBtn     = document.getElementById('chartBtn');
  var chartCloseBtn= document.getElementById('chartCloseBtn');
  var chartUnitFilter = document.getElementById('chartUnitFilter');
  var chartSortBy  = document.getElementById('chartSortBy');
  var chartSortDir = document.getElementById('chartSortDir');
  var chartTableBody = document.getElementById('chartTableBody');
  var adminCloseBtn= document.getElementById('adminCloseBtn');
  var adminNewUser = document.getElementById('adminNewUsername');
  var adminIsAdmin = document.getElementById('adminMakeAdmin');
  var adminCreateBtn=document.getElementById('adminCreateBtn');
  var adminCreateMsg=document.getElementById('adminCreateMsg');
  var adminUserList= document.getElementById('adminUserList');
  var chartUsersCache = [];

  var UNIT_ICON_BY_KEY = {
    archer: 'archer.jpg',
    goblin: 'goblin.jpg',
    ice: 'ice.jpeg',
    fire: 'fire.jpg'
  };

  function showAdminMsg(msg, isOk) {
    adminCreateMsg.textContent = msg;
    adminCreateMsg.className = 'admin-msg ' + (isOk ? 'ok' : 'err');
    adminCreateMsg.hidden = false;
    setTimeout(function() { adminCreateMsg.hidden = true; }, 4000);
  }

  async function loadUsers() {
    adminUserList.textContent = 'Loading...';
    try {
      var data = await riseApi({ action: 'listUsers', username: _loginUsername, token: _sessionToken });
      if (data.error) { adminUserList.textContent = data.error; return; }
      chartUsersCache = Array.isArray(data.users) ? data.users : [];
      adminUserList.innerHTML = '';
      data.users.forEach(function(u) {
        var row = document.createElement('div');
        row.className = 'admin-user-row';
        var name = document.createElement('span');
        name.className = 'admin-user-name';
        name.textContent = u.username;
        row.appendChild(name);
        if (u.is_admin) {
          var b = document.createElement('span');
          b.className = 'admin-user-badge badge-admin';
          b.textContent = 'Admin';
          row.appendChild(b);
        }
        if (u.must_change_password) {
          var b2 = document.createElement('span');
          b2.className = 'admin-user-badge badge-pending';
          b2.textContent = 'Pending';
          row.appendChild(b2);
        }
        if (u.username.toLowerCase() !== _loginUsername.toLowerCase()) {
          var delBtn = document.createElement('button');
          delBtn.className = 'admin-del-btn';
          delBtn.textContent = 'Delete';
          delBtn.addEventListener('click', async function() {
            if (!confirm('Delete user "' + u.username + '"?')) return;
            var res = await riseApi({ action: 'deleteUser', username: _loginUsername, token: _sessionToken, targetUsername: u.username });
            if (res.ok) loadUsers(); else alert(res.error);
          });
          row.appendChild(delBtn);
        }
        adminUserList.appendChild(row);
      });
    } catch(e) { adminUserList.textContent = 'Failed to load users.'; }
  }

  function getTroopPowerValue(troop) {
    if (!troop || troop.power === undefined || troop.power === null || troop.power === '') return 0;
    var n = Number(troop.power);
    return Number.isFinite(n) ? n : 0;
  }

  function renderTroopCell(troop, selectedUnit) {
    var td = document.createElement('td');
    td.className = 'chart-troop-cell';
    if (!troop || !troop.unit) {
      td.innerHTML = '<span class="chart-empty">-</span>';
      return td;
    }

    var normalizedUnit = normalizeUnitValue(troop.unit);
    if (selectedUnit !== 'all' && normalizedUnit !== selectedUnit) {
      td.innerHTML = '<span class="chart-empty">-</span>';
      return td;
    }

    var img = UNIT_ICON_BY_KEY[normalizedUnit];
    var power = getTroopPowerValue(troop).toLocaleString('en-US');
    td.innerHTML = '<span class="chart-unit-chip"><img src="' + img + '" alt="' + normalizedUnit + '">' + power + '</span>';
    return td;
  }

  function buildUserChartRows(users, selectedUnit, sortBy, sortDir) {
    var rows = users.map(function(u) {
      var troops = u.troops && typeof u.troops === 'object' ? u.troops : {};
      var troopEntries = [1,2,3,4,5].map(function(i) {
        var t = troops[String(i)] || {};
        return {
          index: i,
          power: getTroopPowerValue(t),
          unit: normalizeUnitValue(t.unit || '')
        };
      });

      var hasSelectedUnit = selectedUnit === 'all' || troopEntries.some(function(t) { return t.unit === selectedUnit; });
      var total = troopEntries.reduce(function(acc, t) {
        if (selectedUnit !== 'all' && t.unit !== selectedUnit) return acc;
        return acc + t.power;
      }, 0);

      return {
        username: u.username,
        hasSelectedUnit: hasSelectedUnit,
        troops: troopEntries,
        total: total
      };
    }).filter(function(r) { return r.hasSelectedUnit; });

    rows.sort(function(a, b) {
      var av;
      var bv;
      if (sortBy === 'total') {
        av = a.total;
        bv = b.total;
      } else {
        var idx = Number(sortBy);
        av = a.troops[idx - 1] ? a.troops[idx - 1].power : 0;
        bv = b.troops[idx - 1] ? b.troops[idx - 1].power : 0;
      }

      if (av === bv) return a.username.localeCompare(b.username);
      return sortDir === 'asc' ? av - bv : bv - av;
    });

    return rows;
  }

  function renderChart() {
    if (!chartTableBody) return;
    var selectedUnit = chartUnitFilter ? chartUnitFilter.value : 'all';
    var sortBy = chartSortBy ? chartSortBy.value : 'total';
    var sortDir = chartSortDir ? chartSortDir.value : 'desc';
    var rows = buildUserChartRows(chartUsersCache, selectedUnit, sortBy, sortDir);

    if (rows.length === 0) {
      chartTableBody.innerHTML = '<tr><td colspan="7">No users match this filter.</td></tr>';
      return;
    }

    chartTableBody.innerHTML = '';
    rows.forEach(function(r) {
      var tr = document.createElement('tr');

      var nameTd = document.createElement('td');
      nameTd.className = 'chart-name-cell';
      nameTd.textContent = r.username;
      tr.appendChild(nameTd);

      [1,2,3,4,5].forEach(function(i) {
        var t = r.troops[i - 1];
        var displayTroop = {
          power: t.power,
          unit: t.unit
        };
        tr.appendChild(renderTroopCell(displayTroop, selectedUnit));
      });

      var totalTd = document.createElement('td');
      totalTd.className = 'chart-total-cell';
      totalTd.textContent = r.total.toLocaleString('en-US');
      tr.appendChild(totalTd);

      chartTableBody.appendChild(tr);
    });
  }

  async function openChartModal() {
    if (chartTableBody) {
      chartTableBody.innerHTML = '<tr><td colspan="7">Loading...</td></tr>';
    }
    chartModal.hidden = false;
    try {
      var data = await riseApi({ action: 'listUsers', username: _loginUsername, token: _sessionToken });
      if (data.error) {
        chartTableBody.innerHTML = '<tr><td colspan="7">' + data.error + '</td></tr>';
        return;
      }
      chartUsersCache = Array.isArray(data.users) ? data.users : [];
      renderChart();
    } catch (e) {
      chartTableBody.innerHTML = '<tr><td colspan="7">Failed to load user chart.</td></tr>';
    }
  }

  adminBtn.addEventListener('click', function() {
    adminModal.hidden = false;
    loadUsers();
  });

  adminCloseBtn.addEventListener('click', function() { adminModal.hidden = true; });

  chartBtn.addEventListener('click', openChartModal);
  chartCloseBtn.addEventListener('click', function() { chartModal.hidden = true; });

  chartUnitFilter.addEventListener('change', renderChart);
  chartSortBy.addEventListener('change', renderChart);
  chartSortDir.addEventListener('change', renderChart);

  adminCreateBtn.addEventListener('click', async function() {
    var nu = adminNewUser.value.trim();
    if (!nu) { showAdminMsg('Please enter a username.', false); return; }
    var data = await riseApi({ action: 'createUser', username: _loginUsername, token: _sessionToken, newUsername: nu, makeAdmin: adminIsAdmin.checked });
    if (data.ok) {
      showAdminMsg('User "' + data.username + '" created!', true);
      adminNewUser.value = '';
      adminIsAdmin.checked = false;
      loadUsers();
    } else {
      showAdminMsg(data.error || 'Failed to create user.', false);
    }
  });

  adminNewUser.addEventListener('keydown', function(e) { if (e.key === 'Enter') adminCreateBtn.click(); });

  // Expose function to show admin button after login
  window._riseShowAdminBtn = function() {
    adminBtn.hidden = false;
    chartBtn.hidden = false;
  };
})();
/* -------------------------------------------------------------- */
