/**
 * Biophysical Locomotion Simulation on Canvas Arena (DANIO Live Rig)
 * Adult Danionella cerebrum (650,000 Vertebrate Neurons)
 * 
 * Renders the optically transparent teleost fish, vertebrate carangiform swimming,
 * internal 0.6 mm³ cranial window with glowing brain lobes (Tectum, Cerebellum, Telencephalon,
 * Hindbrain Mauthner cell), fluttering pectoral fins, bifurcated caudal tail fin,
 * 140.2 dB SPL acoustic drumming shockwaves, and Mauthner C-start escape reflex.
 */

class ClientConnectoSim {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    // Adult Danionella teleost vertebral spine (36 segments, ~410px total length)
    this.numPoints = 36;
    this.segLen = 11.5;

    this.width = canvas.width;
    this.height = canvas.height;
    this.cx = this.width / 2;
    this.cy = this.height / 2;

    // Centerline vertebral vertices (head is points[0], caudal tail is points[N-1])
    this.points = [];
    for (let i = 0; i < this.numPoints; i++) {
      this.points.push({ x: this.cx - i * this.segLen, y: this.cy });
    }

    // Curvature, heading & carangiform wave state
    this.baseAngles = new Float32Array(this.numPoints);
    this.angle = 0.0;
    this.wavePhase = 0.0;
    this.waveFreq = 0.22;
    this.speed = 2.8;
    this.state = "FORAGING_SEARCH";
    this.wanderPhase = Math.random() * 10;
    this.time = 0;

    // Substrate / Hydrodynamic environment
    this.medium = "water"; // "water" (fluid buffer / rheotaxis) or "agar" (laminar flow)

    // Living prey attractors (Paramecium / Artemia)
    this.foodList = [
      { x: this.cx + 220, y: this.cy - 70, pulse: 0 }
    ];

    // Acoustic drumming & hydro-stimulus shockwaves (140.2 dB SPL)
    this.ripples = [];
    this.drumTimer = 0;

    // Mauthner C-Start & sprint reflex state
    this.escapeTimer = 0;
    this.reverse = false;
    this.sprint = false;
    this.sprintTimer = 0;
    this.cStartSide = 1.0;

    // Vertebrate motor pool telemetry
    this.dorsal = 62;
    this.ventral = 38;

