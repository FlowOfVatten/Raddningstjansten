const { getEpaPool, fairShuffleCheckpoints } = require('../epa-shared');

// Seed data: 10 POIs around Växjö, Sweden
const seedPois = [
  { namn: 'Växjö Stadsbibliotek', lat: 56.8774, lng: 15.6279, radieMeter: 40, ordningFast: 10 },
  { namn: 'Linnéplatsen', lat: 56.8794, lng: 15.6210, radieMeter: 40, ordningFast: 1 },
  { namn: 'Växjö Domkyrka', lat: 56.8728, lng: 15.6255, radieMeter: 40, ordningFast: 2 },
  { namn: 'Evedal Naturreservat', lat: 56.8654, lng: 15.6145, radieMeter: 50, ordningFast: 3 },
  { namn: 'Växjögården', lat: 56.8876, lng: 15.6354, radieMeter: 40, ordningFast: 4 },
  { namn: 'Telefonplan', lat: 56.8720, lng: 15.6368, radieMeter: 40, ordningFast: 5 },
  { namn: 'Vaxholm Camping', lat: 56.8834, lng: 15.5987, radieMeter: 50, ordningFast: 6 },
  { namn: 'Växjö Centrum', lat: 56.8751, lng: 15.6291, radieMeter: 45, ordningFast: 7 },
  { namn: 'Grasboskogen', lat: 56.8682, lng: 15.5967, radieMeter: 50, ordningFast: 8 },
  { namn: 'Södra Torget', lat: 56.8755, lng: 15.6301, radieMeter: 35, ordningFast: 9 }
];

// Question templates
const seedQuestions = [
  {
    text: 'I vilket år invigdes denna plats?',
    alternativ: ['1995', '1998', '2001', '2003'],
    rattIndex: 1,
    ledtrad: 'Det var på 90-talet'
  },
  {
    text: 'Vad är denna platsen känd för?',
    alternativ: ['Mat', 'Natur', 'Historia', 'Kultur'],
    rattIndex: 3,
    ledtrad: 'Det är en viktig kulturell mötesplats'
  },
  {
    text: 'Hur hög är byggningen här?',
    alternativ: ['10 meter', '25 meter', '40 meter', '55 meter'],
    rattIndex: 1,
    ledtrad: 'Ungefär högt som ett träd'
  },
  {
    text: 'Vem designade detta område?',
    alternativ: ['Arkitekt A', 'Arkitekt B', 'Arkitekt C', 'Arkitekt D'],
    rattIndex: 0,
    ledtrad: 'En berömd arkitekt från Sverige'
  },
  {
    text: 'Hur många besökare kommer här varje år?',
    alternativ: ['10 000', '50 000', '100 000', '500 000'],
    rattIndex: 2,
    ledtrad: 'Det är många tusen'
  },
  {
    text: 'Vilket djur hittar du här oftast?',
    alternativ: ['Älg', 'Rådjur', 'Grävling', 'Räv'],
    rattIndex: 1,
    ledtrad: 'Det är ett litet hjortdjur'
  },
  {
    text: 'Vilken växtart är vanligast här?',
    alternativ: ['Gran', 'Tall', 'Björk', 'Asp'],
    rattIndex: 0,
    ledtrad: 'Det är den största trädsorten i Sverige'
  },
  {
    text: 'Från vilket århundrade kommer denna byggnad?',
    alternativ: ['1600-talet', '1700-talet', '1800-talet', '1900-talet'],
    rattIndex: 2,
    ledtrad: 'Det var under industrialiseringen'
  },
  {
    text: 'Vad betekar namnet på denna plats?',
    alternativ: ['Grön stad', 'Källans plats', 'Växstället', 'Framtidshemmet'],
    rattIndex: 2,
    ledtrad: 'Det handlar om växtlighet'
  },
  {
    text: 'Gratuleras! Du har klarat EPA-orienteringen! Se dig omkring och berätta vilken färg målarchibetet har.',
    alternativ: ['Röd', 'Blå', 'Gul', 'Grön'],
    rattIndex: 1,
    ledtrad: 'Kolla skyltningen'
  }
];

async function seed() {
  try {
    console.log('Seeding EPA database...');
    const pool = getEpaPool();

    // Clear existing data
    await pool.query('DELETE FROM epa_player_poi');
    await pool.query('DELETE FROM epa_question');
    await pool.query('DELETE FROM epa_player');
    await pool.query('DELETE FROM epa_poi');

    // Insert POIs
    for (const poi of seedPois) {
      const result = await pool.query(
        'INSERT INTO epa_poi (namn, lat, lng, radie_meter, ordning_fast) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [poi.namn, poi.lat, poi.lng, poi.radieMeter, poi.ordningFast]
      );

      // Insert corresponding question
      const poiId = result.rows[0].id;
      const question = seedQuestions[poi.ordningFast - 1];
      
      await pool.query(
        'INSERT INTO epa_question (poi_id, text, alternativ, ratt_index, ledtrad) VALUES ($1, $2, $3, $4, $5)',
        [poiId, question.text, JSON.stringify(question.alternativ), question.rattIndex, question.ledtrad]
      );

      console.log(`✓ Added POI: ${poi.namn}`);
    }

    console.log('EPA seed completed successfully');
    process.exit(0);
  } catch (err) {
    console.error('EPA seed failed:', err);
    process.exit(1);
  }
}

seed();
