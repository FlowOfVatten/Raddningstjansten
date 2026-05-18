const { createStressStore } = require("./store");

const store = createStressStore();

module.exports = async function (context, req) {
  const method = (req.method || "").toUpperCase();
  const action = (context.bindingData.action || "").toLowerCase();

  try {
    if (method === "POST" && action === "createsession") {
      return json(200, await store.createSession());
    }

    if (method === "POST" && action === "activate") {
      const payload = req.body || {};
      const session = await store.activate({
        sessionId: payload.sessionId,
        adminKey: payload.adminKey,
        phase: payload.phase,
        durationSec: payload.durationSec
      });
      if (!session) {
        return json(401, { error: "Invalid session or admin key" });
      }
      return json(200, { ok: true, phase: session.phase, deadlineMs: session.deadlineMs });
    }

    if (method === "GET" && action === "state") {
      const state = await store.participantState({
        sessionId: req.query.sessionId,
        participantId: req.query.participantId || ""
      });
      if (!state) {
        return json(404, { error: "Session not found" });
      }
      return json(200, state);
    }

    if (method === "POST" && action === "submit") {
      const payload = req.body || {};
      const ok = await store.submit({
        sessionId: payload.sessionId,
        participantId: payload.participantId,
        result: payload.result || {}
      });
      if (ok === null) {
        return json(404, { error: "Session not found" });
      }
      if (ok === false) {
        return json(400, { error: "participantId required" });
      }
      return json(200, { ok: true });
    }

    if (method === "GET" && action === "results") {
      const results = await store.getResults(req.query.sessionId);
      if (!results) {
        return json(404, { error: "Session not found" });
      }
      return json(200, results);
    }

    return json(404, { error: "Unknown action" });
  } catch (error) {
    context.log.error("stress api error", error);
    return json(500, { error: error.message || "Internal server error" });
  }
};

function json(status, body) {
  return {
    status,
    headers: { "Content-Type": "application/json" },
    body
  };
}
