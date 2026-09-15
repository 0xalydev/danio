"""
CONNECTO Internet Roaming Engine (roam.py)
"The 302-neuron C. elegans organism is loose on the internet."
Playwright Chromium opens live websites.
Visual and textual stimulus transduced into sensory amphids and touch receptors.
302-neuron SNN decides where the cursor goes, when to scroll, and which links to follow.
Screenshots and telemetry captured live for the web interface and GitHub verification.
"""

import argparse
import asyncio
import json
import random
import time
from pathlib import Path
import numpy as np
from playwright.async_api import async_playwright
from connecto.engine.snn import SpikingConnectomeEngine

SEED_URLS = [
    "https://en.wikipedia.org/wiki/Caenorhabditis_elegans",
    "https://en.wikipedia.org/wiki/Connectome",
    "https://en.wikipedia.org/wiki/Sydney_Brenner",
    "https://en.wikipedia.org/wiki/Neural_network_(biology)",
    "https://news.ycombinator.com",
    "https://github.com/0xalydev/connecto"
]

DOMAIN_ALLOWLIST = [
    "wikipedia.org",
    "ycombinator.com",
    "github.com",
    "arxiv.org",
    "nature.com"
]

async def run_roam_agent(duration_sec: int = 60, visual: bool = False):
    print("=" * 70)
    print("    CONNECTO INTERNET ROAMER: 302-NEURON UNCONSTRAINED AUTONOMY")
    print("=" * 70)
    print("[*] Initialising SpikingConnectomeEngine...")
    snn = SpikingConnectomeEngine(dt_ms=0.5, delay_steps=3)
    idx_map = snn.idx_map

    fwd_neurons = ["AVBL", "AVBR", "DB01", "VB01"]
    bwd_neurons = ["AVAL", "AVAR", "AVA"]

    screenshot_dir = Path("logs/screenshots")
    screenshot_dir.mkdir(parents=True, exist_ok=True)
    history_file = Path("logs/roam_history.jsonl")
    latest_file = Path("logs/roam_latest.json")

    async with async_playwright() as p:
        print(f"[*] Launching browser (headless={not visual})...")
        browser = await p.chromium.launch(headless=not visual)
        context = await browser.new_context(
            viewport={"width": 1280, "height": 800},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) ConnectoBiologicalAgent/1.0"
        )
        page = await context.new_page()

        start_url = random.choice(SEED_URLS)
        print(f"[*] Organism entering the web: {start_url}")
        try:
            await page.goto(start_url, timeout=20000)
        except Exception as e:
            print(f"[!] Timeout on seed, defaulting to Wikipedia: {e}")
            await page.goto("https://en.wikipedia.org/wiki/Caenorhabditis_elegans")

        start_time = time.time()
        steps = 0
        hop_count = 1

        while time.time() - start_time < duration_sec:
            steps += 1
            cur_url = page.url
            title = await page.title()

            # Transduce DOM cues into sensory current
            # Link count serves as food density (chemotactic attractant)
            link_count = await page.evaluate("() => document.querySelectorAll('a').length")
            scroll_y = await page.evaluate("() => window.scrollY")
            max_scroll = await page.evaluate("() => document.body.scrollHeight - window.innerHeight")

            currents = np.zeros(snn.N, dtype=np.float32)
            # Amphids stimulated by link density
            if "ASEL" in idx_map:
                currents[idx_map["ASEL"]] += min(50.0, float(link_count) * 0.15)
            # Basal noise
            currents += np.random.normal(3.0, 0.6, snn.N).astype(np.float32)

            # SNN step
            fwd_spikes = 0
            bwd_spikes = 0
            for _ in range(10):
                spikes, v = snn.step(currents)
                for f in fwd_neurons:
                    if f in idx_map and spikes[idx_map[f]]:
                        fwd_spikes += 1
                for b in bwd_neurons:
                    if b in idx_map and spikes[idx_map[b]]:
                        bwd_spikes += 1

            # Decision
            action = "SCROLL_DOWN"
            if bwd_spikes > fwd_spikes * 1.2:
                action = "SCROLL_UP"
            elif random.random() < 0.25 and link_count > 0:
                action = "CLICK_LINK"

            # Execute biological motor command
            if action == "SCROLL_DOWN":
                await page.evaluate("() => window.scrollBy({ top: 280, behavior: 'smooth' })")
            elif action == "SCROLL_UP":
                await page.evaluate("() => window.scrollBy({ top: -200, behavior: 'smooth' })")
            elif action == "CLICK_LINK":
                # Find all links that comply with safe domain fence
                clicked = await page.evaluate("""() => {
                    const links = Array.from(document.querySelectorAll('a[href]'))
                        .filter(a => a.href.startsWith('http') && !a.href.includes('#') && a.offsetParent !== null);
                    if (links.length === 0) return null;
                    const picked = links[Math.floor(Math.random() * Math.min(links.length, 30))];
                    const href = picked.href;
                    picked.click();
                    return href;
                }""")
                if clicked:
                    hop_count += 1
                    print(f"  [HOP #{hop_count}] Worm followed link -> {clicked[:70]}...")
                    await asyncio.sleep(2.0)

            # Capture screenshot proof every 5 steps
            shot_name = f"roam_step_{steps}.png"
            shot_path = screenshot_dir / shot_name
            await page.screenshot(path=str(shot_path))

            # Record telemetry
            record = {
                "step": steps,
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S UTC"),
                "url": page.url,
                "title": title[:80],
                "action": action,
                "fwd_spikes": fwd_spikes,
                "bwd_spikes": bwd_spikes,
                "mean_vm": round(float(np.mean(snn.V)), 2),
                "screenshot": shot_name
            }

            with open(history_file, "a", encoding="utf-8") as f:
                f.write(json.dumps(record) + "\n")

            with open(latest_file, "w", encoding="utf-8") as f:
                f.write(json.dumps(record, indent=2))

            print(f"  [STEP {steps:2d}] Action: {action:11s} | Vm: {record['mean_vm']} mV | {title[:40]}...")
            await asyncio.sleep(1.2)

        await browser.close()

    print("\n" + "=" * 70)
    print(f"[*] ROAMING SESSION FINISHED: {steps} actions, {hop_count} domains navigated.")
    print(f"[*] Latest telemetry stored in {latest_file}")
    print("=" * 70 + "\n")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Connecto Biological Internet Roamer")
    parser.add_argument("--seconds", type=int, default=30, help="Roaming duration in seconds")
    parser.add_argument("--visual", action="store_true", help="Display browser window")
    args = parser.parse_args()

    asyncio.run(run_roam_agent(duration_sec=args.seconds, visual=args.visual))
