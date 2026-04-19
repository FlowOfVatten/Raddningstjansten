import { useEffect } from "react";
import { useAppStore } from "./store";
import type { Network } from "./types";

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



export function useTrafficStream() {
  const setNetwork = useAppStore((s) => s.setNetwork);
  const applySnapshot = useAppStore((s) => s.applySnapshot);
  const setConnected = useAppStore((s) => s.setConnected);
  const setSource = useAppStore((s) => s.setSource);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`${getApiBase()}/api/network`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as Network;
        if (!cancelled) setNetwork(data);
      } catch (err) {
        console.error("Failed to load network:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [setNetwork]);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectHandle: number | null = null;
    let closed = false;

    function connect() {
      const wsBase = getWsBase();
      const proto = location.protocol === "https:" ? "wss:" : "ws:";
      const url = wsBase ? `${wsBase}/stream` : `${proto}//${location.host}/stream`;
      ws = new WebSocket(url);

      ws.onopen = () => setConnected(true);
      ws.onclose = () => {
        setConnected(false);
        if (!closed) reconnectHandle = window.setTimeout(connect, 1500);
      };
      ws.onerror = () => { ws?.close(); };
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === "hello") {
            setSource(msg.source === "trafiklab" ? "trafiklab" : "simulator");
            useAppStore.getState().setAIEnabled(!!msg.aiEnabled);
          } else if (msg.type === "snapshot") {
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

    connect();

    return () => {
      closed = true;
      if (reconnectHandle !== null) clearTimeout(reconnectHandle);
      ws?.close();
    };
  }, [applySnapshot, setConnected, setSource]);
}
