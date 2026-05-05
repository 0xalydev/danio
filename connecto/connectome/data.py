"""
C. elegans 302-Neuron Anatomical & Neurochemical Database
Source: WormAtlas & White et al. (1986) "The Mind of a Worm"
"""

from typing import Dict, List

# Full canonical roster of all 302 adult hermaphrodite neurons
NEURONS: List[str] = [
    # Sensory Amphid, Head & Gas sensors
    "ADAL", "ADAR", "ADEL", "ADER", "ADFL", "ADFR", "ADLL", "ADLR", "AFDL", "AFDR",
    "AIAL", "AIAR", "AIBL", "AIBR", "AIML", "AIMR", "AINL", "AINR", "AIYL", "AIYR",
    "AIZL", "AIZR", "ALA", "ALML", "ALMR", "ALNL", "ALNR", "AMBL", "AMBR", "ANCL", "ANCR",
    "AQR", "ASEL", "ASER", "ASGL", "ASGR", "ASHL", "ASHR", "ASIL", "ASIR", "ASJL", "ASJR",
    "ASKL", "ASKR", "AWAL", "AWAR", "AWBL", "AWBR", "AWCL", "AWCR", "BAGL", "BAGR",
    "BDUL", "BDUR", "CANL", "CANR", "CEPDL", "CEPDR", "CEPVL", "CEPVR",
    # Command Interneurons
    "AVAL", "AVAR", "AVBL", "AVBR", "AVDL", "AVDR", "AVEL", "AVER", "AVFL", "AVFR",
    "AVG", "AVHL", "AVHR", "AVJL", "AVJR", "AVKL", "AVKR", "AVL", "AVM",
    # Ventral Nerve Cord Forward B-type (Cholinergic Excitatory Motor)
    "DB01", "DB02", "DB03", "DB04", "DB05", "DB06", "DB07",
    "VB01", "VB02", "VB03", "VB04", "VB05", "VB06", "VB07", "VB08", "VB09", "VB10", "VB11",
    # Ventral Nerve Cord Backward A-type (Cholinergic Excitatory Motor)
    "DA01", "DA02", "DA03", "DA04", "DA05", "DA06", "DA07", "DA08", "DA09",
    "VA01", "VA02", "VA03", "VA04", "VA05", "VA06", "VA07", "VA08", "VA09", "VA10", "VA11", "VA12",
    # Cross-Inhibitory D-type (GABAergic Inhibitory Motor)
    "DD01", "DD02", "DD03", "DD04", "DD05", "DD06",
    "VD01", "VD02", "VD03", "VD04", "VD05", "VD06", "VD07", "VD08", "VD09", "VD10", "VD11", "VD12", "VD13",
    # Sublateral & Ring Motor / Interneurons
    "DVA", "DVB", "DVC", "FLPL", "FLPR", "HSNL", "HSNR",
    "I1L", "I1R", "I2L", "I2R", "I3", "I4", "I5", "I6",
    "IL1DL", "IL1DR", "IL1L", "IL1R", "IL1VL", "IL1VR",
    "IL2DL", "IL2DR", "IL2L", "IL2R", "IL2VL", "IL2VR",
    "LUAL", "LUAR", "M1", "M2L", "M2R", "M3L", "M3R", "M4", "M5",
    "MC1L", "MC1R", "MC2L", "MC2R", "MI", "NSML", "NSMR",
    "OLLL", "OLLR", "OLQDL", "OLQDR", "OLQVL", "OLQVR",
    "PDA", "PDB", "PDEL", "PDER", "PHAL", "PHAR", "PHBL", "PHBR", "PHCL", "PHCR",
    "PLML", "PLMR", "PLNL", "PLNR", "PQR", "PVCL", "PVCR", "PVDL", "PVDR", "PVM",
    "PVNL", "PVNR", "PVPL", "PVPR", "PVQL", "PVQR", "PVR", "PVT",
    "RIAL", "RIAR", "RIBL", "RIBR", "RID", "RIFL", "RIFR", "RIGL", "RIGR", "RIH", "RIML", "RIMR",
    "RIPL", "RIPR", "RIR", "RIS", "RIVL", "RIVR",
    "RMDDL", "RMDDR", "RMDL", "RMDR", "RMDVL", "RMDVR",
    "RMED", "RMEL", "RMER", "RMEV", "RMFL", "RMFR", "RMGL", "RMGR", "RMHL", "RMHR",
    "SAADL", "SAADR", "SAAVL", "SAAVR", "SABD", "SABVL", "SABVR",
    "SDQL", "SDQR", "SIADL", "SIADR", "SIAVL", "SIAVR", "SIBDL", "SIBDR", "SIBVL", "SIBVR",
    "SMBDL", "SMBDR", "SMBVL", "SMBVR", "SMDDL", "SMDDR", "SMDVL", "SMDVR",
    "URADL", "URADR", "URAVL", "URAVR", "URBL", "URBR", "URXL", "URXR", "URYDL", "URYDR", "URYVL", "URYVR",
    # AS and VC Motor Neurons
    "AS01", "AS02", "AS03", "AS04", "AS05", "AS06", "AS07", "AS08", "AS09", "AS10", "AS11",
    "VC01", "VC02", "VC03", "VC04", "VC05", "VC06"
]

