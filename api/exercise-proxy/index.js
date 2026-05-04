// Proxy: Browser → Azure Function → ExerciseDB (RapidAPI)
// Löser CORS-problemet — browsern anropar aldrig ExerciseDB direkt.
//
// Miljövariabel som måste sättas i Azure Static Web App / local.settings.json:
//   EXERCISEDB_API_KEY = din RapidAPI-nyckel för exercisedb.p.rapidapi.com

const EXERCISEDB_BASE = "https://exercisedb.p.rapidapi.com";

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
    const url = `${EXERCISEDB_BASE}/exercises/name/${encodeURIComponent(name)}?limit=3&offset=0`;
    const resp = await fetch(url, {
      headers: {
        "X-RapidAPI-Key": apiKey,
        "X-RapidAPI-Host": "exercisedb.p.rapidapi.com",
      },
    });

    if (!resp.ok) {
      return cors({ error: `ExerciseDB svarade ${resp.status}` }, 502);
    }

    const data = await resp.json();
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
