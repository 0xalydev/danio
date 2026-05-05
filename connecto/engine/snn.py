"""
Biophysical Spiking Neural Network (SNN) Simulation Engine
Conductance-Based Leaky Integrate-and-Fire (LIF) with Synaptic Delays and Gap Junctions.
"""

import numpy as np
from collections import deque
from typing import Dict, List, Optional, Tuple
from ..connectome.data import NEURONS
from ..connectome.synapses import build_synapse_matrices

class SpikingConnectomeEngine:
    def __init__(self, dt_ms: float = 0.5, delay_steps: int = 3):
        """
        Args:
            dt_ms: Simulation timestep in milliseconds (default 0.5 ms).
            delay_steps: Number of buffer steps for axonal/synaptic conduction delay (default 1.5 ms).
        """
        self.dt = dt_ms
        self.N = len(NEURONS)
        self.neurons = NEURONS
        self.chem_matrix, self.gap_matrix, self.idx_map = build_synapse_matrices()

        # Biophysical Parameters
        self.v_rest = -60.0     # Resting potential (mV)
        self.v_reset = -65.0    # Hyperpolarization reset (mV)
        self.v_thresh = -45.0   # Action potential firing threshold (mV)
        self.tau_m = 20.0       # Membrane time constant (ms)
        self.tau_syn = 4.0      # Synaptic current decay time constant (ms)
        self.refractory_period = 2.0  # ms
        self.refractory_steps = int(self.refractory_period / self.dt)

        # Dynamic State Variables
        self.V = np.full(self.N, self.v_rest, dtype=np.float32)
        self.g_syn = np.zeros(self.N, dtype=np.float32)
        self.refractory_timer = np.zeros(self.N, dtype=np.int32)
        
        # Delay Ring Buffer for Spikes
        self.delay_steps = delay_steps
        self.spike_buffer = deque([np.zeros(self.N, dtype=bool) for _ in range(self.delay_steps)], maxlen=self.delay_steps)
        
        # Diagnostics
        self.spike_history = deque(maxlen=200)
        self.total_spikes = 0
        self.step_count = 0

    def reset(self):
        """Reset neural states to resting equilibrium."""
        self.V.fill(self.v_rest)
        self.g_syn.fill(0.0)
        self.refractory_timer.fill(0)
        self.spike_buffer.clear()
        for _ in range(self.delay_steps):
            self.spike_buffer.append(np.zeros(self.N, dtype=bool))
        self.spike_history.clear()
        self.total_spikes = 0
        self.step_count = 0

    def step(self, external_currents: Optional[np.ndarray] = None) -> Tuple[np.ndarray, np.ndarray]:
        """
        Advances the entire connectome by dt_ms.

        Args:
            external_currents: Array of shape (302,) with injected currents in pA/nA.

        Returns:
            spikes: Boolean array of size (302,) indicating which neurons spiked this step.
            potentials: Float array of size (302,) representing current membrane voltages.
        """
        self.step_count += 1
        if external_currents is None:
            external_currents = np.zeros(self.N, dtype=np.float32)

        # 1. Delayed Spikes Arrive at Postsynaptic Terminals
        delayed_spikes = self.spike_buffer[0]  # Oldest spikes in delay line
        synaptic_input = np.dot(delayed_spikes.astype(np.float32), self.chem_matrix)

        # 2. Update Synaptic Conductance (Exponential Decay + New Impulse)
        decay_factor = np.exp(-self.dt / self.tau_syn)
        self.g_syn = self.g_syn * decay_factor + synaptic_input * 18.0

        # 3. Electrical Gap Junction Currents (Ohmic Diffusive Coupling)
        # I_gap_i = sum_j G_ij * (V_j - V_i)
        V_diff = self.V[np.newaxis, :] - self.V[:, np.newaxis]
        gap_currents = np.sum(self.gap_matrix * V_diff, axis=1) * 0.15

        # 4. Integrate Membrane Potential for Non-Refractory Neurons
        is_refractory = self.refractory_timer > 0
        self.refractory_timer[is_refractory] -= 1

        active_mask = ~is_refractory
        dV = (
            -(self.V[active_mask] - self.v_rest)
            + self.g_syn[active_mask]
            + gap_currents[active_mask]
            + external_currents[active_mask] * 28.0
        ) * (self.dt / self.tau_m)

        self.V[active_mask] += dV

        # 5. Threshold Detection & Spike Generation
        spikes = (self.V >= self.v_thresh) & active_mask
        self.V[spikes] = self.v_reset
        self.refractory_timer[spikes] = self.refractory_steps

        # Push to delay buffer
        self.spike_buffer.append(spikes)
        self.spike_history.append(spikes.copy())
        self.total_spikes += int(np.sum(spikes))

        return spikes, self.V.copy()

    def inject_input(self, neuron_name: str, current: float):
        """Convenience method to inject current into a specific named neuron."""
        if neuron_name in self.idx_map:
            idx = self.idx_map[neuron_name]
            self.V[idx] += current

    def get_firing_rates(self, window_steps: int = 50) -> np.ndarray:
        """Returns mean firing rate in Hz over the recent history window."""
        if not self.spike_history:
            return np.zeros(self.N, dtype=np.float32)
        window = min(len(self.spike_history), window_steps)
        recent = np.array(list(self.spike_history)[-window:])
        total_time_s = (window * self.dt) / 1000.0
        if total_time_s == 0:
            return np.zeros(self.N, dtype=np.float32)
        return np.sum(recent, axis=0) / total_time_s
