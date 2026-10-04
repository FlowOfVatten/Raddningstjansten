# EPA Orienteering Game

En GPS-baserad poängpromenad för mobil. Spelare besöker 10 kontrollpunkter i slumpad ordning, svarar på frågor på plats och avslutar på målet.

## Features

- ✅ Mobil-först design (iOS Safari, Android Chrome)
- ✅ GPS-baserad positionsövervakning
- ✅ Leaflet-karta med OpenStreetMap (ingen betald nyckel)
- ✅ Greedy nearest-neighbor shuffle (rättvis väglängd, randomiserad)
- ✅ Frågor med flera svarsalternativ
- ✅ Admin-gränssnitt för POI-hantering
- ✅ Spelarstatistik och tidsräkning
- ✅ EPA dark theme (neon yellow/orange/red)

## Teknologi

- **Frontend:** HTML5 + CSS3 + JavaScript (vanilla, inget framework)
- **Backend:** Azure Functions (Node.js)
- **Databas:** PostgreSQL
- **Kartbibliotek:** Leaflet + OpenStreetMap
- **Hosting:** Azure Static Web Apps + Azure Functions

## Arkitektur

```
/EPA/                    - Frontend (statiska filer)
├── index.html
├── admin.html
├── app.js
├── style.css
└── schema.sql            - Databaskonfiguration

/api/                    - Backend (Azure Functions)
├── epa-shared.js        - Delad databaskonfiguration
├── epa-player-*/        - Spelarlogik
├── epa-poi-*/           - POI-hantering
└── epa-admin-*/         - Admin-funktioner
```

## API Endpoints

Alla under `/api/epa/...`

**Spel:**
- `POST /api/epa/player/start` - Starta
- `GET /api/epa/player/{id}` - Hämta status
- `POST /api/epa/player/{id}/verify-position` - Avstånd
- `POST /api/epa/player/{id}/submit-answer` - Svar

**POI:**
- `GET /api/epa/poi` - Lista
- `GET /api/epa/poi/{id}/question` - Fråga

**Admin:**
- `POST /api/epa/admin/poi` - Lägg till POI
- `POST /api/epa/admin/poi/{id}/question` - Lägg till fråga
- `DELETE /api/epa/admin/poi/{id}` - Ta bort
- `GET /api/epa/admin/players` - Spellista
- `POST /api/epa/admin/reset-player` - Nollställ en
- `POST /api/epa/admin/reset-all` - Nollställ alla

## Deployment

Se [`../api/README.md`](../api/README.md) och [`./schema.sql`](./schema.sql) för:
- Databaskonfiguration
- Azure Static Web Apps setup
- Azure Functions deployment
- Migrationsskript

## Lokal testning

1. Kör `func start` i `api/` för Azure Functions
2. Öppna `EPA/index.html` i webbläsare
3. Verifiera `/api/epa/...` endpoints är tillgängliga

## Admin-gränssnitt

Öppna `EPA/admin.html`:
- Klicka på karta för POI-placering
- Lägg till namn, radie, fråga
- Visa spellista och nollställ

---

**Databaskonfiguration:** `schema.sql`  
**Fair Shuffle Algorithm:** `app.js` + `../api/epa-shared.js`
