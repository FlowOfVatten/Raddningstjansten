-- Kör detta i Azure SQL för att skapa tabellen
-- Azure Portal -> SQL-databas -> Query editor

CREATE TABLE app_state (
  id        NVARCHAR(200)  NOT NULL PRIMARY KEY,
  payload   NVARCHAR(MAX)  NOT NULL,
  updated_at DATETIME2      NOT NULL DEFAULT SYSUTCDATETIME()
);
