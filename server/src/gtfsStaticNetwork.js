import { createReadStream, readFileSync } from "node:fs";
import { createInterface } from "node:readline";

const DEFAULT_LINES = ["120", "125"];
const LINE_COLORS = {
  "120": "#2a9d8f",
  "125": "#e76f51",
};

export async function loadConfiguredStaticNetwork({ fallbackNetwork }) {
  const gtfsDir = process.env.GTFS_STATIC_DIR?.trim();
  const lines = parseLineSelection(process.env.STATIC_GTFS_LINES);
  if (!gtfsDir) {
    return { network: fallbackNetwork, tripToLine: null, metadata: null };
  }

  try {
    const result = await buildNetworkFromGtfsDir({
      gtfsDir,
      lineNumbers: lines,
      fallbackOrigin: fallbackNetwork.origin,
    });
    return {
      network: result.network,
      tripToLine: result.tripToLine,
      metadata: {
        gtfsDir,
        lines,
        stationCount: result.network.stations.length,
        lineCount: result.network.lines.length,
        tripCount: Object.keys(result.tripToLine).length,
      },
    };
  } catch (error) {
    console.warn(`[static-gtfs] failed to build network from ${gtfsDir}: ${error.message}`);
    return { network: fallbackNetwork, tripToLine: null, metadata: null };
  }
}

export async function buildNetworkFromGtfsDir({ gtfsDir, lineNumbers = DEFAULT_LINES, fallbackOrigin }) {
  const selectedLines = new Set(lineNumbers.map((line) => String(line).trim()).filter(Boolean));
  const routesPath = `${gtfsDir}/routes.txt`;
  const tripsPath = `${gtfsDir}/trips.txt`;
  const stopTimesPath = `${gtfsDir}/stop_times.txt`;
  const stopsPath = `${gtfsDir}/stops.txt`;

  const routesById = readRoutes(routesPath, selectedLines);
  if (routesById.size === 0) {
    throw new Error(`no routes matched ${Array.from(selectedLines).join(", ")}`);
  }

  const { tripsById, tripsByLine } = readTrips(tripsPath, routesById);
  if (tripsById.size === 0) {
    throw new Error("no trips matched the selected routes");
  }

  const tripStopTimes = await readStopTimes(stopTimesPath, tripsById);
  const stopsById = readStops(stopsPath);

  const usedStations = new Map();
  const lines = [];
  const tripToLine = {};

  for (const lineNumber of selectedLines) {
    const lineTrips = tripsByLine.get(lineNumber) ?? [];
    const directionGroups = new Map();

    for (const trip of lineTrips) {
      const stopTimes = tripStopTimes.get(trip.tripId);
      if (!stopTimes?.length) continue;
      const resolved = resolveSequence(stopTimes, stopsById);
      if (resolved.length < 2) continue;

      const groupKey = trip.directionId ?? "0";
      const existing = directionGroups.get(groupKey) ?? [];
      existing.push(resolved);
      directionGroups.set(groupKey, existing);

      tripToLine[trip.tripId] = {
        mode: "bus",
        lineId: lineNumber,
        color: colorForLine(lineNumber),
      };
    }

    const preferredSequences = choosePreferredDirection(directionGroups);
    const mergedStationIds = mergeSequences(preferredSequences);
    if (mergedStationIds.length < 2) continue;

    for (const stationId of mergedStationIds) {
      const stop = stopsById.get(stationId);
      if (!stop) continue;
      const station = usedStations.get(stationId) ?? {
        id: `ul-${stationId}`,
        name: stop.name,
        lat: stop.lat,
        lon: stop.lon,
        depth: 0,
        mode: "bus",
        lines: [],
      };
      if (!station.lines.includes(lineNumber)) station.lines.push(lineNumber);
      usedStations.set(stationId, station);
    }

    const routeName = chooseRouteName(lineTrips, lineNumber);
    lines.push({
      id: lineNumber,
      line: lineNumber,
      name: routeName,
      color: colorForLine(lineNumber),
      mode: "bus",
      stations: mergedStationIds.map((stationId) => `ul-${stationId}`),
    });
  }

  if (lines.length === 0 || usedStations.size === 0) {
    throw new Error("selected lines produced no stations");
  }

  const originStation =
    Array.from(usedStations.values()).find((station) => station.name.toLowerCase().includes("alunda")) ??
    Array.from(usedStations.values())[0];

  return {
    network: {
      origin: originStation
        ? { lat: originStation.lat, lon: originStation.lon, label: originStation.name }
        : fallbackOrigin,
      stations: Array.from(usedStations.values()),
      lines,
    },
    tripToLine,
  };
}

function parseLineSelection(raw) {
  const parsed = String(raw ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return parsed.length > 0 ? parsed : DEFAULT_LINES;
}

function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let index = 0; index < line.length; index++) {
    const char = line[index];
    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        cur += '"';
        index++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      out.push(cur);
      cur = "";
    } else {
      cur += char;
    }
  }
  out.push(cur);
  return out;
}

function readRoutes(filePath, selectedLines) {
  const rows = readCsv(filePath);
  const routes = new Map();
  for (const row of rows) {
    const shortName = String(row.route_short_name ?? "").trim();
    if (!selectedLines.has(shortName)) continue;
    routes.set(row.route_id, {
      routeId: row.route_id,
      shortName,
      longName: String(row.route_long_name ?? "").trim(),
    });
  }
  return routes;
}

