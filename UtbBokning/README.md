# UtbBokning

Forsta version av en bokningssida som nu ar ommappad mot DOCX-underlaget for Viktoria ovningsfalt.

## Det som finns nu

- digitalt bokningsutkast med kontakt, datum, schema och resursval
- DOCX-baserad faltstruktur for kontaktperson, organisationsuppgifter, e-faktura och GDPR
- lokal browser-databas via IndexedDB for resurser och sparade utkast
- PDF-preview direkt i sidan sa att underlaget alltid ar synligt
- JSON-export av aktuellt bokningsutkast

## Nuvarande begransning

DOCX-innehall och rubriker ar nu anvanda for webbformularet, men layouten ar fortfarande en tolkning av blanketten snarare an en pixelperfekt kopia. Nasta steg ar att mappa fler detaljfald eller koppla sidan till befintlig backend/databas.
