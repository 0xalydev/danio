"""Integration test for full closed-loop simulation."""

import numpy as np
import pytest
from connecto.simulation import ConnectoSimulation

def test_simulation_run():
    sim = ConnectoSimulation(medium="agar")
    assert sim.snn.N == 302
    assert sim.body.num_segments == 24

    for step in range(50):
        res = sim.step()
        assert res["tick"] == step + 1
        assert not np.isnan(res["mean_v"])
        assert not np.isnan(res["speed_mms"])
        assert len(res["body_points"]) == 25

def test_touch_mechanoreceptor_escape():
    sim = ConnectoSimulation(medium="agar")
    sim.trigger_touch(anterior=True)
    res = sim.step()
    # At least mechanosensory neurons should fire on touch
    assert res["spikes_count"] > 0
