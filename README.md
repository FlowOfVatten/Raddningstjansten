# Raddningstjansten

## Manualer

- `MANUAL_ADMIN.md` - Enkel manual for admin/arrangor
- `MANUAL_OVNINGSDELTAGARE.md` - Enkel manual for ovningsdeltagare

## Databas och API

Root-appen (index/admin) använder endpointen `/api/state` för delat state.

- Ny standard är PostgreSQL (samma DB-plattform som UtbBokning, men separat app och separat dataflöde).
- Root-appen fungerar även utan ny SWA-inställning tack vare samma fallback-mönster som RISE/UtbBokning.
- Om du vill styra anslutningen explicit kan du sätta någon av följande miljövariabler för `/api/state`:
	- `RADDNINGSTJANSTEN_PG_CONNECTION_STRING` (rekommenderad)
	- `STATE_PG_CONNECTION_STRING` (alias)
	- `RISE_PG_CONNECTION_STRING` (legacy fallback)
	- `PG_CONNECTION_STRING`
	- `DATABASE_URL`
	- sista fallback: `UTBBOKNING_PG_CONNECTION_STRING`

### UtbBokning

`/api/utbbokning` ska i första hand använda:

- `UTBBOKNING_PG_CONNECTION_STRING` (rekommenderad)
- `UTBBOKNING_DATABASE_URL` (alias)

Den kan peka på exakt samma DB/server som root-appen om ni vill dela databas,
eller på en annan databas på samma server om ni vill separera data.

Om du behöver flytta befintlig `app_state`-data från SQL Server till PostgreSQL:

1. Sätt `SQL_CONNECTION_STRING` (källa) och en Postgres-connection string (mål).
2. Kör migreringsscriptet i repo-roten:

```bash
node migrate-app-state-to-pg.js
```
