# EPA Orienteering Game

En GPS-baserad poängpromenad för mobil. Spelare besöker 10 kontrollpunkter i slumpad ordning, svarar på frågor på plats och avslutar på målet.

## Features

- ✅ Mobil-först design (iOS Safari, Android Chrome)
- ✅ GPS-baserad positionsövervakning
- ✅ Leaflet-karta med OpenStreetMap (ingen betald nyckel)
- ✅ 10 slumpad ordning på kontrollpunkter per spelare
- ✅ Frågor med flera svarsalternativ
- ✅ Admin-gränssnitt för POI-hantering
- ✅ Spelarstatistik och tidsräkning
- ✅ Offline-medveten (GPS + frågor kräver anslutning)

## Tech Stack

- **Backend:** Node.js + Express
- **Databas:** PostgreSQL
- **Frontend:** HTML5 + CSS3 + JavaScript (vanilla)
- **Kartbibliotek:** Leaflet + OpenStreetMap
- **Positionering:** Geolocation API

## Installation

### 1. Förutsättningar

- Node.js 16+
- PostgreSQL-databas (använd befintlig på `158.174.114.209:5432/smallprojects`)
- npm

### 2. Setup lokalt

```bash
cd EPA
npm install
```

### 3. Miljövariabler

Kopiera `.env.example` till `.env`:
```bash
cp .env.example .env
```

Redigera `.env`:
```env
PORT=3000
EPA_PG_CONNECTION_STRING=postgresql://azure_app:password@158.174.114.209:5432/smallprojects?sslmode=no-verify
ADMIN_PASSWORD=din-hemliga-losenord
NODE_ENV=development
```

### 4. Databaskonfiguration

Kör migrationen för att skapa tabeller:
```bash
npm run migrate
```

(Valfritt) Seed testdata med 10 POI runt Växjö:
```bash
node scripts/seed.js
```

### 5. Starta lokalt

```bash
npm start
```

Öppna i webbläsare:
- **Spel:** http://localhost:3000
- **Admin:** http://localhost:3000/admin.html

## Deployment till Azure App Service

### 1. Förberedelser

```bash
# Installera Azure CLI
# https://learn.microsoft.com/en-us/cli/azure/install-azure-cli

# Logga in
az login

# Skapa resursgrupp
az group create --name epa-rg --location swedencentral

# Skapa App Service Plan (Free tier)
az appservice plan create --name epa-plan --resource-group epa-rg --sku F1 --is-linux

# Skapa Web App
az webapp create --resource-group epa-rg --plan epa-plan --name epa-game --runtime "node|18"
```

### 2. Konfigurera miljövariabler

```bash
az webapp config appsettings set \
  --resource-group epa-rg \
  --name epa-game \
  --settings \
    EPA_PG_CONNECTION_STRING="postgresql://azure_app:password@158.174.114.209:5432/smallprojects?sslmode=no-verify" \
    ADMIN_PASSWORD="din-hemliga-losenord" \
    NODE_ENV=production
```

### 3. Deploy

**Alternativ A: Git Deploy**
```bash
# Initialisera Azure Git remote
az webapp deployment user set --user-name <username> --password <password>

# Lägg till remote
git remote add azure https://<username>@epa-game.scm.azurewebsites.net:443/epa-game.git

# Push och deploy
git push azure main
```

**Alternativ B: ZIP Deploy**
```bash
# Skapa zip
zip -r epa.zip . -x "node_modules/*" ".git/*"

# Deploy
az webapp deployment source config-zip \
  --resource-group epa-rg \
  --name epa-game \
  --src-path epa.zip
```

### 4. Databaskonfiguration på Azure

Kör migrationen remotely:
```bash
# SSH in eller använd Azure WebJobs
az webapp up --resource-group epa-rg --name epa-game
```

**Eller via Azure Portal:**
1. Gå till **Advanced Tools** (Kudu)
2. Öppna Debug Console
3. Kör: `npm run migrate`

## API Endpoints

### Player Routes

