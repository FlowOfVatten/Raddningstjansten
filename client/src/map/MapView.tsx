import { useMemo } from "react";
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useAppStore } from "../data/store";
import type { Train } from "../data/types";

export function MapView() {
  const network = useAppStore((s) => s.network);
  const trains = useAppStore((s) => s.trains);
  const hiddenLineIds = useAppStore((s) => s.hiddenLineIds);
  const setSelectedStation = useAppStore((s) => s.setSelectedStation);
  const setSelectedTrain = useAppStore((s) => s.setSelectedTrain);

  const stationById = useMemo(() => {
    const map = new Map<string, { id: string; name: string; lat: number; lon: number; lines?: string[] }>();
    for (const s of network?.stations ?? []) map.set(s.id, s);
    return map;
  }, [network]);

  const visibleLines = useMemo(() => {
    return (network?.lines ?? []).filter((line) => !hiddenLineIds.has(line.id));
  }, [hiddenLineIds, network]);

  const visibleStations = useMemo(() => {
    const stations = network?.stations ?? [];
    return stations.filter((s) => {
      if (!s.lines || s.lines.length === 0) return true;
      return s.lines.some((id) => !hiddenLineIds.has(id));
    });
  }, [hiddenLineIds, network]);

  const visibleTrains = useMemo(() => {
    return (Array.from(trains.values()) as Train[]).filter((t) => !hiddenLineIds.has(t.lineId));
  }, [hiddenLineIds, trains]);

  if (!network) return null;

  return (
    <div className="map-root">
      <MapContainer
        center={[network.origin.lat, network.origin.lon]}
        zoom={10}
        minZoom={8}
        maxZoom={16}
        scrollWheelZoom
        style={{ position: "absolute", inset: 0 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {visibleLines.map((line) => {
          const pts: [number, number][] = line.stations
            .map((id) => stationById.get(id))
            .filter((s): s is { id: string; name: string; lat: number; lon: number; lines?: string[] } => !!s)
            .map((s) => [s.lat, s.lon]);

          if (pts.length < 2) return null;
          return (
            <Polyline
              key={`line-${line.id}`}
              positions={pts}
              pathOptions={{ color: line.color, weight: 5, opacity: 0.8 }}
            />
          );
        })}

        {visibleStations.map((s) => (
          <CircleMarker
            key={`station-${s.id}`}
            center={[s.lat, s.lon]}
            radius={6}
            pathOptions={{ color: "#ffffff", weight: 1, fillColor: "#0f172a", fillOpacity: 0.9 }}
            eventHandlers={{ click: () => setSelectedStation(s.id) }}
          >
            <Tooltip direction="top" offset={[0, -6]}>
              {s.name}
            </Tooltip>
          </CircleMarker>
        ))}

        {visibleTrains.map((t) => {
          const delayed = t.status === "delayed";
          const stopped = t.status === "stopped";
          return (
            <CircleMarker
              key={`train-${t.id}`}
              center={[t.lat, t.lon]}
              radius={7}
              pathOptions={{
                color: delayed ? "#f59e0b" : stopped ? "#ef4444" : "#111827",
                weight: 1.5,
                fillColor: t.color,
                fillOpacity: 0.95,
              }}
              eventHandlers={{ click: () => setSelectedTrain(t.id) }}
            >
              <Tooltip direction="top" offset={[0, -8]}>
                {`Buss ${t.lineId}${t.delay > 0 ? ` • +${t.delay}s` : ""}`}
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
