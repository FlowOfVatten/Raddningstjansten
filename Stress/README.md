# Operational Overload (MVP)

Web-based stress simulation aligned with the `Operational Overload` GDD.

## Implemented in MVP

- Phase-based gameplay (Introduction, Load, Peak Stress, Cooldown)
- Task system with multiple task types: decision, calculation, memory, priority
- Inbox with mixed urgency levels
- Interrupt system with choices: accept or ignore
- Reaction test with response-time measurement
- Dynamic rules (reward/penalty adjusted per phase)
- Live stress indicator
- Results view with objective metrics
- NASA-TLX form
- Final Stress Score using weighted model
- Group feedback via simulated leaderboard (20 players)

## Start

1. Open `admin.html` and click `Create session`.
2. Open the participant link (or `index.html`) and enter the same session ID.
3. Click `Join` on the client page.
4. Start the game in admin with `Start game`.

## Multiplayer Note

In this MVP, multiplayer/leaderboard is partially simulated on the client side.
For synchronized start and full real-time group data, use backend orchestration (Node.js + WebSocket + database) as described in the GDD.
