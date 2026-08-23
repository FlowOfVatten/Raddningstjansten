# Familjelistan

Delad inköpslista för ett hushåll med butiksanpassad gångordning, ICA-erbjudanden och GPS-förslag.

## Stack

| Lager | Teknologi |
|-------|-----------|
| Frontend | React 18 + Vite + TypeScript |
| State | Zustand |
| Backend | Node.js + Express (ESM) |
| Databas | PostgreSQL |
| Realtime | WebSocket (ws) |
| Auth | JWT (bcryptjs) |

## Komma igång

### 1. Installera beroenden
```bash
npm run install:all
```

### 2. Skapa databas
```bash
createdb familjelistan
psql -d familjelistan -f server/setup.sql
```

### 3. Konfigurera miljövariabler
```bash
cp server/.env.example server/.env
# Redigera server/.env – sätt DATABASE_URL och JWT_SECRET
```

### 4. Starta i dev-läge
```bash
npm run dev
```

- Frontend: http://localhost:5173  
- Backend:  http://localhost:3000

## Projektstruktur

```
Familjelistan/
├── package.json          # Root – concurrently dev
├── client/               # React-app (Vite)
│   ├── src/
│   │   ├── App.tsx
│   │   ├── types.ts
│   │   ├── api/          # fetch-klient
│   │   ├── hooks/        # WebSocket-hook
│   │   ├── screens/      # Login, Lists, List, Trip
│   │   └── store/        # Zustand global state
│   └── vite.config.ts
└── server/               # Express API
    ├── src/
    │   ├── index.js       # Entry point
    │   ├── auth.js        # JWT helpers
    │   ├── db.js          # pg Pool
    │   ├── ws.js          # WebSocket server
    │   └── routes/
    │       ├── auth.js
    │       ├── lists.js
    │       ├── trips.js
    │       └── stores.js
    └── setup.sql          # PostgreSQL schema
```

## Versionsplan

- **v1** – Konto, hushåll, delad lista, manuell butik, avbockning, nu/härnäst-vy, inlärning av gångordning  
- **v2** – ICA-erbjudanden, GPS-butiksförslag, bättre autocomplete  
- **v3** – Streckkod, flera kedjor, zondetektering via tidsluckor  
