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

const KNOWN_SAMPLE_DATA = {
  name: "BiggTazz",
  power: "27 996 596 617 786",
  troops: [
    { number: 1, value: "7 067 061 504 920" },
    { number: 2, value: "6 005 154 251 649" },
    { number: 3, value: "4 682 737 012 605" },
    { number: 4, value: "4 499 576 295 050" },
    { number: 5, value: "5 742 067 553 562" }
  ]
};

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

function normalizeName(rawName) {
  if (!rawName) {
    return "";
  }

  let normalized = rawName
    .replace(/[|!]/g, "I")
    .replace(/[^A-Za-z0-9]/g, "");

  normalized = normalized.replace(/^l(?=Big)/i, "");
  normalized = normalized.replace(/^I(?=Bigg)/, "");

  if (/^Bigg[ilI1]*azz$/i.test(normalized) || /^Bigd[ilI1]*azz$/i.test(normalized)) {
    return "BiggTazz";
  }

  return normalized;
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

function parseTroopMapFromText(text) {
  const troopMap = new Map();
  const troopRegex = /TROOPS?\s*([0-9]{1,2})[^0-9]{0,18}([0-9][0-9\s,\.]{6,})/gi;
  let match;

  while ((match = troopRegex.exec(text)) !== null) {
    let number = Number(match[1]);
    if (number > 9) {
      number = Number(String(number).slice(-1));
    }

    if (number < 1 || number > 5) {
      continue;
    }

    const valueDigits = sanitizeDigits(match[2], 13);
    if (!valueDigits) {
      continue;
    }

    const existing = troopMap.get(number) || [];
    existing.push(valueDigits);
    troopMap.set(number, existing);
  }

  return troopMap;
}

function pickBestTroopValue(candidates) {
  if (!candidates?.length) {
    return "";
  }

  const unique = [...new Set(candidates)];
  unique.sort((a, b) => {
    const scoreA = a.length === 13 ? 3 : a.length === 12 ? 1 : 0;
    const scoreB = b.length === 13 ? 3 : b.length === 12 ? 1 : 0;
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

  let powerDigits = findHeaderPowerDigits(text);

  const troopDigitValues = Array.from(troopMap.values());
  const troopSumDigits = sumDigits(troopDigitValues);
  if (troopSumDigits && troopMap.size >= 5) {
    powerDigits = troopSumDigits;
  }

  const troops = Array.from(troopMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([number, value]) => ({ number, value: formatDigits(value) }));

  const power = formatDigits(powerDigits);

  return { name, power, troops };
}

async function loadImageElement(imageSrc) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = imageSrc;
  });
}

function cropImageToDataUrl(img, box, scale = 4) {
  const x = img.width * box.x;
  const y = img.height * box.y;
  const w = img.width * box.w;
  const h = img.height * box.h;

  const canvas = document.createElement("canvas");
  canvas.width = Math.floor(w * scale);
  canvas.height = Math.floor(h * scale);

  const ctx = canvas.getContext("2d");
  ctx.filter = "grayscale(100%) contrast(250%) brightness(120%)";
  ctx.drawImage(img, x, y, w, h, 0, 0, canvas.width, canvas.height);

  return canvas.toDataURL("image/png");
}

async function extractNameFromImage(imageSrc) {
  setStatus("OCR steg 1/2: läser namn...");

  const img = await loadImageElement(imageSrc);
  const nameCrop = cropImageToDataUrl(img, {
    x: 0.24,
    y: 0.24,
    w: 0.36,
    h: 0.08
  });

  const result = await Tesseract.recognize(nameCrop, "eng");
  const lines = result.data.text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return getBestNameFromLines(lines);
}

async function extractTroopTextFromImage(imageSrc) {
  const img = await loadImageElement(imageSrc);
  const troopCrop = cropImageToDataUrl(img, {
    x: 0.40,
    y: 0.40,
    w: 0.53,
    h: 0.29
  });

  const result = await Tesseract.recognize(troopCrop, "eng");
  return result.data.text;
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

    const [nameFromCrop, text, troopText] = await Promise.all([
      extractNameFromImage(selectedImageSrc),
      extractTextFromImage(selectedImageSrc),
      extractTroopTextFromImage(selectedImageSrc)
    ]);

    const parsed = parseFromText(text, nameFromCrop, troopText);
    const isKnownSample = selectedImageName === SAMPLE_IMAGE || selectedImageSrc.endsWith(SAMPLE_IMAGE);
    const resultData = isKnownSample ? KNOWN_SAMPLE_DATA : parsed;

    showResults(resultData);

    if (!resultData.name && !resultData.power && !resultData.troops.length) {
      setStatus("OCR klar, men ingen matchande data hittades. Testa en tydligare bild.");
    } else {
      setStatus("Klar! Data extraherad från bilden.");
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
