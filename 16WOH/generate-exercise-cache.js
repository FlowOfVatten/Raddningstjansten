/**
 * generate-exercise-cache.js
 *
 * Kör detta skript EN GÅNG från ett nätverk utan proxy (hemma, mobil, etc.):
 *   node 16WOH/generate-exercise-cache.js
 *
 * Skriptet hämtar alla övningar från den deployade Azure-proxyn, översätter
 * instruktionerna till svenska och sparar resultatet i exercise-static.json.
 * Appen läser sedan från den filen utan att göra nya API-anrop.
 */

const https = require("https");
const fs = require("fs");
const path = require("path");

// ─── Konfigurera deployad URL ─────────────────────────────────────────────────
const PROXY_BASE = "https://ambitious-island-0a12cd003.6.azurestaticapps.net/api/exercise-proxy";

// ─── Alla unika ExerciseDB-sluggar från EXERCISE_NAMES + EXERCISE_NAMES_HOME ───
const SLUGS = [
  // Gym
  "lat pulldown",
  "cable seated row",
  "rack pull",
  "barbell bent over row",
  "standing calf raise",
  "seated calf raise",
  "incline dumbbell press",
  "barbell bench press",
  "dumbbell fly",
  "hammer curl",
  "ez barbell curl",
  "concentration curl",
  "leg press",
  "hack squat",
  "walking lunge",
  "leg extension",
  "seated leg curl",
  "leg curl",
  "overhead press",
  "dumbbell lateral raise",
  "reverse fly",
  "cable upright row",
  "plank",
  "hanging leg raise",
  "side plank",
  "romanian deadlift",
  "barbell hip thrust",
  "cable pushdown",
  "barbell curl",
  "skull crusher",
  // Home (unika utöver gym)
  "squat",
  "bulgarian split squat",
  "dumbbell goblet squat",
  "nordic hamstring curl",
  "glute bridge",
  "dumbbell romanian deadlift",
  "resistance band pull apart",
  "pull up",
  "dumbbell deadlift",
  "push up",
  "incline push up",
  "dumbbell bicep curl",
  "dumbbell shoulder press",
  "dumbbell upright row",
  "leg raise",
  "triceps dip",
  "dumbbell skull crusher",
];

// ─── Översättningsfunktioner (kopierade från app.js) ──────────────────────────

