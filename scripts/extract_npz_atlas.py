#!/usr/bin/env python3
"""
Atlas Extractor for Danionella cerebrum 650k Dataset
Extracts 203 biological regions, inter-regional tract connections,
and subsampled representative neuron coordinates into a web-ready JSON atlas.
"""

import os
import sys
import json
import numpy as np
from pathlib import Path

# Add project root to path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from danio.brain.atlas import DANIO_REGIONS, DIVISION_MAP, DIVISION_NEURON_RATIOS

def extract_atlas(npz_path: str, output_json: str, sample_size: int = 20000):
    print(f"[*] Loading {npz_path}...")
    data = np.load(npz_path, allow_pickle=True)

    region_names = [str(r) for r in data["region_names"]]
    region_ids = data["region_ids"] # (650000,)
    coords_xyz = data["coords_xyz"] # (650000, 3)
    neurotransmitters = data["neurotransmitters"] # (650000,)
    resting_potentials = data["resting_potentials"]
    thresholds = data["thresholds"]
    time_constants = data["time_constants"]
    tract_matrix = data["tract_matrix"] # (203, 203)
    metadata = json.loads(str(data["metadata_json"]))

    total_neurons = len(region_ids)
    num_regions = len(region_names)
    print(f"[*] Total neurons: {total_neurons:,} | Regions: {num_regions}")

    # Neurotransmitter names
    NT_NAMES = {
        0: "Glutamate (Excitatory)",
        1: "GABA (Inhibitory)",
        2: "Acetylcholine (Motor/Cholinergic)",
        3: "Dopamine (Modulatory)",
        4: "Serotonin (5-HT / Arousal)"
    }

    # Biological function lookup for adult Danionella cerebrum regions
    def get_region_function(name: str, div: str) -> str:
        if "OlfactoryBulb" in name:
            return "Processes waterborne pheromones and prey amino acid plumes via glomerular odorant channels."
        elif "Pallium" in name:
            return "Homologue of vertebrate hippocampus/amygdala; encodes spatial navigation and associative shoaling memory."
        elif "Subpallium" in name or "Septum" in name:
            return "Basal forebrain cholinergic and GABAergic subpallial network regulating social behavioral arousal."
        elif "Habenula" in name:
            return "Epithalamic asymmetric valence switchboard directing fear avoidance and social dominance states."
        elif "Thalamus" in name:
            return "Relays multimodal sensory projections to telencephalic associative networks."
        elif "Preoptic" in name or "Hypothalamus" in name:
            return "Neuroendocrine and autonomic homeostatic center controlling circadian, metabolic, and acoustic readiness."
        elif "OpticTectum" in name:
            return "Retinotopic visual colliculus computing micro-prey motion vectors and predator looming angles."
        elif "TorusSemicircularis" in name:
            return "Auditory and vibrational processing hub receiving lateral line and inner ear saccular inputs."
        elif "Cerebell" in name or "Eurydendroid" in name:
            return "High-frequency sensorimotor calibration; computes body balance, dorsal-ventral pitch, and smooth swimming."
        elif "Mauthner" in name:
            return "Giant hindbrain reticulospinal command neuron executing 5ms explosive C-start predator escape reflex."
        elif "Sonic" in name:
            return "Drives specialized drumming muscle apparatus to generate >140 dB SPL acoustic pulses via swim bladder resonance."
        elif "VentralRoot" in name or "Reticulospinal" in name or "Peduncle" in name or "Fin" in name:
            return "Reticulospinal central pattern generator innervating 36 vertebral myotome segments for carangiform thrust."
        elif "LateralLine" in name:
            return "Mechanosensory neuromast processing column detecting water flow velocity and rheotaxic pressure waves."
        elif "Auditory" in name or "Vestibular" in name:
            return "Acoustic-octavolateralis nuclei computing high-frequency underwater acoustic waves and gravity orientation."
        else:
            return f"Vertebrate {div} integration center coordinating sensorimotor loops and neuromodulatory tone."

    # 1. Calculate per-region statistics & spatial bounding spheres
    regions_list = []
    region_centroids = []

    for idx, name in enumerate(region_names):
        div = DIVISION_MAP.get(name, "Unassigned")
        mask = (region_ids == idx)
        count = int(np.sum(mask))

        if count > 0:
            reg_coords = coords_xyz[mask]
            # Spatial coordinates scale: X in [-0.5, 0.5], Y in [-0.4, 0.4], Z in [0.05, 0.95]
            # Convert to WebGL 3D world units:
            # X (lateral): [-12, 12]
            # Y (dorsoventral): [-8, 8]
            # Z (rostrocaudal): [14, -14] (Rostral forward +Z, Caudal backward -Z)
            cx = float(np.mean(reg_coords[:, 0])) * 24.0
            cy = float(np.mean(reg_coords[:, 1])) * 20.0
            cz = (0.5 - float(np.mean(reg_coords[:, 2]))) * 28.0

            # Radius
            dists = np.sqrt(
                ((reg_coords[:, 0] * 24.0) - cx) ** 2 +
                ((reg_coords[:, 1] * 20.0) - cy) ** 2 +
                (((0.5 - reg_coords[:, 2]) * 28.0) - cz) ** 2
            )
            radius = float(np.percentile(dists, 90)) if len(dists) > 0 else 1.5
            radius = max(0.8, min(radius, 4.5))

            # Neurotransmitter breakdown
            reg_nts = neurotransmitters[mask]
            nt_counts = np.bincount(reg_nts, minlength=5)
            dom_nt_idx = int(np.argmax(nt_counts))
            dom_nt = NT_NAMES.get(dom_nt_idx, "Glutamate")

            # Electrophysiology means
            mean_vm = float(np.mean(resting_potentials[mask]))
            mean_thresh = float(np.mean(thresholds[mask]))
            mean_tau = float(np.mean(time_constants[mask]))
        else:
            cx, cy, cz = 0.0, 0.0, 0.0
            radius = 1.0
            dom_nt = "Glutamate"
            mean_vm = -65.0
            mean_thresh = -50.0
            mean_tau = 20.0

        centroid = [round(cx, 2), round(cy, 2), round(cz, 2)]
        region_centroids.append(centroid)

        # Baseline firing rate based on division
        if div == "Mesencephalon":
            base_hz = 72
            color_hex = "#06b6d4" # Cyan
        elif div == "Cerebellum":
            base_hz = 64
            color_hex = "#10b981" # Green
        elif div == "Telencephalon":
            base_hz = 38
            color_hex = "#38bdf8" # Sky blue
        elif div == "Diencephalon":
            base_hz = 42
            color_hex = "#a855f7" # Purple
        elif div == "Rhombencephalon":
            base_hz = 56
            color_hex = "#f43f5e" # Rose
        else:
            base_hz = 48
            color_hex = "#f59e0b" # Amber

        regions_list.append({
            "id": idx,
            "name": name,
            "division": div,
            "center": centroid,
            "radius": round(radius, 2),
            "neuronCount": count,
            "dominantNT": dom_nt,
            "restingPotential": round(mean_vm, 2),
            "threshold": round(mean_thresh, 2),
            "timeConstant": round(mean_tau, 1),
            "baselineHz": base_hz,
            "color": color_hex,
            "function": get_region_function(name, div)
        })

    # 2. Extract Top Inter-Regional Tracts from tract_matrix
    print("[*] Extracting inter-regional tract pathways...")
    tracts = []
    non_zero = np.where(np.abs(tract_matrix) > 0.35)
    for src_idx, dst_idx in zip(non_zero[0], non_zero[1]):
        if src_idx == dst_idx:
            continue
        w = float(tract_matrix[src_idx, dst_idx])
        src_reg = regions_list[src_idx]
        dst_reg = regions_list[dst_idx]
        
        # Calculate intermediate curve control points (Catmull-Rom guide)
        p0 = src_reg["center"]
        p1 = dst_reg["center"]
        # Add slight arch based on division
        mid_x = (p0[0] + p1[0]) * 0.5
        mid_y = (p0[1] + p1[1]) * 0.5 + (0.8 if w > 0 else -0.5)
        mid_z = (p0[2] + p1[2]) * 0.5
        
        tracts.append({
            "src": src_idx,
            "dst": dst_idx,
            "srcName": src_reg["name"],
            "dstName": dst_reg["name"],
            "weight": round(w, 3),
            "isInhibitory": bool(w < 0),
            "mid": [round(mid_x, 2), round(mid_y, 2), round(mid_z, 2)]
        })

    # Sort tracts by absolute weight descending and keep top 600 for performance
    tracts.sort(key=lambda t: abs(t["weight"]), reverse=True)
    selected_tracts = tracts[:600]
    print(f"[+] Retained {len(selected_tracts)} major tract pathways (from {len(tracts)} above threshold)")

    # 3. Subsample Representative Neurons (e.g. 20,000 points) for WebGL Buffer
    print(f"[*] Subsampling {sample_size:,} representative somata for high-performance WebGL Points buffer...")
    step = max(1, total_neurons // sample_size)
    sample_indices = np.arange(0, total_neurons, step)[:sample_size]

    sampled_coords = coords_xyz[sample_indices]
    sampled_regions = region_ids[sample_indices].tolist()
    sampled_nts = neurotransmitters[sample_indices].tolist()

    # Scale coordinates to WebGL world units
    scaled_coords = []
    for i in range(len(sampled_coords)):
        x = round(float(sampled_coords[i, 0]) * 24.0, 2)
        y = round(float(sampled_coords[i, 1]) * 20.0, 2)
        z = round((0.5 - float(sampled_coords[i, 2])) * 28.0, 2)
        scaled_coords.extend([x, y, z])

    # 4. Division Summaries
    div_counts = {}
    for r in regions_list:
        d = r["division"]
        div_counts[d] = div_counts.get(d, 0) + r["neuronCount"]

    division_stats = [
        {"name": k, "neuronCount": v, "pct": round((v / total_neurons) * 100, 1)}
        for k, v in div_counts.items()
    ]

    # Assemble final payload
    atlas_payload = {
        "metadata": {
            "organism": metadata.get("organism", "Danionella cerebrum"),
            "totalNeurons": total_neurons,
            "totalRegions": num_regions,
            "sampleCount": len(sample_indices),
            "tractCount": len(selected_tracts),
            "cranialVolumeMm3": metadata.get("cranial_volume_mm3", 0.6),
            "soundDrummingDb": metadata.get("sound_drumming_peak_db", 140.2),
            "version": "1.0.0",
            "license": "Apache-2.0"
        },
        "divisions": division_stats,
        "regions": regions_list,
        "tracts": selected_tracts,
        "neuronPoints": {
            "count": len(sample_indices),
            "positions": scaled_coords, # Flat [x0, y0, z0, x1, y1, z1, ...]
            "regions": sampled_regions, # uint8 region IDs
            "neurotransmitters": sampled_nts # uint8 NT indices
        }
    }

    # Convert numpy types to python native types
    def to_py(obj):
        if isinstance(obj, np.integer):
            return int(obj)
        elif isinstance(obj, np.floating):
            return float(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        elif isinstance(obj, dict):
            return {k: to_py(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [to_py(i) for i in obj]
        return obj

    atlas_payload = to_py(atlas_payload)

    # Save to JSON
    os.makedirs(os.path.dirname(output_json), exist_ok=True)
    with open(output_json, "w", encoding="utf-8") as f:
        json.dump(atlas_payload, f, separators=(',', ':'))

    size_mb = os.path.getsize(output_json) / (1024 * 1024)
    print(f"[+] Atlas successfully exported to {output_json} ({size_mb:.2f} MB)")
    return atlas_payload

if __name__ == "__main__":
    root = Path(__file__).resolve().parent.parent
    npz_in = root / "danio_brain_650k.npz"
    json_out = root / "web" / "data" / "danio_atlas_203.json"
    extract_atlas(str(npz_in), str(json_out), sample_size=20000)
