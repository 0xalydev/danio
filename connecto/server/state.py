"""
Shared Global State and On-Chain Environmental Bridge
"""

import time
from typing import Dict, List, Optional
from ..simulation import ConnectoSimulation

class SimulationManager:
    _instance: Optional['SimulationManager'] = None

    def __init__(self):
        self.sim = ConnectoSimulation(medium="agar")
        self.last_telemetry: Dict = {}
        self.start_time = time.time()
        
        # On-Chain / Web3 Bridge State
        self.token_info = {
            "name": "C. elegans Connecto",
            "symbol": "CONNECTO",
            "address": "0x7b194d2e82f7c2294dae3d74c0b468a5294e019c",
            "chain": "Robinhood Chain · id 4663",
            "supply": "1,000,000,000 CONNECTO",
            "tax": "0.00 %",
            "treasury_eth": 4.18,
            "status": "HEALTHY_CLOSED_LOOP"
        }

    @classmethod
    def get_instance(cls) -> 'SimulationManager':
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def step(self) -> Dict:
        data = self.sim.step()
        data["token"] = self.token_info
        data["uptime_s"] = round(time.time() - self.start_time, 1)
        self.last_telemetry = data
        return data

    def add_food(self, x: float, y: float, strength: float = 10.0):
        self.sim.add_food(x, y, strength)

    def trigger_touch(self, anterior: bool = True):
        self.sim.trigger_touch(anterior=anterior)
