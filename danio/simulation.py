"""
DanioSimulation — Server-side Closed-Loop Simulation for Danionella cerebrum (650,000 Neurons)
Runs the vertebrate brain in a continuous 50 Hz loop with sensory-motor integration.
"""

from __future__ import annotations
import math
import random
import time
import numpy as np
from dataclasses import dataclass, field
from typing import Dict, Any, Optional, List
from danio.brain.engine import DanioBrain, DanioAction


@dataclass
class DanioTelemetry:
    """Telemetry snapshot from the Danio simulation."""
    tick: int
    time_s: float
    state: str
    speed_mms: float
    spikes_count: int
    mean_v: float
    dorsal: float
    ventral: float
    chem: float
    active_neurons: List[str]
    action: DanioAction
    locomotion: Dict[str, Any] = field(default_factory=dict)


class DanioSimulation:
    """
    Closed-loop Danionella cerebrum simulation.
    Couples the 650k-neuron brain to a virtual fish body in a water tank.
    """

    # Arena coordinate space == client canvas space (1000 x 600 units).
    # 1 arena unit renders as ~1 canvas pixel, so the web viewport (INSTRUMENT 01)
    # always sees the fish, its food and the walls.
    ARENA_W = 1000.0
    ARENA_H = 600.0
    WALL_MARGIN = 120.0

    def __init__(self, brain_file: str = "danio_brain_650k.npz", dt: float = 0.02):
        self.brain = DanioBrain.load(brain_file)
        self.dt = dt
        self.tick = 0
        self.start_time = time.time()
        
        # Virtual fish state (arena units == client canvas pixels)
        self.x = self.ARENA_W / 2.0
        self.y = self.ARENA_H / 2.0
        self.heading = 0.0  # radians
        self.speed = 0.0    # arena units / s
        
        # Environment
        self.food_x = 720.0
        self.food_y = 240.0
        self.predator_x = 5000.0
        self.predator_y = 5000.0
        self.water_flow = 0.05
        
        # Sensory state
        self.visual_luminance = 0.7
        self.last_action: Optional[DanioAction] = None
        
        # Behavioral state
        self.state = "FORAGING_SEARCH"
        self.escape_cooldown = 0.0
        self.drum_cooldown = 0.0
        
        # Tactile reflex timers (seconds) — driven by POST /api/touch
        self.escape_timer = 0.0
        self.sprint_timer = 0.0
        
        # Retrograde body-wave phase (drives the 24-segment undulation)
        self.wave_phase = 0.0
        
        # Population stats
        self.population_spikes = 0
        self.mean_vm = -65.0
        
        # For active neuron tracking (sampled)
        self.active_neuron_names: List[str] = []

    def _compute_sensory(self) -> Dict[str, Any]:
        """Compute sensory inputs from virtual environment."""
        import math
        
        # Distance to food
        dx_food = self.food_x - self.x
        dy_food = self.food_y - self.y
        dist_food = math.hypot(dx_food, dy_food)
        
        # Visual prey angle (relative to heading)
        target_angle_world = math.atan2(dy_food, dx_food)
        rel_angle = (target_angle_world - self.heading + math.pi) % (2 * math.pi) - math.pi
        prey_angle_deg = math.degrees(rel_angle)
        prey_angle_deg = max(-90.0, min(90.0, prey_angle_deg))
        
        # Predator threat
        dx_pred = self.predator_x - self.x
        dy_pred = self.predator_y - self.y
        dist_pred = math.hypot(dx_pred, dy_pred)
        predator_threat = max(0.0, 1.0 - (dist_pred / 300.0))
        
        # Acoustic stimulus (conspecific drumming)
        acoustic_hz = 80.0 if dist_food < 60.0 else 0.0
        acoustic_db = 70.0 if dist_food < 60.0 else 0.0
        
        return {
            "visual_luminance": self.visual_luminance,
            "visual_prey_angle": prey_angle_deg,
            "predator_threat": predator_threat,
            "water_flow_velocity": self.water_flow,
            "acoustic_stimulus_hz": acoustic_hz,
            "acoustic_stimulus_db": acoustic_db,
        }

    def _update_fish_kinematics(self, action: DanioAction):
        """Update virtual fish position from motor commands.

        Arena is the 1000x600 client canvas space, so speeds/sizes here are
        directly in canvas pixels (fish cruises at ~60-120 px/s — clearly visible).
        """
        # Tactile reflex overrides (from POST /api/touch)
        thrust = action.tail_thrust
        yaw = action.heading_yaw
        if self.escape_timer > 0:
            thrust = 1.0          # full Mauthner burst
            yaw = 0.0             # locked C-turn, no weaving
        elif self.sprint_timer > 0:
            thrust = min(1.0, thrust * 2.0 + 0.6)  # forward sprint
            yaw = yaw * 0.3       # mostly straight, slight steering

        # Turn rate from heading yaw
        turn_rate = yaw * 4.0  # rad/s
        self.heading += turn_rate * self.dt

        # Speed from tail thrust (arena units/s; ~25-40 u/s cruise, ~180 u/s bursts)
        acceleration = thrust * 800.0
        self.speed = self.speed * 0.965 + acceleration * self.dt
        self.speed = max(0.0, min(180.0, self.speed))

        # Position update
        self.x += math.cos(self.heading) * self.speed * self.dt
        self.y += math.sin(self.heading) * self.speed * self.dt

        # Visual prey attraction — weak bias toward the nutrient so the
        # fish visibly runs to the green halo (layered on top of brain steering)
        if self.escape_timer <= 0:
            dx_f = self.food_x - self.x
            dy_f = self.food_y - self.y
            d_f = math.hypot(dx_f, dy_f)
            if d_f > 1.0:
                desired_f = math.atan2(dy_f, dx_f)
                diff_f = (desired_f - self.heading + math.pi) % (2 * math.pi) - math.pi
                attract = 1.2 / (1.0 + d_f / 150.0)  # max 1.2 rad/s, fades with distance
                self.heading += diff_f * min(1.0, attract * self.dt)

        # 1. Soft boundary repulsion — steer back toward arena center near walls
        cx = self.ARENA_W / 2.0
        cy = self.ARENA_H / 2.0
        m = self.WALL_MARGIN
        if not (m < self.x < self.ARENA_W - m and m < self.y < self.ARENA_H - m):
            dx_c = cx - self.x
            dy_c = cy - self.y
            d_c = math.hypot(dx_c, dy_c)
            if d_c > 1e-6:
                desired = math.atan2(dy_c, dx_c)
                diff = (desired - self.heading + math.pi) % (2 * math.pi) - math.pi
                self.heading += diff * min(1.0, 4.0 * self.dt)
            self.speed = max(self.speed, 40.0)  # keep moving while recovering

        # 2. Hard safety clamp — fish can never leave the viewport
        self.x = max(15.0, min(self.ARENA_W - 15.0, self.x))
        self.y = max(15.0, min(self.ARENA_H - 15.0, self.y))

        # 3. Propagate the retrograde body wave (faster in sprint, reversed in escape)
        wave_dir = -1.0 if self.escape_timer > 0 else 1.0
        wave_rate = 0.30 if self.sprint_timer > 0 else 0.19
        self.wave_phase = (self.wave_phase + wave_dir * wave_rate) % (2 * math.pi)

        # Fin pitch affects vertical (not modeled in 2D)
        
    def _determine_state(self, action: DanioAction, sensory: Dict[str, Any]) -> str:
        """Determine high-level behavioral state."""
        threat = sensory.get("predator_threat", 0.0)
        
        if self.escape_timer > 0:
            return "MAUTHNER_ESCAPE"
        elif self.sprint_timer > 0:
            return "ESCAPE_ACCELERATION"
        elif threat > 0.6 and self.escape_cooldown <= 0:
            self.escape_cooldown = 0.5
            return "MAUTHNER_ESCAPE"
        elif action.drumming_sound_active:
            return "SONIC_DRUMMING"
        elif sensory.get("visual_prey_angle", 0) != 0 and self.speed > 0.5:
            return "CHEMOTAXIS_FORWARD"
        elif self.speed > 0.1:
            return "FORAGING_SEARCH"
        else:
            return "RESTING"

    def step(self, sensory_override: Optional[Dict[str, Any]] = None) -> DanioTelemetry:
        """Execute one simulation step (50 Hz).

        sensory_override: optional manual stimulus dict (POST /api/sensory/override)
        applied on top of the environment-computed senses while it is set.
        """
        self.tick += 1
        current_time = time.time() - self.start_time
        
        # Decay cooldowns & reflex timers
        self.escape_cooldown = max(0.0, self.escape_cooldown - self.dt)
        self.drum_cooldown = max(0.0, self.drum_cooldown - self.dt)
        self.escape_timer = max(0.0, self.escape_timer - self.dt)
        self.sprint_timer = max(0.0, self.sprint_timer - self.dt)
        
        # Compute sensory input (manual override wins while set)
        sensory = self._compute_sensory()
        if sensory_override:
            for key, value in sensory_override.items():
                if key in sensory and value is not None:
                    sensory[key] = float(value)
        
        # Step the brain
        action = self.brain.step(sensory, dt=self.dt)
        self.last_action = action
        
        # Update fish kinematics
        self._update_fish_kinematics(action)
        
        # Determine behavioral state
        self.state = self._determine_state(action, sensory)
        
        # Population statistics (from brain)
        self.population_spikes = int(action.population_firing_rate)
        self.mean_vm = -65.0 + (action.population_firing_rate / 45.0) * 20.0  # approximate
        
        # Active neurons (sampled from hub regions)
        self.active_neuron_names = self._get_active_neurons(action)
        
        # Motor pool activity (dorsal/ventral from spinal motor)
        dorsal_activity = 50.0 + action.tail_thrust * 30.0
        ventral_activity = 50.0 + abs(action.heading_yaw) * 30.0
        
        # Chemosensory gradient
        chem_gradient = 1.0 / (1.0 + abs(sensory.get("visual_prey_angle", 0)) / 45.0)

        # Nutrient economy: eat when close, respawn elsewhere in the arena
        if math.hypot(self.food_x - self.x, self.food_y - self.y) < 45.0:
            self._respawn_food()

        # Locomotion data for web sync (arena units == client canvas pixels)
        locomotion = {
            "x": round(self.x, 2),
            "y": round(self.y, 2),
            "heading": round(self.heading, 4),
            "speed": round(self.speed, 2),
            "state": self.state,
            "segments": self._get_body_segments(),
            "food_list": [{"x": round(self.food_x, 2), "y": round(self.food_y, 2), "pulse": 0}],
        }

        return DanioTelemetry(
            tick=self.tick,
            time_s=current_time,
            state=self.state,
            speed_mms=round(self.speed * 0.008, 3),  # arena px/s -> plausible mm/s readout
            spikes_count=self.population_spikes,
            mean_v=round(self.mean_vm, 2),
            dorsal=round(dorsal_activity, 1),
            ventral=round(ventral_activity, 1),
            chem=round(chem_gradient, 4),
            active_neurons=self.active_neuron_names,
            action=action,
            locomotion=locomotion,
        )

    def _get_active_neurons(self, action: DanioAction) -> List[str]:
        """Get names of currently active neuron populations."""
        active = []
        
        # Sensory
        if action.regional_activity.get("Mesencephalon", 0) > 0.5:
            active.extend(["Mes_OpticTectum_L", "Mes_OpticTectum_R"])
        
        # Motor
        if action.tail_thrust > 0.3:
            active.extend(["Sp_VentralRoot_L", "Sp_VentralRoot_R"])
        
        # Escape
        if action.mauthner_escape:
            active.extend(["Rh_Mauthner_L", "Rh_Mauthner_R"])
        
        # Drumming
        if action.drumming_sound_active:
            active.extend(["Sonic_Drumming_L", "Sonic_Drumming_R"])
        
        # Cerebellum balance
        if action.fin_pitch != 0:
            active.extend(["Ce_Cerebellum_L", "Ce_Cerebellum_R"])
        
        return active[:12]

    def _get_body_segments(self, num_segments: int = 24) -> List[Dict[str, float]]:
        """Get body segment positions for rendering (arena/canvas units).

        Body spans 24 segments x 17u ~= 408u, matching the client's ~410px backbone
        so the fish renders full-size in the viewport. Head is segments[0].
        """
        segments = []
        seg_len = 17.0
        n = max(2, int(num_segments))
        amp = 0.50 if self.sprint_timer > 0 else 0.42
        wave_dir = -1.0 if self.escape_timer > 0 else 1.0

        for i in range(n):
            u = i / (n - 1)
            # Anatomical envelope: head steers subtly, midbody undulates, tail tapers
            envelope = math.sin(u * math.pi) ** 0.85
            angle_offset = amp * envelope * math.sin(self.wave_phase * wave_dir - i * 0.30)
            seg_angle = self.heading + angle_offset
            seg_x = self.x - i * seg_len * math.cos(seg_angle)
            seg_y = self.y - i * seg_len * math.sin(seg_angle)
            segments.append({"x": round(seg_x, 2), "y": round(seg_y, 2), "angle": round(seg_angle, 4)})

        return segments

    def add_food(self, x: float, y: float):
        """Add food at world coordinates."""
        self.food_x = x
        self.food_y = y

    def trigger_predator(self, x: float, y: float):
        """Trigger predator at position."""
        self.predator_x = x
        self.predator_y = y
        self.escape_cooldown = 0.0  # Allow immediate escape

    def trigger_touch(self, anterior: bool = True):
        """Tactile arena reflex (POST /api/touch).

        anterior=True  -> head poke (ALM/AVM): Mauthner C-start escape, reverse & burst away
        anterior=False -> tail poke (PLM/PVM): posterior touch -> forward sprint
        """
        if anterior:
            self.escape_timer = 1.2
            # Instantaneous C-start: cast the head around away from the stimulus
            self.heading += math.pi + random.uniform(-0.6, 0.6)
        else:
            self.sprint_timer = 1.2

    def reset_arena(self):
        """Re-center the fish and respawn the nutrient patch (POST /api/reset)."""
        self.x = self.ARENA_W / 2.0
        self.y = self.ARENA_H / 2.0
        self.heading = 0.0
        self.speed = 0.0
        self.escape_timer = 0.0
        self.sprint_timer = 0.0
        self.wave_phase = 0.0
        self.state = "FORAGING_SEARCH"
        self._respawn_food()

    def _respawn_food(self):
        """Place a fresh nutrient patch at a random reachable spot in the arena."""
        m = 130.0
        self.food_x = random.uniform(m, self.ARENA_W - m)
        self.food_y = random.uniform(m, self.ARENA_H - m)

    def get_cranial_snapshot(self, sample_size: int = 2000) -> Dict[str, Any]:
        """Get 3D neuron snapshot for visualization."""
        return self.brain.get_cranial_snapshot(sample_size)

    def info(self) -> str:
        return self.brain.info()


def main():
    """Run offline simulation for testing."""
    sim = DanioSimulation()
    print("=" * 70)
    print(" DANIONELLA CEREBRUM — CLOSED-LOOP SIMULATION (650K NEURONS)")
    print("=" * 70)
    
    for i in range(100):
        telem = sim.step()
        if i % 10 == 0 or telem.state in ["MAUTHNER_ESCAPE", "SONIC_DRUMMING"]:
            print(f"[{telem.time_s:6.2f}s] Tick {telem.tick:04d} | "
                  f"State: {telem.state:20s} | "
                  f"Speed: {telem.speed_mms:6.1f} mm/s | "
                  f"Spikes: {telem.spikes_count:3d} | "
                  f"Thrust: {telem.action.tail_thrust:.2f} | "
                  f"Yaw: {telem.action.heading_yaw:+.2f} | "
                  f"Drum: {'YES' if telem.action.drumming_sound_active else 'no'}")
    
    print("=" * 70)
    print("Simulation complete.")


if __name__ == "__main__":
    main()