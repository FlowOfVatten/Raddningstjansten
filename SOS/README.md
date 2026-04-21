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
- **Backend**: Azure Functions (serverles)
- **Lagring**: In-memory (automatisk rensning efter 5 min inaktivitet)
- **API**: REST-baserad (`/api/positions`, `/api/position`)
- **Hosting**: Azure Static Web Apps (Free tier kompatibel)

## Lokal utveckling

Du behöver **INTE** Node.js installerat lokalt. Öppna bara HTML-filerna direkt:

1. `index.html` – Insatsledarvyn (karta)
2. `firefighter.html` – Brandmannens vy (positionsdelning)

**OBS:** API:et fungerar inte lokalt utan deployment. För fullständig lokal test behöver du Azure Functions Core Tools (valfritt).

## Deployment på Azure SWA (Free tier)

1. Gå till **Azure Portal** → **Static Web Apps** → **Skapa ny**
2. Länka ditt GitHub-repo: `VattenfallGIT/Raddningstjansten-Ovning`
3. **Build-inställningar:**
   - App location: `SOS/`
   - Build command: (lämna tomt – ingen build behövs)
   - Output location: `.`
4. Deploy

SWA serverar automatiskt:
- HTML/CSS/JS-filerna
- Azure Functions via `/api/*`-routing

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
