/**
 * Headless pipeline test: proves the server (24-segment) -> client (44-point)
 * sync now animates the FULL backbone (incl. tail pts 24-43 that used to freeze),
 * converges to the authoritative targets, and syncs reflex states + food list.
 *
 * Run: node tests/test_client_sim_pipeline.js   (from repo root)
 */
const fs = require("fs");
const path = require("path");

const src = fs.readFileSync(path.join(__dirname, "..", "web", "connecto_sim.js"), "utf8");

// Minimal no-op canvas 2D context stub
const ctx = new Proxy({}, {
  get: (t, p) => {
    if (p === "createRadialGradient") return () => ({ addColorStop() {} });
    return () => {};
  },
  set: () => true
});
const canvas = { width: 920, height: 560, getContext: () => ctx };

eval(src + "\n;globalThis.ClientConnectoSim = ClientConnectoSim;");
const sim = new ClientConnectoSim(canvas);

// Mirrors the exact math in danio/simulation.py _get_body_segments()
function payload(cx, cy, heading, phase, state) {
  const segs = [];
  for (let i = 0; i < 24; i++) {
    const u = i / 23;
    const env = Math.pow(Math.sin(u * Math.PI), 0.85);
    const ao = 0.42 * env * Math.sin(phase - i * 0.30);
    const a = heading + ao;
    segs.push({ x: cx - i * 17 * Math.cos(a), y: cy - i * 17 * Math.sin(a), angle: a });
  }
  return {
    x: cx, y: cy, heading,
    state: state || "CHEMOTAXIS_FORWARD",
    segments: segs,
    food_list: [{ x: 720, y: 240, pulse: 0 }]
  };
}

// Record pre-sync tail positions (these used to stay FROZEN at the init line)
const initialTail = sim.points.slice(24).map(p => ({ x: Math.round(p.x), y: Math.round(p.y) }));

// 6 seconds @ 60 fps; server message every 2 frames (50 Hz); fish glides right
let step = 0, maxErr = 0;
for (let f = 0; f < 360; f++) {
  if (f % 2 === 0) {
    step++;
    const cx = 500 + 27 * (f * 0.0167) * Math.cos(0.4);
    const cy = 300 + 27 * (f * 0.0167) * Math.sin(0.4);
    sim.syncWithServer(payload(cx, cy, 0.4, step * 0.19));
  }
  sim.render();
  const tgt = sim.serverTargets;
  if (tgt && f > 200) { // after the convergence window
    for (let i = 0; i < 44; i++) {
      const e = Math.hypot(sim.points[i].x - tgt[i].x, sim.points[i].y - tgt[i].y);
      maxErr = Math.max(maxErr, e);
    }
  }
}

const r2 = p => ({ x: Math.round(p.x), y: Math.round(p.y) });
let failures = 0;
function check(label, cond, detail) {
  console.log((cond ? "PASS" : "FAIL") + " | " + label + (detail ? " -> " + detail : ""));
  if (!cond) failures++;
}

check("backbone converged to server targets (< 1.5 px)", maxErr < 1.5, "maxErr=" + maxErr.toFixed(2) + "px");
check("tail point 24 left its frozen initial position",
  Math.hypot(sim.points[24].x - initialTail[0].x, sim.points[24].y - initialTail[0].y) > 30,
  "init=" + JSON.stringify(initialTail[0]) + " now=" + JSON.stringify(r2(sim.points[24])));
check("tail point 43 left its frozen initial position",
  Math.hypot(sim.points[43].x - initialTail[19].x, sim.points[43].y - initialTail[19].y) > 30,
  "init=" + JSON.stringify(initialTail[19]) + " now=" + JSON.stringify(r2(sim.points[43])));
check("head tracks server head",
  Math.hypot(sim.points[0].x - sim.serverTargets[0].x, sim.points[0].y - sim.serverTargets[0].y) < 1.5,
  "head=" + JSON.stringify(r2(sim.points[0])));

// Reflex visual sync
sim.syncWithServer({ ...payload(500, 300, 0.5, 1), state: "MAUTHNER_ESCAPE" });
check("MAUTHNER_ESCAPE -> reverse color mode", sim.reverse === true && sim.state === "MAUTHNER_ESCAPE");
sim.syncWithServer({ ...payload(500, 300, 0.5, 1), state: "ESCAPE_ACCELERATION" });
check("ESCAPE_ACCELERATION -> sprint mode", sim.sprint === true && sim.reverse === false);
sim.syncWithServer({ ...payload(500, 300, 0.5, 1), state: "FORAGING_SEARCH" });
check("FORAGING_SEARCH -> normal mode", sim.reverse === false && sim.sprint === false);

// Food list sync
check("food list synced from server", sim.foodList.length === 1 &&
  Math.abs(sim.foodList[0].x - 720 * (920 / 1000)) < 0.01,
  "foodList=" + JSON.stringify(sim.foodList.map(r2)));

// Stale buffer expiry: if the WebSocket dies (no fresh samples > 400 ms),
// render() must stop overriding the backbone so the local sim can take over
if (sim.serverBuf && sim.serverBuf.length) {
  const staleT = performance.now() - 500;
  sim.serverBuf.forEach(s => { s.t = staleT; });
  const before = sim.points.map(p => ({ x: p.x, y: p.y }));
  sim.render();
  const moved = Math.max(...sim.points.map((p, i) => Math.hypot(p.x - before[i].x, p.y - before[i].y)));
  check("stale server buffer expires (local sim regains control)", moved < 0.001, "maxMove=" + moved.toFixed(3) + "px");
  sim.serverBuf = []; // restore
}

// Legacy "points" ([x,y]) payload still works
sim.syncWithServer({ x: 500, y: 300, angle: 0.3, points: Array.from({ length: 24 }, (_, i) => [500 - i * 17, 300]) });
check("legacy [x,y] points payload accepted",
  sim.serverTargets && sim.serverTargets.length === 44 &&
  Math.abs(sim.serverTargets[0].x - 500 * 0.92) < 0.01);

console.log(failures === 0 ? "ALL_CLIENT_PIPELINE_TESTS_PASSED" : failures + " TEST(S) FAILED");
process.exit(failures === 0 ? 0 : 1);
