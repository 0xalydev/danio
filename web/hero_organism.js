/**
 * Hero Observation Chamber: Danionella cerebrum (650,000 Vertebrate Neurons)
 * Renders the optically transparent teleost fish, vertebrate brain lobes (Tectum,
 * Cerebellum, Telencephalon, Spinal Cord), and 140 dB acoustic drumming shockwaves.
 */

class HeroObservationChamber {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.numSegs = 32;
    this.time = 0;
    
    // Pointer parallax
    this.pointerX = 0;
    this.pointerY = 0;
    this.targetPointerX = 0;
    this.targetPointerY = 0;

    // Acoustic drumming shockwaves (140 dB SPL)
    this.shockwaves = [];
    this.drumTimer = 0;

    // Ambient Chamber Micro-Telemetry Particles (fluorescent water drift)
    this.particles = [];
    for (let i = 0; i < 70; i++) {
      this.particles.push({
        x: Math.random() * 1440,
        y: Math.random() * 760,
        size: Math.random() * 1.8 + 0.4,
        alpha: Math.random() * 0.4 + 0.1,
        vx: -(Math.random() * 0.4 + 0.1), // subtle water flow against fish
        vy: (Math.random() - 0.5) * 0.15
      });
    }

    // Cranial Lobes (Telencephalon, Optic Tectum, Cerebellum, Hindbrain)
    this.brainLobes = [
      { name: 'Telencephalon', rx: 9, ry: 7, dx: 18, dy: -2, color: '#38bdf8' },
      { name: 'Optic Tectum L', rx: 14, ry: 10, dx: 6, dy: -8, color: '#06b6d4' },
      { name: 'Optic Tectum R', rx: 14, ry: 10, dx: 6, dy: 6, color: '#06b6d4' },
      { name: 'Cerebellum', rx: 12, ry: 8, dx: -8, dy: -1, color: '#10b981' },
      { name: 'Hindbrain/Mauthner', rx: 10, ry: 6, dx: -20, dy: 0, color: '#a855f7' }
    ];

