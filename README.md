# Alunda Busspuls

Realtidsvisualisering av busstrafik runt Alunda i 3D. Noden kring Alunda lyfts fram, linjer och fordon visas i markniva, och en AI-analytiker kommenterar trafiklaget lopande.

![Screenshot](docs/screenshot.png)

## Vad det är

En webbapp som renderar ett bussnat runt Alunda med lysande linjer och rorliga fordon. Hallbackar skalar upp efter aktivitet och storningar visualiseras som larm i vyn.

**Nyckelfunktioner**
- Busslinjer runt Alunda med nav mot Uppsala, Gimo och Osthammar
- Simulatorlage som standard for stabil demo, med valfritt live-lage via Trafiklab
- 3D-scen med React Three Fiber + postprocessing (bloom, vignette)
- Hallplats-klick -> ankomsttavla med ETA for kommande fordon
- Fordons-klick -> panel med linje, status, forsening, koordinater, folj-kamera
- AI-analytiker via OpenRouter (Gemini) som beskriver trafiklaget kontinuerligt
- Flodespulser langs linjer och larmmarkorer vid storningar

## Kom igång

```bash
git clone <repo>
cd <repo>
npm run install:all
cp .env.example server/.env   # fyll i valfria nycklar
npm run dev
```

Öppna [http://localhost:5173](http://localhost:5173).

Utan miljo-variabler kor appen i simulator-lage och AI-panelen ar inaktiv. Med `OPENROUTER_KEY` aktiveras AI-analys. For GTFS live satter du `TRAFIKLAB_RT_KEY`, dina regionala GTFS-RT URL:er och `ENABLE_LIVE_GTFS=1`.

## Arkitektur

```
.
├── server/                  Express + WebSocket + simulator + AI-analytiker
│   ├── src/
│   │   ├── index.js         HTTP/WS entry
│   │   ├── simulator.js     Genererar realistisk tågtrafik när Trafiklab saknas
│   │   ├── trafiklab.js     GTFS-RT fetch
│   │   ├── aiAnalyst.js     OpenRouter-anrop var N sekund
│   │   └── geo.js           Haversine, lerp
│   └── data/network.json    ~100 stationer, 7 linjer, koordinater + djup
└── client/                  Vite + React + Three.js
    └── src/
        ├── scene/           3D-komponenter (CityBase, TunnelNetwork, Trains, Stations, FlowPulses, AlertHalos, Labels, Camera)
        ├── ui/              HTML-overlay (Header, Controls, Legend, InfoPanel, StationInfoPanel, AIPanel, Alerts)
        └── data/            Projektion, store (zustand), WebSocket-hook, station-board-logik
```

**Pipeline**

1. Simulator (eller Trafiklab-proxy) genererar tågpositioner varje sekund.
2. Server broadcastar över WebSocket (`/stream`).
3. Klienten lerpar mellan snapshots för mjuk rörelse.
4. AI-analytiker kör parallellt, samlar aggregerade stats, skickar till OpenRouter, broadcastar JSON-svar till klienten.

## Miljövariabler

| Variabel | Standard | Beskrivning |
|---|---|---|
| `TRAFIKLAB_RT_KEY` | — | API-nyckel for GTFS Regional Realtime. |
| `TRAFIKLAB_STATIC_KEY` | — | API-nyckel for GTFS Regional Static data (valfri, for framtida importscript). |
| `GTFS_RT_VEHICLE_URL` | — | Regional feed-URL for Vehicle Positions. |
| `GTFS_RT_TRIPS_URL` | — | Regional feed-URL for Trip Updates. |
| `GTFS_RT_ALERTS_URL` | — | Regional feed-URL for Service Alerts. |
| `ENABLE_LIVE_GTFS` | `0` | Satt till `1` for att anvanda live-kalla i stallet for simulatorn. |
| `GTFS_MAX_MATCH_METERS` | `1200` | Matchningstolerans mellan fordon och linjesegment i meter. |
| `OPENROUTER_KEY` | — | OpenRouter-nyckel för AI-analytikern. Utan denna är AI-panelen inaktiv. |
| `AI_INTERVAL_MS` | `90000` | Hur ofta AI-analysen körs (ms). |
| `PORT` | `4000` | Backend-port. Vite-proxyn förutsätter denna. |

## Stack

- **Frontend**: React 18, TypeScript, Vite, Three.js, @react-three/fiber, @react-three/drei, @react-three/postprocessing, zustand
- **Backend**: Node 18+, Express, ws
- **AI**: OpenRouter → `google/gemini-3-flash-preview`
- **Data**: Trafiklab GTFS-RT (Vehicle Positions, Trip Updates, Service Alerts)

## Skalor

Horisontellt: 1:300 (linjär, 1 scenhet ≈ 300 m). Djupet: ~1:10 mot horisontal — verkliga djup men något nedtonade för läsbarhet. Stationsdjup hämtat från SL:s offentliga stationsdata och Wikipedia; vissa avrundningar förekommer.

## Licens

MIT.
