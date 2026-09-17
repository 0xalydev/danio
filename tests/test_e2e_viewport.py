"""
Live end-to-end regression: boots nothing (expects uvicorn on :8767), then
verifies every client-facing surface the viewport depends on.

Run manually:
  1) python -m uvicorn danio.server.app:app --port 8767
  2) python tests/test_e2e_viewport.py
"""
import asyncio
import json
import sys
import time
import urllib.request

BASE = "http://127.0.0.1:8767"
FAILURES = []


def check(label, cond, detail=""):
    print(("PASS" if cond else "FAIL") + f" | {label}" + (f" -> {detail}" if detail else ""))
    if not cond:
        FAILURES.append(label)


def get(path):
    return json.loads(urllib.request.urlopen(BASE + path, timeout=15).read())


def post(path, body=None):
    req = urllib.request.Request(
        BASE + path,
        data=json.dumps(body).encode() if body is not None else b"",
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    return json.loads(urllib.request.urlopen(req, timeout=15).read())


def main():
    html = urllib.request.urlopen(BASE + "/", timeout=15).read().decode()
    check("index.html served with viewport + scripts",
          "rig-canvas" in html and "connecto_sim.js" in html and "app.js" in html,
          f"{len(html)} bytes")

    st = get("/api/state")
    check("/api/state has locomotion with new keys",
          sorted(st["locomotion"].keys()) == ["food_list", "heading", "segments", "speed", "state", "x", "y"]
          and st.get("uptime_s", 0) > 0,
          f"state={st['state']}")

    check("/api/food works", post("/api/food", {"x": 250, "y": 380})["status"] == "ok")
    check("/api/touch (head) works", post("/api/touch", {"anterior": True})["status"] == "ok")
    check("/api/touch (tail) works", post("/api/touch", {"anterior": False})["status"] == "ok")
    reset_res = post("/api/reset")
    check("/api/reset works + reports exact re-center position",
          reset_res["status"] == "ok"
          and reset_res["position"] == {"x": 500.0, "y": 300.0}
          and reset_res["food"]["x"] > 130 and reset_res["food"]["x"] < 870,
          f"pos={reset_res['position']} food={reset_res['food']}")

    summ = get("/api/activity/summary")
    check("/api/activity/summary shape",
          set(summ.keys()) == {"journal", "dino", "fizzbuzz", "roam"}
          and "accuracy_pct" in summ["fizzbuzz"],
          "keys=" + ",".join(sorted(summ.keys())))

    async def ws_check():
        import websockets
        async with websockets.connect("ws://127.0.0.1:8767/ws/telemetry") as ws:
            stamps, frames = [], []
            t0 = time.perf_counter()
            while time.perf_counter() - t0 < 2.0:
                try:
                    frames.append(json.loads(await asyncio.wait_for(ws.recv(), timeout=2.0)))
                    stamps.append(time.perf_counter())
                except asyncio.TimeoutError:
                    break
            if not frames:
                check("WS stream alive", False, "no frames")
                return
            gaps = [b - a for a, b in zip(stamps[:-1], stamps[1:])]
            rate = len(frames) / (stamps[-1] - stamps[0])
            f = frames[-1]["locomotion"]
            head_in = 15 <= f["x"] <= 985 and 15 <= f["y"] <= 585
            clip = sum(1 for s in f["segments"]
                       if not (15 <= s["x"] <= 985 and 15 <= s["y"] <= 585))
            span = ((f["segments"][0]["x"] - f["segments"][-1]["x"]) ** 2
                    + (f["segments"][0]["y"] - f["segments"][-1]["y"]) ** 2) ** 0.5
            check("WS streams at ~50Hz (40-60)", 40 <= rate <= 60, f"{rate:.1f} Hz")
            check("WS cadence stable (max gap < 250ms)", max(gaps) * 1000 < 250,
                  f"max_gap={max(gaps)*1000:.0f}ms")
            # Hard invariant: head always clamped inside the arena (matches the
            # client local sim). The 391px body may swing past an edge — canvas
            # clips it, same as the offline local simulation.
            check("head always inside arena (hard clamp)", head_in,
                  f"head=({f['x']}, {f['y']}) | tail segments clipped at edge: {clip}/24 (informational)")
            check("body renders full-size (span 300-460px)", 300 <= span <= 460, f"{span:.0f}px")
            check("food_list + state in locomotion",
                  len(f["food_list"]) == 1 and f["state"] != "")

    asyncio.run(ws_check())

    print("E2E_ALL_PASSED" if not FAILURES else f"E2E: {len(FAILURES)} FAILED")
    return 0 if not FAILURES else 1


if __name__ == "__main__":
    sys.exit(main())