    window.addEventListener('pointermove', (e) => {
      this.targetPointerX = (e.clientX / window.innerWidth - 0.5) * 50;
      this.targetPointerY = (e.clientY / window.innerHeight - 0.5) * 35;
    });

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.width = this.canvas.width;
    this.height = this.canvas.height;
    this.ctx.scale(dpr, dpr);
    this.cssWidth = rect.width;
    this.cssHeight = rect.height;
  }

  triggerAcousticPulse(x, y) {
    this.shockwaves.push({
      x: x,
      y: y,
      radius: 8,
      maxRadius: 260,
      alpha: 0.9,
      speed: 4.8,
      spl_db: 140.2
    });
  }

  render() {
    const ctx = this.ctx;
    const w = this.cssWidth;
    const h = this.cssHeight;

    ctx.clearRect(0, 0, w, h);

    // Parallax smoothing
    this.pointerX += (this.targetPointerX - this.pointerX) * 0.05;
    this.pointerY += (this.targetPointerY - this.pointerY) * 0.05;
    this.time += 0.025;

    const centerX = w / 2 + this.pointerX;
    const centerY = h / 2 + this.pointerY - 15;

    // 1. Water Drift Particles
    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x = w;
      if (p.x > w) p.x = 0;
      if (p.y < 0) p.y = h;
      if (p.y > h) p.y = 0;

      ctx.fillStyle = `rgba(56, 189, 248, ${p.alpha * 0.35})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Compute Danionella Fish Kinematic Spine (32 Segments)
    // Head on right, tail on left, swimming forward into water flow
    const points = [];
    const totalLength = Math.min(w * 0.68, 760);

    for (let i = 0; i < this.numSegs; i++) {
      const u = i / (this.numSegs - 1); // 0 (tail tip) to 1 (snout)
      const s = (u - 0.5) * 2; // -1 to +1

      // Vertebrate carangiform undulation (small head motion, increasing toward caudal peduncle)
      const tailGain = Math.pow(1.0 - u, 1.6);
      const phase = this.time * 2.2 - i * 0.22;
      const waveY = Math.sin(phase) * (tailGain * 52 + 3);
      const waveZ = Math.cos(phase) * (tailGain * 24);

      const px = centerX + s * (totalLength / 2);
      const py = centerY + waveY;

      // Adult Danionella teleost body height/radius envelope
      let radius;
      if (u > 0.85) {
        // Tapered cranial snout
        radius = Math.sin((u - 0.85) / 0.15 * Math.PI * 0.5) * 16 + 12;
      } else if (u > 0.45) {
        // Cranial and swim bladder midsection (widest)
        radius = 28 + Math.sin((u - 0.45) / 0.4 * Math.PI) * 10;
      } else {
        // Caudal peduncle tapering to tail
        radius = Math.max(4.5, u * 48);
      }

      points.push({ x: px, y: py, z: waveZ, r: radius, u: u });
    }

    const head = points[points.length - 1];
    const swimBladderPt = points[Math.floor(this.numSegs * 0.72)];

    // 3. Acoustic Drumming Trigger (every ~3 seconds or 140 dB pulse)
    this.drumTimer += 0.025;
    if (this.drumTimer > 2.8) {
      this.drumTimer = 0;
      this.triggerAcousticPulse(swimBladderPt.x, swimBladderPt.y);
    }

    // Draw Expanding Acoustic Shockwaves (140 dB SPL)
    ctx.save();
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.radius += sw.speed;
      sw.alpha *= 0.965;

      if (sw.alpha < 0.02 || sw.radius > sw.maxRadius) {
        this.shockwaves.splice(i, 1);
        continue;
      }

      ctx.strokeStyle = `rgba(6, 182, 212, ${sw.alpha * 0.75})`;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.ellipse(sw.x, sw.y, sw.radius, sw.radius * 0.65, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Secondary echo ring
      ctx.strokeStyle = `rgba(16, 185, 129, ${sw.alpha * 0.4})`;
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.ellipse(sw.x, sw.y, sw.radius * 0.75, sw.radius * 0.5, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    // 4. Draw Transparent Teleost Fish Cuticle & Musculature
    ctx.save();
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const depth = (p1.z + 30) / 60; // 0 to 1

      // Glass-like transparent biological tissue gradient
      const grad = ctx.createLinearGradient(p1.x, p1.y - p1.r, p1.x, p1.y + p1.r);
      grad.addColorStop(0, `rgba(56, 189, 248, ${0.08 + depth * 0.06})`);
      grad.addColorStop(0.5, `rgba(6, 182, 212, ${0.04 + depth * 0.04})`);
      grad.addColorStop(1, `rgba(16, 185, 129, ${0.09 + depth * 0.06})`);

      ctx.strokeStyle = `rgba(56, 189, 248, ${0.18 + depth * 0.25})`;
      ctx.lineWidth = 1.2;
      ctx.fillStyle = grad;

      ctx.beginPath();
      ctx.ellipse(p1.x, p1.y, p1.r * 0.75, p1.r, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();

    // 5. Caudal (Tail) Fin Rays & Undulation
    const tailTip = points[0];
    const tailPrev = points[2];
    ctx.save();
    const tailAngle = Math.atan2(tailTip.y - tailPrev.y, tailTip.x - tailPrev.x);
    ctx.translate(tailTip.x, tailTip.y);
    ctx.rotate(tailAngle);

    // Bilobed caudal fin
    ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-45, -34);
    ctx.quadraticCurveTo(-30, 0, -50, 34);
    ctx.lineTo(0, 0);
    ctx.fill();
    ctx.stroke();

    // Caudal fin rays
    for (let r = -24; r <= 24; r += 8) {
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-40, r);
      ctx.stroke();
    }
    ctx.restore();

    // 6. Spinal Cord & Ventral Motor Neurons (Vertebrate Axon Column)
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 0; i < points.length - 1; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2;
      const yc = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
    }
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 2.2;
    ctx.stroke();

    // Spinal motor segmental nodes
    for (let i = 4; i < points.length - 8; i += 2) {
      const pt = points[i];
      const fireAlpha = 0.4 + Math.sin(this.time * 3 + i) * 0.4;
      ctx.fillStyle = `rgba(16, 185, 129, ${fireAlpha})`;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y - 4, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 7. Swim Bladder & Drumming Cartilage Apparatus (Sound Production)
    ctx.save();
    ctx.fillStyle = 'rgba(6, 182, 212, 0.25)';
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(swimBladderPt.x, swimBladderPt.y + 2, 24, 14, -0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Drumming muscle pulse trigger
    const drumPulse = Math.max(0, 1.0 - (this.drumTimer / 0.5));
    if (drumPulse > 0.05) {
      ctx.fillStyle = `rgba(244, 63, 94, ${drumPulse * 0.9})`;
      ctx.beginPath();
      ctx.arc(swimBladderPt.x + 10, swimBladderPt.y + 2, 5 + drumPulse * 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 8. Adult Cranial Optical Window & Glowing Vertebrate Brain Lobe System
    // Located at anterior (u = 0.82 to 0.96)
    const cranialBase = points[Math.floor(this.numSegs * 0.88)];
    ctx.save();
    ctx.translate(cranialBase.x, cranialBase.y);

    // Cranial Window Boundary (0.6 mm3 transparent optical cranium)
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
    ctx.lineWidth = 1.4;
    ctx.fillStyle = 'rgba(56, 189, 248, 0.06)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 36, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Render 5 Major Brain Lobes with Flashing Two-Photon Calcium Dynamics
    for (const lobe of this.brainLobes) {
      const calciumIntensity = 0.5 + Math.sin(this.time * 2.5 + lobe.dx * 0.2) * 0.35;
      
      // Dual-pass glow
      ctx.fillStyle = lobe.color;
      ctx.globalAlpha = calciumIntensity * 0.35;
      ctx.beginPath();
      ctx.ellipse(lobe.dx, lobe.dy, lobe.rx * 1.3, lobe.ry * 1.3, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = calciumIntensity * 0.85;
      ctx.beginPath();
      ctx.ellipse(lobe.dx, lobe.dy, lobe.rx * 0.6, lobe.ry * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Outer lobe boundary
      ctx.strokeStyle = lobe.color;
      ctx.globalAlpha = 0.9;
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.ellipse(lobe.dx, lobe.dy, lobe.rx, lobe.ry, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    // 9. Teleost Optical Eye (Contralateral & Ipsilateral)
    ctx.save();
    ctx.fillStyle = '#020408';
    ctx.beginPath();
    ctx.arc(head.x - 14, head.y - 12, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(head.x - 13, head.y - 12, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 10. Minimal Cranial Overlay HUD (Top-Left of Chamber)
    ctx.save();
    ctx.font = '600 10px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(56, 189, 248, 0.7)';
    ctx.fillText('SPECIMEN: DANIONELLA CEREBRUM (ADULT VERTEBRATE TELEOST)', 24, 32);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillText('CNS: 650,000 NEURONS · 203 ANATOMICAL REGIONS · 0.6 mm³ OPTICAL CRANIUM', 24, 48);

    if (this.drumTimer < 0.6) {
      ctx.fillStyle = '#f43f5e';
      ctx.fillText('🔊 ACOUSTIC DRUMMING: 140.2 dB SPL PULSE DETECTED', 24, 66);
    } else {
      ctx.fillStyle = '#10b981';
      ctx.fillText('● CEREBELLUM BALANCE: STABLE · OPTIC TECTUM SACCADIC PURSUIT', 24, 66);
    }
    ctx.restore();
  }

  start() {
    this.isVisible = true;
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        this.isVisible = entries[0].isIntersecting;
      }, { threshold: 0.05 });
      observer.observe(this.canvas);
    }

    const loop = () => {
      if (this.isVisible) {
        this.render();
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('hero-organism-canvas');
  if (canvas) {
    const chamber = new HeroObservationChamber(canvas);
    chamber.start();
  }
});
