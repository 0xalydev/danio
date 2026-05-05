/**
 * Biophysical Locomotion Simulation on Canvas Arena (CONNECTO Live Rig)
 * Mathematical curvature-integrated backbone with continuous hydrostatic envelope,
 * smooth boundary repulsion loops, chemotaxis, and mechanosensory reflexes.
 */

class ClientConnectoSim {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    // Slender, elongated anatomical nematode proportions (44 segments, ~410px length)
    this.numPoints = 44;
    this.segLen = 9.5;

    this.width = canvas.width;
    this.height = canvas.height;
    this.cx = this.width / 2;
    this.cy = this.height / 2;

    // Centerline vertices
    this.points = [];
    for (let i = 0; i < this.numPoints; i++) {
      this.points.push({ x: this.cx - i * this.segLen, y: this.cy });
    }

    // Curvature & angle state
    this.baseAngles = new Float32Array(this.numPoints);
    this.angle = 0.0;
    this.wavePhase = 0.0;
    this.waveFreq = 0.16;
    this.speed = 2.1;
    this.state = "CHEMOTAXIS_FORWARD";
    this.wanderPhase = Math.random() * 10;

    // Substrate physics
    this.medium = "agar"; // "agar" (crawling) or "water" (swimming)

    // Nutrient attractant (NaCl)
    this.foodList = [
      { x: this.cx + 220, y: this.cy - 70, pulse: 0 }
    ];

    // Stimulus shockwaves
    this.ripples = [];

    // Reflexes
    this.escapeTimer = 0;
    this.reverse = false;
    this.sprint = false;
    this.sprintTimer = 0;

