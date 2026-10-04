using Npgsql;

var username = args.Length > 0 ? args[0] : "root";
var password = args.Length > 1 ? args[1] : "Brandbil4360!";
var mode = args.Length > 2 ? args[2] : "grant";
var host = args.Length > 3 ? args[3] : "158.174.114.209";
var sslMode = args.Length > 4 ? args[4] : "Require";
var cs = $"Host={host};Port=5432;Database=smallprojects;Username={username};Password={password};SSL Mode={sslMode};Trust Server Certificate=true;Timeout=15;Command Timeout=20";

Console.WriteLine($"Connecting to DB server {host}:5432 (SSL={sslMode})...");
try
{
  await using var conn = new NpgsqlConnection(cs);
  var openTask = Task.Run(() => conn.Open());
  var timeoutTask = Task.Delay(TimeSpan.FromSeconds(20));
  var completed = await Task.WhenAny(openTask, timeoutTask);
  if (completed != openTask)
  {
    throw new TimeoutException("Timed out connecting as root after 20 seconds.");
  }
  await openTask;
  Console.WriteLine($"Connected as {username}.");

  if (string.Equals(mode, "probe", StringComparison.OrdinalIgnoreCase))
  {
    await using var probeCmd = new NpgsqlCommand("select current_user as user, current_database() as db, now() as now_utc", conn);
    await using var reader = await probeCmd.ExecuteReaderAsync();
    if (await reader.ReadAsync())
    {
      Console.WriteLine($"Probe OK user={reader["user"]} db={reader["db"]} now={reader["now_utc"]}");
    }
    return;
  }

var statements = new[]
{
  "CREATE TABLE IF NOT EXISTS app_state (id text PRIMARY KEY, payload jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT NOW())",
  "CREATE INDEX IF NOT EXISTS app_state_updated_at_idx ON app_state (updated_at DESC)",
  "GRANT USAGE ON SCHEMA public TO azure_app",
  "GRANT CREATE ON SCHEMA public TO azure_app",
  "GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO azure_app",
  "GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO azure_app",
  "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO azure_app",
  "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO azure_app"
};

  for (var i = 0; i < statements.Length; i++)
  {
    var sql = statements[i];
    Console.WriteLine($"Running {i + 1}/{statements.Length}: {sql}");
    await using var cmd = new NpgsqlCommand(sql, conn);
    cmd.CommandTimeout = 20;
    await cmd.ExecuteNonQueryAsync();
  }

  Console.WriteLine("All grants applied successfully.");
}
catch (Exception ex)
{
  Console.Error.WriteLine($"DB grant failed: {ex.GetType().Name}: {ex.Message}");
  Environment.ExitCode = 1;
}
