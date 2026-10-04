const { Pool } = require('pg');

const connectionString = (
  process.env.EPA_PG_CONNECTION_STRING ||
  'postgresql://azure_app:N8mvQ2rT7xP4kL9zC5dH1sW3fY6@158.174.114.209:5432/smallprojects?sslmode=no-verify'
).trim();

if (!connectionString) {
  throw new Error('Missing EPA_PG_CONNECTION_STRING environment variable');
}

const pool = new Pool({
  connectionString,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

module.exports = pool;
