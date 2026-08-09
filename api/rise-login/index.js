const { Pool } = require('pg');
const crypto = require('crypto');

const pool = new Pool({
  connectionString:
    process.env.RISE_PG_CONNECTION_STRING ||
    'postgresql://azure_app:N8mvQ2rT7xP4kL9zC5dH1sW3fY6@158.174.114.209:5432/smallprojects?sslmode=require',
});

function hashPassword(password, salt) {
  return crypto
    .pbkdf2Sync(password, salt, 100000, 64, 'sha512')
    .toString('hex');
}

function generateSalt() {
  return crypto.randomBytes(16).toString('hex');
}

module.exports = async function (context, req) {
  const cors = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  if (req.method === 'OPTIONS') {
    return { status: 204, headers: cors, body: '' };
  }

  const { action, username, password, newPassword } = req.body || {};

  if (!username || typeof username !== 'string') {
    return { status: 400, headers: cors, body: JSON.stringify({ error: 'username saknas' }) };
  }

  let client;
  try {
    client = await pool.connect();

    if (action === 'check') {
      // Check if user exists
      const result = await client.query(
        'SELECT must_change_password FROM users WHERE lower(username) = lower($1)',
        [username]
      );
      if (result.rows.length === 0) {
        return { status: 401, headers: cors, body: JSON.stringify({ error: 'Okänd användare' }) };
      }
      return {
        status: 200,
        headers: cors,
        body: JSON.stringify({ mustChangePassword: result.rows[0].must_change_password }),
      };
    }

    if (action === 'login') {
      const result = await client.query(
        'SELECT password_hash, salt, must_change_password FROM users WHERE lower(username) = lower($1)',
        [username]
      );
      if (result.rows.length === 0) {
        return { status: 401, headers: cors, body: JSON.stringify({ error: 'Fel användarnamn eller lösenord' }) };
      }
      const user = result.rows[0];
      if (!user.password_hash || !user.salt) {
        return { status: 403, headers: cors, body: JSON.stringify({ mustChangePassword: true }) };
      }
      const hash = hashPassword(password, user.salt);
      if (hash !== user.password_hash) {
        return { status: 401, headers: cors, body: JSON.stringify({ error: 'Fel användarnamn eller lösenord' }) };
      }
      return {
        status: 200,
        headers: cors,
        body: JSON.stringify({ ok: true, mustChangePassword: user.must_change_password }),
      };
    }

    if (action === 'setPassword') {
      if (!newPassword || newPassword.length < 8) {
        return { status: 400, headers: cors, body: JSON.stringify({ error: 'Lösenordet måste vara minst 8 tecken' }) };
      }
      const salt = generateSalt();
      const hash = hashPassword(newPassword, salt);
      const result = await client.query(
        'UPDATE users SET password_hash=$1, salt=$2, must_change_password=FALSE WHERE lower(username)=lower($3) RETURNING id',
        [hash, salt, username]
      );
      if (result.rowCount === 0) {
        return { status: 404, headers: cors, body: JSON.stringify({ error: 'Okänd användare' }) };
      }
      return { status: 200, headers: cors, body: JSON.stringify({ ok: true }) };
    }

    return { status: 400, headers: cors, body: JSON.stringify({ error: 'Okänd action' }) };
  } catch (err) {
    context.log.error('rise-login error:', err.message);
    return { status: 500, headers: cors, body: JSON.stringify({ error: 'Serverfel' }) };
  } finally {
    if (client) client.release();
  }
};
