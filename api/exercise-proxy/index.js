// Proxy: Browser → Azure Function → ExerciseDB (RapidAPI)
// Löser CORS-problemet — browsern anropar aldrig ExerciseDB direkt.
//
// Miljövariabel som måste sättas i Azure Static Web App / local.settings.json:
//   EXERCISEDB_API_KEY = din RapidAPI-nyckel för exercisedb.p.rapidapi.com

const https = require("https");

const EXERCISEDB_HOST = "exercisedb.p.rapidapi.com";

function cors(body, status) {
  return {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify(body),
  };
}

function requestJson(path, apiKey) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        protocol: "https:",
        hostname: EXERCISEDB_HOST,
        path,
        method: "GET",
        headers: {
          "X-RapidAPI-Key": apiKey,
          "X-RapidAPI-Host": EXERCISEDB_HOST,
        },
      },
      (res) => {
        let raw = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          raw += chunk;
        });
        res.on("end", () => {
          let parsed = null;
          try {
            parsed = raw ? JSON.parse(raw) : null;
          } catch (_err) {
            parsed = null;
          }

          resolve({
            statusCode: res.statusCode || 500,
            body: parsed,
            raw,
          });
        });
      }
    );

    req.setTimeout(10000, () => {
      req.destroy(new Error("Timeout mot ExerciseDB"));
    });
    req.on("error", (err) => reject(err));
    req.end();
  });
}

module.exports = async function (context, req) {
  const name = (req.query.name || "").trim();
  if (!name) {
    return cors({ error: "Ange ?name=övningsnamn" }, 400);
  }

  const apiKey = process.env.EXERCISEDB_API_KEY || "";
  if (!apiKey) {
    return cors({ error: "EXERCISEDB_API_KEY saknas i miljövariabler." }, 503);
  }

  try {
    const path = `/exercises/name/${encodeURIComponent(name)}?limit=3&offset=0`;
    const result = await requestJson(path, apiKey);
    if (result.statusCode < 200 || result.statusCode >= 300) {
      return cors(
        {
          error: `ExerciseDB svarade ${result.statusCode}`,
          details: typeof result.body === "object" ? result.body : result.raw,
        },
        502
      );
    }

    const data = result.body;
    if (!Array.isArray(data) || data.length === 0) {
      return cors({ found: false }, 200);
    }

    // Returnera det mest relevanta träffet (första)
    const ex = data[0];
    return cors(
      {
        found: true,
        id: ex.id,
        name: ex.name,
        bodyPart: ex.bodyPart,
        target: ex.target,
        gifUrl: ex.gifUrl,
        instructions: ex.instructions || [],
      },
      200
    );
  } catch (err) {
    return cors({ error: err.message }, 502);
  }
};
