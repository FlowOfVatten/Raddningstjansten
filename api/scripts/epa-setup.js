#!/usr/bin/env node

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString =
  process.env.EPA_PG_CONNECTION_STRING ||
  process.env.RISE_PG_CONNECTION_STRING ||
  'postgresql://azure_app:N8mvQ2rT7xP4kL9zC5dH1sW3fY6@158.174.114.209:5432/smallprojects?sslmode=no-verify';

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
});

async function setupEPA() {
  try {
    console.log('🔗 Connecting to database...');
    const client = await pool.connect();

    // Read schema
    const schemaPath = path.join(__dirname, '..', 'EPA', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');

    // Run schema
    console.log('📋 Creating EPA tables...');
    const statements = schema.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (const stmt of statements) {
      try {
        await client.query(stmt);
        console.log(`  ✓ ${stmt.substring(0, 40)}...`);
      } catch (err) {
        if (err.message.includes('already exists')) {
          console.log(`  ℹ ${stmt.substring(0, 40)}... (already exists)`);
        } else {
          throw err;
        }
      }
    }

    // Seed POIs if table is empty
    console.log('🌱 Checking POI data...');
    const poiCount = await client.query('SELECT COUNT(*) FROM epa_poi');
    
    if (poiCount.rows[0].count === '0') {
      console.log('📍 Seeding POI data...');
      
      const pois = [
        ['Växjö Stadsbibliotek', 56.8774, 15.6279, 40, 10],
        ['Linnéplatsen', 56.8794, 15.6210, 40, 1],
        ['Växjö Domkyrka', 56.8728, 15.6255, 40, 2],
        ['Evedal Naturreservat', 56.8654, 15.6145, 50, 3],
        ['Växjögården', 56.8876, 15.6354, 40, 4],
        ['Telefonplan', 56.8720, 15.6368, 40, 5],
        ['Vaxholm Camping', 56.8834, 15.5987, 50, 6],
        ['Växjö Centrum', 56.8751, 15.6291, 45, 7],
        ['Grasboskogen', 56.8682, 15.5967, 50, 8],
        ['Södra Torget', 56.8755, 15.6301, 35, 9]
      ];

      for (const [namn, lat, lng, radius, order] of pois) {
        const res = await client.query(
          'INSERT INTO epa_poi (namn, lat, lng, radie_meter, ordning_fast) VALUES ($1, $2, $3, $4, $5) RETURNING id',
          [namn, lat, lng, radius, order]
        );
        console.log(`  ✓ Added ${namn}`);

        // Add dummy question for each POI
        const poiId = res.rows[0].id;
        await client.query(
          'INSERT INTO epa_question (poi_id, text, alternativ, ratt_index, ledtrad) VALUES ($1, $2, $3, $4, $5)',
          [
            poiId,
            `Fråga om ${namn}?`,
            JSON.stringify(['Svar 1', 'Svar 2', 'Svar 3', 'Svar 4']),
            0,
            'En ledtråd'
          ]
        );
      }
    } else {
      console.log(`  ℹ POIs already exist (${poiCount.rows[0].count} found)`);
    }

    client.release();
    await pool.end();

    console.log('\n✅ EPA database setup complete!');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Setup failed:', err.message);
    process.exit(1);
  }
}

setupEPA();
