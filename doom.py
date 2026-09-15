"""
CONNECTO Doom & Dino Engine (doom.py)
"Can 302 biological C. elegans neurons survive Chrome Dino?"
Connects Playwright browser to Dino runner.
Transduces visual distance into mechanosensory ALM/PLM touch receptors.
Spiking dynamics across AVA escape command neurons drive physical JUMP keypresses.
Saves telemetry and screenshot proof to logs/screenshots/ and logs/dino_scores.jsonl.
"""

import argparse
import asyncio
import json
import time
from pathlib import Path
import numpy as np
from playwright.async_api import async_playwright
from connecto.engine.snn import SpikingConnectomeEngine

async def run_dino_agent(duration_sec: int = 40, visual: bool = False):
    print("=" * 65)
    print("      CONNECTO BIOLOGICAL GAMING: 302-NEURON DINO RUNNER")
    print("=" * 65)
    print("[*] Initialising SpikingConnectomeEngine (302 LIF neurons)...")
    snn = SpikingConnectomeEngine(dt_ms=0.5, delay_steps=3)
    idx_map = snn.idx_map

    touch_sensors = ["ALML", "ALMR", "AVM", "BDUL", "BDUR"]
    escape_command = ["AVAL", "AVAR", "AVDL", "AVDR"]

    dino_path = Path(__file__).parent / "web" / "dino.html"
    dino_url = f"file:///{dino_path.resolve()}".replace("\\", "/")

    screenshot_dir = Path("logs/screenshots")
    screenshot_dir.mkdir(parents=True, exist_ok=True)
    scores_file = Path("logs/dino_scores.jsonl")

    async with async_playwright() as p:
        print(f"[*] Launching Chromium browser (headless={not visual})...")
        browser = await p.chromium.launch(headless=not visual)
        page = await browser.new_page(viewport={"width": 640, "height": 320})
        print(f"[*] Navigating to {dino_url}...")
        await page.goto(dino_url)
        await asyncio.sleep(1.0)

        # Trigger initial jump to start game
        await page.keyboard.press("Space")
        print("[*] Game started! Worm connectome in active closed loop.\n")

        start_time = time.time()
        jumps_count = 0
        best_score = 0
        trials = 1
        last_screenshot_time = 0

        while time.time() - start_time < duration_sec:
            # 1. Sense environment from browser DOM
            state = await page.evaluate("() => window.connecto_dino_state || {}")
            dist = state.get("nearestObstacleDist", 999)
            score = state.get("score", 0)
            is_over = state.get("gameOver", False)
            speed = state.get("speed", 4.0)

            if score > best_score:
                best_score = score

            if is_over:
                trials += 1
                print(f"  [!] Collision detected at score {score}. Initiating trial #{trials}...")
                await page.keyboard.press("Space")
                await asyncio.sleep(0.5)
                continue

            # 2. Transduce visual proximity into sensory receptor currents
            currents = np.zeros(snn.N, dtype=np.float32)
            # Distance threshold: obstacle incoming within collision hazard window (typically 90-180px)
            hazard_window = speed * 25.0  # Dynamic window based on velocity
            if 0 < dist < hazard_window:
                intensity = float((hazard_window - dist) / hazard_window) * 60.0
                for s in touch_sensors:
                    if s in idx_map:
                        currents[idx_map[s]] += intensity

            # Basal exploratory drive
            currents += np.random.normal(2.0, 0.5, snn.N).astype(np.float32)

            # 3. Step SNN
            escape_spikes = 0
            for _ in range(12):
                spikes, v = snn.step(currents)
                for e in escape_command:
                    if e in idx_map and spikes[idx_map[e]]:
                        escape_spikes += 1

            # 4. Motor Decision: High-rate AVA/AVD burst triggers SPACE jump
            if escape_spikes >= 4:
                jumps_count += 1
                await page.keyboard.press("Space")
                now = time.time()
                if now - last_screenshot_time > 4.0:
                    last_screenshot_time = now
                    shot_path = screenshot_dir / f"dino_jump_score_{score}.png"
                    await page.screenshot(path=str(shot_path))
                    print(f"  [JUMP #{jumps_count}] Score: {score:4d} | Hazard Dist: {dist:4.1f}px | AVA Spikes: {escape_spikes} -> Screenshot saved!")

            await asyncio.sleep(0.04)

        # Final screenshot
        final_shot = screenshot_dir / "dino_latest_trial.png"
        await page.screenshot(path=str(final_shot))
        await browser.close()

    print("\n" + "=" * 65)
    print(f"[*] BENCHMARK COMPLETE:")
    print(f"    Best Score Achieved : {best_score}")
    print(f"    Total Jumps Executed: {jumps_count}")
    print(f"    Trials Completed    : {trials}")
    print(f"    Proof Screenshot    : {final_shot}")
    print("=" * 65)

    record = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S UTC"),
        "epoch": time.time(),
        "best_score": best_score,
        "total_jumps": jumps_count,
        "trials": trials,
        "proof_image": str(final_shot.name)
    }
    with open(scores_file, "a", encoding="utf-8") as f:
        f.write(json.dumps(record) + "\n")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Connecto Biological Dino Runner")
    parser.add_argument("--seconds", type=int, default=30, help="Run duration in seconds")
    parser.add_argument("--visual", action="store_true", help="Display headful browser window")
    args = parser.parse_args()

    asyncio.run(run_dino_agent(duration_sec=args.seconds, visual=args.visual))
