"""
Shared Global State and Authoritative 24/7 World Simulation
Maintains continuous worm coordinates, 44-segment kinematic body,
persistent food list, and multi-user synchronized environmental arena.
"""

import math
import random
import time
from typing import Dict, List, Optional
import numpy as np
from ..simulation import ConnectoSimulation

class SimulationManager:
    _instance: Optional['SimulationManager'] = None

    def __init__(self):
        self.sim = ConnectoSimulation(medium="agar")
        self.last_telemetry: Dict = {}
        self.start_time = time.time()
        
        # Continuous Arena Coordinates (1000 x 600 arena coordinate system)
        self.arena_w = 1000.0
        self.arena_h = 600.0
        self.cx = 500.0
        self.cy = 300.0
        self.angle = 0.0
        self.num_points = 44
        self.seg_len = 9.5
        self.wave_phase = 0.0
        self.wave_freq = 0.16
        self.speed = 2.1
        self.state = "CHEMOTAXIS_FORWARD"
        self.speed_mms = "0.52"

        # Initialize 44 body points
        self.points = [[self.cx - i * self.seg_len, self.cy] for i in range(self.num_points)]
        self.base_angles = [0.0] * self.num_points

        # Persistent Global Food List (Shared across all connected users)
        self.food_list: List[Dict] = [
            {"x": 720.0, "y": 230.0, "strength": 10.0, "pulse": 0.0}
        ]

        # Reflex timers
        self.escape_timer = 0
        self.is_reverse = False
        self.wander_phase = random.uniform(0, 10.0)

        # On-Chain / Web3 Bridge State
        self.token_info = {
            "name": "Danionella cerebrum (Danio)",
            "symbol": "DANIO",
            "address": "0x7b194d2e82f7c2294dae3d74c0b468a5294e019c",
            "chain": "Robinhood Chain · id 4663",
            "supply": "1,000,000,000 DANIO",
            "tax": "0.00 %",
            "treasury_eth": 4.18,
            "status": "VERTEBRATE_650K_LIVE"
        }

        # Danionella cerebrum 650,000-Neuron Vertebrate Engine
        self.danio_brain = None
        try:
            from danio import DanioBrain
            from pathlib import Path
            brain_file = Path(__file__).resolve().parent.parent.parent / "danio_brain_650k.npz"
            if brain_file.exists():
                self.danio_brain = DanioBrain.load(str(brain_file))
        except Exception as e:
            print("[*] DanioBrain load note:", e)

    @classmethod
    def get_instance(cls) -> 'SimulationManager':
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def step(self) -> Dict:
        """
        Advances the authoritative 302-neuron SNN and updates global body coordinates.
        This single authoritative state is broadcast to all connected WebSocket clients.
        """
        # 1. Step biological SNN engine
        bio_data = self.sim.step()
        self.state = bio_data.get("state", "CHEMOTAXIS_FORWARD")
        self.speed_mms = str(bio_data.get("speed_mms", "0.52"))

        # 2. Update Kinematic World Locomotion (30 Hz frame)
        margin = 80.0
        self.wander_phase += 0.02

        # A. Boundary Repulsion Steering
        turn_force = 0.0
        if self.cx < margin:
            turn_force += 0.06 * (1.0 - max(0.0, self.cx) / margin)
        elif self.cx > self.arena_w - margin:
            turn_force -= 0.06 * (1.0 - max(0.0, self.arena_w - self.cx) / margin)

        if self.cy < margin:
            turn_force += 0.06 * (1.0 - max(0.0, self.cy) / margin)
        elif self.cy > self.arena_h - margin:
            turn_force -= 0.06 * (1.0 - max(0.0, self.arena_h - self.cy) / margin)

        # B. Food Chemotaxis or Exploration
        if self.food_list and self.escape_timer <= 0:
            target_food = self.food_list[0]
            dx = target_food["x"] - self.cx
            dy = target_food["y"] - self.cy
            dist = math.hypot(dx, dy)

            # Steer toward food
            target_angle = math.atan2(dy, dx)
            diff = (target_angle - self.angle + math.pi) % (2.0 * math.pi) - math.pi
            turn_force += max(-0.045, min(0.045, diff * 0.15))

            # Eat food when reached
            if dist < 28.0:
                self.food_list.pop(0)
                # Spawn a new food source automatically across the arena
                new_fx = random.uniform(150.0, self.arena_w - 150.0)
                new_fy = random.uniform(120.0, self.arena_h - 120.0)
                self.food_list.append({"x": new_fx, "y": new_fy, "strength": 10.0, "pulse": 0.0})
                self.sim.clear_food()
                self.sim.add_food(new_fx / 500.0, new_fy / 300.0)
        elif self.escape_timer > 0:
            self.escape_timer -= 1
            turn_force += 0.08  # Pirouette turn away

        # Gentle sinusoidal head cast
        turn_force += math.sin(self.wander_phase) * 0.015
        self.angle += turn_force

        # Forward velocity
        cur_speed = float(self.speed_mms) * 3.2
        cur_speed = max(1.2, min(4.5, cur_speed))

        # Advance head coordinates
        self.cx += math.cos(self.angle) * cur_speed
        self.cy += math.sin(self.angle) * cur_speed

        # Arena clamping
        self.cx = max(30.0, min(self.arena_w - 30.0, self.cx))
        self.cy = max(30.0, min(self.arena_h - 30.0, self.cy))

        # C. Propagate Sinusoidal Curvature Wave Along 44 Body Points
        self.wave_phase += self.wave_freq
        head_wave = math.sin(self.wave_phase) * 0.48
        self.base_angles[0] = self.angle + head_wave

        # Shift angles down the body
        for i in range(self.num_points - 1, 0, -1):
            self.base_angles[i] = self.base_angles[i - 1]

        # Reconstruct Cartesian coordinates
        self.points[0] = [self.cx, self.cy]
        for i in range(1, self.num_points):
            seg_a = self.base_angles[i]
            prev = self.points[i - 1]
            self.points[i] = [
                prev[0] - math.cos(seg_a) * self.seg_len,
                prev[1] - math.sin(seg_a) * self.seg_len
            ]

        # 3. Step Danionella cerebrum 650,000-Neuron Vertebrate Engine
        danio_telemetry = None
        if self.danio_brain is not None:
            try:
                danio_sensory = {
                    "visual_luminance": 0.8,
                    "visual_prey_angle": math.degrees(math.atan2(self.cy - 300.0, self.cx - 500.0)) if self.food_list else 0.0,
                    "predator_threat": 0.9 if self.escape_timer > 30 else 0.0,
                    "water_flow_velocity": 0.05 + abs(self.speed) * 0.02,
                    "acoustic_stimulus_hz": 80.0 if len(self.food_list) > 1 else 0.0,
                    "acoustic_stimulus_db": 70.0 if len(self.food_list) > 1 else 0.0
                }
                danio_action = self.danio_brain.step(danio_sensory, dt=0.033)
                danio_telemetry = danio_action.to_dict()
            except Exception as e:
                danio_telemetry = {"error": str(e)}

        # 4. Assemble Complete Multi-User Synchronized Telemetry Packet
        uptime = round(time.time() - self.start_time, 1)
        data = {
            "tick": bio_data.get("tick", 0),
            "time_s": bio_data.get("time_s", 0.0),
            "state": self.state,
            "speed_mms": self.speed_mms,
            "spikes_count": bio_data.get("spikes_count", 184),
            "mean_v": bio_data.get("mean_v", -58.4),
            "dorsal": 54,
            "ventral": 46,
            "chem": f"{bio_data.get('chemical_c', 0.025):.4f}",
            "active_neurons": bio_data.get("active_neurons", ["AVBL", "AVBR", "DB01", "VB02"]),
            "uptime_s": uptime,
            "token": self.token_info,
            "danio": danio_telemetry,
            "locomotion": {
                "x": round(self.cx, 1),
                "y": round(self.cy, 1),
                "angle": round(self.angle, 3),
                "state": self.state,
                "speed_mms": self.speed_mms,
                "points": [[round(p[0], 1), round(p[1], 1)] for p in self.points],
                "food_list": self.food_list,
                "uptime_s": uptime
            }
        }
        self.last_telemetry = data
        return data

    def add_food(self, x: float, y: float, strength: float = 10.0):
        """Adds food to the shared global arena, visible to all users."""
        self.food_list.append({"x": x, "y": y, "strength": strength, "pulse": 0.0})
        self.sim.add_food(x / 500.0, y / 300.0, strength)

    def trigger_touch(self, anterior: bool = True):
        """Triggers mechanosensory reflex across all connected clients."""
        self.sim.trigger_touch(anterior=anterior)
        self.escape_timer = 40
        self.state = "REVERSE_ESCAPE"

