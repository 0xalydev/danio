"""
Closed-Loop Connecto Simulation Orchestrator
Binds Connectome Spiking Dynamics -> Neuromuscular Bridge -> Biomechanics -> Hydrodynamic Locomotion.
"""

import numpy as np
from typing import Dict, List, Optional, Tuple
from .engine.snn import SpikingConnectomeEngine
from .engine.sensory import SensoryTransduction
from .engine.motor_circuit import LocomotionCommandCircuit
from .physics.biomechanics import WormBodyModel
from .connectome.data import FORWARD_COMMAND, BACKWARD_COMMAND, CHEMOTAXIS_SENSORS

class ConnectoSimulation:
    def __init__(self, medium: str = "agar"):
        # 1. Neural SNN Engine
        self.snn = SpikingConnectomeEngine(dt_ms=0.5, delay_steps=3)
        self.idx_map = self.snn.idx_map

        # 2. Sensory & Environmental Transduction
        self.sensory = SensoryTransduction(self.idx_map)

        # 3. Neuromuscular Command Circuit
        self.motor = LocomotionCommandCircuit(self.idx_map)

        # 4. Multi-Segment Hydrodynamic Body
        self.body = WormBodyModel(num_segments=24, length_mm=1.0, medium=medium)

        # State and history
        self.tick_count = 0
        self.time_seconds = 0.0
        self.dt = 0.005  # 5 ms physics step
        self.active_food_sources: List[Tuple[float, float, float]] = [(1.5, 0.8, 10.0)]
        self.sensory.set_chemical_sources(self.active_food_sources)

        # Triggers
        self.pending_anterior_touch = False
        self.pending_posterior_touch = False

    def add_food(self, x: float, y: float, strength: float = 10.0):
        """Place chemical attractant food in the arena."""
        self.active_food_sources.append((x, y, strength))
        self.sensory.set_chemical_sources(self.active_food_sources)

    def clear_food(self):
        self.active_food_sources.clear()
        self.sensory.set_chemical_sources(self.active_food_sources)

    def trigger_touch(self, anterior: bool = True):
        """Simulate physical stimulus contact."""
        if anterior:
            self.pending_anterior_touch = True
        else:
            self.pending_posterior_touch = True

    def step(self) -> Dict:
        """Runs one full closed-loop step (sensory -> brain -> muscles -> fluid physics)."""
        self.tick_count += 1
        self.time_seconds += self.dt

        head_pos = self.body.get_head_position()

        # A. Sensory Transduction: Chemical & Mechanosensory & Proprioceptive currents
        sensory_currents = self.sensory.compute_sensory_currents(
            head_pos=head_pos,
            anterior_touch=self.pending_anterior_touch,
            posterior_touch=self.pending_posterior_touch,
            body_curvatures=self.body.curvatures
        )
        self.pending_anterior_touch = False
        self.pending_posterior_touch = False

        # Add spontaneous basal drive to command neurons (maintains natural exploration)
        for fwd in FORWARD_COMMAND:
            sensory_currents[self.idx_map[fwd]] += float(np.random.normal(3.5, 0.4))

        # Intrinsic undulatory oscillator drive for ventral/dorsal motor alternation
        osc_phase = self.time_seconds * 2.0 * np.pi * 1.6  # ~1.6 Hz undulation
        for i in range(1, 8):
            seg_phase = osc_phase - (i * 0.45)
            db_name = f"DB0{i}"
            vb_name = f"VB0{i}" if i < 10 else f"VB{i}"
            if db_name in self.idx_map:
                sensory_currents[self.idx_map[db_name]] += float(max(0.0, np.sin(seg_phase) * 18.0))
            if vb_name in self.idx_map:
                sensory_currents[self.idx_map[vb_name]] += float(max(0.0, -np.sin(seg_phase) * 18.0))

        # Baseline command neuron drive
        for fwd in FORWARD_COMMAND:
            if fwd in self.idx_map:
                sensory_currents[self.idx_map[fwd]] += float(np.random.uniform(8.0, 14.0))

        # B. Spiking Connectome Integration (10 neural sub-steps per physics step)
        spikes = np.zeros(self.snn.N, dtype=bool)
        for _ in range(10):
            sub_spikes, _ = self.snn.step(sensory_currents)
            spikes |= sub_spikes

        # C. Neuromuscular Junctions -> Muscle Activation
        self.motor.update_muscles(spikes, dt_ms=self.dt * 1000.0)
        muscle_torques = self.motor.get_segmental_bending_forces()

        # D. Hydrodynamic Multi-Segment Physics
        points, speed = self.body.step(muscle_torques, dt=self.dt)

        # E. Determine High-Level Behavioral State
        fwd_activity = np.sum([self.snn.V[self.idx_map[n]] for n in FORWARD_COMMAND])
        bwd_activity = np.sum([self.snn.V[self.idx_map[n]] for n in BACKWARD_COMMAND])

        if bwd_activity > fwd_activity * 1.3:
            state = "REVERSE_ESCAPE"
        elif speed > 0.05:
            state = "CHEMOTAXIS_FORWARD"
        else:
            state = "FORAGING_SEARCH"

        return {
            "tick": self.tick_count,
            "time_s": round(self.time_seconds, 3),
            "state": state,
            "speed_mms": round(speed * 1000.0, 2),
            "spikes_count": int(np.sum(spikes)),
            "active_neurons": [self.snn.neurons[i] for i, s in enumerate(spikes) if s][:12],
            "head_pos": [round(float(head_pos[0]), 3), round(float(head_pos[1]), 3)],
            "body_points": [[round(float(p[0]), 3), round(float(p[1]), 3)] for p in points],
            "chemical_c": round(self.sensory.prev_concentration, 4),
            "mean_v": round(float(np.mean(self.snn.V)), 2),
            "food_count": len(self.active_food_sources)
        }
