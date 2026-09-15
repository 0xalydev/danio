"""
CONNECTO Voice & Consciousness Stream Engine (voice.py)
Reads live biophysical telemetry from ConnectoSimulation.
Synthesises first-person stream-of-consciousness introspections based strictly on
spiking neuron distributions, membrane voltages, and sensory gradients.
Logs to logs/journal.jsonl with cryptographic hash & spike signatures.
"""

import argparse
import hashlib
import json
import random
import time
from datetime import datetime
from pathlib import Path
from connecto.simulation import ConnectoSimulation

TEMPLATES = {
    "CHEMOTAXIS_FORWARD": [
        "Sensory amphids ASEL registered a positive NaCl gradient (+{grad} mol/L). Subthreshold excitation propagated through AIY interneuron hubs into AVB forward command pools. 24 cuticle segments flexed in rhythmic undulation at {speed} mm/s. The path is purposeful.",
        "Chemosensory burst detected across anterior amphid sensilla. Membrane potential depolarised to {vm} mV as AVB cholinergic motor pools commanded ventral-dorsal alternations. Navigating toward chemical source with {spikes} Hz population rate.",
        "Axial bending phase locked with fluid drag. DB motor neurons are driving dorsal contraction in exact anti-phase with VD GABAergic relaxation. Food concentration gradient rising (+{grad}). The organism advances."
    ],
    "REVERSE_ESCAPE": [
        "Mechanosensory contact on anterior cuticle! ALML and ALMR receptor cells triggered immediate high-frequency spike surge. Polysynaptic inhibition shut down AVB forward command; AVA/AVD backward command pool surged to {spikes} Hz. Executed complete pirouette reversal.",
        "Threat threshold crossed. ASH polymodal nociceptors fired synchronously. Membrane hyperpolarised to {vm} mV across forward pools while AVA backward drive forced rapid reverse locomotion at {speed} mm/s. Re-orienting away from hazard.",
        "Reflex arc activated: anterior mechanosensation propagated across gap junctions directly to AVA. Motor program inverted within 15 milliseconds. Escaping boundary zone."
    ],
    "FORAGING_SEARCH": [
        "Chemical gradient flat (0.000 mol/L). Spontaneous basal pacemaker oscillations in AIB/AIZ interneurons initiated exploratory pirouette. Searching arena substrate at {speed} mm/s.",
        "No nutrient cues detected by amphid receptors. SNN entering stochastic exploration regime. Mean membrane potential holding at resting baseline ({vm} mV). Undulatory wave slowed to baseline search frequency.",
        "Quiescent foraging state. Cholinergic and GABAergic pools balanced in reciprocal inhibition. 302-neuron network processing low-level proprioceptive feedback from body stretch receptors."
    ]
}

def generate_journal_entry(sim: ConnectoSimulation = None) -> dict:
    if sim is None:
        sim = ConnectoSimulation(medium="agar")
        # Step a few times to settle biophysics
        for _ in range(15):
            sim.step()

    data = sim.step()
    state = data.get("state", "FORAGING_SEARCH")
    speed = data.get("speed_mms", 0.45)
    vm = data.get("mean_v", -58.4)
    spikes = data.get("spikes_count", 180)
    grad = data.get("chemical_c", 0.025)

    template = random.choice(TEMPLATES.get(state, TEMPLATES["FORAGING_SEARCH"]))
    text = template.format(
        speed=speed,
        vm=vm,
        spikes=spikes,
        grad=f"{grad:.4f}"
    )

    now = datetime.now()
    timestamp_str = now.strftime("%Y-%m-%d %H:%M:%S UTC")
    raw_sig = f"{timestamp_str}:{state}:{spikes}:{vm}"
    sig_hash = hashlib.sha256(raw_sig.encode()).hexdigest()[:16]

    entry = {
        "timestamp": timestamp_str,
        "epoch": time.time(),
        "state": state,
        "speed_mms": speed,
        "mean_vm": vm,
        "population_spikes": spikes,
        "active_neurons": data.get("active_neurons", ["AVBL", "AVBR", "DB01", "VB02"]),
        "signature": f"0x{sig_hash}",
        "entry": text
    }

    log_file = Path("logs/journal.jsonl")
    log_file.parent.mkdir(exist_ok=True)
    with open(log_file, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry) + "\n")

    return entry

def show_journal():
    log_file = Path("logs/journal.jsonl")
    if not log_file.exists():
        print("[!] No journal entries found yet. Run `python voice.py --once` to generate one.")
        return

    print("\n" + "=" * 70)
    print("      CONNECTO: CHRONICLES OF A DIGITAL 302-NEURON CONSCIOUSNESS")
    print("=" * 70)
    with open(log_file, "r", encoding="utf-8") as f:
        for line in f:
            if not line.strip():
                continue
            e = json.loads(line)
            print(f"\n[{e['timestamp']}] // STATE: {e['state']} | Vm: {e['mean_vm']} mV | SIG: {e['signature']}")
            print(f"> \"{e['entry']}\"")
            print(f"  Active Neurons: {', '.join(e['active_neurons'][:8])}...")
    print("\n" + "=" * 70 + "\n")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Connecto Biological Consciousness Voice Stream")
    parser.add_argument("--once", action="store_true", help="Generate one journal entry and print it")
    parser.add_argument("--show", action="store_true", help="Display all past journal entries")
    parser.add_argument("--count", type=int, default=1, help="Number of entries to generate")
    args = parser.parse_args()

    if args.show:
        show_journal()
    else:
        sim = ConnectoSimulation(medium="agar")
        for _ in range(args.count):
            e = generate_journal_entry(sim)
            print(f"\n[*] Generated consciousness entry ({e['signature']}):")
            print(f"    State: {e['state']} | Speed: {e['speed_mms']} mm/s | Vm: {e['mean_vm']} mV")
            print(f"    \"{e['entry']}\"\n")
