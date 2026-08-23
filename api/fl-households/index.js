const crypto = require('crypto');
const {
  getPool,
  ensureAppStateTable,
  json,
  getState,
  putState,
  parseBody,
  householdKey,
  userByIdKey,
  userByEmailKey,
  nowIso,
  requireAuthUser,
} = require('../familjelistan-shared');

function inviteKey(token) {
  return `fl:invite:${token}`;
}

module.exports = async function (_context, req) {
  const action = String((req.params && req.params.action) || '').toLowerCase();
  const body = parseBody(req);

  try {
    const pool = getPool();
    await ensureAppStateTable(pool);
    const user = await requireAuthUser(req, pool);

    // POST /api/households/invite – skapa inbjudningstoken + QR-URL
    if (action === 'invite') {
      const token = crypto.randomBytes(24).toString('hex');
      const invite = {
        householdId: user.householdId,
        createdBy: user.id,
        createdAt: nowIso(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };
      await putState(pool, inviteKey(token), invite);

      const url = `https://ambitious-island-0a12cd003.6.azurestaticapps.net/Familjelistan/?invite=${token}`;
      return json(201, { token, url });
    }

    // POST /api/households/join – gå med via QR-token
    if (action === 'join') {
      const inviteToken = String(body.token || '');
      if (!inviteToken) return json(400, { error: 'Token krävs' });

      const invite = await getState(pool, inviteKey(inviteToken));
      if (!invite) return json(404, { error: 'Ogiltig eller utgången inbjudan' });
      if (new Date(invite.expiresAt) < new Date()) {
        return json(410, { error: 'Inbjudan har gått ut' });
      }

      const household = await getState(pool, householdKey(invite.householdId));
      if (!household) return json(404, { error: 'Hushållet finns inte längre' });

      const alreadyMember = (household.members || []).some((m) => m.userId === user.id);
      if (!alreadyMember) {
        household.members = household.members || [];
        household.members.push({ userId: user.id, displayName: user.displayName, role: 'member' });
        household.updatedAt = nowIso();
        await putState(pool, householdKey(household.id), household);
      }

      // Flytta användaren till det inbjudna hushållet
      user.householdId = household.id;
      user.updatedAt = nowIso();
      await putState(pool, userByIdKey(user.id), user);

      return json(200, { ok: true, householdId: household.id, householdName: household.name });
    }

    // POST /api/households/add-by-email – lägg till befintlig användare via e-post
    if (action === 'add-by-email') {
      const targetEmail = String(body.email || '').trim().toLowerCase();
      if (!targetEmail) return json(400, { error: 'E-post krävs' });

      const household = await getState(pool, householdKey(user.householdId));
      if (!household) return json(404, { error: 'Hushåll saknas' });

      const targetIndex = await getState(pool, userByEmailKey(targetEmail));
      if (!targetIndex || !targetIndex.userId) {
        return json(404, { error: 'Ingen användare med den e-posten hittades' });
      }

      const targetUser = await getState(pool, userByIdKey(targetIndex.userId));
      if (!targetUser) return json(404, { error: 'Användaren finns inte' });

      const alreadyMember = (household.members || []).some((m) => m.userId === targetUser.id);
      if (alreadyMember) return json(409, { error: 'Personen är redan medlem i hushållet' });

      household.members = household.members || [];
      household.members.push({ userId: targetUser.id, displayName: targetUser.displayName, role: 'member' });
      household.updatedAt = nowIso();
      await putState(pool, householdKey(household.id), household);

      targetUser.householdId = household.id;
      targetUser.updatedAt = nowIso();
      await putState(pool, userByIdKey(targetUser.id), targetUser);

      return json(200, { ok: true, addedUser: { displayName: targetUser.displayName, email: targetUser.email } });
    }

    return json(404, { error: 'Endpoint finns inte' });
  } catch (err) {
    const message = err && err.message ? err.message : 'Internt serverfel';
    if (message === 'Unauthorized') return json(401, { error: 'Unauthorized' });
    return json(500, { error: message });
  }
};
