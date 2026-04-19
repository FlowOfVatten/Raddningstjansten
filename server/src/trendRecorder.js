function lineGroup(train) {
  // Prefer explicit network grouping, fall back to line id.
  return train.lineGroup || train.lineId || "other";
}

export class TrendRecorder {
  constructor({ getSnapshot, intervalMs = 30_000, maxSamples = 120 }) {
    this.getSnapshot = getSnapshot;
    this.intervalMs = intervalMs;
    this.maxSamples = maxSamples;
    this.samples = [];
    this.tick = this.tick.bind(this);
    this.handle = setInterval(this.tick, intervalMs);
    setTimeout(this.tick, 1500); // record soon after startup
  }

  stop() {
    clearInterval(this.handle);
  }

  tick() {
    try {
      const snap = this.getSnapshot();
      const byGroup = {};
      for (const t of snap.trains) {
        const key = lineGroup(t);
        let g = byGroup[key];
        if (!g) {
          g = { delaySum: 0, delayCount: 0, ok: 0, delayed: 0, stopped: 0, total: 0 };
          byGroup[key] = g;
        }
        g.total++;
        if (t.status === "ok") g.ok++;
        else if (t.status === "delayed") g.delayed++;
        else if (t.status === "stopped") g.stopped++;
        if (t.delay && t.delay > 0) {
          g.delaySum += t.delay;
          g.delayCount++;
        }
      }
      const byGroupOut = {};
      for (const [key, g] of Object.entries(byGroup)) {
        byGroupOut[key] = {
          total: g.total,
          ok: g.ok,
          delayed: g.delayed,
          stopped: g.stopped,
          avgDelay: g.delayCount ? Math.round(g.delaySum / g.delayCount) : 0,
          punctuality: g.total ? g.ok / g.total : 0,
        };
      }
      this.samples.push({ t: snap.t || Date.now(), byGroup: byGroupOut });
      while (this.samples.length > this.maxSamples) this.samples.shift();
    } catch (err) {
      console.warn("[trends] tick failed:", err.message);
    }
  }

  snapshot() {
    return {
      intervalMs: this.intervalMs,
      maxSamples: this.maxSamples,
      samples: this.samples.slice(),
    };
  }
}
