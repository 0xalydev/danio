"""
Synaptic Connectivity Matrices (Chemical Synapses & Gap Junctions)
Derived from Varshney et al. (2011) & White et al. (1986)
"""

import numpy as np
from typing import Tuple, Dict
from .data import NEURONS, NEUROTRANSMITTERS, FORWARD_COMMAND, BACKWARD_COMMAND

def build_synapse_matrices() -> Tuple[np.ndarray, np.ndarray, Dict[str, int]]:
    """
    Builds the 302x302 chemical synapse weight matrix and electrical gap junction matrix.
    
    Returns:
        chem_weights: (302, 302) matrix where entry [i, j] is connection from neuron i to j.
                      Positive = Excitatory (ACh, GLU), Negative = Inhibitory (GABA).
        gap_weights:  (302, 302) symmetric conductance matrix for electrical gap junctions.
        idx_map:      Dictionary mapping neuron string ID to integer index [0..301].
    """
    N = len(NEURONS)
    idx = {name: i for i, name in enumerate(NEURONS)}
    chem = np.zeros((N, N), dtype=np.float32)
    gap = np.zeros((N, N), dtype=np.float32)

    def add_chem(pre: str, post: str, weight: float = 1.0):
        if pre in idx and post in idx:
            sign = -1.0 if NEUROTRANSMITTERS.get(pre) == "GABA" else 1.0
            chem[idx[pre], idx[post]] += sign * abs(weight)

    def add_gap(n1: str, n2: str, conductance: float = 1.0):
        if n1 in idx and n2 in idx:
            i, j = idx[n1], idx[n2]
            gap[i, j] += conductance
            gap[j, i] += conductance

    # -------------------------------------------------------------
    # 1. Chemotaxis & Amphid Sensory Cascade (Klinotaxis / Pirouettes)
    # -------------------------------------------------------------
    # ASEL/ASER -> AIY, AIZ, AIA, AIB
    for pre in ["ASEL", "ASER", "AWAL", "AWAR", "AWCL", "AWCR"]:
        for inter in ["AIAL", "AIAR", "AIYL", "AIYR"]:
            add_chem(pre, inter, weight=2.5)
        for turn_inter in ["AIBL", "AIBR", "AIZL", "AIZR"]:
            add_chem(pre, turn_inter, weight=1.8)

    # Interneurons AIA/AIY integrate and synapse onto Command interneurons
    for pre in ["AIYL", "AIYR"]:
        add_chem(pre, "AVBL", weight=2.8)
        add_chem(pre, "AVBR", weight=2.8)
        add_chem(pre, "PVCL", weight=2.2)
        add_chem(pre, "PVCR", weight=2.2)

    for pre in ["AIBL", "AIBR", "AIZL", "AIZR"]:
        add_chem(pre, "AVAL", weight=2.6)
        add_chem(pre, "AVAR", weight=2.6)
        add_chem(pre, "AVDL", weight=2.0)
        add_chem(pre, "AVDR", weight=2.0)

    # -------------------------------------------------------------
    # 2. Mechanosensory Reflex (Touch Response)
    # -------------------------------------------------------------
    # Anterior touch (ALM, AVM) -> Promotes backward escape (AVA, AVD)
    for pre in ["ALML", "ALMR", "AVM"]:
        add_chem(pre, "AVDL", weight=3.5)
        add_chem(pre, "AVDR", weight=3.5)
        add_chem(pre, "AVAL", weight=3.0)
        add_chem(pre, "AVAR", weight=3.0)

    # Posterior touch (PLM, PVM) -> Promotes forward acceleration (AVB, PVC)
    for pre in ["PLML", "PLMR", "PVM"]:
        add_chem(pre, "PVCL", weight=3.5)
        add_chem(pre, "PVCR", weight=3.5)
        add_chem(pre, "AVBL", weight=3.0)
        add_chem(pre, "AVBR", weight=3.0)

    # -------------------------------------------------------------
    # 3. Command Interneuron -> Motor Neuron Circuit
    # -------------------------------------------------------------
    # Forward Command (AVB, PVC) driving B-type motor neurons (DB, VB)
    db_neurons = [f"DB0{i}" for i in range(1, 8)]
    vb_neurons = [f"VB0{i}" if i < 10 else f"VB{i}" for i in range(1, 12)]

    for cmd in FORWARD_COMMAND:
        for db in db_neurons:
            add_chem(cmd, db, weight=1.8)
            add_gap(cmd, db, conductance=1.2)
        for vb in vb_neurons:
            add_chem(cmd, vb, weight=1.8)
            add_gap(cmd, vb, conductance=1.2)

    # Backward Command (AVA, AVD, AVE) driving A-type motor neurons (DA, VA)
    da_neurons = [f"DA0{i}" for i in range(1, 10)]
    va_neurons = [f"VA0{i}" if i < 10 else f"VA{i}" for i in range(1, 13)]

    for cmd in BACKWARD_COMMAND:
        for da in da_neurons:
            add_chem(cmd, da, weight=2.0)
            add_gap(cmd, da, conductance=1.5)
        for va in va_neurons:
            add_chem(cmd, va, weight=2.0)
            add_gap(cmd, va, conductance=1.5)

    # Cross-command mutual inhibition between forward and backward systems
    for fwd in FORWARD_COMMAND:
        for bwd in ["AVAL", "AVAR"]:
            add_chem(fwd, bwd, weight=1.0)
    for bwd in BACKWARD_COMMAND:
        for fwd in ["AVBL", "AVBR"]:
            add_chem(bwd, fwd, weight=1.0)

    # -------------------------------------------------------------
    # 4. Cross-Inhibitory Undulatory Circuit (D-type GABAergic)
    # -------------------------------------------------------------
    dd_neurons = [f"DD0{i}" for i in range(1, 7)]
    vd_neurons = [f"VD0{i}" if i < 10 else f"VD{i}" for i in range(1, 14)]

    # DB excites VD, which cross-inhibits ventral side; VB excites DD, which cross-inhibits dorsal
    for i, db in enumerate(db_neurons):
        vd_target = vd_neurons[min(i * 2, len(vd_neurons) - 1)]
        add_chem(db, vd_target, weight=2.2)
        # VD (GABA) directly inhibits ventral VB counterpart
        vb_target = vb_neurons[min(i * 2, len(vb_neurons) - 1)]
        add_chem(vd_target, vb_target, weight=2.0)

    for i, vb in enumerate(vb_neurons):
        dd_target = dd_neurons[min(i // 2, len(dd_neurons) - 1)]
        add_chem(vb, dd_target, weight=2.2)
        # DD (GABA) directly inhibits dorsal DB counterpart
        db_target = db_neurons[min(i // 2, len(db_neurons) - 1)]
        add_chem(dd_target, db_target, weight=2.0)

    # Quiescence interneuron RIS (GABAergic) inhibits locomotion command neurons
    for cmd in ["AVAL", "AVAR", "AVBL", "AVBR"]:
        add_chem("RIS", cmd, weight=2.5)

    # Anterior-to-posterior progressive phase delay coupling along ventral cord
    for i in range(len(db_neurons) - 1):
        add_chem(db_neurons[i], db_neurons[i + 1], weight=1.5)
        add_gap(db_neurons[i], db_neurons[i + 1], conductance=0.8)

    for i in range(len(vb_neurons) - 1):
        add_chem(vb_neurons[i], vb_neurons[i + 1], weight=1.5)
        add_gap(vb_neurons[i], vb_neurons[i + 1], conductance=0.8)

    # Sublateral ring motor neurons (Head foraging & steering)
    for side in ["L", "R"]:
        add_chem(f"SMDD{side}", f"RMDD{side}", weight=2.0)
        add_chem(f"SMDV{side}", f"RMDV{side}", weight=2.0)
        add_gap(f"SMDD{side}", f"SMDV{side}", conductance=0.5)

    return chem, gap, idx
