/**
 * HeroObservationChamber — WebGL 3D Adult Danionella cerebrum
 * 
 * Renders the centered floating transparent teleost against pure black space,
 * with dense fine white/gray neural fibers and sparse traveling action potentials.
 */

class HeroObservationChamber {
  constructor(canvas) {
    this.canvas = canvas;
    this.container = canvas.parentElement;

    // Hide the legacy 2D canvas
    this.canvas.style.display = 'none';

    if (typeof DanioWebGLSimulation !== 'undefined') {
      this.webgl = new DanioWebGLSimulation(this.container, {
        isHero: true,
        enableControls: true,
        autoRotate: true
      });
    }
  }

  triggerAcousticPulse(x, y) {
    if (this.webgl) {
      this.webgl.triggerSonicDrumming();
    }
  }

  render() {
    // 3D WebGL handles rendering via internal rAF loop
  }
}

window.HeroObservationChamber = HeroObservationChamber;
