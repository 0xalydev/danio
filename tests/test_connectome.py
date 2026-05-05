"""Unit tests for C. elegans Connectome data and matrices."""

import pytest
import numpy as np
from connecto.connectome.data import NEURONS, NEURON_TYPES, NEUROTRANSMITTERS
from connecto.connectome.synapses import build_synapse_matrices
from connecto.connectome.muscle_map import MUSCLES, NEUROMUSCULAR_JUNCTIONS

def test_neuron_count():
    assert len(NEURONS) == 302
    assert len(set(NEURONS)) == 302

def test_muscle_count():
    assert len(MUSCLES) == 95
    assert len(set(MUSCLES)) == 95

def test_synapse_matrices():
    chem, gap, idx = build_synapse_matrices()
    assert chem.shape == (302, 302)
    assert gap.shape == (302, 302)
    assert len(idx) == 302
    
    # Gap junctions must be symmetric
    assert np.allclose(gap, gap.T)
    
    # Chemical matrix must have both excitatory and inhibitory connections
    assert np.any(chem > 0)
    assert np.any(chem < 0)

def test_motor_neuron_innervation():
    assert "DB01" in NEUROMUSCULAR_JUNCTIONS
    assert "VB01" in NEUROMUSCULAR_JUNCTIONS
    assert NEUROMUSCULAR_JUNCTIONS["DB01"]["type"] == "excitatory"
    assert NEUROMUSCULAR_JUNCTIONS["DD01"]["type"] == "inhibitory"
