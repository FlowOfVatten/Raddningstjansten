# Power Apps-manual for Brandresan

## Syfte

Detta dokument beskriver hur du bygger en Canvas App i Power Apps som motsvarar funktionerna i den nuvarande Brandresan-webappen, men med Azure SQL som direkt datakälla.

Manualen utgår från den nuvarande webappen i:

- `Raddningstjansten-Brandresan/index.html`
- `Raddningstjansten-Brandresan/app.js`
- `Raddningstjansten-Brandresan/style.css`

Målet är att bygga en Power App med:

- lista över dagens lektioner
- markering av aktuell lektion utifrån tid
- detaljvy för vald lektion
- utrustningslista per lektion
- möjlighet att senare bygga adminfunktioner

## Rekommenderad arkitektur

Den nuvarande SWA-lösningen använder ett API som läser och skriver JSON i en state-tabell. Det fungerar bra för webappen, men är inte optimalt för Power Apps.

För Power Apps rekommenderas att datat ligger i riktiga SQL-tabeller.

Rekommenderad målarkitektur:

1. Azure SQL Database med tabeller för lektioner och utrustning.
2. Power Apps Canvas App som ansluter direkt till Azure SQL.
3. Valfritt senare steg: adminskärm i Power Apps för att skapa och uppdatera lektioner.

Detta är bättre än att försöka låta Power Apps läsa den nuvarande JSON-payloaden direkt.

## Förutsättningar

Du behöver följande:

1. Power Apps-licens eller M365-licens som inkluderar Power Apps.
2. Azure SQL server name.
3. Azure SQL database name.
4. SQL-användare och lösenord, eller Entra ID-åtkomst.
5. Rättigheter att skapa tabeller i databasen, eller hjälp från DBA/IT.

Om du redan har SQL admin/password kan du börja med SQL Server Authentication.

## Del 0: Kontrollera befintlig databas forst

Om databasen redan finns behover du inte alltid kora hela SQL-skriptet.

Kora detta for att se vilka tabeller som redan finns:

```sql
SELECT TABLE_NAME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_NAME IN ('Lessons', 'LessonEquipment', 'app_state');
```

Kora detta for att se kolumner i befintliga tabeller:

```sql
SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME IN ('Lessons', 'LessonEquipment')
ORDER BY TABLE_NAME, ORDINAL_POSITION;
```

Tolkning:

1. Om `Lessons` och `LessonEquipment` redan finns med ratt kolumner, hoppa over `CREATE TABLE` och ga vidare till testdata och appbygge.
2. Om endast `app_state` finns (JSON-upplagg), skapa nya tabeller enligt manualen for att fa en stabil Power Apps-modell.
3. Om tabeller finns men kolumner skiljer sig, justera antingen schema eller Power Fx-formler.

## Del 1: Skapa datamodellen i Azure SQL

### Varför detta steg behövs

Power Apps fungerar bäst mot normaliserade tabeller. Den nuvarande JSON-modellen i SWA-API:t bör inte vara primär källa för en Canvas App.

### Tabell 1: Lessons

Kör detta SQL-script i databasen:

```sql
CREATE TABLE Lessons (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    LessonDate DATE NOT NULL,
    StartTime TIME NOT NULL,
    EndTime TIME NOT NULL,
    Title NVARCHAR(200) NOT NULL,
    LessonType NVARCHAR(100) NULL,
    Location NVARCHAR(200) NULL,
    Instructor NVARCHAR(200) NULL,
    Focus NVARCHAR(MAX) NULL,
    SortOrder INT NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
```

### Tabell 2: LessonEquipment

Kör detta SQL-script i databasen:

```sql
CREATE TABLE LessonEquipment (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    LessonId INT NOT NULL,
    EquipmentName NVARCHAR(200) NOT NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_LessonEquipment_Lessons
        FOREIGN KEY (LessonId) REFERENCES Lessons(Id) ON DELETE CASCADE
);
```

### Rekommenderade index

Kör även detta:

```sql
CREATE INDEX IX_Lessons_LessonDate_StartTime
ON Lessons (LessonDate, StartTime);

CREATE INDEX IX_LessonEquipment_LessonId
ON LessonEquipment (LessonId);
```

## Del 2: Lägg in testdata

Använd detta för att få igång appen snabbt.

