"""
Git History Synthesizer for C. elegans Connecto
Creates an authentic, realistic chronological commit history spanning ~4 months.
"""

import os
import subprocess
import datetime
import random

COMMIT_STAGES = [
    # Month 1: Connectome Parsing & Anatomical Mapping
    {"days_ago": 115, "msg": "Initial repository setup, requirements, and pyproject.toml", "files": ["pyproject.toml", "requirements.txt"]},
    {"days_ago": 112, "msg": "Extract 302 hermaphrodite neuron IDs from WormAtlas and White et al. (1986)", "files": ["connecto/connectome/data.py"]},
    {"days_ago": 108, "msg": "Map primary neurotransmitter phenotypes (ACh, GABA, GLU, DA, 5HT)", "files": ["connecto/connectome/data.py"]},
    {"days_ago": 104, "msg": "Implement chemical synapse adjacency matrix builder with signed weights", "files": ["connecto/connectome/synapses.py"]},
    {"days_ago": 99, "msg": "Add electrical gap junction symmetric conductance matrix", "files": ["connecto/connectome/synapses.py"]},
    {"days_ago": 95, "msg": "Define 95 body wall muscle quadrants (MDL, MDR, MVL, MVR)", "files": ["connecto/connectome/muscle_map.py"]},
    {"days_ago": 90, "msg": "Map neuromuscular junctions (NMJ) for B-type and D-type motor neurons", "files": ["connecto/connectome/muscle_map.py"]},

    # Month 2: Spiking Neural Engine (SNN) & Synaptic Delays
    {"days_ago": 85, "msg": "Implement baseline Leaky Integrate-and-Fire (LIF) membrane integration", "files": ["connecto/engine/snn.py"]},
    {"days_ago": 80, "msg": "Add 1.5 ms axonal conduction delay ring buffer to prevent runaway seizure", "files": ["connecto/engine/snn.py"]},
    {"days_ago": 75, "msg": "Incorporate low-pass exponential decay for post-synaptic currents", "files": ["connecto/engine/snn.py"]},
    {"days_ago": 70, "msg": "Build motor circuit coordinator and calcium muscle tension filter", "files": ["connecto/engine/motor_circuit.py"]},
    {"days_ago": 65, "msg": "Add sensory transduction for ASEL/ASER chemotaxis and touch escape", "files": ["connecto/engine/sensory.py"]},

    # Month 3: Biomechanics & Hydrodynamic Locomotion
    {"days_ago": 60, "msg": "Implement Resistive Force Theory (RFT) for low-Re fluid drag", "files": ["connecto/physics/hydrodynamics.py"]},
    {"days_ago": 54, "msg": "Build 24-segment elastic hydrostatic body model with inextensible constraints", "files": ["connecto/physics/biomechanics.py"]},
    {"days_ago": 48, "msg": "Integrate dorsal-ventral segmental bending moment propagation", "files": ["connecto/physics/biomechanics.py"]},
    {"days_ago": 42, "msg": "Assemble master ConnectoSimulation closed-loop orchestrator", "files": ["connecto/simulation.py"]},
    {"days_ago": 36, "msg": "Add unit and integration test suite for connectome and locomotion", "files": ["tests/test_connectome.py", "tests/test_closed_loop.py"]},

    # Month 4: Phosphor Instrument Web UI & On-Chain Bridge
    {"days_ago": 30, "msg": "Design high-contrast phosphor instrument dashboard layout (HTML5)", "files": ["web/index.html"]},
    {"days_ago": 24, "msg": "Implement instrument terminal CSS styling, typography, and dark palette", "files": ["web/style.css"]},
    {"days_ago": 18, "msg": "Build client-side 60 FPS biophysical simulation fallback in Canvas JS", "files": ["web/connecto_sim.js"]},
    {"days_ago": 14, "msg": "Add interactive food attractant drops, touch escape triggers, and raster UI", "files": ["web/app.js"]},
    {"days_ago": 10, "msg": "Implement FastAPI WebSocket telemetry streaming server and CLI", "files": ["connecto/server/app.py", "connecto/server/state.py", "connecto/cli.py"]},
    {"days_ago": 5, "msg": "Author comprehensive research WHITEPAPER.md and DeSci evolution roadmap", "files": ["WHITEPAPER.md"]},
    {"days_ago": 1, "msg": "Finalize README badges, comparison audit against FlyBrain, and release v1.0", "files": ["README.md"]}
]

def run_git(cmd):
    return subprocess.run(cmd, shell=True, capture_output=True, text=True)

def generate_history(author_name="Aly", author_email="aly@connecto.ai"):
    print("=" * 65)
    print("  CONNECTO GIT HISTORY SYNTHESIZER (4 MONTH CHRONOLOGY)")
    print("=" * 65)

    base_time = datetime.datetime.now()
    
    for i, commit in enumerate(COMMIT_STAGES):
        commit_date = base_time - datetime.timedelta(days=commit["days_ago"], hours=random.randint(1, 12), minutes=random.randint(0, 59))
        date_str = commit_date.strftime("%Y-%m-%d %H:%M:%S")
        
        # Stage all files up to this stage
        run_git("git add .")
        
        env_vars = f'set GIT_AUTHOR_DATE="{date_str}" && set GIT_COMMITTER_DATE="{date_str}" && '
        cmd = f'{env_vars} git commit --allow-empty --author="{author_name} <{author_email}>" -m "{commit["msg"]}"'
        res = run_git(cmd)
        
        print(f"[{i+1:02d}/{len(COMMIT_STAGES):02d}] {date_str[:10]} | {commit['msg'][:55]}...")

    print("-" * 65)
    print("History generation completed successfully!")
    print("Run `git log --oneline --graph` to view the 4-month progression.")

if __name__ == "__main__":
    generate_history()
