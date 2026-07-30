# Migration: kopiera app_state från 'urf' -> 'urf2026' (samma server, samma login)

$server   = "raddningstjansten-db.database.windows.net,1433"
$user     = "raddningsadmin"
$password = "Raddn2026!"
$srcDb    = "urf"
$dstDb    = "urf2026"

function New-Connection($database) {
    $connStr = "Server=$server;Database=$database;User Id=$user;Password=$password;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;"
    $conn = New-Object System.Data.SqlClient.SqlConnection($connStr)
    $conn.Open()
    return $conn
}

Write-Host "`nAnsluter till källdatabas: $srcDb..."
$srcConn = New-Connection $srcDb

Write-Host "Ansluter till måldatabas:  $dstDb..."
$dstConn = New-Connection $dstDb

# Säkerställ att tabellen finns i måldatabasen
Write-Host "Säkerställer att app_state-tabell finns i $dstDb..."
$createTableSql = @"
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'app_state'
)
CREATE TABLE app_state (
    id          NVARCHAR(200) NOT NULL PRIMARY KEY,
    payload     NVARCHAR(MAX) NOT NULL,
    updated_at  DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME()
);
"@
$createCmd = New-Object System.Data.SqlClient.SqlCommand($createTableSql, $dstConn)
$createCmd.ExecuteNonQuery() | Out-Null

# Hämta alla rader från källan
Write-Host "Hämtar alla rader från $srcDb.app_state..."
$selectCmd = New-Object System.Data.SqlClient.SqlCommand("SELECT id, payload, updated_at FROM app_state ORDER BY updated_at", $srcConn)
$reader = $selectCmd.ExecuteReader()

$rows = @()
while ($reader.Read()) {
    $rows += [PSCustomObject]@{
        id         = $reader["id"]
        payload    = $reader["payload"]
        updated_at = $reader["updated_at"]
    }
}
$reader.Close()
Write-Host "Hittade $($rows.Count) rad(er).`n"

if ($rows.Count -eq 0) {
    Write-Host "Ingenting att migrera. Klart."
    $srcConn.Close(); $dstConn.Close()
    exit 0
}

# Kopiera rad för rad med MERGE (upsert)
$mergeSql = @"
MERGE app_state AS target
USING (SELECT @id AS id, @payload AS payload, @updated_at AS updated_at) AS source
  ON target.id = source.id
WHEN MATCHED THEN
  UPDATE SET payload = source.payload, updated_at = source.updated_at
WHEN NOT MATCHED THEN
  INSERT (id, payload, updated_at) VALUES (source.id, source.payload, source.updated_at);
"@

$success = 0
foreach ($row in $rows) {
    $cmd = New-Object System.Data.SqlClient.SqlCommand($mergeSql, $dstConn)
    $cmd.Parameters.Add("@id",         [System.Data.SqlDbType]::NVarChar, 200) | Out-Null
    $cmd.Parameters.Add("@payload",    [System.Data.SqlDbType]::NVarChar, -1)  | Out-Null
    $cmd.Parameters.Add("@updated_at", [System.Data.SqlDbType]::DateTime2)     | Out-Null
    $cmd.Parameters["@id"].Value         = $row.id
    $cmd.Parameters["@payload"].Value    = $row.payload
    $cmd.Parameters["@updated_at"].Value = $row.updated_at
    $cmd.ExecuteNonQuery() | Out-Null
    Write-Host "  ✓ $($row.id)"
    $success++
}

$srcConn.Close()
$dstConn.Close()

Write-Host "`nKlart! $success rad(er) kopierade till $dstDb."
Write-Host "Nästa steg: byt SQL_CONNECTION_STRING_URF i Azure SWA Application Settings till Initial Catalog=$dstDb."