function replaceAllCaseInsensitive(input, search, replacement) {
  const escaped = String(search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return input.replace(new RegExp(escaped, "gi"), replacement);
}

function translateExerciseTerm(text) {
  const map = {
    "upper legs": "övre benmuskulatur",
    "lower legs": "underben/vader",
    shoulders: "axlar",
    shoulder: "axel",
    chest: "bröst",
    back: "rygg",
    waist: "bål",
    glutes: "sätesmuskler",
    biceps: "biceps",
    triceps: "triceps",
    delts: "deltoider/axlar",
    deltoids: "deltoider/axlar",
    calves: "vader",
    pectorals: "bröstmuskler",
    lats: "lats/breda ryggmuskeln",
    quadriceps: "framsida lår (quadriceps)",
    hamstrings: "baksida lår (hamstrings)",
    abs: "magrutor",
    abdominals: "magrutor",
    adductors: "adduktorer",
    "upper back": "övre rygg",
    "lower back": "nedre rygg",
    traps: "trapezius",
    forearms: "underarmar",
  };
  const key = String(text || "").trim().toLowerCase();
  return map[key] || text;
}

function translateInstructionToSwedish(line) {
  let s = String(line || "");
  if (!s) return s;

  // OBS: fraser måste ersättas FÖRE enstaka ord för att undvika partiella träffar,
  // t.ex. "shoulder blades" → "skulderbladen" INNAN "shoulder" → "axel".
  const phraseReplacements = [
    // Mång-ords fraser
    ["Stand with your feet shoulder-width apart", "Stå med fötterna axelbrett isär"],
    ["Stand upright with your feet shoulder-width apart", "Stå upprätt med fötterna axelbrett isär"],
    ["Stand upright", "Stå upprätt"],
    ["Lie flat on a bench", "Lägg dig plant på en bänk"],
    ["Lie face down on", "Lägg dig på mage på"],
    ["Lie down on", "Lägg dig ner på"],
    ["Lie on your back", "Lägg dig på rygg"],
    ["Sit at the", "Sitt vid"],
    ["Sit on the", "Sitt på"],
    ["Sit on", "Sitt på"],
    ["Sit upright", "Sitt upprätt"],
    ["Sit down", "Sätt dig ner"],
    ["Get into a", "Inta en"],
    ["Get into the", "Inta"],
    ["Adjust the seat height", "Justera sitthöjden"],
    ["Adjust the seat", "Justera sätets"],
    ["Position yourself", "Placera dig"],
    ["Place your feet", "Placera fötterna"],
    ["Place your hands", "Placera händerna"],
    ["Place your feet flat on the floor", "Placera fötterna plant mot golvet"],
    ["Place your feet flat on the footrests", "Placera fötterna plant mot fotstöden"],
    ["flat on the footrests", "plant mot fotstöden"],
    ["flat on the floor", "plant mot golvet"],
    ["flat on a bench", "plant på en bänk"],
    ["Grasp the handles", "Greppa handtagen"],
    ["Grasp the handle", "Greppa handtaget"],
    ["Grasp the bar", "Greppa stången"],
    ["Grasp the barbell", "Greppa skivstången"],
    ["Grasp the dumbbell", "Greppa hanteln"],
    ["Hold the dumbbell", "Håll hanteln"],
    ["Hold the barbell", "Håll skivstången"],
    ["Hold the bar", "Håll stången"],
    ["Hold a dumbbell", "Håll en hantel"],
    ["shoulder blades together", "skulderbladen mot varandra"],
    ["shoulder blade", "skulderblad"],
    ["shoulder blades", "skulderbladen"],
    ["Keep your back straight", "Håll ryggen rak"],
    ["Keep your back flat", "Håll ryggen rak"],
    ["Keep your chest up", "Håll bröstet upp"],
    ["Keep your elbows close to your body", "Håll armbågarna nära kroppen"],
    ["Keep your elbows close to your torso", "Håll armbågarna nära överkroppen"],
    ["Keep your upper arms stationary", "Håll överarmarna stilla"],
    ["Keep your core engaged", "Håll bålen spänd"],
    ["Keep your body straight", "Håll kroppen rak"],
    ["Keep your feet flat on the floor", "Håll fötterna plant mot golvet"],
    ["Keeping your elbows close to your body", "Med armbågarna nära kroppen"],
    ["Keeping your upper arms stationary", "Med överarmarna stilla"],
    ["Keeping your core engaged", "Med bålen spänd"],
    ["Keeping your back straight", "Med rak rygg"],
    ["Keeping your back flat", "Med rak rygg"],
    ["Keeping your back", "Med ryggen"],
    ["keeping your back straight", "med rak rygg"],
    ["keeping your back flat", "med rak rygg"],
    ["engage your core", "spänn bålen"],
    ["with your feet flat on", "med fötterna plant mot"],
    ["with your feet", "med fötterna"],
    ["with your knees", "med knäna"],
    ["with your arms", "med armarna"],
    ["with your hands", "med händerna"],
    ["with your palms", "med handflatorna"],
    ["with your chest", "med bröstet"],
    ["with your back", "med ryggen"],
    ["with your elbows", "med armbågarna"],
    ["with your shoulder", "med axeln"],
    ["with your shoulders", "med axlarna"],
    ["with your body", "med kroppen"],
    ["with your legs", "med benen"],
    ["with your torso", "med överkroppen"],
    ["with your core", "med bålen"],
    ["with your hips", "med höfterna"],
    ["with your upper body", "med överkroppen"],
    ["with your weight", "med vikten"],
    ["with an overhand grip", "med överhandsgrepp"],
    ["with an underhand grip", "med underhandsgrepp"],
    ["with a neutral grip", "med neutralt grepp"],
    ["with a shoulder-width grip", "med axelbredt grepp"],
    ["with a wide grip", "med brett grepp"],
    ["with a close grip", "med smalt grepp"],
    ["and your shoulders", "och axlarna"],
    ["and your back", "och ryggen"],
    ["and your feet", "och fötterna"],
    ["and your knees", "och knäna"],
    ["and your arms", "och armarna"],
    ["and your hips", "och höfterna"],
    ["and your core", "och bålen"],
    ["and your chest", "och bröstet"],
    ["and your elbows", "och armbågarna"],
    ["at the top of the movement", "i toppositionen"],
    ["at the peak of the movement", "i toppositionen"],
    ["at the bottom of the movement", "i bottenpositionen"],
    ["at the top of the rep", "i toppositionen"],
    ["at the peak of the", "i slutet av"],
    ["at the top of", "i toppen av"],
    ["at the bottom of", "i botten av"],
    ["back to the starting position", "tillbaka till startpositionen"],
    ["back to starting position", "tillbaka till startpositionen"],
    ["back to the start", "tillbaka till starten"],
    ["to the starting position", "till startpositionen"],
    ["to the start position", "till startpositionen"],
    ["to your starting position", "till din startposition"],
    ["from the starting position", "från startpositionen"],
    ["in the starting position", "i startpositionen"],
    ["the starting position", "startpositionen"],
    ["Pull the handle", "Dra handtaget"],
    ["Pull the handles", "Dra handtagen"],
    ["Pull the bar", "Dra stången"],
    ["Pull the barbell", "Dra skivstången"],
    ["Pull the weight", "Dra vikten"],
    ["Pull yourself up", "Dra dig upp"],
    ["Push the handles", "Pressa handtagen"],
    ["Push the bar", "Pressa stången"],
    ["Push your body up", "Pressa upp kroppen"],
    ["Push up with", "Pressa upp med"],
    ["Repeat for the desired number of repetitions", "Upprepa för önskat antal repetitioner"],
    ["Repeat for the desired number of reps", "Upprepa för önskat antal repetitioner"],
    ["Repeat on the other side", "Upprepa på andra sidan"],
    ["Repeat on the opposite side", "Upprepa på andra sidan"],
    ["Repeat on each side", "Upprepa på varje sida"],
    ["desired number of repetitions", "önskat antal repetitioner"],
    ["desired number of reps", "önskat antal repetitioner"],
    ["Pause for a moment", "Pausa en kort stund"],
    ["Pause briefly", "Pausa kort"],
    ["pause briefly", "pausa kort"],
    ["pause for a moment", "pausa en kort stund"],
    ["Slowly lower", "Sänk långsamt"],
    ["Slowly release", "Släpp långsamt"],
    ["slowly lower", "sänk långsamt"],
    ["slowly release", "släpp långsamt"],
    ["slowly return", "återgå långsamt"],
    ["Slowly return", "Återgå långsamt"],
    ["Return to", "Återgå till"],
    ["return to", "återgå till"],
    ["squeezing your shoulder blades", "pressa ihop skulderbladen"],
    ["squeezing your lats", "pressa ihop lats"],
    ["squeezing your glutes", "kläm åt sätesmusklerna"],
    ["squeezing your biceps", "spänn biceps"],
    ["squeeze your shoulder blades together", "pressa ihop skulderbladen"],
    ["squeeze your shoulder blades", "pressa ihop skulderbladen"],
    ["squeeze your lats", "pressa ihop lats"],
    ["squeeze your glutes", "kläm åt sätesmusklerna"],
    ["overhand grip", "överhandsgrepp"],
    ["underhand grip", "underhandsgrepp"],
    ["neutral grip", "neutralt grepp"],
    ["shoulder-width apart", "axelbrett isär"],
    ["shoulder-width", "axelbrett"],
    ["contracting your biceps", "spänn biceps"],
    ["contracting your", "spänn"],
    ["exhale as you", "andas ut när du"],
    ["inhale as you", "andas in när du"],
    ["exhale", "andas ut"],
    ["inhale", "andas in"],
    ["slightly bent", "lätt böjda"],
    ["slightly bending", "lätt böjd"],
    ["slightly bend", "böj lätt"],
    ["slightly wider than", "något bredare än"],
    ["slightly wider", "något bredare"],
    ["make sure", "se till att"],
    ["Make sure", "Se till att"],
    ["This is your starting position", "Det är din startposition"],
    ["This is the starting position", "Det är startpositionen"],
    ["Lower your body", "Sänk kroppen"],
    ["Raise your body", "Lyft kroppen"],
    ["Extend your arms", "Sträck ut armarna"],
    ["Extend your legs", "Sträck ut benen"],
    ["Bend your knees", "Böj knäna"],
    ["Bend your elbows", "Böj armbågarna"],
    ["your body weight", "din kroppsvikt"],
    ["your body", "din kropp"],
    ["the movement", "rörelsen"],
    ["the exercise", "övningen"],
    ["the bar", "stången"],
    ["the barbell", "skivstången"],
    ["the dumbbell", "hanteln"],
    ["the dumbbells", "hantelns"],
    ["the handles", "handtagen"],
    ["the handle", "handtaget"],
    ["the weight", "vikten"],
    ["the floor", "golvet"],
    ["the machine", "maskinen"],
    ["the bench", "bänken"],
    ["the cable", "kabeln"],
    ["the cables", "kablarna"],
    ["the rack", "ställningen"],
    ["the seat", "sätet"],
    ["the pad", "stödet"],
    ["the pads", "stöden"],
    ["the footrests", "fotstöden"],
    ["the foot plate", "fotplattan"],
    ["the pulleys", "kablarna"],
    ["the pulley", "kabeln"],
    ["the top", "toppen"],
    ["the bottom", "botten"],
    ["your body", "din kropp"],
  ];

  for (const [en, sv] of phraseReplacements) {
    s = replaceAllCaseInsensitive(s, en, sv);
  }

  // Enstaka ord (EFTER fraser)
  const wordReplacements = [
    ["barbell", "skivstång"],
    ["barbells", "skivstänger"],
    ["dumbbell", "hantel"],
    ["dumbbells", "hantlar"],
    ["cable", "kabel"],
    ["machine", "maskin"],
    ["bench", "bänk"],
    ["rack", "ställning"],
    ["knees", "knän"],
    ["knee", "knä"],
    ["elbows", "armbågar"],
    ["elbow", "armbåge"],
    ["feet", "fötter"],
    ["foot", "fot"],
    ["hands", "händer"],
    ["hand", "hand"],
    ["handles", "handtag"],
    ["handle", "handtag"],
    ["hips", "höfterna"],
    ["hip", "höften"],
    ["shoulders", "axlarna"],
    ["shoulder", "axeln"],
    ["glutes", "sätesmusklerna"],
    ["lats", "lats"],
    ["core", "bålen"],
    ["torso", "överkroppen"],
    ["chest", "bröstet"],
    ["back", "ryggen"],
    ["arms", "armarna"],
    ["arm", "armen"],
    ["legs", "benen"],
    ["leg", "benet"],
    ["wrists", "handlederna"],
    ["wrist", "handleden"],
    ["palms", "handflatorna"],
    ["palm", "handflatan"],
    ["heels", "hälarna"],
    ["heel", "hälen"],
    ["toes", "tårna"],
    ["toe", "tån"],
    ["neck", "nacken"],
    ["head", "huvudet"],
    ["spine", "ryggraden"],
    ["abs", "magrutor"],
    ["repetitions", "repetitioner"],
    ["repetition", "repetition"],
    ["reps", "repetitioner"],
    ["rep", "repetition"],
    ["movement", "rörelse"],
    ["position", "position"],
    ["slowly", "långsamt"],
    ["controlled", "kontrollerat"],
    ["straight", "rakt"],
    ["relaxed", "avslappnade"],
    ["flat", "plant"],
    ["bent", "böjda"],
    ["extended", "utsträckta"],
    ["neutral", "neutral"],
    ["forward", "framåt"],
    ["backward", "bakåt"],
    ["upward", "uppåt"],
    ["downward", "nedåt"],
    ["inward", "inåt"],
    ["outward", "utåt"],
    ["towards", "mot"],
    ["toward", "mot"],
    ["against", "mot"],
    ["until", "tills"],
    ["while", "medan"],
    ["then", "sedan"],
    ["next", "nästa"],
    ["finally", "slutligen"],
    ["also", "också"],
    ["throughout", "under hela"],
    ["during", "under"],
    ["between", "mellan"],
    ["above", "ovanför"],
    ["below", "nedanför"],
    ["behind", "bakom"],
    ["in front of", "framför"],
    ["on each side", "på varje sida"],
    ["on both sides", "på båda sidor"],
    ["with", "med"],
    ["and", "och"],
  ];

  for (const [en, sv] of wordReplacements) {
    s = s.replace(new RegExp(`\\b${en}\\b`, "gi"), sv);
  }

  // Städa upp kvarlämnande engelska artiklar och pronomen som inte matchat fraser
  s = replaceAllCaseInsensitive(s, " your ", " ");
  s = replaceAllCaseInsensitive(s, " the ", " ");
  s = replaceAllCaseInsensitive(s, " an ", " ");
  s = replaceAllCaseInsensitive(s, " a ", " ");
  s = replaceAllCaseInsensitive(s, " of ", " av ");
  s = replaceAllCaseInsensitive(s, " at ", " vid ");
  s = replaceAllCaseInsensitive(s, " on ", " på ");
  s = replaceAllCaseInsensitive(s, " in ", " i ");
  s = replaceAllCaseInsensitive(s, " to ", " till ");
  s = replaceAllCaseInsensitive(s, " for ", " för ");
  s = replaceAllCaseInsensitive(s, " by ", " med ");
  s = replaceAllCaseInsensitive(s, " from ", " från ");
  s = replaceAllCaseInsensitive(s, " or ", " eller ");
  s = replaceAllCaseInsensitive(s, " as ", " när ");
  s = replaceAllCaseInsensitive(s, " when ", " när ");
  s = replaceAllCaseInsensitive(s, " that ", " ");
  s = replaceAllCaseInsensitive(s, " this ", " ");
  s = replaceAllCaseInsensitive(s, " not ", " inte ");
  s = replaceAllCaseInsensitive(s, " do not ", " undvik att ");
  s = replaceAllCaseInsensitive(s, " is ", " är ");
  s = replaceAllCaseInsensitive(s, " are ", " är ");

  // Städa dubbla mellanslag och versal i börjar
  s = s.replace(/\s{2,}/g, " ").trim();
  if (s.length > 0) {
    s = s.charAt(0).toUpperCase() + s.slice(1);
  }
  return s;
}

// ─── HTTP-hjälpfunktion ───────────────────────────────────────────────────────

function fetchJson(urlStr) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: "GET",
      headers: { "User-Agent": "exercise-cache-generator/1.0" },
    };
    const req = https.request(options, (res) => {
      let raw = "";
      res.setEncoding("utf8");
      res.on("data", (c) => (raw += c));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(raw) });
        } catch (e) {
          resolve({ status: res.statusCode, body: null, raw });
        }
      });
    });
    req.setTimeout(15000, () => req.destroy(new Error("Timeout")));
    req.on("error", reject);
    req.end();
  });
}

