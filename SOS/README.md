# SOS – Webb­baserat positions­- och SOS­stöd

En fullständig webblösning för **positionsdelning och nödkommunikation** vid skogsbrandinsatser.

## Två rollers

### 🚒 Insatsledning (`index.html`)
- Realtidskarta över alla aktiva brandmän
- SOS-markering för skadade/nödfall
- Automatisk uppdatering var 2:e sekund
- Lättöversiktlig säkerhetsvyn

### 👨‍🚒 Brandman (`firefighter.html`)
- Enkel positionsdelning med ett klick
- Nödknapp för SOS-läge
- Automatisk GPS-uppdatering (var 5 sekund, var 2 sekund i SOS-läge)
- Ingen bakgrund-spårning efter stängning

## Teknologi

- **Frontend**: HTML5 + Leaflet-karta + vanilla JS
- **Backend**: Node.js + Express
- **Lagring**: In-memory (automatisk rensning efter 5 min inaktivitet)
- **API**: REST-baserad (`/api/positions`, `/api/position`)

## Lokal start

1. `npm install` (installera Express, CORS, body-parser)
2. `npm start` eller `node server.js`
3. Öppna `http://localhost:3000`

### Två separata sessionaler:
- Insatsledare: `http://localhost:3000` (index.html)
- Brandman: `http://localhost:3000/firefighter.html`

## Deployment på Azure SWA

1. Skapa en Azure Static Web Apps-instans
2. Länka detta repo eller ladda upp filerna
3. Konfigurera build command: `npm install`
4. SWA serverar automatiskt Node.js-backend via `/api/*`-routing

## Säkerhet & juridik

✅ Ingen permanent datalagring  
✅ Aktivt godkännande krävs  
✅ Automatisk rensning vid omloggning  
✅ Ingen bakgrundsspårning  

## API-endpoints

### POST `/api/position`
Uppdatera eller lägg till brandman-position.

```json
{
  "id": "BM-ABC123",
  "lat": 59.3293,
  "lon": 18.0686,
  "sos": false,
  "accuracy": 10
}
```

### GET `/api/positions`
Hämta alla aktiva positione

r.

```json
{
  "timestamp": 1713700000000,
  "firefighters": [
    {
      "id": "BM-ABC123",
      "lat": 59.3293,
      "lon": 18.0686,
      "sos": false,
      "lastUpdate": 1713700000000,
      "accuracy": 10
    }
  ],
  "count": 1
}
```

### DELETE `/api/position/:id`
Radera brandman från tracking.

## Nästa steg

- [ ] Autentisering (JWT / SSO)
- [ ] Historik-loggning (opt-in)
- [ ] Webpush-notifier för SOS
- [ ] Admin-dashboard för övning­sledning
