"""Connectome data and synaptic connectivity mapping for C. elegans."""

from .data import NEURONS, NEURON_TYPES, SENSORY_MODALITIES, NEUROTRANSMITTERS
from .synapses import build_synapse_matrices
from .muscle_map import MUSCLES, NEUROMUSCULAR_JUNCTIONS

__all__ = [
    "NEURONS",
    "NEURON_TYPES",
    "SENSORY_MODALITIES",
    "NEUROTRANSMITTERS",
    "build_synapse_matrices",
    "MUSCLES",
    "NEUROMUSCULAR_JUNCTIONS"
]
