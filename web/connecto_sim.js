/**
 * DanioSimBridge — Client Simulation Bridge for Adult Danionella cerebrum
 * Replaces legacy ClientConnectoSim with authoritative DanioSimEngine integration.
 */

class ClientConnectoSim {
  constructor(canvas) {
    this.canvas = canvas;
    this.container = canvas.parentElement;

    // Hide legacy 2D canvas
    if (this.canvas) this.canvas.style.display = 'none';

    this.engine = window.danioEngine || (typeof DanioSimEngine !== 'undefined' ? new DanioSimEngine() : null);

    // Instantiate 3D WebGL Brain Simulation
    if (typeof DanioWebGLSimulation !== 'undefined') {
      this.webgl = new DanioWebGLSimulation(this.container, {
        enableControls: true,
        autoRotate: false
      });
    }

    this.foodList = [{ x: 500, y: 300 }];
  }

  step() {
    if (this.engine) {
      const s = this.engine.state;
      const recent = s.recentSpikes.slice();
      s.recentSpikes = []; // flush consumed
      return {
        state: s.dominantState,
        speed_mms: typeof s.velocity === 'number' ? s.velocity.toFixed(2) : s.velocity,
        spikes_count: s.spikesCount,
        mean_v: typeof s.meanVm === 'number' ? s.meanVm.toFixed(1) : s.meanVm,
        chem: typeof s.preyConcentration === 'number' ? s.preyConcentration.toFixed(4) : s.preyConcentration,
        dorsal: (s.motorPools.spinalVentral || 60) * 0.5,
        ventral: (s.motorPools.spinalVentral || 60) * 0.5,
        motor_pools: s.motorPools,
        spike_events: recent
      };
    }

    return {
      state: 'PELAGIC_CRUISE',
      speed_mms: '0.52',
      spikes_count: 48,
      mean_v: '-62.4',
      chem: '7.4827',
      dorsal: 35,
      ventral: 35,
      motor_pools: { mCell: 12, opticTectum: 82, purkinje: 65, sonicDrumming: 14, spinalVentral: 74 },
      spike_events: []
    };
  }

  triggerTouch(anterior) {
    if (this.engine) {
      if (anterior) {
        this.engine.triggerMauthnerEscape();
      } else {
        this.engine.triggerSonicDrumming();
      }
    } else if (this.webgl) {
      if (anterior) this.webgl.triggerMauthnerCStart();
      else this.webgl.triggerSonicDrumming();
    }
  }

  pause(shouldPause) {
    if (this.engine) {
      return this.engine.pause(shouldPause);
    }
    if (this.webgl) {
      this.webgl.isPaused = (shouldPause !== undefined) ? shouldPause : !this.webgl.isPaused;
      return this.webgl.isPaused;
    }
  }

  reset() {
    if (this.engine) this.engine.reset();
    if (this.webgl) this.webgl.resetSimulation();
  }

  addFood(x, y) {
    if (this.engine) {
      this.engine.triggerPreyAttractor(x, y);
    } else if (this.webgl) {
      this.webgl.triggerTectalBurst();
    }
  }

  clearFood() {
    this.foodList = [];
  }

  toggleMedium() {
    if (this.engine) {
      this.engine.state.dominantState =
        (this.engine.state.dominantState === 'PELAGIC_CRUISE') ? 'LAMINAR_FLOW_HOLD' : 'PELAGIC_CRUISE';
    }
  }

  syncWithServer(locomotion) {
    if (!locomotion || !this.engine) return;
    this.engine.syncServerTelemetry(locomotion);
  }

  getTelemetry() {
    return this.step();
  }

  render() {
    // Handled by DanioWebGLSimulation requestAnimationFrame loop
  }
}

window.ClientConnectoSim = ClientConnectoSim;
window.DanioSimBridge = ClientConnectoSim;
