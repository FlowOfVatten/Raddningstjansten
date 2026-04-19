import express from "express";
import cors from "cors";
import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { Simulator } from "./simulator.js";
import { LiveSource, hasTrafiklabKey } from "./liveSource.js";
import { AIAnalyst } from "./aiAnalyst.js";
import { TrendRecorder } from "./trendRecorder.js";
import { loadConfiguredStaticNetwork } from "./gtfsStaticNetwork.js";
import { haversine } from "./geo.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const NETWORK_PATH = resolve(__dirname, "../data/network.json");

function parseJsonFile(filePath) {
  const raw = readFileSync(filePath, "utf8");
  const clean = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
  return JSON.parse(clean);
}

function calculateTrainSpeeds(currentSnapshot, previousSnapshot) {
  if (!previousSnapshot || !previousSnapshot.trains) return new Map();
  
  const timeDeltaS = (currentSnapshot.t - previousSnapshot.t) / 1000;
  if (timeDeltaS < 1) return new Map();
  
  const prevTrainMap = new Map(previousSnapshot.trains.map((t) => [t.id, t]));
  const speeds = new Map();
  
  for (const train of currentSnapshot.trains) {
    const prevTrain = prevTrainMap.get(train.id);
    if (!prevTrain) continue;
    
    const distanceM = haversine(
      { lat: prevTrain.lat, lon: prevTrain.lon },
      { lat: train.lat, lon: train.lon }
    );
    
    const speedKmh = (distanceM / 1000) / (timeDeltaS / 3600);
    if (!isNaN(speedKmh) && speedKmh >= 0 && speedKmh < 200) {
      speeds.set(train.id, Math.round(speedKmh));
    }
  }
  
  return speeds;
}

const fallbackNetwork = parseJsonFile(NETWORK_PATH);
const { network, tripToLine, metadata: staticMetadata } = await loadConfiguredStaticNetwork({
  fallbackNetwork,
});

const PORT = Number(process.env.PORT ?? 4000);
const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.post("/api/_snapshot", async (req, res) => {
  const { data, name } = req.body ?? {};
  if (!data || typeof data !== "string") return res.status(400).json({ error: "bad body" });
  const b64 = data.split(",").pop();
  const buf = Buffer.from(b64, "base64");
  const fs = await import("node:fs/promises");
  const file = `/tmp/${(name || "snap") + "-" + Date.now()}.png`;
  await fs.writeFile(file, buf);
  res.json({ ok: true, file });
});

app.get("/api/network", (_req, res) => {
  res.json(network);
});

app.get("/api/status", (_req, res) => {
  const snap = source.snapshot();
  res.json({
    status: "ok",
    source: hasTrafiklabKey() ? "trafiklab-gtfs-rt" : "simulator",
    networkStations: network.stations.length,
    networkLines: network.lines.length,
    staticGtfsImported: !!staticMetadata,
    staticGtfsLines: staticMetadata?.lines ?? null,
    trains: snap.trains.length,
    alerts: snap.alerts.length,
    uptime: Date.now() - startTime,
  });
});

app.get("/api/snapshot", (_req, res) => {
  const snap = source.snapshot();
  const trainSpeeds = calculateTrainSpeeds(snap, lastSnapshot);
  lastSnapshot = snap;
  
  const snapshotWithSpeeds = {
    ...snap,
    trains: snap.trains.map((t) => ({
      ...t,
      speed: trainSpeeds.get(t.id) ?? null,
    })),
  };
  
  res.json({
    source: hasTrafiklabKey() ? "trafiklab" : "simulator",
    aiEnabled: !!aiAnalyst.apiKey,
    ai: {
      latest: aiAnalyst.latest,
      error: aiAnalyst.lastError,
    },
    data: snapshotWithSpeeds,
  });
});

const server = createServer(app);
const wss = new WebSocketServer({ server, path: "/stream" });

const startTime = Date.now();
let lastSnapshot = null;
const liveEnabled = (process.env.ENABLE_LIVE_GTFS === "1" || process.env.ENABLE_SL_GTFS === "1") && hasTrafiklabKey();

const source = liveEnabled
  ? new LiveSource(network, { tripToLine })
  : new Simulator(network);

const aiAnalyst = new AIAnalyst({
  getSnapshot: () => source.snapshot(),
  network,
  intervalMs: Number(process.env.AI_INTERVAL_MS ?? 90_000),
});

const trendRecorder = new TrendRecorder({
  getSnapshot: () => source.snapshot(),
  intervalMs: Number(process.env.TREND_INTERVAL_MS ?? 30_000),
  maxSamples: 120,
});

app.get("/api/trends", (_req, res) => {
  res.json(trendRecorder.snapshot());
});

wss.on("connection", (ws) => {
  ws.send(JSON.stringify({ type: "hello", source: hasTrafiklabKey() ? "trafiklab" : "simulator", aiEnabled: !!aiAnalyst.apiKey }));
  
  const initialSnap = source.snapshot();
  const initialSpeeds = calculateTrainSpeeds(initialSnap, lastSnapshot);
  lastSnapshot = initialSnap;
  const initialSnapWithSpeeds = {
    ...initialSnap,
    trains: initialSnap.trains.map((t) => ({
      ...t,
      speed: initialSpeeds.get(t.id) ?? null,
    })),
  };
  ws.send(JSON.stringify({ type: "snapshot", data: initialSnapWithSpeeds }));
  
  if (aiAnalyst.latest) {
    ws.send(JSON.stringify({ type: "ai", data: { latest: aiAnalyst.latest, error: aiAnalyst.lastError } }));
  }

  const unsubscribe = source.on((snap) => {
    if (ws.readyState === WebSocket.OPEN) {
      const trainSpeeds = calculateTrainSpeeds(snap, lastSnapshot);
      lastSnapshot = snap;
      const snapWithSpeeds = {
        ...snap,
        trains: snap.trains.map((t) => ({
          ...t,
          speed: trainSpeeds.get(t.id) ?? null,
        })),
      };
      ws.send(JSON.stringify({ type: "snapshot", data: snapWithSpeeds }));
    }
  });
  const unsubscribeAI = aiAnalyst.on((payload) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "ai", data: payload }));
    }
  });

  ws.on("close", () => {
    unsubscribe();
    unsubscribeAI();
  });
});

server.listen(PORT, () => {
  console.log(`[alunda-busspuls] server on http://localhost:${PORT}`);
  console.log(`[alunda-busspuls] data source: ${liveEnabled ? "GTFS-RT live" : "simulator"}`);
  if (staticMetadata) {
    console.log(`[static-gtfs] loaded ${staticMetadata.lineCount} lines / ${staticMetadata.stationCount} stations from ${staticMetadata.gtfsDir}`);
  }
});

process.on("SIGINT", () => {
  source.stop();
  aiAnalyst.stop();
  trendRecorder.stop();
  server.close(() => process.exit(0));
});
