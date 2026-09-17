"""
Danio Dino Runner
The 650k-neuron vertebrate brain plays Chrome Dino game.
Visual obstacle distance -> optic tectum -> Mauthner escape -> JUMP keypress.
Real biological reflex arc driving real game performance.
"""

import asyncio
import json
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


class DanioDinoPlayer:
    """Chrome Dino player driven by Danionella cerebrum brain."""
    
    def __init__(self, brain_file: str = "danio_brain_650k.npz", headless: bool = True):
        self.brain = DanioBrain.load(brain_file)
        self.headless = headless
        self.browser = None
        self.page = None
        self.playwright = None
        self.logs_dir = Path("logs")
        self.logs_dir.mkdir(exist_ok=True)
        self.screenshots_dir = self.logs_dir / "screenshots"
        self.screenshots_dir.mkdir(exist_ok=True)
        
        # Game state
        self.score = 0
        self.best_score = 0
        self.total_jumps = 0
        self.trials = 0
        self.game_over = False
        self.max_trials = 5
        
    async def start(self):
        """Initialize browser and navigate to Dino game."""
        if not PLAYWRIGHT_AVAILABLE:
            print("[DINO] Playwright not available. Install with: pip install playwright && playwright install")
            return False
        
        self.playwright = await async_playwright().start()
        self.browser = await self.playwright.chromium.launch(headless=self.headless)
        self.page = await self.browser.new_page(viewport={"width": 800, "height": 600})
        
        # Navigate to Chrome Dino
        await self.page.goto("chrome://dino", wait_until="domcontentloaded")
        await asyncio.sleep(1)
        
        # Start game
        await self.page.keyboard.press("Space")
        await asyncio.sleep(0.5)
        return True
    
    async def stop(self):
        if self.browser:
            await self.browser.close()
        if self.playwright:
            await self.playwright.stop()
    
    async def _get_game_state(self) -> dict:
        """Extract game state from Dino."""
        try:
            # Get game data from Runner instance
            state = await self.page.evaluate("""
                () => {
                    const runner = window.Runner.instance_;
                    if (!runner) return null;
                    return {
                        playing: runner.playing,
                        crashed: runner.crashed,
                        score: Math.floor(runner.distanceMeter?.getActualDistance?.(runner.distanceMeter) || 0),
                        speed: runner.currentSpeed,
                        horizon: runner.horizon?.obstacles?.map(o => ({
                            x: o.xPos,
                            y: o.yPos,
                            width: o.width,
                            height: o.height,
                            type: o.typeConfig?.name || 'unknown'
                        })) || [],
                        tRex: runner.tRex ? {
                            x: runner.tRex.xPos,
                            y: runner.tRex.yPos,
                            jumping: runner.tRex.jumping,
                            ducking: runner.tRex.ducking
                        } : null
                    };
                }
            """)
            return state
        except Exception:
            return None
    
    def _state_to_sensory(self, game_state: dict) -> dict:
        """Convert game state to brain sensory input."""
        if not game_state or not game_state.get("playing"):
            return {
                "visual_luminance": 0.5,
                "visual_prey_angle": 0.0,
                "predator_threat": 0.0,
                "water_flow_velocity": 0.05,
                "acoustic_stimulus_hz": 0.0,
                "acoustic_stimulus_db": 0.0,
            }
        
        trex = game_state.get("tRex", {})
        obstacles = game_state.get("horizon", [])
        
        # Find nearest obstacle ahead
        threat = 0.0
        prey_angle = 0.0
        
        if trex and obstacles:
            trex_x = trex.get("x", 0)
            for obs in obstacles:
                obs_x = obs.get("x", 999)
                obs_width = obs.get("width", 20)
                distance = obs_x - trex_x
                
                if 0 < distance < 200:  # Obstacle approaching
                    # Threat increases as obstacle gets closer
                    threat = max(threat, 1.0 - (distance / 200.0))
                    # Prey angle: obstacle position relative to center
                    prey_angle = max(-90, min(90, (distance - 100) * 0.9))
                    break
        
        # Visual luminance based on game speed (day/night cycle)
        speed = game_state.get("speed", 6)
        visual_lum = 0.8 if speed < 10 else 0.4  # Night mode at high speed
        
        return {
            "visual_luminance": visual_lum,
            "visual_prey_angle": prey_angle,
            "predator_threat": threat,
            "water_flow_velocity": 0.05,
            "acoustic_stimulus_hz": 0.0,
            "acoustic_stimulus_db": 0.0,
        }
    
    async def _execute_jump(self):
        """Execute jump keypress."""
        await self.page.keyboard.press("Space")
        self.total_jumps += 1
    
    async def step(self) -> dict:
        """One game step: sense -> brain -> act."""
        # Get game state
        game_state = await self._get_game_state()
        
        if not game_state:
            return {"error": "No game state"}
        
        # Check game over
        if game_state.get("crashed") and game_state.get("playing"):
            self.game_over = True
            self.score = game_state.get("score", 0)
            if self.score > self.best_score:
                self.best_score = self.score
        
        # Convert to sensory
        sensory = self._state_to_sensory(game_state)
        
        # Brain step
        action = self.brain.step(sensory, dt=0.02)
        
        # Execute action
        jumped = False
        if action.mauthner_escape or (action.drumming_sound_active and sensory["predator_threat"] > 0.3):
            await self._execute_jump()
            jumped = True
        
        # Log
        log_entry = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "score": game_state.get("score", 0),
            "best_score": self.best_score,
            "total_jumps": self.total_jumps,
            "trials": self.trials,
            "game_over": self.game_over,
            "speed": game_state.get("speed", 0),
            "obstacle_distance": min([o.get("x", 999) for o in game_state.get("horizon", [])], default=999) - game_state.get("tRex", {}).get("x", 0),
            "sensory": sensory,
            "motor": action.to_dict(),
            "jumped": jumped,
            "mauthner_triggered": action.mauthner_escape,
            "drumming": action.drumming_sound_active,
        }
        
        return log_entry
    
    async def run_trial(self) -> dict:
        """Run one complete game trial."""
        self.game_over = False
        self.score = 0
        self.trials += 1
        trial_jumps = 0
        
        # Restart game
        await self.page.keyboard.press("Space")
        await asyncio.sleep(0.3)
        
        while not self.game_over:
            entry = await self.step()
            if entry.get("jumped"):
                trial_jumps += 1
            
            # Log to JSONL
            log_file = self.logs_dir / "danio_dino_scores.jsonl"
            with open(log_file, "a", encoding="utf-8") as f:
                f.write(json.dumps(entry) + "\n")
            
            await asyncio.sleep(0.02)  # ~50 Hz game loop
        
        # Screenshot at game over
        try:
            await self.page.screenshot(path=str(self.screenshots_dir / "dino_latest_trial.png"))
        except Exception:
            pass
        
        return {
            "trial": self.trials,
            "score": self.score,
            "best_score": self.best_score,
            "jumps": trial_jumps,
            "total_jumps": self.total_jumps,
        }
    
    async def run(self, max_trials: int = 3):
        """Run multiple trials."""
        print(f"[DINO] Starting Danio Dino player for {max_trials} trials...")
        
        if not await self.start():
            return
        
        try:
            for i in range(max_trials):
                result = await self.run_trial()
                print(f"[DINO] Trial {result['trial']}: Score={result['score']}, Jumps={result['jumps']}, Best={result['best_score']}")
                await asyncio.sleep(1)
        finally:
            await self.stop()
        
        print(f"[DINO] Complete. Best score: {self.best_score}, Total jumps: {self.total_jumps}")


async def main():
    player = DanioDinoPlayer(headless=True)
    await player.run(max_trials=3)


if __name__ == "__main__":
    asyncio.run(main())