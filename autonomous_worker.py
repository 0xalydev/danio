"""
CONNECTO Autonomous Background Worker (autonomous_worker.py)
Continuously runs biological embodiment trials:
  1. Generates consciousness journal entries (voice.py)
  2. Executes internet roaming & Dino gaming trials (roam.py, doom.py)
  3. Periodically commits and pushes verifiable proof to GitHub (github_sync.py)
Runs silently in the background as a self-driving artificial life engine.
"""

import asyncio
import os
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path

def log(msg: str):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] [WORKER] {msg}", flush=True)

def run_script(script_name: str, args: list = []):
    cmd = [sys.executable, script_name] + args
    try:
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        return res.returncode == 0, res.stdout, res.stderr
    except subprocess.TimeoutExpired:
        return False, "", "Timeout expired"
    except Exception as e:
        return False, "", str(e)

def run_cycle():
    log("==================================================")
    log("Starting Autonomous Embodiment Cycle...")
    log("==================================================")

    # 1. Consciousness Journal
    log("1/4: Sampling SNN membrane dynamics for journal entry...")
    ok, out, _ = run_script("voice.py", ["--count", "1"])
    if ok:
        log("     Journal entry recorded with cryptographic signature.")
    else:
        log("     Notice on voice generation.")

    # 2. Dino Benchmark Trial
    log("2/4: Running closed-loop Chrome Dino trial (AVA reflex jumps)...")
    ok, out, _ = run_script("doom.py", ["--seconds", "15"])
    if ok:
        log("     Dino trial completed. Screenshot & score saved.")
    else:
        log("     Notice on Dino runner.")

    # 3. Internet Roamer
    log("3/4: Unleashing organism onto the web (Playwright navigation)...")
    ok, out, _ = run_script("roam.py", ["--seconds", "15"])
    if ok:
        log("     Internet roaming pass completed. Screenshot captured.")
    else:
        log("     Notice on internet roam.")

    # 4. GitHub Sync
    log("4/4: Compiling proof into ACTIVITY.md & pushing to GitHub...")
    ok, out, err = run_script("github_sync.py", ["--once"])
    if ok:
        log("     [SUCCESS] Live proof committed & pushed to https://github.com/0xalydev/connecto")
    else:
        log(f"     GitHub push notice: {err.strip() or out.strip()}")

    log("Cycle complete. Awaiting next autonomous interval.\n")

def main():
    log("CONNECTO Autonomous Life Worker initialized.")
    # Run immediate first cycle
    run_cycle()

    # Loop every 15 minutes (900 seconds)
    interval = int(os.environ.get("CONNECTO_SYNC_INTERVAL", "900"))
    log(f"Entering continuous loop (interval = {interval}s)...")
    while True:
        time.sleep(interval)
        try:
            run_cycle()
        except Exception as e:
            log(f"Error in cycle: {e}")

if __name__ == "__main__":
    main()