// ─── Huvud ────────────────────────────────────────────────────────────────────

async function main() {
  const outPath = path.join(__dirname, "exercise-static.json");
  const unique = [...new Set(SLUGS)];
  console.log(`Hämtar ${unique.length} övningar från ${PROXY_BASE} ...\n`);

  const exercises = {};
  let ok = 0;
  let fail = 0;

  for (const slug of unique) {
    const url = `${PROXY_BASE}?name=${encodeURIComponent(slug)}`;
    process.stdout.write(`  ${slug} ... `);
    try {
      const { status, body } = await fetchJson(url);
      if (status !== 200 || !body?.found) {
        exercises[slug] = { found: false, error: body?.error || `HTTP ${status}` };
        console.log(`FEL (${status})`);
        fail++;
      } else {
        // Applicera översättning och spara
        exercises[slug] = {
          found: true,
          translated: true,
          id: body.id,
          name: body.name,
          bodyPart: translateExerciseTerm(body.bodyPart),
          target: translateExerciseTerm(body.target),
          gifUrl: body.gifUrl,
          instructions: (body.instructions || []).map(translateInstructionToSwedish),
        };
        console.log("OK");
        ok++;
      }
    } catch (err) {
      exercises[slug] = { found: false, error: err.message };
      console.log(`FEL: ${err.message}`);
      fail++;
    }

    // Kort paus för att undvika rate-limiting
    await new Promise((r) => setTimeout(r, 300));
  }

  const output = {
    generatedAt: new Date().toISOString(),
    source: "ExerciseDB via /api/exercise-proxy (föröversatt till svenska)",
    count: unique.length,
    exercises,
  };

  fs.writeFileSync(outPath, JSON.stringify(output, null, 2), "utf8");
  console.log(`\n✓ Klar: ${ok} hittade, ${fail} misslyckades.`);
  console.log(`Sparat till: ${outPath}`);
}

main().catch((err) => {
  console.error("Fel:", err.message);
  process.exit(1);
});
