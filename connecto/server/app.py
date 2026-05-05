"""
FastAPI Telemetry & Web3 Bridge Server
Streams live neural dynamics and locomotion coordinates over WebSocket & REST.
"""

import asyncio
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

# Mount static web UI if directory exists
web_dir = Path(__file__).parent.parent.parent / "web"
if web_dir.exists():
    app.mount("/", StaticFiles(directory=str(web_dir), html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    import numpy as np
    uvicorn.run(app, host="0.0.0.0", port=8000)
