"""
Neuromuscular Junctions (NMJ) & Body Wall Muscle Mapping
Arrangement: 95 body wall muscles in 4 quadrants (DL, DR, VL, VR) along 24 body segments.
"""

from typing import Dict, List

# 95 Body Wall Muscle IDs: 24 Dorsal Left, 24 Dorsal Right, 24 Ventral Left, 23 Ventral Right
MUSCLES: List[str] = (
    [f"MDL{i:02d}" for i in range(1, 25)] +
    [f"MDR{i:02d}" for i in range(1, 25)] +
    [f"MVL{i:02d}" for i in range(1, 25)] +
    [f"MVR{i:02d}" for i in range(1, 24)]
)
assert len(MUSCLES) == 95, f"Expected 95 muscles, got {len(MUSCLES)}"

# Neuromuscular junction table: mapping motor neurons to target muscle groups
# Format: {MotorNeuron: [List of target muscles, Excitatory (+1.0) or Inhibitory (-1.0)]}
NEUROMUSCULAR_JUNCTIONS: Dict[str, Dict] = {}

# 1. Dorsal B-type Motor Neurons (Forward drive to Dorsal muscles)
db_map = {
    "DB01": [f"MDL{i:02d}" for i in range(1, 5)] + [f"MDR{i:02d}" for i in range(1, 5)],
    "DB02": [f"MDL{i:02d}" for i in range(5, 9)] + [f"MDR{i:02d}" for i in range(5, 9)],
    "DB03": [f"MDL{i:02d}" for i in range(9, 13)] + [f"MDR{i:02d}" for i in range(9, 13)],
    "DB04": [f"MDL{i:02d}" for i in range(13, 16)] + [f"MDR{i:02d}" for i in range(13, 16)],
    "DB05": [f"MDL{i:02d}" for i in range(16, 19)] + [f"MDR{i:02d}" for i in range(16, 19)],
    "DB06": [f"MDL{i:02d}" for i in range(19, 22)] + [f"MDR{i:02d}" for i in range(19, 22)],
    "DB07": [f"MDL{i:02d}" for i in range(22, 25)] + [f"MDR{i:02d}" for i in range(22, 25)],
}

for mn, targets in db_map.items():
    NEUROMUSCULAR_JUNCTIONS[mn] = {"targets": targets, "weight": 1.0, "type": "excitatory"}

# 2. Ventral B-type Motor Neurons (Forward drive to Ventral muscles)
vb_map = {
    "VB01": [f"MVL{i:02d}" for i in range(1, 4)] + [f"MVR{i:02d}" for i in range(1, 4)],
    "VB02": [f"MVL{i:02d}" for i in range(4, 7)] + [f"MVR{i:02d}" for i in range(4, 7)],
    "VB03": [f"MVL{i:02d}" for i in range(7, 9)] + [f"MVR{i:02d}" for i in range(7, 9)],
    "VB04": [f"MVL{i:02d}" for i in range(9, 11)] + [f"MVR{i:02d}" for i in range(9, 11)],
    "VB05": [f"MVL{i:02d}" for i in range(11, 13)] + [f"MVR{i:02d}" for i in range(11, 13)],
    "VB06": [f"MVL{i:02d}" for i in range(13, 15)] + [f"MVR{i:02d}" for i in range(13, 15)],
    "VB07": [f"MVL{i:02d}" for i in range(15, 17)] + [f"MVR{i:02d}" for i in range(15, 17)],
    "VB08": [f"MVL{i:02d}" for i in range(17, 19)] + [f"MVR{i:02d}" for i in range(17, 19)],
    "VB09": [f"MVL{i:02d}" for i in range(19, 21)] + [f"MVR{i:02d}" for i in range(19, 21)],
    "VB10": [f"MVL{i:02d}" for i in range(21, 23)] + [f"MVR{i:02d}" for i in range(21, 23)],
    "VB11": [f"MVL{i:02d}" for i in range(23, 25)] + [f"MVR{i:02d}" for i in range(23, 24)],
}

for mn, targets in vb_map.items():
    NEUROMUSCULAR_JUNCTIONS[mn] = {"targets": targets, "weight": 1.0, "type": "excitatory"}

# 3. GABAergic D-type Motor Neurons (Cross-Inhibition)
# DD motor neurons relax dorsal muscles
for i in range(1, 7):
    mn = f"DD0{i}"
    seg_start = int((i - 1) * (24 / 6)) + 1
    seg_end = int(i * (24 / 6)) + 1
    targets = [f"MDL{s:02d}" for s in range(seg_start, min(seg_end, 25))] + \
              [f"MDR{s:02d}" for s in range(seg_start, min(seg_end, 25))]
    NEUROMUSCULAR_JUNCTIONS[mn] = {"targets": targets, "weight": -0.8, "type": "inhibitory"}

# VD motor neurons relax ventral muscles
for i in range(1, 14):
    mn = f"VD0{i}" if i < 10 else f"VD{i}"
    seg_start = int((i - 1) * (24 / 13)) + 1
    seg_end = int(i * (24 / 13)) + 1
    targets = [f"MVL{s:02d}" for s in range(seg_start, min(seg_end, 25))] + \
              [f"MVR{s:02d}" for s in range(seg_start, min(seg_end, 24))]
    NEUROMUSCULAR_JUNCTIONS[mn] = {"targets": targets, "weight": -0.8, "type": "inhibitory"}

# 4. Head Foraging and Steering Motor Neurons (SMD & RMD)
NEUROMUSCULAR_JUNCTIONS["SMDDL"] = {"targets": ["MDL01", "MDL02", "MDL03"], "weight": 1.5, "type": "excitatory"}
NEUROMUSCULAR_JUNCTIONS["SMDDR"] = {"targets": ["MDR01", "MDR02", "MDR03"], "weight": 1.5, "type": "excitatory"}
NEUROMUSCULAR_JUNCTIONS["SMDVL"] = {"targets": ["MVL01", "MVL02", "MVL03"], "weight": 1.5, "type": "excitatory"}
NEUROMUSCULAR_JUNCTIONS["SMDVR"] = {"targets": ["MVR01", "MVR02", "MVR03"], "weight": 1.5, "type": "excitatory"}