function readTrips(filePath, routesById) {
  const rows = readCsv(filePath);
  const tripsById = new Map();
  const tripsByLine = new Map();

  for (const row of rows) {
    const route = routesById.get(row.route_id);
    if (!route) continue;
    const trip = {
      tripId: row.trip_id,
      routeId: row.route_id,
      lineNumber: route.shortName,
      routeLongName: route.longName,
      directionId: String(row.direction_id ?? "0"),
      headsign: String(row.trip_headsign ?? "").trim(),
    };
    tripsById.set(trip.tripId, trip);
    const existing = tripsByLine.get(route.shortName) ?? [];
    existing.push(trip);
    tripsByLine.set(route.shortName, existing);
  }

  return { tripsById, tripsByLine };
}

async function readStopTimes(filePath, tripsById) {
  const tripIds = new Set(tripsById.keys());
  const byTrip = new Map();
  const rl = createInterface({ input: createReadStream(filePath) });

  let header = null;
  for await (const line of rl) {
    if (!header) {
      header = parseCsvLine(line);
      continue;
    }
    if (!line) continue;
    const values = parseCsvLine(line);
    const row = mapRow(header, values);
    if (!tripIds.has(row.trip_id)) continue;

    const stopTimes = byTrip.get(row.trip_id) ?? [];
    stopTimes.push({
      stopId: row.stop_id,
      sequence: Number(row.stop_sequence ?? 0),
    });
    byTrip.set(row.trip_id, stopTimes);
  }

  for (const stopTimes of byTrip.values()) {
    stopTimes.sort((left, right) => left.sequence - right.sequence);
  }

  return byTrip;
}

function readStops(filePath) {
  const rows = readCsv(filePath);
  const stops = new Map();
  for (const row of rows) {
    if (!row.stop_id) continue;
    stops.set(row.stop_id, {
      id: row.stop_id,
      name: String(row.stop_name ?? "").trim(),
      lat: Number(row.stop_lat),
      lon: Number(row.stop_lon),
      parentStation: String(row.parent_station ?? "").trim() || null,
    });
  }
  return stops;
}

function resolveSequence(stopTimes, stopsById) {
  const resolved = [];
  for (const stopTime of stopTimes) {
    const stop = stopsById.get(stopTime.stopId);
    if (!stop) continue;
    const station = stop.parentStation ? stopsById.get(stop.parentStation) ?? stop : stop;
    if (!station?.name || Number.isNaN(station.lat) || Number.isNaN(station.lon)) continue;
    if (resolved[resolved.length - 1] === station.id) continue;
    resolved.push(station.id);
  }
  return resolved;
}

function choosePreferredDirection(directionGroups) {
  const ranked = Array.from(directionGroups.entries()).map(([directionId, sequences]) => ({
    directionId,
    sequences,
    stationCount: new Set(sequences.flat()).size,
  }));

  ranked.sort((left, right) => {
    if (right.stationCount !== left.stationCount) return right.stationCount - left.stationCount;
    if (right.sequences.length !== left.sequences.length) return right.sequences.length - left.sequences.length;
    if (left.directionId === "0") return -1;
    if (right.directionId === "0") return 1;
    return left.directionId.localeCompare(right.directionId);
  });

  return ranked[0]?.sequences ?? [];
}

function mergeSequences(sequences) {
  const uniqueSequences = new Map();
  for (const sequence of sequences) {
    if (sequence.length < 2) continue;
    uniqueSequences.set(sequence.join(">"), sequence);
  }

  const stationStats = new Map();
  const precedence = new Map();
  for (const sequence of uniqueSequences.values()) {
    const lastIndex = Math.max(sequence.length - 1, 1);
    for (let index = 0; index < sequence.length; index++) {
      const stationId = sequence[index];
      const stat = stationStats.get(stationId) ?? { total: 0, count: 0 };
      stat.total += index / lastIndex;
      stat.count += 1;
      stationStats.set(stationId, stat);

      for (let otherIndex = index + 1; otherIndex < sequence.length; otherIndex++) {
        const otherStationId = sequence[otherIndex];
        if (stationId === otherStationId) continue;
        const key = `${stationId}>${otherStationId}`;
        precedence.set(key, (precedence.get(key) ?? 0) + 1);
      }
    }
  }

  const stations = Array.from(stationStats.keys());
  stations.sort((left, right) => {
    const leftBeforeRight = precedence.get(`${left}>${right}`) ?? 0;
    const rightBeforeLeft = precedence.get(`${right}>${left}`) ?? 0;
    if (leftBeforeRight !== rightBeforeLeft) return rightBeforeLeft - leftBeforeRight;

    const leftAverage = averagePosition(stationStats.get(left));
    const rightAverage = averagePosition(stationStats.get(right));
    if (leftAverage !== rightAverage) return leftAverage - rightAverage;
    return left.localeCompare(right);
  });

  return stations;
}

function averagePosition(stat) {
  return stat && stat.count > 0 ? stat.total / stat.count : Number.POSITIVE_INFINITY;
}

function chooseRouteName(lineTrips, lineNumber) {
  const longName = lineTrips.find((trip) => trip.routeLongName)?.routeLongName;
  if (longName) return longName;
  const headsign = lineTrips.find((trip) => trip.headsign)?.headsign;
  return headsign ? `${lineNumber} ${headsign}` : `Skolbuss ${lineNumber}`;
}

function colorForLine(lineNumber) {
  return LINE_COLORS[lineNumber] ?? "#7cc4ff";
}

function readCsv(filePath) {
  const raw = readFileSync(filePath, "utf8");
  const lines = raw.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return [];
  const header = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => mapRow(header, parseCsvLine(line)));
}

function mapRow(header, values) {
  const row = {};
  for (let index = 0; index < header.length; index++) {
    row[header[index]] = values[index] ?? "";
  }
  return row;
}