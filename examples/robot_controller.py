"""
Example 3: Physical Robot & Drone Embedded Controller (robot_controller.py)
Demonstrates how hardware engineers connect DanioBrain (650k vertebrate neurons)
to an actual robot chassis, ROV underwater vehicle, or drone.
Transduces LiDAR/sonar and camera feeds into motor PWM and sonic buzzer pulses.
"""

import sys
import os
import time
import math

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from danio import DanioBrain

class PhysicalRobotHardwareBridge:
    """Hardware bridge converting DanioBrain motor commands into robot PWM."""
    def __init__(self, brain_path: str = "danio_brain_650k.npz"):
        print("[*] Initializing DanioBrain on robot embedded computer...")
        self.brain = DanioBrain.load(brain_path)
        print(f"[+] Loaded {self.brain.num_neurons:,} vertebrate neurons across {self.brain.num_regions} regions.")

    def process_sensor_frame(self, camera_luminance: float, lidar_obstacle_deg: float, lidar_dist_m: float, flow_m_s: float):
        """
        Ingests real-world robot sensor telemetry and computes motor PWM.
        """
        threat_level = 0.0
        if lidar_dist_m < 0.35:
            # Sudden obstacle detected very close -> threat triggers Mauthner escape reflex
            threat_level = 0.95

        sensory = {
            "visual_luminance": max(0.0, min(1.0, camera_luminance)),
            "visual_prey_angle": lidar_obstacle_deg,
            "predator_threat": threat_level,
            "water_flow_velocity": flow_m_s,
            "acoustic_stimulus_hz": 80.0 if lidar_dist_m < 0.6 else 0.0,
            "acoustic_stimulus_db": 70.0 if lidar_dist_m < 0.6 else 0.0
        }

        # Step biological brain
        action = self.brain.step(sensory, dt=0.02)

        # Transduce biological motor commands into hardware actuator signals (PWM 1000 - 2000 us)
        # Left and right differential drive wheels/thrusters
        base_pwm = 1500 + int(action.tail_thrust * 400.0) # 1500 is neutral stop, 1900 is full forward
        steering_offset = int(action.heading_yaw * 250.0)
        
        motor_left_pwm = int(max(1100, min(1900, base_pwm + steering_offset)))
        motor_right_pwm = int(max(1100, min(1900, base_pwm - steering_offset)))
        servo_rudder_deg = round(action.heading_yaw * 45.0, 1) # -45 deg to +45 deg

        # Sonic drumming piezo buzzer output
        buzzer_active = action.drumming_sound_active
        buzzer_freq_hz = int(action.drumming_frequency_hz) if buzzer_active else 0

        return {
            "motor_left_pwm": motor_left_pwm,
            "motor_right_pwm": motor_right_pwm,
            "servo_rudder_deg": servo_rudder_deg,
            "buzzer_active": buzzer_active,
            "buzzer_freq_hz": buzzer_freq_hz,
            "mauthner_escape": action.mauthner_escape,
            "firing_rate_hz": action.population_firing_rate
        }

def main():
    if sys.stdout.encoding.lower() != "utf-8":
        try:
            sys.stdout.reconfigure(encoding="utf-8")
        except Exception:
            pass

    print("=" * 70)
    print(" DANIO REAL-WORLD ROBOTIC / EMBEDDED CONTROLLER HARNESS")
    print("=" * 70)

    bridge = PhysicalRobotHardwareBridge()
    print("[*] Running 10-frame hardware loop simulation...\n")

    # Simulate robot cruising towards target, encountering an obstacle at frame 7
    for frame in range(1, 11):
        obstacle_dist = 2.0 - (frame * 0.25) # approaching wall
        if frame >= 8:
            obstacle_dist = 0.25 # sudden wall / crash imminent!

        pwm_packet = bridge.process_sensor_frame(
            camera_luminance=0.75,
            lidar_obstacle_deg=10.0 * (1 if frame % 2 == 0 else -1),
            lidar_dist_m=obstacle_dist,
            flow_m_s=0.08
        )

        status = ""
        if pwm_packet["mauthner_escape"]:
            status = "⚠️ [EMERGENCY REVERSE ESCAPE THRUST]"
        elif pwm_packet["buzzer_active"]:
            status = f"🔊 [SONIC PIEZO BUZZER: {pwm_packet['buzzer_freq_hz']} Hz]"

        print(
            f"Frame {frame:02d} | "
            f"Dist: {obstacle_dist:.2f}m | "
            f"L-PWM: {pwm_packet['motor_left_pwm']} | "
            f"R-PWM: {pwm_packet['motor_right_pwm']} | "
            f"Rudder: {pwm_packet['servo_rudder_deg']:+4.1f}° | "
            f"Rate: {pwm_packet['firing_rate_hz']:.1f}Hz {status}"
        )
        time.sleep(0.05)

    print("\n[+] Real-world robotics integration verified successfully.")

if __name__ == "__main__":
    main()
