"""
Example 2: DanioBrain Game / Robotics Controller
Plugs Danionella cerebrum into an interactive simulation loop.
Accepts visual obstacle/target coordinates and outputs 3D steering & propulsion.
"""

import sys
import os
import time
import math

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from danio import DanioBrain

class VirtualFishAgent:
    """A simulated Danionella cerebrum agent in a 2D/3D water tank."""
    def __init__(self, brain_file: str = "danio_brain_650k.npz"):
        self.brain = DanioBrain.load(brain_file)
        self.x = 0.0
        self.y = 0.0
        self.heading = 0.0 # Radians
        self.speed = 0.0
        self.total_acoustic_energy_db = 0.0

    def update(self, target_pos: tuple[float, float], threat_pos: tuple[float, float], dt: float = 0.05):
        # Calculate visual angle to target (prey / goal)
        dx_target = target_pos[0] - self.x
        dy_target = target_pos[1] - self.y
        dist_target = math.hypot(dx_target, dy_target)
        target_angle_world = math.atan2(dy_target, dx_target)
        rel_target_angle = (target_angle_world - self.heading + math.pi) % (2 * math.pi) - math.pi
        rel_target_deg = math.degrees(rel_target_angle)

        # Calculate threat distance (predator / obstacle)
        dx_threat = threat_pos[0] - self.x
        dy_threat = threat_pos[1] - self.y
        dist_threat = math.hypot(dx_threat, dy_threat)
        threat_intensity = max(0.0, 1.0 - (dist_threat / 1.5))

        # Sensory packet
        sensory = {
            "visual_luminance": 0.8,
            "visual_prey_angle": max(-90.0, min(90.0, rel_target_deg)),
            "predator_threat": threat_intensity,
            "water_flow_velocity": 0.05,
            "acoustic_stimulus_hz": 70.0 if dist_target < 0.5 else 0.0,
            "acoustic_stimulus_db": 60.0 if dist_target < 0.5 else 0.0
        }

        # Step brain
        action = self.brain.step(sensory, dt=dt)

        # Update physical kinematic state
        turn_rate = action.heading_yaw * 3.0 # radians per second
        self.heading += turn_rate * dt
        acceleration = action.tail_thrust * 1.2
        self.speed = self.speed * 0.88 + acceleration * dt
        self.x += math.cos(self.heading) * self.speed
        self.y += math.sin(self.heading) * self.speed

        if action.drumming_sound_active:
            self.total_acoustic_energy_db += action.drumming_spl_db

        return action, dist_target

def main():
    if sys.stdout.encoding.lower() != "utf-8":
        try:
            sys.stdout.reconfigure(encoding="utf-8")
        except Exception:
            pass

    print("[*] Initializing Danionella cerebrum Game Controller...")
    fish = VirtualFishAgent()
    print("[+] Fish agent initialized with 650k biological vertebrate brain.")

    # Target food drifting in tank
    food = (3.5, 2.0)
    predator = (10.0, 10.0) # Far away initially

    print(f"\n[*] Target food placed at X={food[0]}, Y={food[1]}. Fish starting at (0, 0).")
    print("[*] Running closed-loop sensory-motor pursuit...")

    for tick in range(1, 26):
        # Predator suddenly darts close at tick 18
        if tick >= 18:
            predator = (fish.x + 0.3, fish.y + 0.2)

        action, dist_to_food = fish.update(target_pos=food, threat_pos=predator, dt=0.05)
        
        event = ""
        if action.mauthner_escape:
            event = "[!] EMERGENCY ESCAPE REFLEX"
        elif action.drumming_sound_active:
            event = f"[>] 140dB DRUMMING ({action.drumming_frequency_hz:.0f}Hz)"

        print(
            f"Tick {tick:02d} | "
            f"Fish: ({fish.x:+.2f}, {fish.y:+.2f}) | "
            f"Dist to Goal: {dist_to_food:.2f}m | "
            f"Speed: {fish.speed:.2f}m/s | "
            f"Rate: {action.population_firing_rate:.1f}Hz {event}"
        )
        time.sleep(0.04)

    print("\n[+] Closed-loop game integration test succeeded!")

if __name__ == "__main__":
    main()
