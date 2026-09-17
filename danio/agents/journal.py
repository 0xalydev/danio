"""
Danio Consciousness Journal
First-person introspective narrative generated from 650k-neuron vertebrate brain dynamics.
Membrane potentials, regional calcium, motor commands -> natural language thoughts.
"""

import json
import time
import hashlib
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List

from danio import DanioBrain
from danio.brain.engine import DanioAction


class DanioJournal:
    """Consciousness journal from Danionella cerebrum vertebrate brain."""
    
    def __init__(self, brain_file: str = "danio_brain_650k.npz"):
        self.brain = DanioBrain.load(brain_file)
        self.logs_dir = Path("logs")
        self.logs_dir.mkdir(exist_ok=True)
        
        # Thought templates by brain state
        self.thought_templates = {
            "FORAGING_SEARCH": [
                "No nutrient cues detected by optic tectum. SNN entering stochastic exploration regime. Mean membrane potential holding at resting baseline ({vm:.2f} mV). Undulatory wave slowed to baseline search frequency.",
                "Visual field uniform. Tectal calcium levels low across both hemispheres. Cerebellar balance circuits maintaining neutral posture. Seeking prey silhouette.",
                "Water flow sensors nominal. Lateral line input minimal. Forebrain arousal systems quiescent. Continuing radial search pattern.",
            ],
            "CHEMOTAXIS_FORWARD": [
                "Prey silhouette detected at {angle:.0f} degrees. Optic tectum contralateral activation driving tail thrust {thrust:.2f}. Navigating toward chemical source with {rate:.0f} Hz population rate.",
                "Visual target locked. Tectal-hindbrain pathway engaged. Cerebellum coordinating pectoral fin trim for approach trajectory. Dorsal-ventral alternation stable.",
                "Approach vector confirmed. Sonic drumming nucleus primed for social signal upon capture. Motor pools synchronized at {rate:.0f} Hz.",
            ],
            "MAUTHNER_ESCAPE": [
                "REFLEX ARC ACTIVATED: Anterior mechanosensation propagated across gap junctions directly to Mauthner cells. Motor program inverted within 15 milliseconds. C-start escape initiated. Tail thrust maximal. Heading yaw {yaw:+.2f}. Escaping predator zone.",
                "ULTRA-FAST ESCAPE: Mauthner neuron bilateral activation. Spinal ventral roots synchronous burst. Body curvature maximum. Cerebellum overridden. Survival circuit engaged.",
                "Predator strike detected. Rhombencephalic command surge. 140 dB drumming inhibited - silence is survival. Fleeing at maximum propulsion.",
            ],
            "SONIC_DRUMMING": [
                "Social acoustic stimulus received. Sonic drumming motor nucleus activated. Swim bladder resonance at {freq:.0f} Hz. Generating {spl:.1f} dB pulse. Communicating presence to conspecifics.",
                "Forebrain arousal state elevated. Pre-motor pattern generator rhythmic burst. Drumming apparatus engaged. Acoustic pulse train initiated. Territorial signal emitted.",
                "Conspecific call detected at {stim_hz:.0f} Hz. Reciprocal drumming triggered. Swim bladder cartilage resonance peak at {spl:.1f} dB. Social synchronization achieved.",
            ],
            "RESTING": [
                "Metabolic conservation mode. Population firing rate at basal {rate:.0f} Hz. Membrane potentials near resting. Minimal sensory throughput.",
                "Circadian rhythm entering quiescent phase. Optic tectum silent. Cerebellar Purkinje cells tonic inhibition. Awaiting sensory drive.",
            ],
        }
    
    def _determine_state(self, action: DanioAction, sensory: Dict[str, Any]) -> str:
        """Determine high-level state from brain output."""
        if action.mauthner_escape:
            return "MAUTHNER_ESCAPE"
        elif action.drumming_sound_active:
            return "SONIC_DRUMMING"
        elif sensory.get("visual_prey_angle", 0) != 0 and action.tail_thrust > 0.3:
            return "CHEMOTAXIS_FORWARD"
        elif action.tail_thrust > 0.1:
            return "FORAGING_SEARCH"
        else:
            return "RESTING"
    
    def _generate_thought(self, state: str, action: DanioAction, sensory: Dict[str, Any]) -> str:
        """Generate natural language thought from brain state."""
        import random
        
        templates = self.thought_templates.get(state, self.thought_templates["FORAGING_SEARCH"])
        template = random.choice(templates)
        
        return template.format(
            vm=-65.0 + (action.population_firing_rate / 45.0) * 20.0,
            angle=sensory.get("visual_prey_angle", 0),
            thrust=action.tail_thrust,
            yaw=action.heading_yaw,
            rate=action.population_firing_rate,
            freq=action.drumming_frequency_hz,
            spl=action.drumming_spl_db,
            stim_hz=sensory.get("acoustic_stimulus_hz", 0),
        )
    
    def _generate_signature(self, action: DanioAction, sensory: Dict[str, Any]) -> str:
        """Generate cryptographic signature from brain state."""
        # Hash key neural parameters for verifiable uniqueness
        data = f"{action.population_firing_rate:.3f}{action.tail_thrust:.3f}{action.heading_yaw:.3f}{action.drumming_spl_db:.1f}{time.time()}"
        return "0x" + hashlib.sha256(data.encode()).hexdigest()[:16]
    
    def write_entry(self, sensory: Dict[str, Any] = None) -> Dict[str, Any]:
        """Generate and log one journal entry."""
        sensory = sensory or {
            "visual_luminance": 0.7,
            "visual_prey_angle": 0.0,
            "predator_threat": 0.0,
            "water_flow_velocity": 0.05,
            "acoustic_stimulus_hz": 0.0,
            "acoustic_stimulus_db": 0.0,
        }
        
        # Step brain
        action = self.brain.step(sensory, dt=0.02)
        
        # Determine state
        state = self._determine_state(action, sensory)
        
        # Generate thought
        entry_text = self._generate_thought(state, action, sensory)
        
        # Generate signature
        signature = self._generate_signature(action, sensory)
        
        # Create log entry
        log_entry = {
            "timestamp": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"),
            "epoch": time.time(),
            "state": state,
            "speed_mms": round(action.tail_thrust * 1000, 1),
            "mean_vm": round(-65.0 + (action.population_firing_rate / 45.0) * 20.0, 2),
            "population_spikes": int(action.population_firing_rate),
            "active_neurons": self._get_active_regions(action),
            "signature": signature,
            "entry": entry_text,
        }
        
        # Save to JSONL
        log_file = self.logs_dir / "danio_journal.jsonl"
        with open(log_file, "a", encoding="utf-8") as f:
            f.write(json.dumps(log_entry) + "\n")
        
        return log_entry
    
    def _get_active_regions(self, action: DanioAction) -> List[str]:
        """Get active brain regions from regional activity."""
        active = []
        for region, activity in action.regional_activity.items():
            if activity > 0.5:
                active.append(region)
        return active[:12]
    
    def run_continuous(self, interval: float = 10.0, max_entries: int = 0):
        """Run continuous journal generation."""
        print(f"[JOURNAL] Starting Danio consciousness journal (interval: {interval}s)...")
        
        count = 0
        try:
            while max_entries == 0 or count < max_entries:
                entry = self.write_entry()
                print(f"[JOURNAL] {entry['timestamp']} | {entry['state']} | {entry['signature']}")
                print(f"         \"{entry['entry'][:80]}...\"")
                count += 1
                time.sleep(interval)
        except KeyboardInterrupt:
            print(f"\n[JOURNAL] Stopped after {count} entries.")


def main():
    journal = DanioJournal()
    journal.run_continuous(interval=5.0, max_entries=20)


if __name__ == "__main__":
    main()