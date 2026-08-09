const { Pool } = require('pg');
const crypto = require('crypto');

const pool = new Pool({
  connectionString:
    process.env.RISE_PG_CONNECTION_STRING ||
    'postgresql://azure_app:N8mvQ2rT7xP4kL9zC5dH1sW3fY6@158.174.114.209:5432/smallprojects?sslmode=no-verify',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
});

function hashPassword(p, s) { return crypto.pbkdf2Sync(p, s, 100000, 64, 'sha512').toString('hex'); }
function generateSalt()  { return crypto.randomBytes(16).toString('hex'); }
function generateToken() { return crypto.randomBytes(32).toString('hex'); }

async function verifyAdmin(client, username, token) {
  const r = await client.query('SELECT is_admin FROM users WHERE lower(username)=lower($1) AND token=$2', [username, token]);
  return r.rows.length > 0 && r.rows[0].is_admin === true;
}

module.exports = async function (context, req) {
  const cors = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
  if (req.method === 'OPTIONS') return { status: 204, headers: cors, body: '' };

  const { action, username, password, newPassword, token, troops, newUsername, makeAdmin, targetUsername } = req.body || {};

  // Token-authenticated troop actions
  if (action === 'saveTroops' || action === 'loadTroops') {
    if (!username || !token) return { status: 401, headers: cors, body: JSON.stringify({ error: 'Unauthorized' }) };
    let tc;
    try {
      tc = await pool.connect();
      const tr = await tc.query('SELECT token, troops FROM users WHERE lower(username)=lower($1)', [username]);
      if (tr.rows.length === 0 || tr.rows[0].token !== token)
        return { status: 401, headers: cors, body: JSON.stringify({ error: 'Invalid session' }) };
      if (action === 'loadTroops')
        return { status: 200, headers: cors, body: JSON.stringify({ troops: tr.rows[0].troops || {} }) };
      const troopPayload = (troops && typeof troops === 'object') ? { ...troops } : {};
      troopPayload._updatedAt = new Date().toISOString();
      await tc.query('UPDATE users SET troops=$1 WHERE lower(username)=lower($2)', [JSON.stringify(troopPayload), username]);
      return { status: 200, headers: cors, body: JSON.stringify({ ok: true }) };
    } catch (err) {
      context.log.error('rise troops error:', err.message);
      return { status: 500, headers: cors, body: JSON.stringify({ error: 'Serverfel: ' + err.message }) };
    } finally { if (tc) tc.release(); }
  }

  // Admin actions
  if (action === 'listUsers' || action === 'createUser' || action === 'deleteUser') {
    if (!username || !token) return { status: 401, headers: cors, body: JSON.stringify({ error: 'Unauthorized' }) };
    let ac;
    try {
      ac = await pool.connect();
      if (!(await verifyAdmin(ac, username, token)))
        return { status: 403, headers: cors, body: JSON.stringify({ error: 'Admin access required' }) };

      if (action === 'listUsers') {
        const r = await ac.query('SELECT id, username, is_admin, must_change_password, created_at, troops FROM users ORDER BY username');
        return { status: 200, headers: cors, body: JSON.stringify({ users: r.rows }) };
      }

      if (action === 'createUser') {
        if (!newUsername || newUsername.trim().length < 2)
          return { status: 400, headers: cors, body: JSON.stringify({ error: 'Username must be at least 2 characters' }) };
        const nu = newUsername.trim().toLowerCase();
        const ex = await ac.query('SELECT 1 FROM users WHERE lower(username)=lower($1)', [nu]);
        if (ex.rows.length > 0) return { status: 409, headers: cors, body: JSON.stringify({ error: 'Username already exists' }) };
        await ac.query('INSERT INTO users (username, is_admin, must_change_password) VALUES ($1, $2, TRUE)', [nu, makeAdmin === true]);
        return { status: 201, headers: cors, body: JSON.stringify({ ok: true, username: nu }) };
      }

      if (action === 'deleteUser') {
        if (!targetUsername) return { status: 400, headers: cors, body: JSON.stringify({ error: 'targetUsername missing' }) };
        if (targetUsername.toLowerCase() === username.toLowerCase())
          return { status: 400, headers: cors, body: JSON.stringify({ error: 'Cannot delete yourself' }) };
        await ac.query('DELETE FROM users WHERE lower(username)=lower($1)', [targetUsername]);
        return { status: 200, headers: cors, body: JSON.stringify({ ok: true }) };
      }
    } catch (err) {
      context.log.error('rise admin error:', err.message);
      return { status: 500, headers: cors, body: JSON.stringify({ error: 'Serverfel: ' + err.message }) };
    } finally { if (ac) ac.release(); }
  }

  if (!username || typeof username !== 'string')
    return { status: 400, headers: cors, body: JSON.stringify({ error: 'username missing' }) };

  let client;
  try {
    client = await pool.connect();

    if (action === 'check') {
      const r = await client.query('SELECT must_change_password FROM users WHERE lower(username)=lower($1)', [username]);
      if (r.rows.length === 0) return { status: 401, headers: cors, body: JSON.stringify({ error: 'Unknown user' }) };
      return { status: 200, headers: cors, body: JSON.stringify({ mustChangePassword: r.rows[0].must_change_password }) };
    }

    if (action === 'login') {
      const r = await client.query('SELECT password_hash, salt, must_change_password, is_admin FROM users WHERE lower(username)=lower($1)', [username]);
      if (r.rows.length === 0) return { status: 401, headers: cors, body: JSON.stringify({ error: 'Incorrect username or password' }) };
      const user = r.rows[0];
      if (!user.password_hash || !user.salt) return { status: 403, headers: cors, body: JSON.stringify({ mustChangePassword: true }) };
      if (hashPassword(password, user.salt) !== user.password_hash)
        return { status: 401, headers: cors, body: JSON.stringify({ error: 'Incorrect username or password' }) };
      const newToken = generateToken();
      await client.query('UPDATE users SET token=$1 WHERE lower(username)=lower($2)', [newToken, username]);
      return { status: 200, headers: cors, body: JSON.stringify({ ok: true, mustChangePassword: user.must_change_password, token: newToken, isAdmin: user.is_admin }) };
    }

    if (action === 'setPassword') {
      if (!newPassword || newPassword.length < 8)
        return { status: 400, headers: cors, body: JSON.stringify({ error: 'Password must be at least 8 characters' }) };
      const salt = generateSalt();
      const hash = hashPassword(newPassword, salt);
      const newToken = generateToken();
      const r = await client.query(
        'UPDATE users SET password_hash=$1, salt=$2, must_change_password=FALSE, token=$3 WHERE lower(username)=lower($4) RETURNING id, is_admin',
        [hash, salt, newToken, username]
      );
      if (r.rowCount === 0) return { status: 404, headers: cors, body: JSON.stringify({ error: 'Unknown user' }) };
      return { status: 200, headers: cors, body: JSON.stringify({ ok: true, token: newToken, isAdmin: r.rows[0].is_admin }) };
    }

    return { status: 400, headers: cors, body: JSON.stringify({ error: 'Unknown action' }) };
  } catch (err) {
    context.log.error('rise-login error:', err.message);
    return { status: 500, headers: cors, body: JSON.stringify({ error: 'Serverfel: ' + err.message }) };
  } finally { if (client) client.release(); }
};
