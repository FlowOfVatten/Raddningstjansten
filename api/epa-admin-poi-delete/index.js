const { getEpaPool, verifyAdminPassword } = require('../epa-shared');

module.exports = async function (context, req) {
  const { poiId } = req.params;
  const { password } = req.body || {};

  // Verify password against database
  const isValid = await verifyAdminPassword(password);
  if (!isValid) {
    return {
      status: 403,
      body: { error: 'Felaktigt lösenord' }
    };
  }

  try {
    const pool = getEpaPool();
    await pool.query('DELETE FROM epa_poi WHERE id = $1', [poiId]);

    return {
      status: 200,
      body: { success: true }
    };
  } catch (err) {
    context.log('Error deleting POI:', err.message);
    return {
      status: 500,
      body: { error: 'Kunde inte ta bort POI' }
    };
  }
};
