"""
Danionella cerebrum Anatomical Brain Atlas (v2.0)
Official Reference: Kadobianskyi et al. bioRxiv 2026 (doi:10.64898/2026.03.09.710483v1)
Judkewitz Lab / Charité – Universitätsmedizin Berlin & Humboldt-Universität zu Berlin
Template: dc_mixed_hhg6@1.0 (520x1002x332 voxels at 2.5 um isotropic resolution)
Total Neuroanatomical Regions: 203
"""

import os
import json
from pathlib import Path
from typing import List, Dict, Any, Optional

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent

# 203 Neuroanatomical Regions from official dc_labels.json segmentation
def _load_manifest_regions() -> List[Dict[str, Any]]:
    manifest_path = PROJECT_ROOT / "danio_region_manifest.json"
    if not manifest_path.exists():
        manifest_path = PROJECT_ROOT / "web" / "data" / "danio_region_manifest.json"
    if manifest_path.exists():
        try:
            with open(manifest_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                return data.get("regions", [])
        except Exception:
            pass
    return []

_OFFICIAL_REGIONS = _load_manifest_regions()

if _OFFICIAL_REGIONS:
    DANIO_REGIONS: List[str] = [r["name"] for r in _OFFICIAL_REGIONS]
    DIVISION_MAP: Dict[str, str] = {r["name"]: r["division"] for r in _OFFICIAL_REGIONS}
else:
    # Fallback to predefined 203 regions list if manifest not yet available
    from danio.brain.build_memory_v2 import load_official_regions
    try:
        _regs = load_official_regions()
        DANIO_REGIONS = [r["name"] for r in _regs]
        DIVISION_MAP = {r["name"]: r["division"] for r in _regs}
    except Exception:
        # Ultimate fallback
        DANIO_REGIONS = [f"Danio_Region_{i}" for i in range(203)]
        DIVISION_MAP = {r: "Mesencephalon" for r in DANIO_REGIONS}

TOTAL_REGIONS = len(DANIO_REGIONS)

# Division weights for neuron allocation (summing to 650,000)
# Cerebellum and Optic Tectum contain the dense granular and visual sheets
DIVISION_NEURON_RATIOS = {
    "Cerebellum": 0.38,              # ~247,000 neurons (densely packed granule folia)
    "Mesencephalon": 0.35,           # ~227,500 neurons (optic tectum retinotopic sheets)
    "Telencephalon": 0.08,           # ~52,000 neurons (pallium & subpallium)
    "Rhombencephalon": 0.08,         # ~52,000 neurons (hindbrain, vestibular, Mauthner)
    "Diencephalon": 0.07,            # ~45,500 neurons (habenula & thalamus)
    "Motor & Spinal": 0.04           # ~26,000 neurons (spinal motor pools & sonic drumming)
}

# Scientific Provenance Constants
ATLAS_TEMPLATE = "dc_mixed_hhg6@1.0"
ATLAS_DOI = "10.64898/2026.03.09.710483v1"
ATLAS_RESOLUTION_UM = 2.5
ATLAS_VOXEL_DIMENSIONS = (520, 1002, 332)
ATLAS_ORGANISM = "Danionella cerebrum (Adult Teleost Vertebrate)"
ATLAS_LICENSE = "CC-BY-NC-SA 4.0"

def load_atlas_manifest() -> Dict[str, Any]:
    """Load the full 203-region manifest with official voxel and physical mm coordinates."""
    path = PROJECT_ROOT / "danio_region_manifest.json"
    if not path.exists():
        path = PROJECT_ROOT / "web" / "data" / "danio_region_manifest.json"
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def load_provenance() -> Dict[str, Any]:
    """Load scientific provenance and integrity charter."""
    path = PROJECT_ROOT / "danio_provenance.json"
    if not path.exists():
        path = PROJECT_ROOT / "web" / "data" / "danio_provenance.json"
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)
