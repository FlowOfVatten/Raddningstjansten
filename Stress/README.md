# Operational Overload (MVP)

Webbaserad stress-simulering enligt GDD for `Operational Overload`.

## Implementerat i MVP

- Fasindelat spel (Introduktion, Load, Peak Stress, Nedtrappning)
- Task-system med flera task-typer: decision, calculation, memory, priority
- Inbox med varierad allvarlighetsgrad
- Avbrottssystem med val: acceptera eller ignorera
- Reaktionstest med responstid
- Dynamiska regler (reward/penalty justeras per fas)
- Live-stressindikator
- Resultatvy med objektiva matt
- NASA-TLX-formular
- Slutlig Stress Score enligt viktad modell
- Gruppfeedback via simulerad leaderboard (20 spelare)

## Starta

1. Oppna `index.html` i webblasare eller via Live Server i VS Code.
2. Valj `Demo 3 min` eller `Standard 10 min`.
3. Klicka `Starta simulering`.

## Notering om multiplayer

I denna MVP ar multiplayer/leaderboard simulerad pa klientsidan.
For synkron start och riktig gruppdata behovs backend (Node.js + WebSocket + databas) enligt GDD.
