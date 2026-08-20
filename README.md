# Raddningstjansten

## Manualer

- `MANUAL_ADMIN.md` - Enkel manual for admin/arrangor
- `MANUAL_OVNINGSDELTAGARE.md` - Enkel manual for ovningsdeltagare

## Databas och API

Root-appen (index/admin) använder endpointen `/api/state` för delat state.

- Ny standard är PostgreSQL (samma DB-plattform som UtbBokning, men separat app och separat dataflöde).
- Sätt minst en av följande miljövariabler för `/api/state`:
	- `RISE_PG_CONNECTION_STRING`
	- `PG_CONNECTION_STRING`
	- `DATABASE_URL`
	- fallback: `UTBBOKNING_PG_CONNECTION_STRING`

Om du behöver flytta befintlig `app_state`-data från SQL Server till PostgreSQL:

1. Sätt `SQL_CONNECTION_STRING` (källa) och en Postgres-connection string (mål).
2. Kör migreringsscriptet i repo-roten:

```bash
node migrate-app-state-to-pg.js
```
