"""
Hydrodynamic Drag Engine: Resistive Force Theory (RFT)
Calculates thrust and drag in low Reynolds number fluid / gelatinous agar media.
"""

import numpy as np

class ResistiveForceHydrodynamics:
    def __init__(self, medium: str = "agar"):
        """
        Args:
            medium: 'agar' (crawling) or 'water' (swimming).
        """
        self.medium = medium
        if medium == "agar":
            # Highly anisotropic drag: high resistance to lateral sliding, lower along body tangent
            self.C_N = 35.0  # Normal drag coefficient
            self.C_T = 1.0   # Tangential drag coefficient
        else:
            # Low Reynolds water / buffer fluid
            self.C_N = 1.8
            self.C_T = 1.0

    def compute_segment_forces(self, tangents: np.ndarray, normals: np.ndarray, velocities: np.ndarray) -> np.ndarray:
        """
        Computes hydrodynamic drag forces on each segment.

        Args:
            tangents: (N_seg, 2) unit tangent vectors along the body.
            normals: (N_seg, 2) unit normal vectors perpendicular to the body.
            velocities: (N_seg, 2) segment velocities.

        Returns:
            forces: (N_seg, 2) drag/thrust forces on each segment.
        """
        # Decompose velocity into tangential and normal components
        v_t = np.sum(velocities * tangents, axis=1, keepdims=True)  # (N_seg, 1)
        v_n = np.sum(velocities * normals, axis=1, keepdims=True)   # (N_seg, 1)

        # Drag force: F = - C_T * v_T * t - C_N * v_N * n
        f_t = -self.C_T * v_t * tangents
        f_n = -self.C_N * v_n * normals

        return f_t + f_n
