import { useEffect, useState } from "react";
import { useTrafficStream } from "./data/useTrafficStream";
import { useAppStore } from "./data/store";
import { Scene } from "./scene/Scene";
import { MapView } from "./map/MapView";
import { Controls } from "./ui/Controls";
import { Legend } from "./ui/Legend";
import { Header } from "./ui/Header";
import { Alerts } from "./ui/Alerts";
import { InfoPanel } from "./ui/InfoPanel";
import { StationInfoPanel } from "./ui/StationInfoPanel";
import { AIPanel } from "./ui/AIPanel";
import { StationSearch } from "./ui/StationSearch";
import { TrendPanel } from "./ui/TrendPanel";

type ViewMode = "3d" | "map";
const VIEW_MODE_KEY = "alunda:view-mode";

export default function App() {
  useTrafficStream();
  const network = useAppStore((s) => s.network);
  const connected = useAppStore((s) => s.connected);
  const showLabels = useAppStore((s) => s.showLabels);
  const setShowLabels = useAppStore((s) => s.setShowLabels);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try {
      const value = localStorage.getItem(VIEW_MODE_KEY);
      return value === "map" ? "map" : "3d";
    } catch {
      return "3d";
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(VIEW_MODE_KEY, viewMode);
    } catch {}
  }, [viewMode]);

  return (
    <div className="app">
      {viewMode === "3d" ? <Scene /> : <MapView />}
      <div className="ui-overlay">
        <Header />
        <StationSearch />
        <Controls />
        <Legend />
        <Alerts />
        <InfoPanel />
        <StationInfoPanel />
        <AIPanel />
        <TrendPanel />
        <div style={{ position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 8 }}>
          <button
            onClick={() => setViewMode(viewMode === "3d" ? "map" : "3d")}
            className="panel"
            style={{
              padding: "8px 14px",
              fontSize: 11,
              letterSpacing: 0.14,
              textTransform: "uppercase",
              background: "rgba(124,196,255,0.12)",
              borderColor: "rgba(124,196,255,0.4)",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            {viewMode === "3d" ? "Visa karta" : "Visa 3D"}
          </button>
          {viewMode === "3d" && (
            <button
              onClick={() => setShowLabels(!showLabels)}
              className="panel"
              style={{
                padding: "8px 14px",
                fontSize: 11,
                letterSpacing: 0.14,
                textTransform: "uppercase",
                background: showLabels ? "rgba(124,196,255,0.12)" : "rgba(10,15,28,0.72)",
                borderColor: showLabels ? "rgba(124,196,255,0.4)" : "rgba(255,255,255,0.06)",
                color: showLabels ? "#fff" : "#8b98ad",
                cursor: "pointer",
              }}
            >
              {showLabels ? "Dölj etiketter" : "Visa etiketter"}
            </button>
          )}
        </div>
        <div className="footer" style={{ bottom: 60 }}>Alunda regional busstrafik · Simulatorläge · {network?.stations.length ?? "—"} hållplatser</div>
      </div>
      {!network && (
        <div className="loading">
          <div className="row"><div className="spinner" /> Läser in bussnätet runt Alunda…</div>
        </div>
      )}
      {network && !connected && (
        <div className="loading" style={{ alignItems: "start", paddingTop: 120 }}>
          <div className="row"><div className="spinner" /> Återansluter realtidsström…</div>
        </div>
      )}
    </div>
  );
}