```sql
INSERT INTO Lessons (LessonDate, StartTime, EndTime, Title, LessonType, Location, Instructor, Focus, SortOrder)
VALUES
('2026-04-18', '08:00', '09:30', 'Rokdykning - grundteknik', 'Praktik', 'Ovningsfalt A', 'Anna Berg', 'Saker in- och utgang, kommunikation i lag och orientering under nedsatt sikt.', 1),
('2026-04-18', '10:00', '11:15', 'Slackteori - forsta insats', 'Teori', 'Sal Delta', 'Johan Lind', 'Val av metod utifran brandforlopp, riskbedomning och ansvar i forsta laget.', 2),
('2026-04-18', '13:00', '15:00', 'Fordon och utrustningskontroll', 'Workshop', 'Fordonshall B', 'Sara Nord', 'Daglig kontrollrutin, funktionstest och felrapportering av kritisk utrustning.', 3);
```

Lägg sedan till utrustning:

```sql
INSERT INTO LessonEquipment (LessonId, EquipmentName)
VALUES
(1, 'Larmstall'),
(1, 'Hjalm med visir'),
(1, 'Handskar'),
(1, 'Luftpaket'),
(1, 'Radio'),
(2, 'Anteckningsblock'),
(2, 'Surfplatta'),
(2, 'Penna'),
(3, 'Arbetshandskar'),
(3, 'Skyddsglasogon'),
(3, 'Checklista'),
(3, 'Reflexvast');
```

## Del 3: Skapa anslutning i Power Apps

### Rekommenderad autentisering

Om du har SQL admin/password är den enklaste vägen:

1. Öppna Power Apps.
2. Skapa en ny Canvas App.
3. Gå till Data.
4. Välj SQL Server.
5. Välj SQL Server Authentication.
6. Ange server name.
7. Ange database name.
8. Ange username.
9. Ange password.

Om organisationen föredrar Entra ID kan detta ändras senare.

### Datakällor som ska läggas till

Lägg till dessa två tabeller som datakällor:

- `Lessons`
- `LessonEquipment`

## Del 4: Skapa appens struktur

Skapa först en enkel läsapp med en screen.

### Skärm

Skapa en screen och döp den till:

- `scrSchedule`

### Kontroller som ska finnas på skärmen

Lägg till följande kontroller:

1. Label: `lblTitle`
2. Label: `lblToday`
3. Label: `lblCount`
4. Vertical gallery: `galLessons`
5. Container eller group: `cntEmptyState`
6. Container eller group: `cntDetail`
7. Label i detaljytan: `lblDetailTime`
8. Label i detaljytan: `lblDetailType`
9. Label i detaljytan: `lblDetailTitle`
10. Label i detaljytan: `lblDetailLocation`
11. Label i detaljytan: `lblDetailInstructor`
12. Vertical gallery eller modern table/list: `galEquipment`
13. Label i detaljytan: `lblDetailFocus`

## Del 5: App-logik

### App.OnStart

Sätt detta i `App.OnStart`:

```powerfx
Set(varToday, Today());
Set(varSelectedLesson, Blank());

ClearCollect(
    colTodayLessons,
    SortByColumns(
        Filter(Lessons, LessonDate = varToday),
        "StartTime"
    )
);
```

Kör sedan `App -> Run OnStart`.

### Uppdatera data när appen öppnas

Om du vill vara säker på att senaste data alltid laddas, använd detta i `scrSchedule.OnVisible`:

```powerfx
Refresh(Lessons);
Refresh(LessonEquipment);

ClearCollect(
    colTodayLessons,
    SortByColumns(
        Filter(Lessons, LessonDate = Today()),
        "StartTime"
    )
);
```

## Del 6: Rubriker och sammanfattning

### lblTitle.Text

```powerfx
"Brandresan - Dagens schema"
```

### lblToday.Text

```powerfx
Text(Today(), "[$-sv-SE]dddd d mmmm")
```

Om du vill tvinga första bokstaven till versal:

```powerfx
Upper(Left(Text(Today(), "[$-sv-SE]dddd d mmmm"), 1)) &
Mid(Text(Today(), "[$-sv-SE]dddd d mmmm"), 2, 100)
```

### lblCount.Text

```powerfx
CountRows(colTodayLessons) & " pass"
```

## Del 7: Lektionslistan

### galLessons.Items

```powerfx
colTodayLessons
```

### Innehåll i varje rad

