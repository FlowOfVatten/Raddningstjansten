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

  nameValue.textContent = data.name || "Kunde inte läsa namn";
  powerValue.textContent = data.power || "Kunde inte läsa power";

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
  { x: 0.24, y: 0.24, w: 0.36, h: 0.08, scale: 4 },
  { x: 0.15, y: 0.16, w: 0.45, h: 0.12, scale: 4 },
  { x: 0.22, y: 0.22, w: 0.35, h: 0.09, scale: 5 }
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
  if (name.length >= 4 && name.length <= 10) {
    score += 4;
  } else if (name.length >= 3 && name.length <= 14) {
    score += 2;
  }

  if (/^[A-Z][a-z]+$/.test(name)) {
    score += 4;
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
    if (digits.length >= 12 && digits.length <= 15) {
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
  // Each line that contains a plausible troop-sized number is collected in sequence.
  const digitOnlyValues = [];
  for (const line of valueSection.split("\n").map((l) => l.trim()).filter(Boolean)) {
    const v = pickBestNumericValueFromRaw(line);
    if (v && v.length >= 12 && v.length <= 14) {
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
    .replace(/[“”]/g, '"')
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

  // Keep rawTroopDigits sorted by troop number so index 0=Troop1 … 4=Troop5.
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

  // Leading 1 ↔ 7.
  if (digits[0] === "1") set.add("7" + digits.slice(1));
  if (digits[0] === "7") set.add("1" + digits.slice(1));

  // Dropped leading digit (value one digit too short).
  if (digits.length === 12) {
    for (let d = 1; d <= 9; d++) set.add(String(d) + digits);
  }

  // Single 5 ↔ 6 swap at every position, plus all pairs within same value.
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

  // Adjacent digit transposition at every position (catches 14↔41, 17↔71, etc.).
  for (let i = 0; i < digits.length - 1; i++) {
    if (digits[i] !== digits[i + 1]) {
      set.add(digits.slice(0, i) + digits[i + 1] + digits[i] + digits.slice(i + 2));
    }
  }

  return [...set];
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

    // Already within tolerance – nothing to do.
    if (currentDiff <= tolerance) {
      return result;
    }

    // OCR total too far off (>50%) – it's probably from the wrong image area. Trust sum.
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
    // No extracted total power — fall back to digit-length check only.
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
  setStatus("OCR steg 1/2: läser namn...");

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
// OCR picks it up with separators like 27/996'596'617:786 — strip non-digits and we get the total.
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

      // Find the longest consecutive digit sequence of 13–14 digits.
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
  setStatus("OCR steg 2/2: läser power och trupper...");
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

function setPreview(src, fileName = "") {
  selectedImageSrc = src;
  selectedImageName = fileName;
  preview.src = src;
  preview.style.display = "block";
}

imageInput.addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  const objectUrl = URL.createObjectURL(file);
  setPreview(objectUrl, file.name);
  setStatus(`Vald bild: ${file.name}`);
});

useSampleBtn.addEventListener("click", () => {
  setPreview(SAMPLE_IMAGE, SAMPLE_IMAGE);
  setStatus("Exempelbild laddad.");
});

analyzeBtn.addEventListener("click", async () => {
  if (!selectedImageSrc) {
    setStatus("Välj en bild först.");
    return;
  }

  analyzeBtn.disabled = true;
  useSampleBtn.disabled = true;

  try {
    const hasTesseract = await ensureTesseractLoaded();
    if (!hasTesseract) {
      setStatus("OCR-biblioteket kunde inte laddas. Kontrollera internet eller kör via localhost/Live Server.");
      return;
    }

    let resultData = null;
    let attempt = 0;

    while (attempt < MAX_OCR_ATTEMPTS) {
      attempt += 1;
      if (attempt > 1) {
        setStatus(`Kontroll misslyckades – kör OCR igen (försök ${attempt}/${MAX_OCR_ATTEMPTS})...`);
      }

      const [nameFromCrop, text, troopText, rawTotalPowerDigits] = await Promise.all([
        extractNameFromImage(selectedImageSrc),
        extractTextFromImage(selectedImageSrc),
        extractTroopTextFromImage(selectedImageSrc),
        extractTotalPowerFromImage(selectedImageSrc)
      ]);

      const parsed = parseFromText(text, nameFromCrop, troopText);
      parsed.rawTotalPowerDigits = rawTotalPowerDigits;

      if (isTroopSumConsistent(parsed)) {
        resultData = parsed;
        break;
      }

      // Show best result so far while retrying.
      if (!resultData || parsed.troops.length >= (resultData.troops?.length ?? 0)) {
        resultData = parsed;
      }
    }

    // If still not consistent after all attempts, try to repair a single misread troop.
    if (!isTroopSumConsistent(resultData)) {
      resultData = repairTroopsWithTotalPower(resultData);
    }

    showResults(resultData);

    if (!resultData.name && !resultData.power && !resultData.troops.length) {
      setStatus("OCR klar, men ingen matchande data hittades. Testa en tydligare bild.");
    } else if (resultData.repairedTroops?.length) {
      const label = resultData.repairedTroops.map((n) => `Troop ${n}`).join(", ");
      setStatus(`Klar! ${label} reparerades automatiskt med 1↔7-korrigering.`);
    } else if (!isTroopSumConsistent(resultData)) {
      setStatus(`Klar (${MAX_OCR_ATTEMPTS} försök) – truppernas summa matchar inte total power, siffrorna kan vara osäkra.`);
    } else {
      setStatus("Klar! Truppernas summa stämmer med total power.");
    }
  } catch (error) {
    console.error(error);
    setStatus("Ett fel uppstod vid OCR. Kontrollera internetanslutning och försök igen.");
  } finally {
    analyzeBtn.disabled = false;
    useSampleBtn.disabled = false;
  }
});

setPreview(SAMPLE_IMAGE, SAMPLE_IMAGE);
if (window.location.protocol === "file:") {
  setStatus("Tips: kör via localhost/Live Server för stabil OCR, och kontrollera att internet finns för att ladda OCR-biblioteket.");
} else {
  setStatus("Exempelbild är förvald. Klicka på Analysera bild.");
}
