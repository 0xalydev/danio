"""
FastAPI Telemetry & Web3 Bridge Server
Streams live neural dynamics and locomotion coordinates over WebSocket & REST.
"""

import asyncio
import json
import os
from pathlib import Path
import numpy as np
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from .state import SimulationManager
from ..connectome.data import NEURONS, NEURON_TYPES, NEUROTRANSMITTERS

app = FastAPI(title="C. elegans Connecto Telemetry Engine", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

manager = SimulationManager.get_instance()

class FoodDropRequest(BaseModel):
    x: float
    y: float
    strength: float = 10.0

class TouchRequest(BaseModel):
    anterior: bool = True

@app.get("/api/state")
async def get_state():
    """Returns the latest closed-loop simulation state and on-chain bridge data."""
    return manager.step()

@app.get("/api/connectome")
async def get_connectome_info():
    """Returns structural topology metadata of the 302-neuron network."""
    return {
        "neuron_count": len(NEURONS),
        "neurons": NEURONS,
        "types": NEURON_TYPES,
        "neurotransmitters": NEUROTRANSMITTERS,
        "synapse_count": int(np.count_nonzero(manager.sim.snn.chem_matrix)),
        "gap_junction_count": int(np.count_nonzero(manager.sim.snn.gap_matrix)) // 2
    }

@app.post("/api/food")
async def drop_food(req: FoodDropRequest):
    """Place chemical attractant into the simulation arena."""
    manager.add_food(req.x, req.y, req.strength)
    return {"status": "ok", "message": f"Food placed at ({req.x}, {req.y})"}

@app.post("/api/touch")
async def trigger_touch(req: TouchRequest):
    """Trigger mechanosensory touch stimulus."""
    manager.trigger_touch(anterior=req.anterior)
    return {"status": "ok", "message": f"Triggered {'anterior' if req.anterior else 'posterior'} touch"}

@app.websocket("/ws/telemetry")
async def websocket_telemetry(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            state = manager.step()
            await websocket.send_json(state)
            await asyncio.sleep(0.033)  # ~30 Hz telemetry stream
    except WebSocketDisconnect:
        pass
    except Exception:
        pass

@app.get("/api/activity/summary")
async def get_activity_summary():
    """Returns aggregated live telemetry from autonomous proof engines."""
    root_dir = Path(__file__).parent.parent.parent
    logs_dir = root_dir / "logs"

    # Journal
    journal_lines = []
    jp = logs_dir / "journal.jsonl"
    if jp.exists():
        with open(jp, "r", encoding="utf-8") as f:
            for l in f:
                if l.strip():
                    try:
                        journal_lines.append(json.loads(l))
                    except Exception:
                        pass
    latest_journal = journal_lines[-1] if journal_lines else {}

    # Dino
    dino_lines = []
    dp = logs_dir / "dino_scores.jsonl"
    if dp.exists():
        with open(dp, "r", encoding="utf-8") as f:
            for l in f:
                if l.strip():
                    try:
                        dino_lines.append(json.loads(l))
                    except Exception:
                        pass
    latest_dino = dino_lines[-1] if dino_lines else {}

    # FizzBuzz
    fb_lines = []
    fbp = logs_dir / "fizzbuzz.jsonl"
    if fbp.exists():
        with open(fbp, "r", encoding="utf-8") as f:
            for l in f:
                if l.strip():
                    try:
                        fb_lines.append(json.loads(l))
                    except Exception:
                        pass
    fb_matched = sum(1 for x in fb_lines if x.get("match"))
    fb_total = len(fb_lines) if fb_lines else 100
    fb_pct = round((fb_matched / max(1, fb_total)) * 100.0, 1)

    # Roam
    roam_data = {}
    rp = logs_dir / "roam_latest.json"
    if rp.exists():
        try:
            with open(rp, "r", encoding="utf-8") as f:
                roam_data = json.load(f)
        except Exception:
            pass

    return {
        "journal": latest_journal,
        "dino": latest_dino,
        "fizzbuzz": {
            "accuracy_pct": fb_pct,
            "matched": fb_matched,
            "total": fb_total,
            "total_spikes": sum(x.get("total_spikes", 0) for x in fb_lines)
        },
        "roam": roam_data
    }

@app.post("/api/activity/sync")
async def trigger_github_sync():
    """Triggers git commit and push of autonomous proof logs to GitHub."""
    import subprocess
    root_dir = Path(__file__).parent.parent.parent
    sync_script = root_dir / "github_sync.py"
    if sync_script.exists():
        res = subprocess.run(["python", str(sync_script), "--once"], capture_output=True, text=True)
        return {
            "status": "ok" if res.returncode == 0 else "error",
            "output": res.stdout.strip() or res.stderr.strip()
        }
    return {"status": "error", "message": "github_sync.py not found"}

# Mount screenshot assets
root_dir = Path(__file__).parent.parent.parent
screenshots_dir = root_dir / "logs" / "screenshots"
if screenshots_dir.exists():
    app.mount("/screenshots", StaticFiles(directory=str(screenshots_dir)), name="screenshots")

# Mount static web UI if directory exists
web_dir = root_dir / "web"
if web_dir.exists():
    app.mount("/", StaticFiles(directory=str(web_dir), html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    import numpy as np
    uvicorn.run(app, host="0.0.0.0", port=8000)