Lägg till labels i galleriet för tid, titel och meta.

#### Tid

```powerfx
Text(ThisItem.StartTime, "[$-sv-SE]hh:mm") & " - " &
Text(ThisItem.EndTime, "[$-sv-SE]hh:mm")
```

#### Titel

```powerfx
ThisItem.Title
```

#### Meta

```powerfx
ThisItem.LessonType & " | " & ThisItem.Location
```

### galLessons.OnSelect

```powerfx
Set(varSelectedLesson, ThisItem)
```

## Del 8: Markera aktuell eller vald lektion

I webappen finns två visuella lägen:

1. vald lektion
2. aktuell lektion enligt klockan

Sätt exempelvis `TemplateFill` på `galLessons` till:

```powerfx
If(
    !IsBlank(varSelectedLesson) && ThisItem.Id = varSelectedLesson.Id,
    RGBA(255, 242, 238, 1),
    If(
        TimeValue(Text(Now(), "[$-sv-SE]hh:mm")) >= ThisItem.StartTime &&
        TimeValue(Text(Now(), "[$-sv-SE]hh:mm")) <= ThisItem.EndTime,
        RGBA(232, 247, 240, 1),
        RGBA(255, 255, 255, 1)
    )
)
```

Om SQL-connectorn beter sig annorlunda för `TIME`, kan du i nästa steg införa hjälpkolumner eller förenkla markeringen.

## Del 9: Tom vy och detaljkort

### cntEmptyState.Visible

```powerfx
IsBlank(varSelectedLesson)
```

### cntDetail.Visible

```powerfx
!IsBlank(varSelectedLesson)
```

## Del 10: Detaljvyn

### lblDetailTime.Text

```powerfx
Text(varSelectedLesson.StartTime, "[$-sv-SE]hh:mm") & " - " &
Text(varSelectedLesson.EndTime, "[$-sv-SE]hh:mm")
```

### lblDetailType.Text

```powerfx
varSelectedLesson.LessonType
```

### lblDetailTitle.Text

```powerfx
varSelectedLesson.Title
```

### lblDetailLocation.Text

```powerfx
"Plats: " & varSelectedLesson.Location
```

### lblDetailInstructor.Text

```powerfx
"Instruktör: " & varSelectedLesson.Instructor
```

### lblDetailFocus.Text

```powerfx
varSelectedLesson.Focus
```

## Del 11: Utrustningslistan

### galEquipment.Items

```powerfx
Filter(LessonEquipment, LessonId = varSelectedLesson.Id)
```

### Utrustningsetikett i galleriet

```powerfx
ThisItem.EquipmentName
```

## Del 12: Layout och design

Din nuvarande webapp har tre tydliga visuella principer:

1. mörk, tydlig toppsektion
2. lektioner till vänster
3. detaljkort till höger

För att efterlikna den i Power Apps rekommenderas:

### Färger

- mörk text: `RGBA(15,27,45,1)`
- accent röd/orange: `RGBA(214,63,43,1)`
- blå sekundär: `RGBA(15,54,89,1)`
- grön för aktuell lektion: `RGBA(30,143,103,1)`
- ljus bakgrund: `RGBA(238,242,246,1)`
- vit panel: `RGBA(255,255,255,1)`

### Rekommenderad layout

1. En header-container överst med titel och datum.
2. Ett vänsterblock för `galLessons`.
3. Ett högerblock för `cntDetail`.
4. Rundade hörn på paneler.
5. Tydliga visuella skillnader mellan normal, aktuell och vald lektion.

## Del 13: Adminfunktioner i Power Apps

När läsappen fungerar kan du lägga till en andra screen:

- `scrAdmin`

Den kan innehålla:

1. Ett galleri med lektioner.
2. Ett edit form kopplat till `Lessons`.
3. En separat hantering för `LessonEquipment`.

### Enkel adminmodell

Du kan börja med att bara redigera `Lessons` i ett form.

Formuläret ska minst hantera:

- LessonDate
- StartTime
- EndTime
- Title
- LessonType
- Location
- Instructor
- Focus
- SortOrder

### Spara-knapp

Exempel på `OnSelect` för en spara-knapp:

```powerfx
SubmitForm(frmLesson)
```

### Ny-knapp

```powerfx
NewForm(frmLesson);
Set(varSelectedLesson, Blank())
```