- `POST /api/player/start` - Starta nytt spel
  ```json
  { "namn": "Namn" }
  ```

- `GET /api/player/:playerId` - Hämta spelets status

- `POST /api/player/:playerId/verify-position` - Kontrollera avstånd till POI
  ```json
  { "lat": 56.88, "lng": 15.63 }
  ```

- `POST /api/player/:playerId/submit-answer` - Skicka svar
  ```json
  { "answerIndex": 0 }
  ```

### POI Routes

- `GET /api/poi` - Hämta alla POI:er

- `GET /api/poi/:poiId/question` - Hämta fråga för POI

### Admin Routes

- `POST /api/admin/poi` - Lägg till POI (kräver lösenord)
- `POST /api/admin/poi/:poiId/question` - Lägg till/uppdatera fråga
- `DELETE /api/admin/poi/:poiId` - Ta bort POI
- `GET /api/admin/players?password=...` - Hämta spellista
- `POST /api/admin/reset-player` - Nollställ en speller
- `POST /api/admin/reset-all` - Nollställ alla spel

## Admin-gränssnitt

Tillgängligt på `/admin.html`

- **Lägg till POI:** Klicka på kartan för att sätta koordinater, fyll i namn, radie och fråga
- **Hantera frågor:** Varje POI kan ha en fråga med 2-4 svarsalternativ
- **Visa spellista:** Se spelares namn, tid och framsteg
- **Nollställ:** Återställ individuella spel eller alla på en gång

## Spelregler

1. Spelare skriver sitt namn vid start
2. 10 POI:er, varav 9 är slumpad ordning och 1 är målet (samma för alla)
3. Bara nästa POI i spelarens ordning är aktiv
4. Radien måste uppnås för att låsa upp frågan (GPS)
5. Max 3 försök per fråga, sedan ledtråd
6. Rätt svar låser upp nästa POI
7. Målgång visar namn, tid och ordningen

## Datenschema

```sql
-- POI (Points of Interest)
epa_poi(id, namn, lat, lng, radie_meter, ordning_fast, aktiv, created_at, updated_at)

-- Frågor per POI
epa_question(id, poi_id, text, alternativ[], ratt_index, ledtrad, created_at, updated_at)

-- Spelare
epa_player(id, namn, start_tid, mal_tid, status, created_at, updated_at)

-- Spelares POI-framsteg
epa_player_poi(id, player_id, poi_id, sekvens, status, klar_tid, forsok, created_at, updated_at)
```

## Mobiloptimering

- Ingen horisontell scroll
- Stora tryckytor (min 48px)
- Stöd för iPhone viewport-fit (notch)
- Mörkläge som standard
- Tangentbordsinvändig på mobil
- Optimerad GPS-uppdateringsfrekvens

## Webbläsarstöd

- ✅ iOS 13+ (Safari)
- ✅ Android 10+ (Chrome)
- ✅ Kräver HTTPS för Geolocation API i produktion
- ✅ Kräver secure context (localhost eller https://)

## Felsökning

### "Geolocation behörighet nekad"
- Säkerställ att appen körs på HTTPS (eller localhost för test)
- Kontrollera att webbläsare har tillåtelse för lokalisering
- iPhone: Inställningar > Sekretess > Platsinformation

### "Kunde inte hämta POI:er"
- Verifiera databaskonnektionen
- Kör `npm run migrate` för att skapa tabeller
- Kontrollera Environment Variables på Azure

### Kartan laddas inte
- Kontrollera internetanslutning
- Leaflet kräver online för OpenStreetMap-tiles
- Offline-läge stöds inte ännu

## Framtida utökningar

- [ ] Offline-läge med lokalt cache
- [ ] Leaderboard med ranking
- [ ] Multimedia-frågor (bilder, video)
- [ ] QR-kod validering
- [ ] Lag-läge
- [ ] Push-notifikationer

## Support

För frågor eller buggar, skapa ett issue eller kontakta development-teamet.

---

**EPA Orienteering** © 2024 | Licensierad under MIT