    this.dorsal = 54;
    this.ventral = 46;
  }

  toggleMedium() {
    if (this.medium === "agar") {
      this.medium = "water";
      this.waveFreq = 0.32;
      this.speed = 3.6;
    } else {
      this.medium = "agar";
      this.waveFreq = 0.16;
      this.speed = 2.1;
    }
    return this.medium;
  }

  addFood(x, y) {
    this.foodList.push({ x, y, pulse: 0 });
    this.ripples.push({ x, y, r: 4, maxR: 70, a: 0.85, col: "#3dff88" });
    if (this.foodList.length > 5) this.foodList.shift();
  }

  clearFood() {
    this.foodList = [];
  }

  triggerTouch(anterior = true) {
    const head = this.points[0];
    const tail = this.points[this.numPoints - 1];

    if (anterior) {
      this.escapeTimer = 55;
      this.reverse = true;
      this.sprint = false;
      this.state = "REVERSE_ESCAPE";
      this.ripples.push({ x: head.x, y: head.y, r: 6, maxR: 85, a: 0.9, col: "#ff8b7a" });
    } else {
      this.sprintTimer = 60;
      this.sprint = true;
      this.reverse = false;
      this.state = "ESCAPE_ACCELERATION";
      this.ripples.push({ x: tail.x, y: tail.y, r: 6, maxR: 85, a: 0.9, col: "#7deaff" });
    }
  }

  steerToward(targetAngle, rate) {
    let diff = targetAngle - this.angle;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    this.angle += diff * Math.min(1.0, rate);
  }

  step() {
    this.wavePhase += this.waveFreq;
    const head = this.points[0];

    // 1. Reflex Timers
    if (this.escapeTimer > 0) {
      this.escapeTimer--;
      if (this.escapeTimer === 0) {
        this.reverse = false;
        // Pirouette turn to reorient toward open space
        this.angle += (Math.random() - 0.5) * 2.4;
      }
    }

    if (this.sprintTimer > 0) {
      this.sprintTimer--;
      if (this.sprintTimer === 0) {
        this.sprint = false;
      }
    }

    // 2. Continuous Navigation: Food Chemotaxis OR Autonomous Foraging Loops
    if (!this.reverse && this.foodList.length > 0) {
      const target = this.foodList[0];
      const dx = target.x - head.x;
      const dy = target.y - head.y;
      const dist = Math.hypot(dx, dy);

      if (dist < 28) {
        this.ripples.push({ x: target.x, y: target.y, r: 6, maxR: 60, a: 0.9, col: "#7deaff" });
        this.foodList.shift();
        this.state = "FORAGING_SEARCH";
      } else {
        const desired = Math.atan2(dy, dx);
        this.steerToward(desired, this.medium === "agar" ? 0.048 : 0.038);
        this.state = "CHEMOTAXIS_FORWARD";
      }
    } else if (!this.reverse) {
      // Endless natural roaming loops (figure-eights and graceful sweeping arcs)
      this.wanderPhase += 0.014;
      const naturalDrift = Math.sin(this.wanderPhase * 0.7) * 0.024 + Math.cos(this.wanderPhase * 0.31) * 0.014;
      this.angle += naturalDrift;
      if (this.state !== "ESCAPE_ACCELERATION") this.state = "FORAGING_SEARCH";
    }

    // 3. Smooth Boundary Repulsion (Never teleports, never breaks across edges)
    const margin = 85;
    const repulsionRate = 0.075;
    const cx = this.width / 2;
    const cy = this.height / 2;

    if (head.x < margin) {
      const factor = (margin - head.x) / margin;
      const targetAngle = Math.atan2(cy - head.y, cx - head.x);
      this.steerToward(targetAngle, repulsionRate * factor);
    } else if (head.x > this.width - margin) {
      const factor = (head.x - (this.width - margin)) / margin;
      const targetAngle = Math.atan2(cy - head.y, cx - head.x);
      this.steerToward(targetAngle, repulsionRate * factor);
    }

    if (head.y < margin) {
      const factor = (margin - head.y) / margin;
      const targetAngle = Math.atan2(cy - head.y, cx - head.x);
      this.steerToward(targetAngle, repulsionRate * factor);
    } else if (head.y > this.height - margin) {
      const factor = (head.y - (this.height - margin)) / margin;
      const targetAngle = Math.atan2(cy - head.y, cx - head.x);
      this.steerToward(targetAngle, repulsionRate * factor);
    }

    // 4. Head Translation Speed
    let curSpeed = this.speed;
    if (this.reverse) curSpeed = -this.speed * 1.35;
    else if (this.sprint) curSpeed = this.speed * 2.15;

    head.x += Math.cos(this.angle) * curSpeed;
    head.y += Math.sin(this.angle) * curSpeed;

    // Hard safety clamp (prevents leaving canvas under extreme stimuli)
    head.x = Math.max(20, Math.min(this.width - 20, head.x));
    head.y = Math.max(20, Math.min(this.height - 20, head.y));

    // 5. C2 Continuous Hydrostatic Backbone Undulation
    this.baseAngles[0] = this.angle;
    const relaxation = this.medium === "agar" ? 0.30 : 0.44;

    for (let i = 1; i < this.numPoints; i++) {
      let diff = this.baseAngles[i - 1] - this.baseAngles[i];
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      this.baseAngles[i] += diff * relaxation;
    }

    const ampBase = this.medium === "agar" ? 0.48 : 0.78;
    const waveLag = this.medium === "agar" ? 0.20 : 0.30;
    const waveDir = this.reverse ? -1 : 1;

    for (let i = 1; i < this.numPoints; i++) {
      const normI = i / (this.numPoints - 1);
      // Anatomical envelope: head subtly steers, midbody undulates maximally, tail tip tapers
      const envelope = Math.sin(normI * Math.PI) ** 0.85;
      const undulation = Math.sin(this.wavePhase * waveDir - i * waveLag) * ampBase * envelope;
      const segAngle = this.baseAngles[i] + undulation;

      const prev = this.points[i - 1];
      const curr = this.points[i];
      curr.x = prev.x - Math.cos(segAngle) * this.segLen;
      curr.y = prev.y - Math.sin(segAngle) * this.segLen;
    }

    // 6. Dorsoventral Muscle Contraction Telemetry
    const sinWave = Math.sin(this.wavePhase);
    this.dorsal = Math.round(50 + sinWave * 38);
    this.ventral = Math.round(50 - sinWave * 38);

    // 7. Ripple Particle Animation
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      r.r += 2.0;
      r.a -= 0.022;
      if (r.a <= 0 || r.r >= r.maxR) this.ripples.splice(i, 1);
    }

    const spikes = Math.floor(160 + Math.abs(sinWave) * 45 + Math.random() * 16);
    const speedDisp = (Math.abs(curSpeed) * 0.15).toFixed(2);
    const active = this.reverse
      ? ["AVAL", "AVAR", "DA03", "VA04", "AVDL"]
      : ["AVBL", "AVBR", "DB02", "VB03", "ASEL"];

    return {
      state: this.state,
      speed_mms: speedDisp,
      spikes_count: spikes,
      mean_v: (-58.4 + sinWave * 4.2).toFixed(1),
      dorsal: this.dorsal,
      ventral: this.ventral,
      active_neurons: active,
      chem: (this.foodList.length > 0 ? (9.998 - Math.hypot(this.foodList[0].x - head.x, this.foodList[0].y - head.y) * 0.01).toFixed(3) : "0.000")
    };
  }

  render() {
    const ctx = this.ctx;
    ctx.fillStyle = "#05070a";
    ctx.fillRect(0, 0, this.width, this.height);

    // 1. Telemetry Coordinate Grid
    ctx.strokeStyle = "rgba(56, 189, 248, 0.04)";
    ctx.lineWidth = 1;
    const gridStep = 44;
    for (let x = 0; x < this.width; x += gridStep) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
      ctx.stroke();
    }
    for (let y = 0; y < this.height; y += gridStep) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
      ctx.stroke();
    }

    // 2. Shockwave Stimulus Ripples
    for (const r of this.ripples) {
      ctx.strokeStyle = r.col || "#3dff88";
      ctx.globalAlpha = Math.max(0, r.a);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1.0;

    // 3. Nutrient (NaCl) Food Halos
    for (const f of this.foodList) {
      f.pulse += 0.06;
      const haloR = 70 + Math.sin(f.pulse) * 6;
      const grad = ctx.createRadialGradient(f.x, f.y, 4, f.x, f.y, haloR);
      grad.addColorStop(0, "rgba(61, 255, 136, 0.45)");
      grad.addColorStop(0.45, "rgba(61, 255, 136, 0.12)");
      grad.addColorStop(1, "rgba(61, 255, 136, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(f.x, f.y, haloR, 0, Math.PI * 2);
      ctx.fill();

      // Nutrient Core Dot
      ctx.fillStyle = "#3dff88";
      ctx.beginPath();
      ctx.arc(f.x, f.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 4. Calculate Anatomical Normal Profiles for Unbroken Body Mesh
    const lefts = [];
    const rights = [];
    const N = this.numPoints;

    for (let i = 0; i < N; i++) {
      const p = this.points[i];
      const u = i / (N - 1);
      // Anatomical radius: rounded head (6.0px), widest midbody (12.5px), tapered tail tip (2.5px)
      const r = 4.5 + Math.sin(u * Math.PI) * 8.0;

      let tx, ty;
      if (i === 0) {
        tx = this.points[0].x - this.points[1].x;
        ty = this.points[0].y - this.points[1].y;
      } else if (i === N - 1) {
        tx = this.points[i - 1].x - this.points[i].x;
        ty = this.points[i - 1].y - this.points[i].y;
      } else {
        tx = this.points[i - 1].x - this.points[i + 1].x;
        ty = this.points[i - 1].y - this.points[i + 1].y;
      }
      const len = Math.hypot(tx, ty) || 1;
      const nx = -ty / len;
      const ny = tx / len;

      lefts.push({ x: p.x + nx * r, y: p.y + ny * r });
      rights.push({ x: p.x - nx * r, y: p.y - ny * r });
    }

    // 5. Render Alternating Muscle Quadrant Bands (Unbroken Connected Mesh)
    ctx.save();
    for (let i = 0; i < N - 1; i++) {
      ctx.beginPath();
      ctx.moveTo(lefts[i].x, lefts[i].y);
      ctx.lineTo(lefts[i + 1].x, lefts[i + 1].y);
      ctx.lineTo(rights[i + 1].x, rights[i + 1].y);
      ctx.lineTo(rights[i].x, rights[i].y);
      ctx.closePath();

      if (this.reverse) {
        ctx.fillStyle = (i % 2 === 0) ? "#ff8b7a" : "#ffa899";
      } else {
        // High contrast alternating phosphor green and electric cyan bands
        ctx.fillStyle = (i % 2 === 0) ? "#3dff88" : "#7deaff";
      }
      ctx.fill();
    }
    ctx.restore();

    // 6. Continuous Smooth Cuticle Envelope & Glow (Unbreakable Outer Tube)
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(lefts[0].x, lefts[0].y);

    // Smooth left edge
    for (let i = 0; i < lefts.length - 1; i++) {
      const xc = (lefts[i].x + lefts[i + 1].x) / 2;
      const yc = (lefts[i].y + lefts[i + 1].y) / 2;
      ctx.quadraticCurveTo(lefts[i].x, lefts[i].y, xc, yc);
    }
    ctx.lineTo(lefts[lefts.length - 1].x, lefts[lefts.length - 1].y);

    // Tail tip arc
    ctx.lineTo(rights[rights.length - 1].x, rights[rights.length - 1].y);

    // Smooth right edge back to head
    for (let i = rights.length - 1; i > 0; i--) {
      const xc = (rights[i].x + rights[i - 1].x) / 2;
      const yc = (rights[i].y + rights[i - 1].y) / 2;
      ctx.quadraticCurveTo(rights[i].x, rights[i].y, xc, yc);
    }
    ctx.closePath();

    ctx.strokeStyle = this.reverse ? "rgba(255, 139, 122, 0.9)" : "rgba(125, 234, 255, 0.9)";
    ctx.lineWidth = 1.8;
    ctx.shadowColor = this.reverse ? "#ff8b7a" : "#3dff88";
    ctx.shadowBlur = 14;
    ctx.stroke();
    ctx.restore();

    // 7. Silky-Smooth Ventral Nerve Cord (Zero Jagged Angles)
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(this.points[0].x, this.points[0].y);
    for (let i = 0; i < this.points.length - 1; i++) {
      const xc = (this.points[i].x + this.points[i + 1].x) / 2;
      const yc = (this.points[i].y + this.points[i + 1].y) / 2;
      ctx.quadraticCurveTo(this.points[i].x, this.points[i].y, xc, yc);
    }
    ctx.lineTo(this.points[this.points.length - 1].x, this.points[this.points.length - 1].y);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2.0;
    ctx.shadowColor = "#7deaff";
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.restore();

    // 8. Glowing Head Amphid Sensilla & Trajectory Heading Ray
    const head = this.points[0];
    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "#7deaff";
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(head.x, head.y, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Heading Trajectory Ray
    ctx.strokeStyle = "rgba(125, 234, 255, 0.45)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(head.x, head.y);
    ctx.lineTo(head.x + Math.cos(this.angle) * 36, head.y + Math.sin(this.angle) * 36);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }
}
