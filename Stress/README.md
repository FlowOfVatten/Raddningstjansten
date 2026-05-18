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

1. Oppna `admin.html` och klicka `Skapa session`.
2. Oppna deltagarlanken (eller `index.html`) och ange samma session-id.
3. Klicka `Anslut` pa klientsidan.
4. Starta spelet i adminvyn med `Starta spel`.

## Notering om multiplayer

I denna MVP ar multiplayer/leaderboard simulerad pa klientsidan.
For synkron start och riktig gruppdata behovs backend (Node.js + WebSocket + databas) enligt GDD.
