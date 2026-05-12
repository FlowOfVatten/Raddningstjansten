# Presentation Live Experiment

Detta ar en MVP for live interaktion under presentation.

## Delar

- `presentation/index.html`: Deltagarsida
- `presentation/admin.html`: Adminpanel
- `presentation/results.html`: Resultatvy
- `api/presentation/*`: API med SQL-lagring via `app_state`

## Funktioner i MVP

- Live-session med adminstyrning
- Anonyma deltagarsvar
- Realtidsvisning av gruppresultat
- CSV-export av grupperad resultatdata

## Databas

`presentation` anvander samma SQL-anslutningsmonster som `16WOH` och sparar i tabellen `app_state`.

Miljovariabel som anvands:

- `SQL_CONNECTION_STRING`
- fallback: `SQLAZURECONNSTR_SQL_CONNECTION_STRING` eller `SQLCONNSTR_SQL_CONNECTION_STRING`

Nyckelprefix i `app_state`:

- Session: `rto:presentation:session:<SESSION_ID>`
- Svar: `rto:presentation:answer:<SESSION_ID>:<PHASE>:<PARTICIPANT_ID>`

Om connection string saknas fallbackar implementationen till in-memory lokalt.

## Exempel-URLer

- Deltagare: `/presentation/index.html?session=SXXXX`
- Admin: `/presentation/admin.html`
- Resultat: `/presentation/results.html?session=SXXXX`
