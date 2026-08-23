const crypto = require('crypto');
const {
  getPool,
  ensureAppStateTable,
  json,
  getState,
  putState,
  normalizeEmail,
  assertEmail,
  assertPassword,
  hashPassword,
  signSession,
  parseBody,
  userByIdKey,
  userByEmailKey,
  householdKey,
  nowIso,
  mapUserForClient,
  requireAuthUser,
} = require('../familjelistan-shared');

module.exports = async function (_context, req) {
  const action = String((req.params && req.params.action) || '').toLowerCase();
  const body = parseBody(req);

  try {
    const pool = getPool();
    await ensureAppStateTable(pool);

    if (action === 'register') {
      const email = normalizeEmail(body.email);
      const password = String(body.password || '');
      assertEmail(email);
      assertPassword(password);

      const existingIndex = await getState(pool, userByEmailKey(email));
      if (existingIndex && existingIndex.userId) {
        return json(409, { error: 'E-post redan registrerad' });
      }

      const userId = crypto.randomUUID();
      const householdId = crypto.randomUUID();
      const displayName = String(body.displayName || email.split('@')[0]).trim() || 'Medlem';
      const salt = crypto.randomBytes(16).toString('hex');
      const token = signSession(userId);
      const createdAt = nowIso();

      const user = {
        id: userId,
        email,
        displayName,
        passwordSalt: salt,
        passwordHash: hashPassword(password, salt),
        token,
        householdId,
        createdAt,
        updatedAt: createdAt,
      };

      const household = {
        id: householdId,
        name: 'Vart hushall',
        members: [{ userId, displayName, role: 'owner' }],
        lists: [],
        itemHistory: [],
        createdAt,
        updatedAt: createdAt,
      };

      await putState(pool, userByIdKey(userId), user);
      await putState(pool, userByEmailKey(email), { userId });
      await putState(pool, householdKey(householdId), household);

      return json(201, {
        user: mapUserForClient(user),
        token,
      });
    }

    if (action === 'login') {
      const email = normalizeEmail(body.email);
      const password = String(body.password || '');
      assertEmail(email);
      assertPassword(password);

      const index = await getState(pool, userByEmailKey(email));
      if (!index || !index.userId) {
        return json(401, { error: 'Fel e-post eller losenord' });
      }

      const user = await getState(pool, userByIdKey(index.userId));
      if (!user) {
        return json(401, { error: 'Fel e-post eller losenord' });
      }

      const hashed = hashPassword(password, user.passwordSalt);
      if (hashed !== user.passwordHash) {
        return json(401, { error: 'Fel e-post eller losenord' });
      }

      user.token = signSession(user.id);
      user.updatedAt = nowIso();
      await putState(pool, userByIdKey(user.id), user);

      return json(200, {
        user: mapUserForClient(user),
        token: user.token,
      });
    }

    return json(404, { error: 'Endpoint finns inte' });

  // POST /api/auth/change-password
    if (action === 'change-password') {
      const authUser = await requireAuthUser(req, pool);
      const currentPassword = String(body.currentPassword || '');
      const newPassword = String(body.newPassword || '');
      assertPassword(newPassword);

      const hashed = hashPassword(currentPassword, authUser.passwordSalt);
      if (hashed !== authUser.passwordHash) {
        return json(401, { error: 'Fel nuvarande lösenord' });
      }

      const newSalt = crypto.randomBytes(16).toString('hex');
      authUser.passwordSalt = newSalt;
      authUser.passwordHash = hashPassword(newPassword, newSalt);
      authUser.token = signSession(authUser.id); // invalidera gamla sessioner
      authUser.updatedAt = nowIso();
      await putState(pool, userByIdKey(authUser.id), authUser);

      return json(200, { user: mapUserForClient(authUser), token: authUser.token });
    }

  } catch (err) {
    const message = err && err.message ? err.message : 'Internt serverfel';
    if (message === 'Unauthorized') return json(401, { error: 'Unauthorized' });
    return json(500, { error: message });
  }
};
