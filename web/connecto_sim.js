/**
 * ClientConnectoSim — WebGL Biophysical Locomotion & Neural Transit Bridge
 * Adult Danionella cerebrum (650,000 Vertebrate Neurons)
 * 
 * Drives the 3D WebGL transparent teleost and connects real-time action potential
 * transits directly to website telemetry (motor pools, spike raster, oscilloscope).
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
    this.meanVm = -62.4;
    this.frequency = 42;
    this.nutrient = 7.4827;

    // Motor pool spike rates
    this.motorPools = {
      mCell: 8,
      opticTectum: 90,
      purkinje: 49,
      sonicDrumming: 12,
      spinalVentral: 90
    };

    // Instantiate 3D WebGL Simulation inside the container
    if (typeof DanioWebGLSimulation !== 'undefined') {
      this.webgl = new DanioWebGLSimulation(this.container, {
        isHero: false,
        enableControls: true,
        autoRotate: true,
        onTelemetry: (t) => this.onWebGLTelemetry(t)
      });
    }

    // Keep food attractors list for backwards compatibility
    this.foodList = [{ x: 500, y: 300 }];
  }

  onWebGLTelemetry(t) {
    this.dominantState = t.dominantState || this.dominantState;
    this.meanVm = t.meanVm || this.meanVm;
    this.frequency = Math.round(t.spikeRate || this.frequency);

    if (t.cStartActive) {
      this.velocity = 3.65;
      this.motorPools.mCell = 180;
      this.motorPools.spinalVentral = 180;
      this.motorPools.opticTectum = 120;
    } else if (t.sonicActive) {
      this.velocity = 0.95;
      this.motorPools.sonicDrumming = 100;
      this.motorPools.mCell = 12;
    } else {
      this.velocity = 0.52 + Math.random() * 0.15;
      this.motorPools.mCell = 6 + Math.round(Math.random() * 6);
      this.motorPools.opticTectum = 70 + Math.round(Math.random() * 30);
      this.motorPools.purkinje = 40 + Math.round(Math.random() * 20);
      this.motorPools.sonicDrumming = 10 + Math.round(Math.random() * 8);
      this.motorPools.spinalVentral = 60 + Math.round(Math.random() * 40);
    }
  }

  step() {
    return {
      state: this.dominantState,
      speed_mms: typeof this.velocity === 'number' ? this.velocity.toFixed(2) : this.velocity,
      spikes_count: this.frequency,
      mean_v: typeof this.meanVm === 'number' ? this.meanVm.toFixed(1) : this.meanVm,
      chem: this.nutrient.toFixed(4),
      dorsal: this.motorPools.spinalVentral * 0.5,
      ventral: this.motorPools.spinalVentral * 0.5,
      motor_pools: this.motorPools
    };
  }

  triggerTouch(anterior) {
    if (!this.webgl) return;
    if (anterior) {
      // Anterior stimulus: Mauthner C-Start Escape Reflex
      this.webgl.triggerMauthnerCStart();
    } else {
      // Posterior stimulus: Acoustic Drumming (140.2 dB)
      this.webgl.triggerSonicDrumming();
    }
  }

  addFood(x, y) {
    if (this.webgl) {
      this.webgl.triggerVisuomotorSaccade();
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

  reset() {
    if (this.webgl) {
      this.webgl.dominantState = 'PELAGIC_CRUISE';
      this.webgl.cStartActive = false;
      this.webgl.sonicActive = false;
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
