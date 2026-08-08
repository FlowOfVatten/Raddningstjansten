# RISE Power Reader

En enkel Azure-vänlig webbapp som:

- laddar upp en bild
- kör OCR i webbläsaren (Tesseract.js)
- extraherar och visar:
  - Namn (t.ex. BiggTazz)
  - Total Power
  - Troop 1, Troop 2, osv

## Köra lokalt

OCR blir stabilast om sidan körs via `http://localhost` (inte bara dubbelklick på filen).

Alternativ i VS Code:

1. Installera extension `Live Server`.
2. Högerklicka på `index.html`.
3. Välj `Open with Live Server`.

Viktigt:

- Internet behövs för att ladda OCR-biblioteket (Tesseract.js) från CDN.
- Om OCR inte startar, prova reload av sidan och kontrollera devtools console.

## Publicera till Azure

Det här passar bra som **Azure Static Web App** eftersom appen är frontend-only.

1. Skapa ett repo i GitHub med innehållet i mappen.
2. I Azure Portal: skapa en **Static Web App**.
3. Build details:
   - App location: `/`
   - Api location: lämna tom
   - Output location: `/`
4. Publicera, klart.

## Notering

OCR-kvalitet beror på bildens skärpa och upplösning.
