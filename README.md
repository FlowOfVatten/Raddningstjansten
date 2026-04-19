# SCB Map Population

En enkel statisk webbsida dar du ritar ett omrade pa karta och forsoker summera befolkning inom omradet via SCB GeoServer (WFS).

Denna version anvander endast direktanrop till SCB (ingen extern proxy-fallback i klienten).

## Filer

- `index.html`
- `style.css`
- `app.js`

## Starta

Oppna `index.html` i webblasare.

## Inmatningslagen

- `Rita omrade`: Rita polygon/rektangel manuellt.
- `Klick + minuter (fagelvag)`: Klicka en punkt pa kartan och ange minuter + antagen hastighet. Appen skapar en cirkel (inte vagbaserad isokron) och summerar befolkning i den ytan.

## Hur det fungerar

1. Hamtar WFS `GetCapabilities` fran `https://geodata.scb.se/geoserver/stat/wfs?service=wfs&version=1.1.0&request=GetCapabilities`
2. Forsoker valja en passande layer automatiskt
3. Hamtar features inom ritad polygons bbox
4. Skar features mot polygon med Turf
5. Summerar befolkning (area-viktat for delvis overlap)

## Om automatisk layer-val inte funkar

Satt en explicit layer i `app.js`:

```js
const SCB_LAYER_NAME_OVERRIDE = "din:layer";
```

## Viktigt

- Exakt precision beror pa vilken SCB layer/falt som finns tillganglig.
- Om CORS eller natverkspolicy blockerar `geodata.scb.se` far du fel i status-rutan.
- Om direktanrop blockeras behovs en egen backend-endpoint som gor SCB-anrop server-side.
