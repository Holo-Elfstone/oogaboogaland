// Live OogaBoogaX stats from the deployed oogatron worker: one poller for the
// page life, every minute while the tab is visible. Subscribers get plain
// events: { type: "stats", stats } for every good poll (the full /v1/stats
// payload, schema 2), and { type: "contribution", delta, activity } when the
// org's commits+prs+reviews rose since the previous poll — the fireworks
// signal. The baseline is the first successful poll, never the baked
// snapshot: a stale bake must not fire celebration on every page load.
// Network errors are silent (counted in state); the page always keeps the
// baked board. Like the mempool feed, this stays off under nosim and can be
// disabled with oogatron=0. file:// pages and a reported-offline browser
// never open the worker; coming back online resumes an armed poller.
(() => {
  "use strict";
  const BL = window.BL = window.BL || {};
  const ENDPOINT = "https://oogatron.sterlingbreck.workers.dev/v1/stats";
  const POLL_MS = 60000;
  const subscribers = new Set();
  const state = { enabled: false, polls: 0, failures: 0, activity: -1, contributions: 0, lastAt: 0, lastError: "" };
  let timer = 0, inFlight = false, dueAt = 0;

  const emit = (event) => {
    for (const fn of subscribers) fn(event);
  };

  const liveNet = () => location.protocol !== "file:" && navigator.onLine !== false;
  const poll = async () => {
    if (inFlight || !liveNet()) return;
    inFlight = true;
    dueAt = Date.now() + POLL_MS;
    try {
      const res = await fetch(ENDPOINT);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const stats = await res.json();
      if (!stats || !stats.meta || stats.meta.schema_version !== 2 || !stats.totals) {
        throw new Error("unexpected stats shape");
      }
      const t = stats.totals;
      const activity = (t.commits | 0) + (t.prs | 0) + (t.reviews | 0);
      state.polls++;
      state.lastAt = Date.now();
      state.lastError = "";
      if (state.activity >= 0 && activity > state.activity) {
        state.contributions++;
        emit({ type: "contribution", delta: activity - state.activity, activity });
      }
      state.activity = activity;
      emit({ type: "stats", stats });
    } catch (e) {
      state.failures++;
      state.lastError = e && e.message || String(e);
    } finally {
      inFlight = false;
    }
  };

  const tick = () => {
    if (document.hidden) return;
    poll();
  };
  const onVisibility = () => {
    if (!document.hidden && state.enabled && Date.now() >= dueAt) poll();
  };

  const start = () => {
    if (state.enabled) return;
    state.enabled = true;
    if (liveNet()) poll();
    timer = window.setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", onVisibility);
  };

  const subscribe = (fn) => {
    subscribers.add(fn);
    return () => subscribers.delete(fn);
  };

  const stop = () => {
    if (timer) window.clearInterval(timer);
    timer = 0;
    document.removeEventListener("visibilitychange", onVisibility);
    state.enabled = false;
  };
  const dispose = () => {
    stop();
    subscribers.clear();
  };

  window.addEventListener("online", () => { if (state.enabled) poll(); });

  BL.oogatronLive = { start, stop, subscribe, dispose, state, ENDPOINT };
})();
