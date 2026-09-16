"""
DANIO Autonomous Internet Roamer (danio_roam.py)
"The 650,000-neuron adult Danionella cerebrum vertebrate brain is loose on the internet."
Optic Tectum tracks visual elements on web pages.
Cerebellum regulates smooth scrolling and saccadic mouse cursor motion.
140 dB Sonic Drumming apparatus clicks hyperlinks and articles.
Mauthner giant fiber reflex executes emergency 'back' button escapes.
"""

import os
import sys
import json
import random
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

from danio import DanioBrain

SEED_URLS = [
    "https://en.wikipedia.org/wiki/Danionella_cerebrum",
    "https://en.wikipedia.org/wiki/Optic_tectum",
    "https://en.wikipedia.org/wiki/Cerebellum",
    "https://en.wikipedia.org/wiki/Connectome",
    "https://news.ycombinator.com",
    "https://github.com/0xalydev/danio"
]

DOMAIN_ALLOWLIST = [
    "wikipedia.org",
    "ycombinator.com",
    "github.com",
    "arxiv.org",
    "nature.com",
    "science.org"
]

async def run_danio_roam(duration_sec: int = 30, visual: bool = False):
    print("=" * 70)
    print(" DANIO INTERNET ROAMER: 650,000 VERTEBRATE NEURONS AUTONOMOUS NAVIGATION")
    print("=" * 70)

    brain_file = "danio_brain_650k.npz"
    if not os.path.exists(brain_file):
        print(f"[*] Building {brain_file}...")
        from danio.brain.build_memory import generate_danio_brain
        generate_danio_brain(brain_file)

    brain = DanioBrain.load(brain_file)
    print(f"[+] Loaded Danionella cerebrum 650,000-neuron connectome.\n")

    logs_dir = Path("logs")
    screenshot_dir = logs_dir / "screenshots"
    screenshot_dir.mkdir(parents=True, exist_ok=True)
    history_file = logs_dir / "danio_roam_history.jsonl"
    latest_file = logs_dir / "danio_roam_latest.json"

    async with async_playwright() as p:
        print(f"[*] Launching Chromium browser (headless={not visual})...")
        browser = await p.chromium.launch(headless=not visual)
        context = await browser.new_context(
            viewport={"width": 1280, "height": 800},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) DanionellaVertebrateAgent/2.0"
        )
        page = await context.new_page()

        start_url = random.choice(SEED_URLS)
        print(f"[*] Navigating to starting portal: {start_url}")
        try:
            await page.goto(start_url, timeout=25000, wait_until="domcontentloaded")
            await asyncio.sleep(1.5)
        except Exception as e:
            print(f"[!] Navigation error: {e}, falling back to Wikipedia")
            await page.goto("https://en.wikipedia.org/wiki/Danionella_cerebrum", wait_until="domcontentloaded")

        start_time = asyncio.get_event_loop().time()
        step = 0
        cur_x, cur_y = 640.0, 400.0

        while (asyncio.get_event_loop().time() - start_time) < duration_sec:
            step += 1
            cur_url = page.url
            title = await page.title()

            # 1. Probe page visual and clickable elements
            links = []
            try:
                raw_links = await page.query_selector_all("a[href]")
                for a in raw_links[:25]:
                    box = await a.bounding_box()
                    href = await a.get_attribute("href")
                    if box and href and any(dom in (href if href.startswith("http") else cur_url) for dom in DOMAIN_ALLOWLIST):
                        links.append({"box": box, "href": href})
            except Exception:
                pass

            # Target nearest or most prominent link to drive Optic Tectum
            target_angle = 0.0
            if links:
                chosen = random.choice(links[:5])
                cx = chosen["box"]["x"] + chosen["box"]["width"] / 2
                target_angle = (cx - cur_x) / 640.0 * 60.0 # -60 to +60 deg

            # 2. Drive Danio Brain Sensory Inputs
            sensory = {
                "visual_luminance": 0.85,
                "visual_prey_angle": target_angle,
                "predator_threat": 0.8 if "error" in title.lower() else 0.0,
                "water_flow_velocity": 0.08,
                "acoustic_stimulus_hz": 75.0 if len(links) > 10 else 0.0,
                "acoustic_stimulus_db": 65.0
            }

            action = brain.step(sensory, dt=0.033)

            # 3. Transduce Motor Outputs to Browser Actions
            # Heading yaw controls mouse cursor lateral trajectory
            cur_x = max(50.0, min(1230.0, cur_x + action.heading_yaw * 180.0))
            # Tail thrust controls downward vertical scroll
            scroll_dy = int(action.tail_thrust * 320.0)
            cur_y = max(50.0, min(750.0, cur_y + (action.fin_pitch * 80.0)))

            # Move mouse
            try:
                await page.mouse.move(cur_x, cur_y)
            except Exception:
                pass

            # Perform scroll
            if scroll_dy > 20:
                try:
                    await page.evaluate(f"window.scrollBy({{top: {scroll_dy}, behavior: 'smooth'}})")
                except Exception:
                    pass

            # Mauthner escape reflex: Go back
            if action.mauthner_escape:
                print(f"[Step {step:02d}] ⚠️ [MAUTHNER C-START ESCAPE] Detonated! Executing browser BACK...")
                try:
                    await page.go_back()
                except Exception:
                    pass

            # 140 dB Sonic Drumming: Click target link
            elif action.drumming_sound_active or (step % 6 == 0 and links):
                print(f"[Step {step:02d}] 🔊 [140 dB SONIC DRUMMING] Pulse emitted! Clicking element under cursor...")
                try:
                    await page.mouse.click(cur_x, cur_y)
                    await asyncio.sleep(1.0)
                except Exception:
                    pass

            # Capture screenshot proof periodically
            shot_name = f"danio_roam_{step:03d}.png"
            shot_path = screenshot_dir / shot_name
            rel_path = f"/screenshots/{shot_name}"
            try:
                await page.screenshot(path=str(shot_path), quality=60, type="jpeg")
            except Exception:
                try:
                    await page.screenshot(path=str(shot_path))
                except Exception:
                    pass

            log_entry = {
                "timestamp": int(asyncio.get_event_loop().time()),
                "step": step,
                "url": cur_url,
                "title": title[:70],
                "cursor": [round(cur_x, 1), round(cur_y, 1)],
                "tail_thrust": round(action.tail_thrust, 3),
                "heading_yaw": round(action.heading_yaw, 3),
                "firing_rate_hz": round(action.population_firing_rate, 1),
                "drumming_active": action.drumming_sound_active,
                "screenshot": rel_path
            }

            with open(history_file, "a", encoding="utf-8") as f:
                f.write(json.dumps(log_entry) + "\n")
            with open(latest_file, "w", encoding="utf-8") as f:
                json.dump(log_entry, f, indent=2)

            drum_status = f"🔊 140dB ({action.drumming_spl_db:.0f}dB)" if action.drumming_sound_active else "Silent"
            print(f"[Step {step:02d}] Rate: {action.population_firing_rate:.1f}Hz | Thrust: {action.tail_thrust:.2f} | Scroll: +{scroll_dy}px | Drum: {drum_status} | {title[:40]}")
            await asyncio.sleep(1.2)

        print(f"\n[+] Finished Danio internet roaming ({step} steps executed).")
        await browser.close()

def main():
    duration = 20
    visual = False
    for arg in sys.argv[1:]:
        if arg.startswith("--seconds="):
            duration = int(arg.split("=")[1])
        elif arg == "--visual":
            visual = True
        elif arg.isdigit():
            duration = int(arg)
    asyncio.run(run_danio_roam(duration_sec=duration, visual=visual))

if __name__ == "__main__":
    main()