# Ensure exactly 302 unique neurons
NEURONS = sorted(list(set(NEURONS)))
assert len(NEURONS) == 302, f"Expected 302 neurons, found {len(NEURONS)}"

# Neuron Functional Classes
NEURON_TYPES: Dict[str, str] = {}
for n in NEURONS:
    if n.startswith(("D", "V", "AS", "VC")) and any(c.isdigit() for c in n):
        NEURON_TYPES[n] = "motor"
    elif n.startswith(("RMD", "RME", "RMF", "RMH", "SIA", "SIB", "SMB", "SMD", "UR", "IL1", "IL2")):
        NEURON_TYPES[n] = "motor"
    elif n in [
        "ALML", "ALMR", "AVM", "PLML", "PLMR", "PVM", "PVDL", "PVDR",
        "ASEL", "ASER", "AWAL", "AWAR", "AWBL", "AWBR", "AWCL", "AWCR",
        "ASHL", "ASHR", "ASIL", "ASIR", "ASJL", "ASJR", "ASKL", "ASKR",
        "ADFL", "ADFR", "BAGL", "BAGR", "FLPL", "FLPR", "PHAL", "PHAR", "PHBL", "PHBR",
        "AQR", "PQR", "AFDL", "AFDR"
    ]:
        NEURON_TYPES[n] = "sensory"
    elif any(n.startswith(prefix) for prefix in ["ASE", "AWA", "AWB", "AWC", "ASH", "ASI", "ASJ", "ASK", "ADF", "BAG", "CEP", "AFD", "ALM", "PLM"]):
        NEURON_TYPES[n] = "sensory"
    else:
        NEURON_TYPES[n] = "interneuron"

# Specific Functional Subcircuits
FORWARD_COMMAND = ["AVBL", "AVBR", "PVCL", "PVCR"]
BACKWARD_COMMAND = ["AVAL", "AVAR", "AVDL", "AVDR", "AVEL", "AVER"]
CHEMOTAXIS_SENSORS = ["ASEL", "ASER", "AWAL", "AWAR", "AWCL", "AWCR"]
TOUCH_SENSORS_ANTERIOR = ["ALML", "ALMR", "AVM"]
TOUCH_SENSORS_POSTERIOR = ["PLML", "PLMR", "PVM"]
HEAD_MOTOR = [n for n in NEURONS if n.startswith(("SMD", "SMB", "RMD"))]

# Primary Neurotransmitter Assignments (ACh: Excitatory, GABA: Inhibitory, GLU: Glutamatergic)
NEUROTRANSMITTERS: Dict[str, str] = {}
for n in NEURONS:
    if n.startswith(("DD", "VD", "RME", "AVL", "DVB", "RIS")):
        NEUROTRANSMITTERS[n] = "GABA"       # Inhibitory
    elif n.startswith(("DB", "VB", "DA", "VA", "AS", "VC", "SMD", "SMB", "RMD", "SIA", "SIB")):
        NEUROTRANSMITTERS[n] = "ACh"        # Acetylcholine (Excitatory)
    elif n.startswith(("ASE", "AWC", "ASH", "AFD", "BAG", "EAT", "GLR", "AQR", "PQR")):
        NEUROTRANSMITTERS[n] = "GLU"        # Glutamate (Mixed/Modulatory)
    elif n.startswith(("ADE", "PDE", "CEP")):
        NEUROTRANSMITTERS[n] = "DA"         # Dopamine
    elif n.startswith(("ADF", "NSM", "HSN")):
        NEUROTRANSMITTERS[n] = "5HT"        # Serotonin
    else:
        NEUROTRANSMITTERS[n] = "ACh"        # Default baseline excitatory

# Sensory Modalities
SENSORY_MODALITIES: Dict[str, str] = {
    "ASEL": "chemotaxis_salt_up",
    "ASER": "chemotaxis_salt_down",
    "AWAL": "odor_attractant",
    "AWAR": "odor_attractant",
    "AWBL": "odor_repellent",
    "AWBR": "odor_repellent",
    "AWCL": "odor_general",
    "AWCR": "odor_general",
    "ASHL": "nociceptive_osmotic",
    "ASHR": "nociceptive_osmotic",
    "ALML": "anterior_mechanotouch",
    "ALMR": "anterior_mechanotouch",
    "AVM":  "anterior_mechanotouch",
    "PLML": "posterior_mechanotouch",
    "PLMR": "posterior_mechanotouch",
    "PVM":  "posterior_mechanotouch",
    "AFDL": "thermosensory",
    "AFDR": "thermosensory",
    "BAGL": "carbon_dioxide_oxygen",
    "BAGR": "carbon_dioxide_oxygen",
    "AQR":  "aerotaxis_oxygen",
    "PQR":  "aerotaxis_oxygen"
}
