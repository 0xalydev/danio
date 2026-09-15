/**
 * Hero Observation Chamber: 3D/2.5D Digital Organism Visualization
 * Renders translucent biological cuticle segments, neural nodes, and electrical impulses.
 */

class HeroObservationChamber {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.numSegs = 28;
    this.time = 0;
    
    // Pointer parallax
    this.pointerX = 0;
    this.pointerY = 0;
    this.targetPointerX = 0;
    this.targetPointerY = 0;

    // Ambient Chamber Micro-Telemetry Particles
    this.particles = [];
    for (let i = 0; i < 60; i++) {
      this.particles.push({
        x: Math.random() * 1440,
        y: Math.random() * 760,
        size: Math.random() * 1.6 + 0.4,
        alpha: Math.random() * 0.35 + 0.1,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15
      });
    }

    // Background Neural Graph Nodes
    this.bgNodes = [];
    for (let i = 0; i < 40; i++) {
      this.bgNodes.push({
        x: Math.random() * 1440,
        y: Math.random() * 760,
        radius: Math.random() * 2 + 1.2,
        pulse: Math.random() * Math.PI * 2
      });
    }

    // Action potential electrical impulses travelling along the body
    this.impulses = [
      { progress: 0.1, speed: 0.008, color: '#38bdf8' },
      { progress: 0.55, speed: 0.009, color: '#10b981' }
    ];

    window.addEventListener('pointermove', (e) => {
      this.targetPointerX = (e.clientX / window.innerWidth - 0.5) * 60;
      this.targetPointerY = (e.clientY / window.innerHeight - 0.5) * 40;
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

  render() {
    const ctx = this.ctx;
    const w = this.cssWidth;
    const h = this.cssHeight;

    ctx.clearRect(0, 0, w, h);

    // Smooth Parallax
    this.pointerX += (this.targetPointerX - this.pointerX) * 0.05;
    this.pointerY += (this.targetPointerY - this.pointerY) * 0.05;
    this.time += 0.02;

    const centerX = w / 2 + this.pointerX;
    const centerY = h / 2 + this.pointerY - 20;

    // 1. Background Neural Lattice Lines
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.04)';
    ctx.lineWidth = 1;
    for (let i = 0; i < this.bgNodes.length; i++) {
      const n1 = this.bgNodes[i];
      n1.pulse += 0.02;
      for (let j = i + 1; j < this.bgNodes.length; j++) {
        const n2 = this.bgNodes[j];
        const dist = Math.hypot(n1.x - n2.x, n1.y - n2.y);
        if (dist < 180) {
          ctx.beginPath();
          ctx.moveTo(n1.x, n1.y);
          ctx.lineTo(n2.x, n2.y);
          ctx.stroke();
        }
      }
      // Node point
      ctx.fillStyle = `rgba(56, 189, 248, ${0.1 + Math.sin(n1.pulse) * 0.06})`;
      ctx.beginPath();
      ctx.arc(n1.x, n1.y, n1.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Ambient Telemetry Dust
    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x = w;
      if (p.x > w) p.x = 0;
      if (p.y < 0) p.y = h;
      if (p.y > h) p.y = 0;

      ctx.fillStyle = `rgba(56, 189, 248, ${p.alpha * 0.4})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Compute 3D Spline Vertices for the Organism
    const points = [];
    const totalLength = Math.min(w * 0.62, 720);
    const segSpacing = totalLength / this.numSegs;

    for (let i = 0; i < this.numSegs; i++) {
      const u = i / (this.numSegs - 1); // 0 (tail) to 1 (head)
      const s = (u - 0.5) * 2; // -1 to +1

      // Natural undulating traveling sine wave
      const undulationPhase = this.time * 1.5 - i * 0.28;
      const waveAmplitude = (Math.sin(u * Math.PI) * 44 + 6);
      const waveY = Math.sin(undulationPhase) * waveAmplitude;
      const waveZ = Math.cos(undulationPhase) * (waveAmplitude * 0.35); // subtle 3D depth

      const px = centerX + s * (totalLength / 2) + Math.cos(undulationPhase) * 6;
      const py = centerY + waveY;
      const pz = waveZ;

      // Anatomical radius profile (tapered at ends, widest around mid-body vulva/gonads)
      const radius = Math.sin(u * Math.PI) * 22 + 5.5;

      points.push({ x: px, y: py, z: pz, r: radius, u: u });
    }

    // 4. Draw Translucent Biological Cuticle Segments (Outer Envelope)
    ctx.save();
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const depth = (p1.z + 25) / 50; // 0 to 1

      // Gradient fill for translucent biological segment
      const grad = ctx.createLinearGradient(p1.x, p1.y - p1.r, p1.x, p1.y + p1.r);
      grad.addColorStop(0, `rgba(56, 189, 248, ${0.12 + depth * 0.1})`);
      grad.addColorStop(0.5, `rgba(16, 185, 129, ${0.08 + depth * 0.08})`);
      grad.addColorStop(1, `rgba(6, 182, 212, ${0.14 + depth * 0.1})`);

      ctx.strokeStyle = `rgba(56, 189, 248, ${0.28 + depth * 0.3})`;
      ctx.lineWidth = 1.4;
      ctx.fillStyle = grad;

      // Render segment ring
      ctx.beginPath();
      ctx.ellipse(p1.x, p1.y, p1.r, p1.r * (0.85 + depth * 0.25), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();

    // 5. Internal Central Ventral Nerve Cord & Axon Core (Smooth Quadratic Spline)
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 0; i < points.length - 1; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2;
      const yc = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
    }
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 2.0;
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.restore();

    // 6. Neural Synaptic Points along the Body
    for (let i = 0; i < points.length; i++) {
      const pt = points[i];
      // Dorsal and ventral motor neurons
      const isMotor = i % 2 === 0;
      const nAlpha = 0.5 + Math.sin(this.time * 2 + i) * 0.35;

      ctx.fillStyle = isMotor ? `rgba(16, 185, 129, ${nAlpha})` : `rgba(56, 189, 248, ${nAlpha})`;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y - pt.r * 0.55, 2.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(56, 189, 248, ${nAlpha * 0.8})`;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y + pt.r * 0.55, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // 7. Circumpharyngeal Nerve Ring (Anterior Ganglia at Head - points[numSegs - 1])
    const head = points[points.length - 1];
    ctx.save();
    // High-performance outer glow ring
    ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
    ctx.beginPath();
    ctx.arc(head.x, head.y, 11, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(head.x, head.y, 5.5, 0, Math.PI * 2);
    ctx.fill();

    // Nerve ring halo
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.75)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(head.x, head.y, 14, 10, this.time * 0.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // 8. Traveling Electrical Action Potential Impulses
    for (const imp of this.impulses) {
      imp.progress += imp.speed;
      if (imp.progress > 1.0) imp.progress = 0.0;

      const idx = Math.floor(imp.progress * (points.length - 1));
      const pt = points[idx];
      if (pt) {
        ctx.save();
        // High-performance dual-pass glow instead of expensive GPU shadowBlur
        ctx.fillStyle = imp.color === '#38bdf8' ? 'rgba(56, 189, 248, 0.3)' : 'rgba(16, 185, 129, 0.3)';
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 9.0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = imp.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 4.0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
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
