const { createPresentationStore } = require("./store");

const store = createPresentationStore();

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

      return json(200, {
        ok: true,
        phase: session.phase,
        deadlineMs: session.deadlineMs
      });
    }

    if (method === "POST" && action === "submit") {
      const payload = req.body || {};
      const result = await store.submit({
        sessionId: payload.sessionId,
        participantId: payload.participantId,
        ranking: payload.ranking,
        responseTimeMs: payload.responseTimeMs
      });

      if (result === null) {
        return json(404, { error: "Session not found" });
      }

      if (result === false) {
        return json(400, { error: "participantId and ranking required" });
      }

      return json(200, { ok: true });
    }

    if (method === "GET" && action === "conflicts") {
      const sessionId = req.query.sessionId;
      const participantId = req.query.participantId || "";
      const conflicts = await store.getConflicts({ sessionId, participantId });
      if (!conflicts) {
        return json(404, { error: "Session not found" });
      }
      return json(200, conflicts);
    }

    if (method === "GET" && action === "state") {
      const sessionId = req.query.sessionId;
      const participantId = req.query.participantId || "";
      const state = await store.participantState({ sessionId, participantId });
      if (!state) {
        return json(404, { error: "Session not found" });
      }
      return json(200, state);
    }

    if (method === "GET" && action === "results") {
      const sessionId = req.query.sessionId;
      const results = await store.getResults(sessionId);
      if (!results) {
        return json(404, { error: "Session not found" });
      }
      return json(200, results);
    }

    return json(404, { error: "Unknown action" });
  } catch (error) {
    context.log.error("presentation api error", error);
    return json(500, { error: "Internal server error" });
  }
};

function json(status, body) {
  return {
    status,
    headers: { "Content-Type": "application/json" },
    body
  };
}
