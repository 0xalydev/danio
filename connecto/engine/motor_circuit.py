"""
Motor Circuit Coordinator & Neuromuscular Bridge
Translates spiking motor neuron activity into Dorsal/Ventral muscle activations.
"""

import numpy as np
from typing import Dict, List, Tuple
from ..connectome.muscle_map import NEUROMUSCULAR_JUNCTIONS, MUSCLES

class LocomotionCommandCircuit:
    def __init__(self, idx_map: Dict[str, int]):
        self.idx_map = idx_map
        self.num_muscles = len(MUSCLES)
        self.muscle_indices = {m: i for i, m in enumerate(MUSCLES)}
        
        # Muscle activation state with low-pass filtering (calcium-induced tension decay)
        self.muscle_activations = np.zeros(self.num_muscles, dtype=np.float32)
        self.tau_muscle = 25.0  # ms time constant for muscle twitch relaxation

    def update_muscles(self, spikes: np.ndarray, dt_ms: float = 0.5) -> np.ndarray:
        """
        Integrates motor neuron spikes across the neuromuscular junctions into muscle tensions.

        Args:
            spikes: Boolean array of size (302,) indicating which neurons spiked.
            dt_ms: Timestep in ms.

        Returns:
            muscle_activations: Float array of size (95,) in range [0.0, 1.0].
        """
        decay = np.exp(-dt_ms / self.tau_muscle)
        self.muscle_activations *= decay

        # Check each motor neuron with mapped NMJs
        for mn, info in NEUROMUSCULAR_JUNCTIONS.items():
            mn_idx = self.idx_map.get(mn)
            if mn_idx is not None and spikes[mn_idx]:
                weight = info["weight"]
                for target_m in info["targets"]:
                    m_idx = self.muscle_indices.get(target_m)
                    if m_idx is not None:
                        if weight > 0:
                            # Excitatory (ACh) contraction
                            self.muscle_activations[m_idx] = min(1.0, self.muscle_activations[m_idx] + weight * 0.35)
                        else:
                            # Inhibitory (GABA) relaxation
                            self.muscle_activations[m_idx] = max(0.0, self.muscle_activations[m_idx] + weight * 0.25)

        return self.muscle_activations.copy()

    def get_segmental_bending_forces(self) -> np.ndarray:
        """
        Computes the net dorso-ventral bending torque for each of the 24 longitudinal segments.
        Positive = Dorsal bending, Negative = Ventral bending.
        """
        torques = np.zeros(24, dtype=np.float32)
        for seg in range(1, 25):
            seg_str = f"{seg:02d}"
            dl = self.muscle_activations[self.muscle_indices[f"MDL{seg_str}"]]
            dr = self.muscle_activations[self.muscle_indices[f"MDR{seg_str}"]]
            vl = self.muscle_activations[self.muscle_indices[f"MVL{seg_str}"]]
            # Note: MVR has only 23 segments in hermaphrodite anatomy
            vr = self.muscle_activations[self.muscle_indices[f"MVR{seg_str}"]] if seg < 24 else 0.0

            dorsal_tension = (dl + dr) * 0.5
            ventral_tension = (vl + vr) * 0.5
            torques[seg - 1] = dorsal_tension - ventral_tension

        return torques
