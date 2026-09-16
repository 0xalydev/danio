"""
DANIO Consciousness Voice & Journal Engine (danio_voice.py)
Translates 650,000 vertebrate neurons & 203 anatomical regions into first-person thoughts.
Driven by Optic Tectum (vision), Cerebellum (balance), Habenula (mood), and Sonic Drumming (140 dB).
"""

import os
import sys
import json
import time
import random
from pathlib import Path

from danio import DanioBrain

def generate_danio_thought(brain: DanioBrain, step_result=None) -> dict:
    # Run a sensory step to sample live biophysical dynamics
    sensory = {
        "visual_luminance": random.uniform(0.4, 0.95),
        "visual_prey_angle": random.uniform(-45.0, 45.0),
        "predator_threat": random.uniform(0.0, 0.2),
        "water_flow_velocity": random.uniform(0.04, 0.15),
        "acoustic_stimulus_hz": random.choice([0.0, 60.0, 85.0, 110.0]),
        "acoustic_stimulus_db": random.uniform(40.0, 80.0)
    }
    action = brain.step(sensory, dt=0.02)
    reg_act = action.regional_activity

    tectum = reg_act.get("Mesencephalon", 0.1)
    cerebellum = reg_act.get("Cerebellum", 0.1)
    forebrain = reg_act.get("Telencephalon", 0.1)
    hindbrain = reg_act.get("Rhombencephalon", 0.1)

    # Determine biological consciousness state from vertebrate anatomy
    if action.mauthner_escape:
        state = "MAUTHNER_C_START_ESCAPE"
        thought = "Predator shadow detected in optic tectum! Mauthner giant reticulospinal neuron detonated — full axial escape torque initiated."
    elif action.drumming_sound_active:
        state = "SONIC_DRUMMING_COMMUNICATION"
        thought = f"Striated sonic muscle accelerated drumming cartilage against swim bladder: {action.drumming_spl_db:.1f} dB SPL acoustic pulse emitted at {action.drumming_frequency_hz:.0f} Hz."
    elif tectum > 0.25:
        state = "OPTIC_TECTUM_SACCADE"
        thought = f"Superficial interneurons in optic tectum stratum opticum tracking visual contrast vector ({action.heading_yaw:+.2f} rad). Retinotopic visual attention lock acquired."
    elif cerebellum > 0.2:
        state = "CEREBELLAR_RHEOTAXIS_STABLE"
        thought = f"Purkinje and granule layer cerebellar microcircuits computing lateral flow balance. Axial pitch trimmed to {action.fin_pitch:+.2f}."
    else:
        state = "PELAGIC_EXPLORATION"
        thought = f"Forebrain pallium maintaining exploratory rheotaxis. Mean 650,000-neuron firing rate calibrated at {action.population_firing_rate:.1f} Hz."

    entry = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "organism": "Danionella cerebrum (Adult Vertebrate)",
        "neurons": 650_000,
        "regions": 203,
        "state": state,
        "population_firing_rate_hz": action.population_firing_rate,
        "tail_thrust": action.tail_thrust,
        "heading_yaw": action.heading_yaw,
        "fin_pitch": action.fin_pitch,
        "drumming_spl_db": action.drumming_spl_db,
        "drumming_frequency_hz": action.drumming_frequency_hz,
        "thought": thought,
        "cranial_calcium_levels": reg_act
    }

    # Save to logs
    logs_dir = Path("logs")
    logs_dir.mkdir(parents=True, exist_ok=True)
    with open(logs_dir / "danio_journal.jsonl", "a", encoding="utf-8") as f:
        f.write(json.dumps(entry) + "\n")

    return entry

def main():
    if sys.stdout.encoding.lower() != "utf-8":
        try:
            sys.stdout.reconfigure(encoding="utf-8")
        except Exception:
            pass

    print("=" * 70)
    print(" DANIO VERTEBRATE CONSCIOUSNESS STREAM (650,000 NEURONS / 203 REGIONS)")
    print("=" * 70)

    brain_file = "danio_brain_650k.npz"
    if not os.path.exists(brain_file):
        print(f"[*] Building {brain_file}...")
        from danio.brain.build_memory import generate_danio_brain
        generate_danio_brain(brain_file)

    brain = DanioBrain.load(brain_file)
    print(f"[+] Loaded Adult Danionella cerebrum Connectome ({brain.num_neurons:,} neurons).\n")

    count = 3
    if len(sys.argv) > 1 and sys.argv[1].isdigit():
        count = int(sys.argv[1])

    for i in range(1, count + 1):
        entry = generate_danio_thought(brain)
        print(f"[{entry['timestamp']}] State: {entry['state']}")
        print(f"   Rate: {entry['population_firing_rate_hz']:.1f} Hz | Thrust: {entry['tail_thrust']:.2f} | Drum: {entry['drumming_spl_db']:.1f} dB")
        print(f"   \"{entry['thought']}\"\n")
        time.sleep(0.3)

if __name__ == "__main__":
    main()