    // Fin flutter phases
    this.pectoralFlutter = 0.0;
  }

  toggleMedium() {
    if (this.medium === "water") {
      this.medium = "agar";
      this.waveFreq = 0.16;
      this.speed = 2.1;
    } else {
      this.medium = "water";
      this.waveFreq = 0.26;
      this.speed = 3.4;
    }
    return this.medium;
  }

  syncWithServer(loc) {
    if (!loc) return;
    const scaleX = this.canvas.width / 1000.0;
    const scaleY = this.canvas.height / 600.0;

    if (loc.x !== undefined) this.cx = loc.x * scaleX;
    if (loc.y !== undefined) this.cy = loc.y * scaleY;
    // Accept both legacy ("angle") and Danio engine ("heading") payload keys
    if (loc.angle !== undefined) this.angle = loc.angle;
    else if (loc.heading !== undefined) this.angle = loc.heading;
    if (loc.state !== undefined) this.state = loc.state;

    // Sync reflex visuals with the authoritative server state
    if (this.state === "MAUTHNER_ESCAPE" || this.state === "REVERSE_ESCAPE") {
      this.reverse = true;
      this.sprint = false;
    } else if (this.state === "ESCAPE_ACCELERATION") {
      this.sprint = true;
      this.reverse = false;
    } else {
      this.reverse = false;
      this.sprint = false;
    }

    // Direct segment coordinate sync from authoritative server.
    // Accepts legacy "points" ([x,y] pairs) and Danio "segments" ({x,y,angle} dicts).
    // The server polyline is arc-length resampled onto the client's 44-point
    // backbone, so no tail segment is ever left stranded at a stale position.
    // Samples are kept in a short ring buffer for timestamp-based interpolation
    // in render() (fluid 60 fps from 50 Hz server telemetry, zero phase lag).
    const serverPts = (loc.points && Array.isArray(loc.points) && loc.points.length > 0)
      ? loc.points
      : (loc.segments && Array.isArray(loc.segments) && loc.segments.length > 0 ? loc.segments : null);
    if (serverPts) {
      const resampled = this._resampleToBackbone(serverPts, scaleX, scaleY);
      if (resampled) {
        this.serverBuf = this.serverBuf || [];
        this.serverBuf.push({ t: performance.now(), pts: resampled });
        while (this.serverBuf.length > 3) this.serverBuf.shift();
        this.serverTargets = resampled; // alias for tooling/reset
      }
    }

    // Authoritative global food list sync
    if (loc.food_list && Array.isArray(loc.food_list)) {
      this.foodList = loc.food_list.map(f => ({
        x: f.x * scaleX,
        y: f.y * scaleY,
        pulse: f.pulse || 0
      }));
    }
  }

  // Arc-length resample of any server polyline (N pts) onto the client's backbone.
  _resampleToBackbone(pts, scaleX, scaleY) {
    const n = this.numPoints;
    const src = [];
    for (const p of pts) {
      const px = Array.isArray(p) ? p[0] : p.x;
      const py = Array.isArray(p) ? p[1] : p.y;
      if (px === undefined || py === undefined) continue;
      src.push({ x: px * scaleX, y: py * scaleY });
    }
    if (src.length === 0) return null;

    const out = new Array(n);
    if (src.length === 1) {
      for (let i = 0; i < n; i++) out[i] = { x: src[0].x, y: src[0].y };
      return out;
    }

    // Cumulative arc lengths along the server polyline
    const cum = [0];
    for (let i = 1; i < src.length; i++) {
      cum.push(cum[i - 1] + Math.hypot(src[i].x - src[i - 1].x, src[i].y - src[i - 1].y));
    }
    const total = cum[cum.length - 1];
    if (total < 1e-6) {
      for (let i = 0; i < n; i++) out[i] = { x: src[0].x, y: src[0].y };
      return out;
    }

    // Walk the client's evenly-spaced samples along the polyline
    let j = 1;
    for (let i = 0; i < n; i++) {
      const d = (i / (n - 1)) * total;
      while (j < cum.length - 1 && cum[j] < d) j++;
      const segLen = (cum[j] - cum[j - 1]) || 1e-6;
      const t = Math.max(0, Math.min(1, (d - cum[j - 1]) / segLen));
      out[i] = {
        x: src[j - 1].x + (src[j].x - src[j - 1].x) * t,
        y: src[j - 1].y + (src[j].y - src[j - 1].y) * t
      };
    }
    return out;
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
      // Mauthner Cell C-Start Escape: Unilateral flexion & burst acceleration
      this.escapeTimer = 48;
      this.reverse = true;
      this.sprint = false;
      this.cStartSide = Math.random() > 0.5 ? 1.0 : -1.0;
      this.state = "MAUTHNER_ESCAPE";
      this.ripples.push({ x: head.x, y: head.y, r: 8, maxR: 110, a: 0.95, col: "#f43f5e" });
      this.ripples.push({ x: head.x, y: head.y, r: 14, maxR: 180, a: 0.7, col: "#38bdf8" });
    } else {
      // 140.2 dB SPL Sonic Drumming Pulse & Acceleration
      this.sprintTimer = 55;
      this.sprint = true;
      this.reverse = false;
      this.state = "SONIC_DRUMMING";
      this.ripples.push({ x: tail.x, y: tail.y, r: 8, maxR: 130, a: 0.95, col: "#06b6d4" });
    }
  }

  steerToward(targetAngle, rate) {
    let diff = targetAngle - this.angle;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    this.angle += diff * Math.min(1.0, rate);
  }

  step() {
    this.time += 0.02;
    this.wavePhase += this.waveFreq;
    this.pectoralFlutter += 0.35;
    const head = this.points[0];

    // 1. Reflex Timers (Mauthner C-start & Sonic Drumming)
    if (this.escapeTimer > 0) {
      this.escapeTimer--;
      if (this.escapeTimer === 0) {
        this.reverse = false;
        this.angle += this.cStartSide * (Math.PI * 0.45);
      }
    }

    if (this.sprintTimer > 0) {
      this.sprintTimer--;
      if (this.sprintTimer === 0) {
        this.sprint = false;
      }
    }

    // Periodic spontaneous 140 dB drumming pulse (every ~6 seconds)
    this.drumTimer += 0.02;
    if (this.drumTimer > 6.0) {
      this.drumTimer = 0;
      const mid = this.points[Math.floor(this.numPoints * 0.35)];
      this.ripples.push({ x: mid.x, y: mid.y, r: 10, maxR: 160, a: 0.85, col: "#38bdf8" });
    }

    // 2. Navigation: Visual Prey Pursuit (Optic Tectum Saccades) OR Foraging Sweep
    if (!this.reverse && this.foodList.length > 0) {
      const target = this.foodList[0];
      const dx = target.x - head.x;
      const dy = target.y - head.y;
      const dist = Math.hypot(dx, dy);

      if (dist < 32) {
        this.ripples.push({ x: target.x, y: target.y, r: 8, maxR: 70, a: 0.95, col: "#10b981" });
        this.foodList.shift();
        this.state = "FORAGING_SEARCH";
      } else {
        const desired = Math.atan2(dy, dx);
        this.steerToward(desired, 0.052);
        this.state = "CHEMOTAXIS_FORWARD";
      }
    } else if (!this.reverse) {
      this.wanderPhase += 0.016;
      const naturalDrift = Math.sin(this.wanderPhase * 0.65) * 0.028 + Math.cos(this.wanderPhase * 0.28) * 0.015;
      this.angle += naturalDrift;
      if (this.state !== "SONIC_DRUMMING" && this.state !== "ESCAPE_ACCELERATION") {
        this.state = "FORAGING_SEARCH";
      }
    }

    // 3. Smooth Arena Boundary Repulsion
    const margin = 85;
    const repulsionRate = 0.082;
    const cx = this.width / 2;
    const cy = this.height / 2;

    if (head.x < margin) {
      const factor = (margin - head.x) / margin;
      this.steerToward(Math.atan2(cy - head.y, cx - head.x), repulsionRate * factor);
    } else if (head.x > this.width - margin) {
      const factor = (head.x - (this.width - margin)) / margin;
      this.steerToward(Math.atan2(cy - head.y, cx - head.x), repulsionRate * factor);
    }

    if (head.y < margin) {
      const factor = (margin - head.y) / margin;
      this.steerToward(Math.atan2(cy - head.y, cx - head.x), repulsionRate * factor);
    } else if (head.y > this.height - margin) {
      const factor = (head.y - (this.height - margin)) / margin;
      this.steerToward(Math.atan2(cy - head.y, cx - head.x), repulsionRate * factor);
    }

    // 4. Forward Velocity Calculation
    let curSpeed = this.speed;
    if (this.reverse) {
      curSpeed = this.speed * 2.2;
    } else if (this.sprint) {
      curSpeed = this.speed * 1.85;
    }

    head.x += Math.cos(this.angle) * curSpeed;
    head.y += Math.sin(this.angle) * curSpeed;

    head.x = Math.max(24, Math.min(this.width - 24, head.x));
    head.y = Math.max(24, Math.min(this.height - 24, head.y));

    // 5. Vertebrate Carangiform Swimming Kinematics
    this.baseAngles[0] = this.angle;
    const relaxation = 0.36;

    for (let i = 1; i < this.numPoints; i++) {
      let diff = this.baseAngles[i - 1] - this.baseAngles[i];
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      this.baseAngles[i] += diff * relaxation;
    }

    for (let i = 1; i < this.numPoints; i++) {
      const u = i / (this.numPoints - 1);
      let carangiformAmp;
      if (this.reverse) {
        const cShape = Math.sin(u * Math.PI);
        carangiformAmp = this.cStartSide * cShape * 1.35;
      } else {
        const tailGain = Math.pow(u, 1.85);
        carangiformAmp = Math.sin(this.wavePhase - i * 0.28) * (tailGain * 0.85);
      }

      const segAngle = this.baseAngles[i] + carangiformAmp;
      const prev = this.points[i - 1];
      const curr = this.points[i];
      curr.x = prev.x - Math.cos(segAngle) * this.segLen;
      curr.y = prev.y - Math.sin(segAngle) * this.segLen;
    }

    // 6. Vertebrate Motor Pool Activity Telemetry
    const sinWave = Math.sin(this.wavePhase);
    this.dorsal = Math.round(52 + sinWave * 32);
    this.ventral = Math.round(52 - sinWave * 32);

    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      r.r += 2.4;
      r.a -= 0.024;
      if (r.a <= 0 || r.r >= r.maxR) this.ripples.splice(i, 1);
    }

    const spikes = Math.floor(450 + Math.abs(sinWave) * 380 + (this.sprint ? 320 : 0));
    const speedDisp = (curSpeed * 125.0).toFixed(1);
    const active = this.reverse
      ? ["Rh_Mauthner_L", "Sp_VentralRoot_R", "Sonic_DrummingMotor", "Ce_Cerebellum_Purkinje"]
      : ["Mes_OpticTectum_L", "Mes_OpticTectum_R", "Ce_Cerebellum_Granule", "Sp_VentralRoot_L", "Tel_DorsalPallium"];

    return {
      state: this.state,
      speed_mms: speedDisp,
      spikes_count: spikes,
      mean_v: (-62.5 + sinWave * 5.5).toFixed(1),
      dorsal: this.dorsal,
      ventral: this.ventral,
      active_neurons: active,
      chem: (this.foodList.length > 0 ? (9.998 - Math.hypot(this.foodList[0].x - head.x, this.foodList[0].y - head.y) * 0.01).toFixed(3) : "0.000")
    };
  }

  render() {
    const ctx = this.ctx;

    // 0. Authoritative server sync: timestamp-based linear interpolation of the
    // 44-point backbone between the last two server samples (50 Hz -> 60 fps).
    // Unlike low-pass smoothing this adds zero spatial lag, so the fast tail
    // whip stays phase-correct. Stale samples expire so a dropped WebSocket
    // hands control back to the local client-side simulation within 400 ms.
    if (this.serverBuf && this.serverBuf.length > 0) {
      const now = performance.now();
      const latest = this.serverBuf[this.serverBuf.length - 1];
      if (now - latest.t > 400) {
        // WebSocket is dead — drop all samples so the local sim drives the fish
        this.serverBuf.length = 0;
      } else {
        while (this.serverBuf.length > 1 && now - this.serverBuf[0].t > 400) this.serverBuf.shift();
        const a = this.serverBuf.length >= 2 ? this.serverBuf[this.serverBuf.length - 2] : null;
        const c = this.serverBuf[this.serverBuf.length - 1];

        if (a) {
          const span = c.t - a.t;
          let alpha = span > 1 ? Math.min(1.0, (now - a.t) / span) : 1.0;

          // Teleport guard (reconnect after a long gap): glide in instead of jumping
          let far = false;
          for (let i = 0; i < this.points.length; i += 11) {
            const px = a.pts[i].x + (c.pts[i].x - a.pts[i].x) * alpha;
            const py = a.pts[i].y + (c.pts[i].y - a.pts[i].y) * alpha;
            if (Math.hypot(px - this.points[i].x, py - this.points[i].y) > 150) { far = true; break; }
          }
          if (far) alpha = 1.0;

          const glide = far ? 0.35 : 1.0;
          for (let i = 0; i < this.points.length; i++) {
            const tx = a.pts[i].x + (c.pts[i].x - a.pts[i].x) * alpha;
            const ty = a.pts[i].y + (c.pts[i].y - a.pts[i].y) * alpha;
            if (glide < 1.0) {
              this.points[i].x += (tx - this.points[i].x) * glide;
              this.points[i].y += (ty - this.points[i].y) * glide;
            } else {
              this.points[i].x = tx;
              this.points[i].y = ty;
            }
          }
        } else {
          // Only one fresh sample yet — glide toward it
          const k = 0.35;
          for (let i = 0; i < this.points.length; i++) {
            this.points[i].x += (c.pts[i].x - this.points[i].x) * k;
            this.points[i].y += (c.pts[i].y - this.points[i].y) * k;
          }
        }
      }
    }

    // 0. Dark deep-water scientific arena background
    ctx.fillStyle = "#05070a";
    ctx.fillRect(0, 0, this.width, this.height);

    // 1. Hydrodynamic Telemetry Coordinate Grid
    ctx.strokeStyle = "rgba(56, 189, 248, 0.035)";
    ctx.lineWidth = 1;
    const gridStep = 48;
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

    // 2. Expanding 140.2 dB Acoustic Shockwave Ripples
    for (const r of this.ripples) {
      ctx.strokeStyle = r.col || "#38bdf8";
      ctx.globalAlpha = Math.max(0, r.a);
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = "rgba(56, 189, 248, 0.35)";
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r * 0.72, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1.0;

    // 3. Living Prey Attractors (Paramecium / Artemia)
    for (const f of this.foodList) {
      f.pulse += 0.065;
      const haloR = 48 + Math.sin(f.pulse) * 6;
      
      const grad = ctx.createRadialGradient(f.x, f.y, 3, f.x, f.y, haloR);
      grad.addColorStop(0, "rgba(56, 189, 248, 0.45)");
      grad.addColorStop(0.5, "rgba(6, 182, 212, 0.15)");
      grad.addColorStop(1, "rgba(56, 189, 248, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(f.x, f.y, haloR, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(f.pulse * 0.4);

      ctx.fillStyle = "#38bdf8";
      ctx.beginPath();
      ctx.ellipse(0, 0, 8, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "rgba(125, 234, 255, 0.6)";
      ctx.lineWidth = 1;
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 8, Math.sin(a) * 4.5);
        ctx.lineTo(Math.cos(a) * 12, Math.sin(a) * 7);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 4. Compute Adult Danionella Teleost Anatomical Profiles
    const N = this.numPoints;
    const lefts = [];
    const rights = [];
    const rads = [];

    for (let i = 0; i < N; i++) {
      const p = this.points[i];
      const u = i / (N - 1);

      let r;
      if (u < 0.12) {
        r = 6.0 + (u / 0.12) * 9.0;
      } else if (u < 0.32) {
        r = 15.0 + Math.sin((u - 0.12) / 0.20 * Math.PI) * 2.5;
      } else if (u < 0.55) {
        r = 17.5 - ((u - 0.32) / 0.23) * 3.5;
      } else {
        r = Math.max(3.8, 14.0 * Math.pow(1.0 - u, 0.75) + 3.8);
      }
      rads.push(r);

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

    // 5. Draw Translucent Vertebrate Fish Body Envelope
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(lefts[0].x, lefts[0].y);

    for (let i = 0; i < lefts.length - 1; i++) {
      const xc = (lefts[i].x + lefts[i + 1].x) / 2;
      const yc = (lefts[i].y + lefts[i + 1].y) / 2;
      ctx.quadraticCurveTo(lefts[i].x, lefts[i].y, xc, yc);
    }
    ctx.lineTo(lefts[lefts.length - 1].x, lefts[lefts.length - 1].y);
    ctx.lineTo(rights[rights.length - 1].x, rights[rights.length - 1].y);

    for (let i = rights.length - 1; i > 0; i--) {
      const xc = (rights[i].x + rights[i - 1].x) / 2;
      const yc = (rights[i].y + rights[i - 1].y) / 2;
      ctx.quadraticCurveTo(rights[i].x, rights[i].y, xc, yc);
    }
    ctx.closePath();

    const snout = this.points[0];
    const tailBase = this.points[N - 1];
    const fishGrad = ctx.createLinearGradient(snout.x, snout.y, tailBase.x, tailBase.y);
    if (this.reverse) {
      fishGrad.addColorStop(0, "rgba(244, 63, 94, 0.28)");
      fishGrad.addColorStop(0.5, "rgba(244, 63, 94, 0.12)");
      fishGrad.addColorStop(1, "rgba(255, 139, 122, 0.05)");
    } else {
      fishGrad.addColorStop(0, "rgba(56, 189, 248, 0.25)");
      fishGrad.addColorStop(0.4, "rgba(6, 182, 212, 0.14)");
      fishGrad.addColorStop(1, "rgba(16, 185, 129, 0.06)");
    }
    ctx.fillStyle = fishGrad;
    ctx.fill();

    ctx.strokeStyle = this.reverse ? "rgba(244, 63, 94, 0.85)" : "rgba(56, 189, 248, 0.75)";
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.restore();

    // 6. Draw Segmented Vertebrae Column & Myotome Chevron Blocks
    ctx.save();
    for (let i = 2; i < N - 2; i += 2) {
      const p = this.points[i];
      const pPrev = this.points[i - 1];
      const dx = p.x - pPrev.x;
      const dy = p.y - pPrev.y;
      const angle = Math.atan2(dy, dx);

      ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.4, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = this.reverse ? "rgba(255, 139, 122, 0.18)" : "rgba(56, 189, 248, 0.14)";
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(lefts[i].x, lefts[i].y);
      ctx.lineTo(p.x - Math.cos(angle) * 3, p.y - Math.sin(angle) * 3);
      ctx.lineTo(rights[i].x, rights[i].y);
      ctx.stroke();
    }
    ctx.restore();

    // 7. Continuous Spinal Cord
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(this.points[0].x, this.points[0].y);
    for (let i = 0; i < N - 1; i++) {
      const xc = (this.points[i].x + this.points[i + 1].x) / 2;
      const yc = (this.points[i].y + this.points[i + 1].y) / 2;
      ctx.quadraticCurveTo(this.points[i].x, this.points[i].y, xc, yc);
    }
    ctx.lineTo(this.points[N - 1].x, this.points[N - 1].y);
    ctx.strokeStyle = this.reverse ? "#f43f5e" : "#38bdf8";
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.restore();

    // 8. Bifurcated Caudal Fin (Homocercal Fish Tail with Fin Rays)
    ctx.save();
    const tailP = this.points[N - 1];
    const tailPPrev = this.points[N - 3];
    const tailAngle = Math.atan2(tailP.y - tailPPrev.y, tailP.x - tailPPrev.x);

    ctx.translate(tailP.x, tailP.y);
    ctx.rotate(tailAngle);

    const finLen = 32;
    const finSpread = 22;

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(finLen * 0.5, -finSpread * 0.9, finLen, -finSpread);
    ctx.quadraticCurveTo(finLen * 0.7, 0, finLen * 0.3, 0);
    ctx.closePath();
    ctx.fillStyle = "rgba(56, 189, 248, 0.22)";
    ctx.fill();
    ctx.strokeStyle = "rgba(56, 189, 248, 0.8)";
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(finLen * 0.5, finSpread * 0.9, finLen, finSpread);
    ctx.quadraticCurveTo(finLen * 0.7, 0, finLen * 0.3, 0);
    ctx.closePath();
    ctx.fillStyle = "rgba(56, 189, 248, 0.22)";
    ctx.fill();
    ctx.strokeStyle = "rgba(56, 189, 248, 0.8)";
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
    ctx.lineWidth = 0.8;
    for (let r = -finSpread * 0.85; r <= finSpread * 0.85; r += 5.5) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(finLen * (0.65 + Math.abs(r) / finSpread * 0.35), r);
      ctx.stroke();
    }
    ctx.restore();

    // 9. Fluttering Pectoral Fins
    const pecIdx = Math.floor(N * 0.22);
    const pecAngle = Math.atan2(this.points[pecIdx].y - this.points[pecIdx - 1].y, this.points[pecIdx].x - this.points[pecIdx - 1].x);
    const flutter = Math.sin(this.pectoralFlutter) * 0.25;

    ctx.save();
    ctx.translate(lefts[pecIdx].x, lefts[pecIdx].y);
    ctx.rotate(pecAngle - Math.PI * 0.45 + flutter);
    ctx.beginPath();
    ctx.ellipse(8, 0, 14, 5, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(56, 189, 248, 0.25)";
    ctx.fill();
    ctx.strokeStyle = "rgba(56, 189, 248, 0.6)";
    ctx.lineWidth = 1.0;
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.translate(rights[pecIdx].x, rights[pecIdx].y);
    ctx.rotate(pecAngle + Math.PI * 0.45 - flutter);
    ctx.beginPath();
    ctx.ellipse(8, 0, 14, 5, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(56, 189, 248, 0.25)";
    ctx.fill();
    ctx.strokeStyle = "rgba(56, 189, 248, 0.6)";
    ctx.lineWidth = 1.0;
    ctx.stroke();
    ctx.restore();

    // 10. Glowing Cranial Window & Vertebrate Brain Lobes (0.6 mm³)
    const cranialP = this.points[Math.floor(N * 0.12)];
    const headAngle = Math.atan2(this.points[0].y - this.points[1].y, this.points[0].x - this.points[1].x);

    ctx.save();
    ctx.translate(cranialP.x, cranialP.y);
    ctx.rotate(headAngle);

    const cranialGlow = ctx.createRadialGradient(0, 0, 2, 0, 0, 18);
    cranialGlow.addColorStop(0, "rgba(56, 189, 248, 0.35)");
    cranialGlow.addColorStop(0.7, "rgba(6, 182, 212, 0.12)");
    cranialGlow.addColorStop(1, "rgba(56, 189, 248, 0)");
    ctx.fillStyle = cranialGlow;
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.fill();

    // Telencephalon
    ctx.fillStyle = "#38bdf8";
    ctx.beginPath();
    ctx.ellipse(7, -2.5, 4.5, 2.5, 0, 0, Math.PI * 2);
    ctx.ellipse(7, 2.5, 4.5, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Optic Tectum
    ctx.fillStyle = "#06b6d4";
    ctx.beginPath();
    ctx.ellipse(1, -4.5, 6.0, 3.5, -0.2, 0, Math.PI * 2);
    ctx.ellipse(1, 4.5, 6.0, 3.5, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Cerebellum
    ctx.fillStyle = "#10b981";
    ctx.beginPath();
    ctx.ellipse(-5, 0, 4.5, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hindbrain & Mauthner Cell
    ctx.fillStyle = this.reverse ? "#f43f5e" : "#a855f7";
    ctx.beginPath();
    ctx.ellipse(-10, -2.5, 3.2, 2.0, 0, 0, Math.PI * 2);
    ctx.ellipse(-10, 2.5, 3.2, 2.0, 0, 0, Math.PI * 2);
    ctx.fill();

    // Teleost Eyes
    ctx.fillStyle = "#05070a";
    ctx.beginPath();
    ctx.arc(5, -11, 4.0, 0, Math.PI * 2);
    ctx.arc(5, 11, 4.0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(6, -11, 2.0, 0, Math.PI * 2);
    ctx.arc(6, 11, 2.0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 11. Resonant Swim Bladder & 140 dB Sonic Drumming Organ
    const swimP = this.points[Math.floor(N * 0.36)];
    const bodyAngle = Math.atan2(this.points[Math.floor(N * 0.36)].y - this.points[Math.floor(N * 0.36) - 1].y,
                                 this.points[Math.floor(N * 0.36)].x - this.points[Math.floor(N * 0.36) - 1].x);

    ctx.save();
    ctx.translate(swimP.x, swimP.y);
    ctx.rotate(bodyAngle);

    ctx.fillStyle = "rgba(125, 234, 255, 0.35)";
    ctx.beginPath();
    ctx.ellipse(0, 0, 11, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(125, 234, 255, 0.7)";
    ctx.lineWidth = 1.0;
    ctx.stroke();

    ctx.fillStyle = "rgba(244, 63, 94, 0.6)";
    ctx.fillRect(-6, -6.5, 12, 1.8);
    ctx.fillRect(-6, 4.7, 12, 1.8);
    ctx.restore();

    // 12. Saccadic Heading Trajectory Ray
    ctx.save();
    ctx.strokeStyle = "rgba(56, 189, 248, 0.4)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(snout.x, snout.y);
    ctx.lineTo(snout.x + Math.cos(this.angle) * 42, snout.y + Math.sin(this.angle) * 42);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }
}

if (typeof window !== 'undefined') {
  window.DanioTeleostSim = ClientConnectoSim;
  window.ClientConnectoSim = ClientConnectoSim;
}
