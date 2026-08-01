# Utlägg Revisor

En enkel webapp för att registrera och hantera utgifter med kvittobilder.

## Funktioner

✅ **Lägg till utlägg** - Registrera ny utgift med:
- Datum för inköp
- Affär/butik
- Belopp
- Valfri beskrivning
- Kvittobild

✅ **Snyggt gränssnitt** - Alla utlägg visas i kort format med:
- Datum
- Affär
- Belopp
- Kort beskrivning

✅ **Detaljsvy** - Klicka på ett kort för att se:
- Fullständig information
- Större kvittobild
- Redigerings- och raderingsknappar

✅ **Statistik** - Visar:
- Totalt spenderat belopp
- Antal registrerade utlägg

✅ **Redigering** - Ändra befintliga utlägg

✅ **Radering** - Ta bort utlägg

## Lagring

Alla utlägg sparas lokalt i webbläsarens `localStorage`. 
- Ingen server krävs
- Data sparas mellan sessioner
- Bilder sparas inline (base64)

## Filstruktur

```
utlagg/
├── index.html      # HTML-struktur
├── style.css       # Styling & layout
├── app.js          # Logik & interaktion
└── README.md       # Denna fil
```

## Framtida förbättringar

- [ ] Export till CSV/PDF
- [ ] Gruppering efter månad
- [ ] Filtrering efter affär
- [ ] Sökning
- [ ] Dark mode
- [ ] Synkronisering till server
- [ ] QR-kod scanning av kvitton
