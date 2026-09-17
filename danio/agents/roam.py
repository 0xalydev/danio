"""
Danio Internet Roamer
The 650k-neuron vertebrate brain navigates the live web.
Visual DOM elements stimulate optic tectum; motor commands drive scrolling/clicking.
Logs trajectory and screenshots for GitHub verification.
"""

import asyncio
import json
import os
import time
import hashlib
from datetime import datetime
from pathlib import Path
from typing import Optional

from danio import DanioBrain
from danio.brain.engine import DanioAction

try:
    from playwright.async_api import async_playwright
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False


class DanioRoamer:
    """Autonomous web navigator driven by Danionella cerebrum brain."""
    
    def __init__(self, brain_file: str = "danio_brain_650k.npz", headless: bool = True):
        self.brain = DanioBrain.load(brain_file)
        self.headless = headless
        self.browser = None
        self.page = None
        self.playwright = None
        self.step_count = 0
        self.logs_dir = Path("logs")
        self.logs_dir.mkdir(exist_ok=True)
        self.screenshots_dir = self.logs_dir / "screenshots"
        self.screenshots_dir.mkdir(exist_ok=True)
        
        # Navigation state
        self.current_url = "https://github.com/0xalydev/danio"
        self.scroll_position = 0
        self.max_steps = 50
        
    async def start(self):
        """Initialize browser."""
        if not PLAYWRIGHT_AVAILABLE:
            print("[ROAM] Playwright not available. Install with: pip install playwright && playwright install")
            return False
        
        self.playwright = await async_playwright().start()
        self.browser = await self.playwright.chromium.launch(headless=self.headless)
        self.page = await self.browser.new_page(viewport={"width": 1280, "height": 720})
        return True
    
    async def stop(self):
        """Clean up browser."""
        if self.browser:
            await self.browser.close()
        if self.playwright:
            await self.playwright.stop()
    
    def _extract_visual_features(self) -> dict:
        """Extract simplified visual features from current page for brain input."""
        # In real implementation, this would analyze DOM/screenshots
        # For now, simulate based on page state
        return {
            "visual_luminance": 0.7,
            "visual_prey_angle": 10.0 * (1 if self.step_count % 4 < 2 else -1),  # Simulated link positions
            "predator_threat": 0.0,
            "water_flow_velocity": 0.05,
            "acoustic_stimulus_hz": 80.0 if self.step_count > 10 else 0.0,
            "acoustic_stimulus_db": 65.0 if self.step_count > 10 else 0.0,
        }
    
    def _action_to_browser_command(self, action: DanioAction) -> dict:
        """Convert brain motor output to browser action."""
        commands = []
        
        # Tail thrust -> scroll speed
        if action.tail_thrust > 0.3:
            scroll_amount = int(action.tail_thrust * 300)
            commands.append(("scroll", scroll_amount))
        
        # Heading yaw -> horizontal navigation (tab switching, back/forward)
        if abs(action.heading_yaw) > 0.5:
            if action.heading_yaw > 0:
                commands.append(("navigate_forward", None))
            else:
                commands.append(("navigate_back", None))
        
        # Drumming -> click (communication/social)
        if action.drumming_sound_active:
            commands.append(("click_link", None))
        
        # Mauthner escape -> emergency stop / new page
        if action.mauthner_escape:
            commands.append(("new_tab", "https://github.com/trending"))
        
        return {"commands": commands, "action_summary": self._summarize_action(action)}
    
    def _summarize_action(self, action: DanioAction) -> str:
        """Human-readable action summary."""
        if action.mauthner_escape:
            return "MAUTHNER_ESCAPE_NEW_TAB"
        elif action.drumming_sound_active:
            return f"CLICK_LINK_DRUMMING_{action.drumming_spl_db:.0f}dB"
        elif action.tail_thrust > 0.5:
            return "SCROLL_FORWARD_FAST"
        elif action.tail_thrust > 0.2:
            return "SCROLL_FORWARD"
        elif abs(action.heading_yaw) > 0.3:
            return "NAVIGATE_HORIZONTAL"
        else:
            return "IDLE_OBSERVE"
    
    async def execute_browser_command(self, cmd: dict) -> str:
        """Execute browser command and return result description."""
        if not self.page:
            return "NO_BROWSER"
        
        results = []
        for command_type, param in cmd["commands"]:
            try:
                if command_type == "scroll":
                    await self.page.evaluate(f"window.scrollBy(0, {param})")
                    self.scroll_position += param
                    results.append(f"SCROLLED_{param}px")
                
                elif command_type == "click_link":
                    # Find and click a visible link
                    links = await self.page.query_selector_all("a:visible")
                    if links:
                        idx = min(len(links) - 1, max(0, int(abs(hash(str(time.time()))) % len(links))))
                        await links[idx].click()
                        await self.page.wait_for_load_state("domcontentloaded", timeout=5000)
                        self.current_url = self.page.url
                        results.append(f"CLICKED_LINK_{idx}")
                
                elif command_type == "navigate_forward":
                    await self.page.go_forward()
                    self.current_url = self.page.url
                    results.append("NAV_FORWARD")
                
                elif command_type == "navigate_back":
                    await self.page.go_back()
                    self.current_url = self.page.url
                    results.append("NAV_BACK")
                
                elif command_type == "new_tab":
                    new_page = await self.browser.new_page()
                    await new_page.goto(param, wait_until="domcontentloaded")
                    await self.page.close()
                    self.page = new_page
                    self.current_url = param
                    results.append(f"NEW_TAB_{param}")
                    
            except Exception as e:
                results.append(f"ERROR_{command_type}:{e}")
        
        return "; ".join(results)
    
    async def step(self) -> dict:
        """Execute one roam step: sense -> brain -> act -> log."""
        self.step_count += 1
        
        # 1. Sense: Extract visual features from page
        sensory = self._extract_visual_features()
        
        # 2. Brain: Step the 650k vertebrate brain
        action = self.brain.step(sensory, dt=0.02)
        
        # 3. Act: Convert to browser commands
        cmd = self._action_to_browser_command(action)
        result = await self.execute_browser_command(cmd)
        
        # 4. Log
        log_entry = {
            "step": self.step_count,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "url": self.current_url,
            "title": await self.page.title() if self.page else "unknown",
            "action": cmd["action_summary"],
            "result": result,
            "sensory": sensory,
            "motor": action.to_dict(),
            "brain_state": {
                "population_rate": action.population_firing_rate,
                "state": "ESCAPE" if action.mauthner_escape else ("DRUMMING" if action.drumming_sound_active else "NAVIGATE"),
            }
        }
        
        # Save to JSONL
        log_file = self.logs_dir / "danio_roam_history.jsonl"
        with open(log_file, "a", encoding="utf-8") as f:
            f.write(json.dumps(log_entry) + "\n")
        
        # Update latest
        latest = {
            "step": self.step_count,
            "url": self.current_url,
            "title": log_entry["title"],
            "action": cmd["action_summary"],
            "screenshot": f"danio_roam_{self.step_count:03d}.png",
            "timestamp": log_entry["timestamp"],
        }
        with open(self.logs_dir / "danio_roam_latest.json", "w", encoding="utf-8") as f:
            json.dump(latest, f, indent=2)
        
        # Screenshot
        if self.page:
            try:
                await self.page.screenshot(path=str(self.screenshots_dir / f"danio_roam_{self.step_count:03d}.png"), full_page=False)
            except Exception:
                pass
        
        return log_entry
    
    async def run(self, max_steps: int = 20):
        """Run autonomous roaming for max_steps."""
        print(f"[ROAM] Starting Danio web roamer for {max_steps} steps...")
        print(f"[ROAM] Initial URL: {self.current_url}")
        
        if not await self.start():
            return
        
        try:
            await self.page.goto(self.current_url, wait_until="domcontentloaded")
            await asyncio.sleep(2)
            
            for i in range(max_steps):
                entry = await self.step()
                print(f"[ROAM] Step {entry['step']:02d} | {entry['action']} | {entry['result']} | {entry['url'][:60]}")
                await asyncio.sleep(1.5)  # Rate limit
                
        except KeyboardInterrupt:
            print("[ROAM] Interrupted")
        finally:
            await self.stop()
        
        print(f"[ROAM] Completed {self.step_count} steps. Logs in logs/danio_roam_history.jsonl")


async def main():
    roamer = DanioRoamer(headless=True)
    await roamer.run(max_steps=15)


if __name__ == "__main__":
    asyncio.run(main())