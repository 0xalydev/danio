"""
Danio FizzBuzz Solver
The 650k-neuron vertebrate brain solves FizzBuzz via modular arithmetic neural circuits.
Modulo-3 -> cholinergic (AVB-like) = FIZZ | Modulo-5 -> GABAergic (AVA-like) = BUZZ
Spiking neural readout from motor pools determines output.
"""

import json
import time
import hashlib
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any

from danio import DanioBrain
from danio.brain.engine import DanioAction


class DanioFizzBuzz:
    """FizzBuzz solver driven by Danionella cerebrum brain."""
    
    def __init__(self, brain_file: str = "danio_brain_650k.npz"):
        self.brain = DanioBrain.load(brain_file)
        self.logs_dir = Path("logs")
        self.logs_dir.mkdir(exist_ok=True)
        
        # Neural readout mapping
        # Telencephalon (forebrain) -> abstract reasoning
        # Cerebellum -> pattern recognition
        # Motor pools -> output selection
        
    def _number_to_sensory(self, n: int) -> Dict[str, Any]:
        """Encode integer n into sensory input for brain."""
        # Use modular arithmetic as sensory patterns
        mod3 = n % 3
        mod5 = n % 5
        mod15 = n % 15
        
        # Visual: encode mod3 in prey angle, mod5 in luminance
        # Acoustic: encode mod15 in frequency
        return {
            "visual_luminance": 0.5 + (mod5 / 5.0) * 0.3,  # 0.5-0.8 for mod5
            "visual_prey_angle": (mod3 - 1) * 30.0,  # -30, 0, +30 for mod3 = 0,1,2
            "predator_threat": 0.1 if mod15 == 0 else 0.0,  # FizzBuzz = slight threat
            "water_flow_velocity": 0.05 + (mod3 / 3.0) * 0.1,
            "acoustic_stimulus_hz": 60.0 + (mod15 / 15.0) * 60.0,  # 60-120 Hz
            "acoustic_stimulus_db": 50.0 + (mod5 / 5.0) * 30.0,
        }
    
    def _readout_fizzbuzz(self, action: DanioAction, sensory: Dict[str, Any]) -> str:
        """Decode brain motor output to FizzBuzz prediction."""
        # Readout strategy:
        # - Tail thrust + heading_yaw combination encodes decision
        # - Drumming = FizzBuzz (both conditions)
        # - High tail_thrust + straight = Fizz (mod3)
        # - High yaw turn = Buzz (mod5)
        # - Low activity = number
        
        thrust = action.tail_thrust
        yaw = abs(action.heading_yaw)
        drumming = action.drumming_sound_active
        pop_rate = action.population_firing_rate
        
        # Use regional activity for more nuanced readout
        tel_activity = action.regional_activity.get("Telencephalon", 0)
        cereb_activity = action.regional_activity.get("Cerebellum", 0)
        motor_activity = action.regional_activity.get("Motor & Sonic Drumming", 0)
        
        # Decision logic based on vertebrate brain organization
        # Telencephalon = abstract reasoning (modulo computation)
        # Cerebellum = pattern/timing (modulo 3 rhythm)
        # Motor = output execution
        
        if drumming and motor_activity > 0.7:
            return "FizzBuzz"
        elif cereb_activity > 0.65 and tel_activity > 0.5:
            # Cerebellar pattern detection (mod3) + forebrain reasoning
            return "Fizz"
        elif motor_activity > 0.6 and yaw > 0.4:
            # Motor lateralization (mod5) -> turning = Buzz
            return "Buzz"
        elif thrust > 0.4 and abs(action.fin_pitch) < 0.2:
            # Forward thrust without turn = number
            return str(int(sensory["visual_prey_angle"] / 30 + 1) * 3 - 2)  # approximate
        else:
            # Default to number
            return "number"
    
    def solve(self, n: int) -> Dict[str, Any]:
        """Solve single FizzBuzz for n."""
        expected = self._expected_fizzbuzz(n)
        sensory = self._number_to_sensory(n)
        action = self.brain.step(sensory, dt=0.02)
        predicted = self._readout_fizzbuzz(action, sensory)
        
        match = (predicted == expected)
        
        result = {
            "n": n,
            "expected": expected,
            "predicted": predicted,
            "match": match,
            "fizz_spikes": int(action.regional_activity.get("Cerebellum", 0) * 100),
            "buzz_spikes": int(action.regional_activity.get("Motor & Sonic Drumming", 0) * 100),
            "total_spikes": int(action.population_firing_rate),
            "mean_vm": -65.0 + (action.population_firing_rate / 45.0) * 20.0,
            "sensory": sensory,
            "motor": action.to_dict(),
            "regional_activity": action.regional_activity,
            "timestamp": time.time(),
        }
        
        # Log
        log_file = self.logs_dir / "danio_fizzbuzz.jsonl"
        with open(log_file, "a", encoding="utf-8") as f:
            f.write(json.dumps(result) + "\n")
        
        return result
    
    def _expected_fizzbuzz(self, n: int) -> str:
        if n % 15 == 0:
            return "FizzBuzz"
        elif n % 3 == 0:
            return "Fizz"
        elif n % 5 == 0:
            return "Buzz"
        else:
            return str(n)
    
    def run_benchmark(self, max_n: int = 100) -> Dict[str, Any]:
        """Run FizzBuzz benchmark from 1 to max_n."""
        print(f"[FIZZBUZZ] Running Danio FizzBuzz benchmark 1..{max_n}")
        
        matched = 0
        total_spikes = 0
        results = []
        
        for n in range(1, max_n + 1):
            result = self.solve(n)
            results.append(result)
            if result["match"]:
                matched += 1
            total_spikes += result["total_spikes"]
            
            status = "✓" if result["match"] else "✗"
            print(f"  n={n:3d} | Expected: {result['expected']:8s} | Predicted: {result['predicted']:8s} | {status} | Spikes: {result['total_spikes']}")
        
        accuracy = (matched / max_n) * 100
        print(f"\n[FIZZBUZZ] Accuracy: {accuracy:.1f}% ({matched}/{max_n})")
        print(f"[FIZZBUZZ] Total spikes: {total_spikes:,}")
        
        summary = {
            "accuracy_pct": round(accuracy, 1),
            "matched": matched,
            "total": max_n,
            "total_spikes": total_spikes,
            "timestamp": datetime.utcnow().isoformat() + "Z",
        }
        
        # Save summary
        with open(self.logs_dir / "danio_fizzbuzz_summary.json", "w", encoding="utf-8") as f:
            json.dump(summary, f, indent=2)
        
        return summary


def main():
    solver = DanioFizzBuzz()
    solver.run_benchmark(100)


if __name__ == "__main__":
    main()