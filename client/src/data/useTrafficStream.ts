import { useEffect } from "react";
import { useAppStore } from "./store";
import type { Network, Snapshot, Train } from "./types";

function trimTrailingSlash(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function getApiBase() {
  const configured = import.meta.env.VITE_API_BASE_URL as string | undefined;
  return configured ? trimTrailingSlash(configured) : "";
}

function getWsBase() {
  const configured = import.meta.env.VITE_WS_BASE_URL as string | undefined;
  if (configured) return trimTrailingSlash(configured);

  const apiBase = getApiBase();
  if (apiBase) {
    try {
      const parsed = new URL(apiBase);
      const wsProto = parsed.protocol === "https:" ? "wss:" : "ws:";
      return `${wsProto}//${parsed.host}`;
    } catch {
      return "";
    }
  }

  return "";
}

interface DemoVehicle {
  id: string;
  lineId: string;
  lineGroup: string;
  color: string;
  mode: Train["mode"];
  direction: 1 | -1;
  segment: number;
  progress: number;
  speed: number;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function createDemoSnapshot(network: Network, vehicles: DemoVehicle[]): Snapshot {
  const byId = new Map(network.stations.map((s) => [s.id, s]));
  const lines = new Map(network.lines.map((l) => [l.id, l]));
  const trains: Train[] = [];

  for (const v of vehicles) {
    const line = lines.get(v.lineId);
    if (!line || line.stations.length < 2) continue;

    const fromId = line.stations[v.segment];
    const toId = line.stations[v.segment + 1];
    const from = byId.get(fromId);
    const to = byId.get(toId);
    if (!from || !to) continue;

    const p = Math.max(0, Math.min(1, v.progress));
    const lat = lerp(from.lat, to.lat, p);
    const lon = lerp(from.lon, to.lon, p);
    const atStation = p < 0.06 || p > 0.94;

    trains.push({
      id: v.id,
      lineId: v.lineId,
      lineGroup: v.lineGroup,
      mode: v.mode,
      color: v.color,
      status: "ok",
      delay: 0,
      direction: v.direction,
      from: fromId,
      to: toId,
      progress: p,
      atStation,
      lat,
      lon,
      depth: 0,
    });
  }

  return { t: Date.now(), trains, alerts: [] };
}

function advanceDemoVehicles(network: Network, vehicles: DemoVehicle[]) {
  const lines = new Map(network.lines.map((l) => [l.id, l]));
  for (const v of vehicles) {
    const line = lines.get(v.lineId);
    if (!line || line.stations.length < 2) continue;

    v.progress += v.speed;
    if (v.progress < 1) continue;

    v.progress = 0;
    if (v.direction === 1) {
      if (v.segment >= line.stations.length - 2) {
        v.direction = -1;
      } else {
        v.segment += 1;
      }
    } else if (v.segment <= 0) {
      v.direction = 1;
    } else {
      v.segment -= 1;
    }
  }
}

function buildDemoFleet(network: Network): DemoVehicle[] {
  const vehicles: DemoVehicle[] = [];
  for (const line of network.lines) {
    if (line.stations.length < 2) continue;
    vehicles.push({
      id: `demo-${line.id}-a`,
      lineId: line.id,
      lineGroup: line.id,
      color: line.color,
      mode: line.mode ?? "bus",
      direction: 1,
      segment: 0,
      progress: Math.random() * 0.7,
      speed: 0.06 + Math.random() * 0.03,
    });
    vehicles.push({
      id: `demo-${line.id}-b`,
      lineId: line.id,
      lineGroup: line.id,
      color: line.color,
      mode: line.mode ?? "bus",
      direction: -1,
      segment: Math.max(0, line.stations.length - 2),
      progress: Math.random() * 0.7,
      speed: 0.06 + Math.random() * 0.03,
    });
  }
  return vehicles;
}



export function useTrafficStream() {
  const setNetwork = useAppStore((s) => s.setNetwork);
  const applySnapshot = useAppStore((s) => s.applySnapshot);
  const setConnected = useAppStore((s) => s.setConnected);
  const setSource = useAppStore((s) => s.setSource);
  const network = useAppStore((s) => s.network);

  const useBrowserDemo = import.meta.env.PROD && !getApiBase() && !getWsBase();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`${getApiBase()}/api/network`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as Network;
        if (!cancelled) setNetwork(data);
      } catch (err) {
        try {
          const localRes = await fetch("/network.json");
          if (!localRes.ok) throw new Error(`HTTP ${localRes.status}`);
          const localData = (await localRes.json()) as Network;
          if (!cancelled) {
            setNetwork(localData);
            setSource("simulator");
          }
        } catch (fallbackErr) {
          console.error("Failed to load network:", err, fallbackErr);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [setNetwork]);

  useEffect(() => {
    if (useBrowserDemo && network) {
      const vehicles = buildDemoFleet(network);
      setConnected(true);
      setSource("simulator");
      applySnapshot(createDemoSnapshot(network, vehicles));
      const handle = window.setInterval(() => {
        advanceDemoVehicles(network, vehicles);
        applySnapshot(createDemoSnapshot(network, vehicles));
      }, 1000);
      return () => clearInterval(handle);
    }

    let ws: WebSocket | null = null;
    let reconnectHandle: number | null = null;
    let pollHandle: number | null = null;
    let closed = false;

    async function fetchSnapshot() {
      const apiBase = getApiBase();
      if (!apiBase) return;

      try {
        const res = await fetch(`${apiBase}/api/snapshot`);
        if (!res.ok) return;
        const payload = (await res.json()) as {
          source?: "simulator" | "trafiklab";
          aiEnabled?: boolean;
          ai?: { latest?: any; error?: string | null };
          data?: Snapshot;
        };
        if (!payload.data) return;

        setConnected(true);
        setSource(payload.source === "trafiklab" ? "trafiklab" : "simulator");
        useAppStore.getState().setAIEnabled(!!payload.aiEnabled);
        useAppStore.getState().setAIAnalysis(payload.ai?.latest ?? null, payload.ai?.error ?? null);
        applySnapshot(payload.data);
      } catch {
        setConnected(false);
      }
    }

    function startPolling() {
      if (pollHandle !== null) return;
      fetchSnapshot();
      pollHandle = window.setInterval(fetchSnapshot, 5000);
    }

    function stopPolling() {
      if (pollHandle !== null) {
        clearInterval(pollHandle);
        pollHandle = null;
      }
    }

    function connect() {
      const wsBase = getWsBase();
      const proto = location.protocol === "https:" ? "wss:" : "ws:";
      const url = wsBase ? `${wsBase}/stream` : `${proto}//${location.host}/stream`;
      ws = new WebSocket(url);

      ws.onopen = () => {
        stopPolling();
        setConnected(true);
      };
      ws.onclose = () => {
        startPolling();
        if (!closed) reconnectHandle = window.setTimeout(connect, 1500);
      };
      ws.onerror = () => { ws?.close(); };
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === "hello") {
            stopPolling();
            setConnected(true);
            setSource(msg.source === "trafiklab" ? "trafiklab" : "simulator");
            useAppStore.getState().setAIEnabled(!!msg.aiEnabled);
          } else if (msg.type === "snapshot") {
            stopPolling();
            setConnected(true);
            applySnapshot(msg.data);
          } else if (msg.type === "ai") {
            const { latest, error } = msg.data ?? {};
            useAppStore.getState().setAIAnalysis(latest ?? null, error ?? null);
          }
        } catch (err) {
          console.warn("Bad WS message:", err);
        }
      };
    }

    if (getApiBase()) startPolling();
    connect();

    return () => {
      closed = true;
      if (reconnectHandle !== null) clearTimeout(reconnectHandle);
      stopPolling();
      ws?.close();
    };
  }, [applySnapshot, network, setConnected, setSource, useBrowserDemo]);
}
