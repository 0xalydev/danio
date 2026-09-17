/**
 * ClientConnectoSim — WebGL Biophysical Locomotion & Neural Transit Bridge
 * Adult Danionella cerebrum (650,000 Vertebrate Neurons · 203 Regions)
 * 
 * Drives the 3D WebGL Biological Brain & CNS Simulation and connects real-time
 * action potential transits directly to website telemetry (motor pools, spike raster, oscilloscope).
 */

class ClientConnectoSim {
  constructor(canvas) {
    this.canvas = canvas;
    this.container = canvas.parentElement;
    
    // Hide the legacy 2D canvas
    this.canvas.style.display = 'none';

    this.width = this.container.clientWidth || 920;
    this.height = this.container.clientHeight || 560;

    this.medium = 'water';
    this.time = 0;
    this.velocity = 0.52;
    this.dominantState = 'PELAGIC_CRUISE';
    this.meanVm = -61.8;
    this.frequency = 48;
    this.nutrient = 7.4827;

    // Motor pool spike rates
    this.motorPools = {
      mCell: 8,
      opticTectum: 78,
      purkinje: 62,
      sonicDrumming: 12,
      spinalVentral: 68
    };

    this.spikeEvents = [];

    // Instantiate 3D WebGL Brain Simulation inside the container
    if (typeof DanioWebGLSimulation !== 'undefined') {
      this.webgl = new DanioWebGLSimulation(this.container, {
        enableControls: true,
        autoRotate: true,
        onTelemetry: (t) => this.onWebGLTelemetry(t)
      });
    }

    // Food attractors list for backwards compatibility
    this.foodList = [{ x: 500, y: 300 }];
  }

  onWebGLTelemetry(t) {
    this.dominantState = t.dominantState || this.dominantState;
    this.meanVm = t.meanVm !== undefined ? t.meanVm : this.meanVm;
    this.frequency = Math.round(t.spikeRate || this.frequency);
    this.velocity = t.velocity !== undefined ? t.velocity : this.velocity;
    this.nutrient = t.nutrient !== undefined ? t.nutrient : this.nutrient;

    if (t.motorPools) {
      this.motorPools = t.motorPools;
    }

    if (t.spikeEvents && t.spikeEvents.length > 0) {
      this.spikeEvents.push(...t.spikeEvents);
    }
  }

  step() {
    const events = this.spikeEvents;
    this.spikeEvents = []; // Flush consumed spike events

    return {
      state: this.dominantState,
      speed_mms: typeof this.velocity === 'number' ? this.velocity.toFixed(2) : this.velocity,
      spikes_count: this.frequency,
      mean_v: typeof this.meanVm === 'number' ? this.meanVm.toFixed(1) : this.meanVm,
      chem: typeof this.nutrient === 'number' ? this.nutrient.toFixed(4) : this.nutrient,
      dorsal: (this.motorPools.spinalVentral || 60) * 0.5,
      ventral: (this.motorPools.spinalVentral || 60) * 0.5,
      motor_pools: this.motorPools,
      spike_events: events
    };
  }

  triggerTouch(anterior) {
    if (!this.webgl) return;
    if (anterior) {
      // Anterior stimulus: Mauthner C-Start Escape Reflex (Predator Threat)
      this.webgl.triggerMauthnerCStart();
    } else {
      // Posterior stimulus: Acoustic Drumming (140.2 dB Sonic Pulse)
      this.webgl.triggerSonicDrumming();
    }
  }

  pause(shouldPause) {
    if (this.webgl) {
      if (shouldPause !== undefined) {
        this.webgl.isPaused = shouldPause;
      } else {
        this.webgl.togglePause();
      }
    }
  }

  reset() {
    if (this.webgl) {
      this.webgl.reset();
    }
    this.velocity = 0.52;
    this.dominantState = 'PELAGIC_CRUISE';
    this.meanVm = -61.8;
    this.frequency = 48;
    this.motorPools = {
      mCell: 8,
      opticTectum: 78,
      purkinje: 62,
      sonicDrumming: 12,
      spinalVentral: 68
    };
    this.spikeEvents = [];
  }

  addFood(x, y) {
    // Inject sensory excitation into optic tectum
    if (this.webgl) {
      const tectumConns = this.webgl.connections.filter(c => c.tractType === 'sensory');
      for (let i = 0; i < 8; i++) {
        if (tectumConns.length > 0) {
          const c = tectumConns[Math.floor(Math.random() * tectumConns.length)];
          this.webgl.spawnSignal(c);
        }
      }
    }
  }

  clearFood() {
    this.foodList = [];
  }

  toggleMedium() {
    this.medium = (this.medium === 'water') ? 'agar' : 'water';
    if (this.webgl) {
      this.webgl.dominantState = (this.medium === 'agar') ? 'LAMINAR_FLOW_CRUISE' : 'PELAGIC_FREE_SWIM';
    }
  }

  syncWithServer(locomotion) {
    if (!locomotion) return;
    if (locomotion.speed_mms !== undefined) this.velocity = locomotion.speed_mms;
    if (locomotion.mean_vm !== undefined) this.meanVm = locomotion.mean_vm;
    if (locomotion.state && this.webgl) this.webgl.dominantState = locomotion.state;
  }

  getTelemetry() {
    return this.step();
  }

  render() {
    // 3D WebGL handles rendering via its internal rAF loop
  }
}

window.ClientConnectoSim = ClientConnectoSim;
