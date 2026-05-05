"""
Biomechanical Multi-Segment Body Model with Hydrostatic Skeleton
Models the 24-segment body wall dynamics and curvature propagation.
"""

import numpy as np
from typing import Tuple
from .hydrodynamics import ResistiveForceHydrodynamics

class WormBodyModel:
    def __init__(self, num_segments: int = 24, length_mm: float = 1.0, medium: str = "agar"):
        self.num_segments = num_segments
        self.num_points = num_segments + 1
        self.total_length = length_mm
        self.seg_len = length_mm / num_segments

        # Biophysical tissue constants
        self.bending_stiffness = 1.2
        self.damping = 0.6
        self.hydro = ResistiveForceHydrodynamics(medium=medium)

        # 2D Planar Positions (x, y) for 25 vertices along centerline
        self.points = np.zeros((self.num_points, 2), dtype=np.float32)
        # Initialize resting horizontal straight line centered at (0, 0)
        for i in range(self.num_points):
            self.points[i, 0] = i * self.seg_len
            self.points[i, 1] = 0.0

        self.velocities = np.zeros_like(self.points)
        self.curvatures = np.zeros(num_segments, dtype=np.float32)
        self.phase = 0.0

    def get_head_position(self) -> np.ndarray:
        return self.points[0].copy()

    def get_centroid(self) -> np.ndarray:
        return np.mean(self.points, axis=0)

    def step(self, muscle_torques: np.ndarray, dt: float = 0.005) -> Tuple[np.ndarray, float]:
        """
        Advances the body mechanics forward by dt seconds.

        Args:
            muscle_torques: Array of size (24,) representing dorsoventral muscle bending torques.
            dt: Timestep in seconds.

        Returns:
            points: (25, 2) centerline coordinates.
            speed: scalar forward velocity.
        """
        self.phase += dt * 4.0

        # Calculate segment vectors, tangents, and normals
        seg_vecs = self.points[1:] - self.points[:-1]  # (24, 2)
        lengths = np.linalg.norm(seg_vecs, axis=1, keepdims=True) + 1e-6
        tangents = seg_vecs / lengths
        normals = np.stack([-tangents[:, 1], tangents[:, 0]], axis=1)

        # Compute internal elastic bending forces
        # Curvatures are angles between adjacent segments
        angles = np.arctan2(tangents[:, 1], tangents[:, 0])
        diff_angles = np.diff(angles)
        self.curvatures[1:] = diff_angles
        self.curvatures[0] = diff_angles[0] if len(diff_angles) > 0 else 0.0

        # Internal muscle bending moment translated into normal forces
        # Active muscular torque + elastic restoring torque
        net_moment = muscle_torques * 2.5 - self.bending_stiffness * self.curvatures

        # Propagate traveling undulatory wave if active
        seg_velocities = 0.5 * (self.velocities[:-1] + self.velocities[1:])
        hydro_forces = self.hydro.compute_segment_forces(tangents, normals, seg_velocities)

        # Apply forces to vertices
        forces = np.zeros_like(self.points)
        for i in range(self.num_segments):
            lateral_push = normals[i] * net_moment[i] * 12.0 + hydro_forces[i] * 0.4
            forces[i] += lateral_push * 0.5
            forces[i + 1] += lateral_push * 0.5

        # Newton's second law with high damping (low Reynolds regime)
        self.velocities += (forces - self.damping * self.velocities) * dt
        self.points += self.velocities * dt

        # Length constraint relaxation to maintain inextensible hydrostatic cuticle
        for _ in range(3):
            for i in range(self.num_segments):
                delta = self.points[i + 1] - self.points[i]
                d = np.linalg.norm(delta) + 1e-6
                correction = (d - self.seg_len) * (delta / d) * 0.5
                self.points[i] += correction
                self.points[i + 1] -= correction

        # Calculate instantaneous forward speed
        centroid_vel = np.mean(self.velocities, axis=0)
        speed = float(np.linalg.norm(centroid_vel))

        return self.points.copy(), speed
