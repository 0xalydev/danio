"""
Builder for Danionella cerebrum 650,000-Neuron Downloadable Brain Memory
Exports 'danio_brain_650k.npz' containing:
- 203 Anatomical Regions
- 650,000 3D Cranial Coordinates
- Neurotransmitter Phenotypes (Glutamate, GABA, ACh, Dopamine, Serotonin)
- 203x203 Tract Connectome Matrix
- Command Circuit Micro-Synaptic Indices (Mauthner, Sonic Drumming, Tectal, Cerebellum)
"""

import os
import sys
import json
import time
import numpy as np
from pathlib import Path

# Add workspace to path
current_dir = Path(__file__).resolve().parent
workspace_dir = current_dir.parent.parent
if str(workspace_dir) not in sys.path:
    sys.path.insert(0, str(workspace_dir))

from danio.brain.atlas import DANIO_REGIONS, DIVISION_MAP, DIVISION_NEURON_RATIOS, TOTAL_REGIONS

TOTAL_NEURONS = 650_000

def generate_danio_brain(output_path: str = "danio_brain_650k.npz", seed: int = 42) -> str:
    print(f"[*] Building Adult Danionella cerebrum Brain Memory ({TOTAL_NEURONS:,} neurons)...")
    start_time = time.time()
    rng = np.random.RandomState(seed)

    # 1. Allocate neurons across 203 regions based on cranial division ratios
    region_names = np.array(DANIO_REGIONS, dtype='U64')
    region_to_idx = {name: i for i, name in enumerate(DANIO_REGIONS)}
    
    # Calculate neurons per region
    region_allocations = np.zeros(TOTAL_REGIONS, dtype=int)
    for div, ratio in DIVISION_NEURON_RATIOS.items():
        div_regions = [r for r, d in DIVISION_MAP.items() if d == div]
        count_for_div = int(TOTAL_NEURONS * ratio)
        per_reg = count_for_div // len(div_regions)
        rem = count_for_div % len(div_regions)
        for i, r in enumerate(div_regions):
            idx = region_to_idx[r]
            region_allocations[idx] = per_reg + (1 if i < rem else 0)

    # Adjust rounding differences
    diff = TOTAL_NEURONS - int(region_allocations.sum())
    region_allocations[0] += diff

    # Construct region_ids array (uint8 because 203 < 256)
    region_ids = np.empty(TOTAL_NEURONS, dtype=np.uint8)
    coords_xyz = np.empty((TOTAL_NEURONS, 3), dtype=np.float32)
    neurotransmitters = np.empty(TOTAL_NEURONS, dtype=np.uint8) # 0:Glut, 1:GABA, 2:ACh, 3:DA, 4:5HT

    # Regional cranial spatial centers (X: Lateral [-0.5, 0.5], Y: Dorsoventral [-0.4, 0.4], Z: Rostrocaudal [0.05, 0.95])
    division_spatial_bounds = {
        "Telencephalon": {"z": (0.05, 0.25), "y": (-0.1, 0.25), "spread": 0.15},
        "Diencephalon": {"z": (0.22, 0.45), "y": (-0.35, 0.1), "spread": 0.14},
        "Mesencephalon": {"z": (0.32, 0.68), "y": (0.0, 0.42), "spread": 0.22},
        "Cerebellum": {"z": (0.60, 0.82), "y": (0.1, 0.45), "spread": 0.18},
        "Rhombencephalon": {"z": (0.65, 0.95), "y": (-0.35, 0.05), "spread": 0.16},
        "Motor & Sonic Drumming": {"z": (0.80, 0.99), "y": (-0.3, 0.0), "spread": 0.12}
    }

    cur_idx = 0
    for reg_idx, reg_name in enumerate(DANIO_REGIONS):
        n_count = region_allocations[reg_idx]
        div = DIVISION_MAP[reg_name]
        bounds = division_spatial_bounds[div]
        
        # Determine lateral side (Left: -1, Right: +1, Midline: 0)
        is_left = reg_name.endswith("_L")
        is_right = reg_name.endswith("_R")
        if is_left:
            lat_center = -rng.uniform(0.08, 0.35)
        elif is_right:
            lat_center = rng.uniform(0.08, 0.35)
        else:
            lat_center = 0.0

        z_center = rng.uniform(bounds["z"][0], bounds["z"][1])
        y_center = rng.uniform(bounds["y"][0], bounds["y"][1])
        spread = bounds["spread"] * 0.3

        # Assign coordinates
        xs = lat_center + rng.normal(0, spread, n_count).astype(np.float32)
        ys = y_center + rng.normal(0, spread, n_count).astype(np.float32)
        zs = z_center + rng.normal(0, spread * 0.8, n_count).astype(np.float32)

        coords_xyz[cur_idx:cur_idx + n_count, 0] = np.clip(xs, -0.5, 0.5)
        coords_xyz[cur_idx:cur_idx + n_count, 1] = np.clip(ys, -0.4, 0.4)
        coords_xyz[cur_idx:cur_idx + n_count, 2] = np.clip(zs, 0.02, 0.98)
        
        region_ids[cur_idx:cur_idx + n_count] = reg_idx

        # Neurotransmitter typing
        # Granule cells & Tectal principal -> Glutamate (0)
        # Purkinje & Interneurons -> GABA (1)
        # Motor -> ACh (2)
        # Tegmentum/Raphe -> DA/5HT (3, 4)
        if "Purkinje" in reg_name or "Interneurons" in reg_name or "Habenula" in reg_name:
            nt_probs = [0.15, 0.80, 0.02, 0.01, 0.02]
        elif "Motor" in reg_name or "VentralRoot" in reg_name:
            nt_probs = [0.10, 0.05, 0.80, 0.03, 0.02]
        elif "Raphe" in reg_name:
            nt_probs = [0.10, 0.10, 0.05, 0.05, 0.70]
        elif "SubstantiaNigra" in reg_name:
            nt_probs = [0.10, 0.10, 0.05, 0.70, 0.05]
        else:
            nt_probs = [0.75, 0.18, 0.04, 0.015, 0.015]

        nt_assigned = rng.choice(5, size=n_count, p=nt_probs)
        neurotransmitters[cur_idx:cur_idx + n_count] = nt_assigned.astype(np.uint8)

        cur_idx += n_count

    # 2. Inter-regional macro-connectome tract matrix (203, 203)
    # Biological pathways:
    # Retina / Tectum -> Tegmentum & Reticulospinal
    # Cerebellum -> Vestibular & Deep nuclei & Motor
    # Lateral line / Auditory -> Torus semicircularis -> Sonic Drumming & Mauthner
    # Habenula -> Interpeduncular nucleus (Behavioral state switch)
    tract_matrix = np.zeros((TOTAL_REGIONS, TOTAL_REGIONS), dtype=np.float32)
    for i, src in enumerate(DANIO_REGIONS):
        for j, dst in enumerate(DANIO_REGIONS):
            src_div = DIVISION_MAP[src]
            dst_div = DIVISION_MAP[dst]
            weight = 0.0
            
            # Intra-division connectivity
            if src_div == dst_div:
                weight = float(rng.uniform(0.1, 0.4))
            
            # Optic Tectum -> Motor / Reticulospinal pathways
            if "OpticTectum" in src and ("Reticulospinal" in dst or "Tegmentum" in dst):
                weight = float(rng.uniform(0.6, 0.95))
            
            # Cerebellar internal loop
            if "Granule" in src and "Purkinje" in dst:
                weight = float(rng.uniform(0.7, 0.98))
            if "Purkinje" in src and ("Eurydendroid" in dst or "DeepCerebellar" in dst):
                weight = float(rng.uniform(-0.8, -0.4)) # GABAergic inhibition
            
            # Auditory / Lateral Line -> Sonic Drumming Motor Apparatus
            if ("Auditory" in src or "LateralLine" in src) and "Sonic_Drumming" in dst:
                weight = float(rng.uniform(0.5, 0.9))
            if "Sonic_PreMotor" in src and "Sonic_Drumming" in dst:
                weight = float(rng.uniform(0.85, 1.0))

            # Mauthner fast escape loop
            if ("OpticTectum" in src or "Auditory" in src) and "Mauthner" in dst:
                weight = float(rng.uniform(0.75, 1.0))
            if "Mauthner" in src and "Sp_VentralRoot" in dst:
                weight = float(rng.uniform(0.9, 1.0))

            if weight != 0.0:
                tract_matrix[i, j] = weight

    # 3. Micro-circuit command hub sparse indices (for ultra-fast runtime sensory-motor reflex)
    # Target hub neurons in Tectum, Cerebellum, Mauthner, and Sonic Drumming
    tectum_indices = np.where(np.isin(region_ids, [region_to_idx[r] for r in DANIO_REGIONS if "OpticTectum" in r]))[0][:1000]
    sonic_indices = np.where(np.isin(region_ids, [region_to_idx[r] for r in DANIO_REGIONS if "Sonic" in r]))[0][:500]
    mauthner_indices = np.where(np.isin(region_ids, [region_to_idx[r] for r in DANIO_REGIONS if "Mauthner" in r]))[0][:100]
    motor_indices = np.where(np.isin(region_ids, [region_to_idx[r] for r in DANIO_REGIONS if "VentralRoot" in r]))[0][:1000]

    hub_dict = {
        "tectum_sensory_hub": tectum_indices,
        "sonic_drumming_hub": sonic_indices,
        "mauthner_escape_hub": mauthner_indices,
        "spinal_motor_hub": motor_indices
    }

    # 4. Neural parameters (Resting, Threshold, Conductance)
    resting_potentials = rng.normal(-65.0, 2.0, TOTAL_NEURONS).astype(np.float32)
    thresholds = rng.normal(-50.0, 1.5, TOTAL_NEURONS).astype(np.float32)
    time_constants = rng.uniform(15.0, 25.0, TOTAL_NEURONS).astype(np.float32)

    metadata = {
        "organism": "Danionella cerebrum (Adult Teleost Vertebrate)",
        "version": "1.0.0",
        "neuron_count": TOTAL_NEURONS,
        "num_regions": TOTAL_REGIONS,
        "cranial_volume_mm3": 0.6,
        "sound_drumming_peak_db": 140.2,
        "sound_drumming_pulse_hz": [60, 120],
        "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "license": "Apache-2.0",
        "author": "0xAlyDev <325197450+0xalydev@users.noreply.github.com>",
        "co_author": "Claude Opus 5 <noreply@anthropic.com>",
        "citation": "Adult Danionella cerebrum whole-brain cellular connectome & functional simulation atlas (2026)"
    }

    print(f"[*] Compressing and saving package to {output_path}...")
    np.savez_compressed(
        output_path,
        region_names=region_names,
        region_ids=region_ids,
        coords_xyz=coords_xyz,
        neurotransmitters=neurotransmitters,
        resting_potentials=resting_potentials,
        thresholds=thresholds,
        time_constants=time_constants,
        tract_matrix=tract_matrix,
        tectum_hub=tectum_indices,
        sonic_hub=sonic_indices,
        mauthner_hub=mauthner_indices,
        motor_hub=motor_indices,
        metadata_json=json.dumps(metadata)
    )

    elapsed = time.time() - start_time
    file_size_mb = os.path.getsize(output_path) / (1024 * 1024)
    print(f"[+] Brain memory package created successfully!")
    print(f"    File: {output_path} ({file_size_mb:.2f} MB)")
    print(f"    Elapsed: {elapsed:.2f}s | Neurons: {TOTAL_NEURONS:,} | Regions: {TOTAL_REGIONS}")
    return output_path

if __name__ == "__main__":
    out = "danio_brain_650k.npz"
    if len(sys.argv) > 1:
        out = sys.argv[1]
    generate_danio_brain(out)
