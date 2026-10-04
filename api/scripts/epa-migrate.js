const fs = require('fs');
const path = require('path');
const { getEpaPool } = require('../epa-shared');

async function migrate() {
  try {
    const schemaPath = path.join(__dirname, '../..', 'EPA', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');

    // Split schema into individual statements
    const statements = schema.split(';').filter(stmt => stmt.trim().length > 0);

    const pool = getEpaPool();

    for (const statement of statements) {
      console.log(`Executing: ${statement.substring(0, 50)}...`);
      await pool.query(statement);
    }

    console.log('EPA migration completed successfully');
    process.exit(0);
  } catch (err) {
    console.error('EPA migration failed:', err);
    process.exit(1);
  }
}

migrate();
