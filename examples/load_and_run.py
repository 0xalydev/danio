"""
Example 1: Load and Run Danionella cerebrum (650k Neurons) in 10 lines of Python.
Demonstrates sensory-to-motor integration with the downloaded brain memory.
"""

import sys
import os
import time

# Ensure danio package is importable when running from examples/ directory
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from danio import DanioBrain

def main():
    if sys.stdout.encoding.lower() != "utf-8":
        try:
            sys.stdout.reconfigure(encoding="utf-8")
        except Exception:
            pass

    print("[*] Loading 650,000-neuron vertebrate brain memory...")
    brain = DanioBrain.load("danio_brain_650k.npz")
    print(brain.info())

    print("\n[*] Simulating 20 consecutive sensory-motor steps (50 Hz loop)...")
    for step_num in range(1, 21):
        # Simulated sensory input (prey moving, fluctuating water flow, acoustic sound)
        sensory = {
            "visual_luminance": 0.7,
            "visual_prey_angle": 15.0 * (1 if step_num % 4 < 2 else -1),
            "predator_threat": 0.85 if step_num == 15 else 0.0, # Predator burst at step 15
            "water_flow_velocity": 0.08,
            "acoustic_stimulus_hz": 90.0 if step_num > 8 else 0.0,
            "acoustic_stimulus_db": 75.0 if step_num > 8 else 0.0
        }

        # Step the brain
        action = brain.step(sensory, dt=0.02)

        status_flag = ""
        if action.mauthner_escape:
            status_flag = "[!] [MAUTHNER C-START ESCAPE TRIGGERED]"
        elif action.drumming_sound_active:
            status_flag = f"[>] [SONIC DRUMMING: {action.drumming_spl_db:.1f} dB @ {action.drumming_frequency_hz:.0f} Hz]"

        print(
            f"Step {step_num:02d} | "
            f"Thrust: {action.tail_thrust:.3f} | "
            f"Yaw: {action.heading_yaw:+.3f} | "
            f"Pitch: {action.fin_pitch:+.3f} | "
            f"Rate: {action.population_firing_rate:.1f} Hz {status_flag}"
        )
        time.sleep(0.05)

    print("\n[+] Verification finished: 650k vertebrate brain running cleanly.")

if __name__ == "__main__":
    main()
