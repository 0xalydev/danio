"""
Danio Autonomous Worker
Orchestrates all autonomous agents: roam, dino, fizzbuzz, journal.
Runs continuous biological verification loop with GitHub sync.
"""

import asyncio
import argparse
import signal
import sys
import time
from pathlib import Path
from typing import List, Optional

# Import agents
from danio.agents.roam import DanioRoamer
from danio.agents.dino import DanioDinoPlayer
from danio.agents.fizzbuzz import DanioFizzBuzz
from danio.agents.journal import DanioJournal


class DanioAutonomousWorker:
    """Main worker coordinating all Danio autonomous agents."""
    
    def __init__(self, brain_file: str = "danio_brain_650k.npz"):
        self.brain_file = brain_file
        self.running = False
        self.tasks = []
        
    async def run_roam(self, interval: int = 300, steps: int = 10):
        """Run roam agent periodically."""
        while self.running:
            try:
                print(f"[WORKER] Starting roam session...")
                roamer = DanioRoamer(self.brain_file, headless=True)
                await roamer.run(max_steps=steps)
            except Exception as e:
                print(f"[WORKER] Roam error: {e}")
            
            # Wait for next interval
            for _ in range(interval):
                if not self.running:
                    break
                await asyncio.sleep(1)
    
    async def run_dino(self, interval: int = 600, trials: int = 3):
        """Run dino agent periodically."""
        while self.running:
            try:
                print(f"[WORKER] Starting dino session...")
                player = DanioDinoPlayer(self.brain_file, headless=True)
                await player.run(max_trials=trials)
            except Exception as e:
                print(f"[WORKER] Dino error: {e}")
            
            for _ in range(interval):
                if not self.running:
                    break
                await asyncio.sleep(1)
    
    async def run_fizzbuzz(self, interval: int = 1800):
        """Run fizzbuzz benchmark periodically."""
        while self.running:
            try:
                print(f"[WORKER] Starting fizzbuzz benchmark...")
                solver = DanioFizzBuzz(self.brain_file)
                solver.run_benchmark(100)
            except Exception as e:
                print(f"[WORKER] FizzBuzz error: {e}")
            
            for _ in range(interval):
                if not self.running:
                    break
                await asyncio.sleep(1)
    
    async def run_journal(self, interval: int = 30, max_entries: int = 5):
        """Run journal entries periodically."""
        while self.running:
            try:
                print(f"[WORKER] Writing journal entries...")
                journal = DanioJournal(self.brain_file)
                journal.run_continuous(interval=2.0, max_entries=max_entries)
            except Exception as e:
                print(f"[WORKER] Journal error: {e}")
            
            for _ in range(interval):
                if not self.running:
                    break
                await asyncio.sleep(1)
    
    async def run_github_sync(self, interval: int = 300):
        """Periodically sync logs to GitHub."""
        while self.running:
            await asyncio.sleep(interval)
            if not self.running:
                break
            try:
                print(f"[WORKER] Syncing to GitHub...")
                import subprocess
                result = subprocess.run(
                    ["python", "github_sync.py", "--once"],
                    capture_output=True, text=True, timeout=60
                )
                if result.returncode == 0:
                    print(f"[WORKER] GitHub sync successful")
                else:
                    print(f"[WORKER] GitHub sync: {result.stderr.strip() or result.stdout.strip()}")
            except Exception as e:
                print(f"[WORKER] GitHub sync error: {e}")
    
    async def start(self, agents: List[str] = None):
        """Start selected agents."""
        self.running = True
        
        all_agents = {
            "roam": self.run_roam,
            "dino": self.run_dino,
            "fizzbuzz": self.run_fizzbuzz,
            "journal": self.run_journal,
            "github_sync": self.run_github_sync,
        }
        
        if agents is None:
            agents = ["journal", "github_sync"]  # Default safe agents
        
        for agent_name in agents:
            if agent_name in all_agents:
                task = asyncio.create_task(all_agents[agent_name]())
                self.tasks.append(task)
                print(f"[WORKER] Started {agent_name}")
            else:
                print(f"[WORKER] Unknown agent: {agent_name}")
        
        # Wait for all tasks
        try:
            await asyncio.gather(*self.tasks)
        except asyncio.CancelledError:
            pass
    
    def stop(self):
        """Stop all agents."""
        self.running = False
        for task in self.tasks:
            task.cancel()


async def main():
    parser = argparse.ArgumentParser(description="Danio Autonomous Worker")
    parser.add_argument("--agents", nargs="+", 
                        choices=["roam", "dino", "fizzbuzz", "journal", "github_sync", "all"],
                        default=["journal", "github_sync"],
                        help="Agents to run")
    parser.add_argument("--brain", default="danio_brain_650k.npz", help="Brain file path")
    args = parser.parse_args()
    
    if "all" in args.agents:
        agents = ["roam", "dino", "fizzbuzz", "journal", "github_sync"]
    else:
        agents = args.agents
    
    worker = DanioAutonomousWorker(args.brain)
    
    # Handle signals
    loop = asyncio.get_event_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, worker.stop)
    
    print(f"[WORKER] Starting Danio Autonomous Worker with agents: {agents}")
    await worker.start(agents)


if __name__ == "__main__":
    asyncio.run(main())