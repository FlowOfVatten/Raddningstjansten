import { writeFileSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { buildNetworkFromGtfsDir } from "../src/gtfsStaticNetwork.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SERVER_NETWORK = resolve(__dirname, "../data/network.json");
const CLIENT_NETWORK = resolve(__dirname, "../../client/public/network.json");
const TRIP_LINES = resolve(__dirname, "../data/trip-lines.json");

const gtfsDir = process.env.GTFS_STATIC_DIR || process.argv[2];
const lines = String(process.env.STATIC_GTFS_LINES ?? "120,125")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

if (!gtfsDir) {
  console.error("Missing GTFS directory. Set GTFS_STATIC_DIR or pass the extracted GTFS folder as the first argument.");
  process.exit(1);
}

const fallbackNetwork = JSON.parse(readFileSync(SERVER_NETWORK, "utf8").replace(/^\uFEFF/, ""));
const { network, tripToLine } = await buildNetworkFromGtfsDir({
  gtfsDir,
  lineNumbers: lines,
  fallbackOrigin: fallbackNetwork.origin,
});

writeFileSync(SERVER_NETWORK, `${JSON.stringify(network, null, 2)}\n`);
writeFileSync(CLIENT_NETWORK, `${JSON.stringify(network, null, 2)}\n`);
writeFileSync(TRIP_LINES, `${JSON.stringify(tripToLine, null, 2)}\n`);

console.log(`Built network for lines ${lines.join(", ")} from ${gtfsDir}`);
console.log(`Stations: ${network.stations.length}`);
console.log(`Lines: ${network.lines.length}`);
console.log(`Trip mappings: ${Object.keys(tripToLine).length}`);