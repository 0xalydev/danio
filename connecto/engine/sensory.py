"""
Sensory Transduction Subsystem: Chemotaxis, Mechanosensation, and Proprioception
"""

import numpy as np
from typing import Dict, List, Tuple
from ..connectome.data import NEURONS

class SensoryTransduction:
    def __init__(self, idx_map: Dict[str, int]):
        self.idx_map = idx_map
        self.N = len(NEURONS)
        self.prev_concentration = 0.0
        self.ambient_attractants: List[Tuple[float, float, float]] = []  # List of (x, y, strength)

    def set_chemical_sources(self, sources: List[Tuple[float, float, float]]):
        """Set position and strength of chemical sources in the arena."""
        self.ambient_attractants = sources

    def sample_chemical_concentration(self, head_pos: np.ndarray) -> float:
        """Calculates total chemical attractant concentration at head coordinates (x, y)."""
        if not self.ambient_attractants:
            return 0.0
        total_c = 0.0
        for src_x, src_y, strength in self.ambient_attractants:
            dist = np.linalg.norm(head_pos - np.array([src_x, src_y]))
            # 2D Gaussian diffusion gradient
            total_c += strength * np.exp(-(dist ** 2) / (2.0 * (150.0 ** 2)))
        return float(total_c)

    def compute_sensory_currents(
        self,
        head_pos: np.ndarray,
        anterior_touch: bool = False,
        posterior_touch: bool = False,
        body_curvatures: np.ndarray = None
    ) -> np.ndarray:
        """
        Generates injected current vector (shape: 302) based on environmental cues.
        """
        currents = np.zeros(self.N, dtype=np.float32)

        # ---------------------------------------------------------
        # 1. Chemotaxis: ASEL (ON-cell) / ASER (OFF-cell)
        # ---------------------------------------------------------
        c = self.sample_chemical_concentration(head_pos)
        dc_dt = c - self.prev_concentration
        self.prev_concentration = c

        asel_idx = self.idx_map.get("ASEL")
        aser_idx = self.idx_map.get("ASER")

        if asel_idx is not None and aser_idx is not None:
            if dc_dt > 0.001:
                # Concentration rising: excite ASEL -> drives AIY -> forward run
                currents[asel_idx] += float(min(12.0, dc_dt * 80.0))
            elif dc_dt < -0.001:
                # Concentration falling: excite ASER -> drives AIB/AIZ -> pirouette / reorientation turn
                currents[aser_idx] += float(min(14.0, abs(dc_dt) * 100.0))

        # Baseline head exploratory drive (AWC olfactory)
        for awc in ["AWAL", "AWAR", "AWCL", "AWCR"]:
            if awc in self.idx_map:
                currents[self.idx_map[awc]] += float(np.random.uniform(1.0, 3.0))

        # ---------------------------------------------------------
        # 2. Mechanosensory Escape Reflex
        # ---------------------------------------------------------
        if anterior_touch:
            for touch_n in ["ALML", "ALMR", "AVM"]:
                if touch_n in self.idx_map:
                    currents[self.idx_map[touch_n]] += 25.0

        if posterior_touch:
            for touch_n in ["PLML", "PLMR", "PVM"]:
                if touch_n in self.idx_map:
                    currents[self.idx_map[touch_n]] += 25.0

        # ---------------------------------------------------------
        # 3. Proprioceptive Stretch Receptor Feedback
        # ---------------------------------------------------------
        if body_curvatures is not None:
            # Local segment curvature excites anteriorly adjacent B-type motor neurons
            # enforcing stable metachronal wave propagation (Wen et al. 2012)
            for i, curve in enumerate(body_curvatures[:7]):
                db_name = f"DB0{i+1}"
                vb_name = f"VB0{min(i+1, 11):02d}" if (i+1) < 10 else f"VB{i+1}"
                if curve > 0:  # Dorsal bending
                    if db_name in self.idx_map:
                        currents[self.idx_map[db_name]] += float(curve * 3.5)
                else:          # Ventral bending
                    if vb_name in self.idx_map:
                        currents[self.idx_map[vb_name]] += float(abs(curve) * 3.5)

        return currents