### Redigera vald lektion

```powerfx
EditForm(frmLesson);
Set(varSelectedLesson, galLessons.Selected)
```

## Del 14: Om du vill migrera från nuvarande data

Den nuvarande SWA-lösningen läser från en JSON-payload via API. Det betyder att du sannolikt redan har data i tabellen `app_state` eller motsvarande, inte i tabellerna `Lessons` och `LessonEquipment`.

Rekommenderad migreringsstrategi:

1. Exportera nuvarande schema från adminlösningen om det finns exportfunktion.
2. Om exporten ger JSON eller CSV, transformera datat till SQL-tabellerna.
3. Lägg först in `Lessons`.
4. Lägg sedan in relaterad utrustning i `LessonEquipment`.

Om du senare vill kan detta automatiseras med ett litet Node.js-script eller SQL-importsteg.

## Del 15: Rekommenderad säkerhetsmodell

För snabb uppstart kan du använda SQL admin-kontot för att testa anslutningen i Power Apps.

För riktig drift bör du inte använda SQL admin permanent.

Skapa i stället en separat SQL-user för Power Apps med begränsade rättigheter.

Exempel:

```sql
CREATE LOGIN brandresan_powerapp_user WITH PASSWORD = 'BytTillEttStarktLosenordHar';
GO

USE DinDatabas;
GO

CREATE USER brandresan_powerapp_user FOR LOGIN brandresan_powerapp_user;
GO

ALTER ROLE db_datareader ADD MEMBER brandresan_powerapp_user;
ALTER ROLE db_datawriter ADD MEMBER brandresan_powerapp_user;
GO
```

## Del 16: Felsokning

### Problem: Power Apps kan inte ansluta till SQL

Kontrollera:

1. att servernamnet är korrekt, vanligtvis `namn.database.windows.net`
2. att databasen finns
3. att användarnamn och lösenord stämmer
4. att Azure SQL-brandväggen tillåter anslutning
5. att Power Platform får nå databasen via nätverket

### Problem: Inga rader visas i appen

Kontrollera:

1. att det finns rader i `Lessons`
2. att `LessonDate` matchar dagens datum
3. att `colTodayLessons` fylls korrekt efter `OnStart` eller `OnVisible`

### Problem: Utrustning visas inte

Kontrollera:

1. att `LessonId` i `LessonEquipment` faktiskt matchar `Id` i `Lessons`
2. att `varSelectedLesson` inte är blank

### Problem: Tidsjämförelser fungerar inte

Detta kan bero på hur SQL `TIME` tolkas i connectorn. Om så sker:

1. börja utan aktuell-markering
2. få läsapp och detaljvy att fungera först
3. lägg sedan till hjälpkolumner eller justerade Power Fx-uttryck

## Del 17: Rekommenderad byggordning

Följ denna ordning:

1. Skapa tabeller i Azure SQL.
2. Lägg in testdata.
3. Skapa Canvas App.
4. Lägg till SQL-datakällor.
5. Bygg `scrSchedule`.
6. Verifiera att dagens lektioner visas.
7. Verifiera att klick på lektion visar detaljvy.
8. Lägg till utrustningslista.
9. Lägg till markering för vald lektion.
10. Lägg till markering för aktuell lektion.
11. Bygg adminscreen först när läsvyn fungerar stabilt.

## Del 18: Rekommendation for denna losning

For just din nuvarande setup ar detta den mest pragmatiska vagen:

1. Behall nuvarande SWA for publik webvy om den redan fungerar bra.
2. Bygg Power App som ett komplement for intern anvandning.
3. Lat Power App ga direkt mot normaliserade SQL-tabeller.
4. Migrera gradvis i stallet for att forsoka konvertera hela webappen mekaniskt till `.msapp`.

Det ger lagre risk, mindre omlaggning och en losning som ar mer naturlig i Power Apps.

## Del 19: Nasta steg

Nar du vill ga vidare ar detta den naturliga fortsättningen:

1. Skapa SQL-tabellerna i den databas du redan har.
2. Bygg en forsta enkel Canvas App med bara list- och detaljvy.
3. Testa att ansluta med SQL-auth.
4. Bygg adminfunktioner efter att lasappen fungerar.

Om du vill kan nasta dokument vara en ren byggguide i Power Apps Studio med exakta kontrollplaceringar, namn och formelfalt steg for steg.