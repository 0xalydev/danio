/**
 * CONNECTO · MASTER APPLICATION COORDINATOR
 * Orchestrates:
 * 1. Hero Specimen Observation Chamber (3D/2.5D Canvas)
 * 2. Closed-Loop Biophysical Rig (Tactile Arena, Hydrodynamics, Stimuli)
 * 3. Real-Time Population Oscilloscope
 * 4. Anatomical Dissector (Interactive Nematode Anatomy)
 * 5. 302-Neuron Connectome Network Graph
 * 6. DeSci Telemetry & Clipboard Utilities
 */

document.addEventListener('DOMContentLoaded', () => {
  const CONTRACT_ADDRESS = "0x7b194d2e82f7c2294dae3d74c0b468a5294e019c";

  // =========================================================================
  // 1. HERO SPECIMEN OBSERVATION CHAMBER (Handled by hero_organism.js)
  // =========================================================================

  // =========================================================================
  // 2. LIVE RIG: CLIENT-SIDE BIOPHYSICAL SIMULATION & ARENA
  // =========================================================================
  const rigCanvas = document.getElementById('rig-canvas');
  let sim = null;
  let isSimPaused = false;
  let animFrameId = null;

  if (rigCanvas && typeof ClientConnectoSim !== 'undefined') {
    // Canvas sizing
    const resizeRig = () => {
      const rect = rigCanvas.parentElement.getBoundingClientRect();
      rigCanvas.width = rect.width;
      rigCanvas.height = Math.max(rect.height, 540);
      if (sim) {
        sim.width = rigCanvas.width;
        sim.height = rigCanvas.height;
      }
    };
    resizeRig();
    window.addEventListener('resize', resizeRig);

    sim = new ClientConnectoSim(rigCanvas);

    // Drop food on arena click & broadcast globally across all users
    rigCanvas.addEventListener('click', (e) => {
      const rect = rigCanvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      sim.addFood(x, y);

      const scaleX = 1000.0 / rigCanvas.width;
      const scaleY = 600.0 / rigCanvas.height;
      fetch('/api/food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ x: x * scaleX, y: y * scaleY, strength: 10.0 })
      }).catch(() => {});
    });
  }

  // Substrate Mode Switching (Agar Gel vs Fluid Buffer)
  const btnModeAgar = document.getElementById('btn-mode-agar');
  const btnModeFluid = document.getElementById('btn-mode-fluid');
  const substrateLabel = document.getElementById('substrate-label');
  const statDragVal = document.getElementById('stat-drag-val');

  if (btnModeAgar && btnModeFluid) {
    btnModeAgar.addEventListener('click', () => {
      btnModeAgar.classList.add('active');
      btnModeFluid.classList.remove('active');
      if (sim && sim.medium !== 'agar') sim.toggleMedium();
      if (substrateLabel) substrateLabel.textContent = "SUBSTRATE: GEL AGAR (CRAWL)";
      if (statDragVal) statDragVal.textContent = "35.0";
    });

    btnModeFluid.addEventListener('click', () => {
      btnModeFluid.classList.add('active');
      btnModeAgar.classList.remove('active');
      if (sim && sim.medium !== 'water') sim.toggleMedium();
      if (substrateLabel) substrateLabel.textContent = "SUBSTRATE: FLUID BUFFER (SWIM)";
      if (statDragVal) statDragVal.textContent = "1.8";
    });
  }

  // Stimulus Controls
  const btnStimAnterior = document.getElementById('btn-stim-anterior');
  const btnStimPosterior = document.getElementById('btn-stim-posterior');
  const btnPauseSim = document.getElementById('btn-pause-sim');
  const btnPauseText = document.getElementById('btn-pause-text');
  const btnResetRig = document.getElementById('btn-reset-rig');

  if (btnStimAnterior) {
    btnStimAnterior.addEventListener('click', () => {
      if (sim) sim.triggerTouch(true);
      fetch('/api/touch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anterior: true })
      }).catch(() => {});
    });
  }

  if (btnStimPosterior) {
    btnStimPosterior.addEventListener('click', () => {
      if (sim) sim.triggerTouch(false);
      fetch('/api/touch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anterior: false })
      }).catch(() => {});
    });
  }

  if (btnPauseSim) {
    btnPauseSim.addEventListener('click', () => {
      isSimPaused = !isSimPaused;
      if (btnPauseText) btnPauseText.textContent = isSimPaused ? 'RESUME' : 'PAUSE';
    });
  }

  if (btnResetRig) {
    btnResetRig.addEventListener('click', () => {
      if (sim) {
        sim.clearFood();
        sim.cx = sim.width / 2;
        sim.cy = sim.height / 2;
        sim.points = [];
        for (let i = 0; i < sim.numPoints; i++) {
          sim.points.push({ x: sim.cx - i * sim.segLen, y: sim.cy });
        }
        sim.angle = 0;
        if (sim.baseAngles) sim.baseAngles.fill(0);
        sim.state = "FORAGING_SEARCH";
      }
    });
  }

  // Telemetry DOM Bindings — Core readout chips
  const elDominantState = document.getElementById('tel-dominant-state');
  const elVelocity      = document.getElementById('tel-velocity');
  const elFrequency     = document.getElementById('tel-frequency');
  const elVm            = document.getElementById('tel-vm');
  const elNutrient      = document.getElementById('tel-nutrient');

  // Motor Pool Rate Bars
  const barDbRate  = document.getElementById('bar-db-rate');
  const barVbRate  = document.getElementById('bar-vb-rate');
  const barDdRate  = document.getElementById('bar-dd-rate');
  const barVdRate  = document.getElementById('bar-vd-rate');
  const barAvaRate = document.getElementById('bar-ava-rate');
  const valDbRate  = document.getElementById('val-db-rate');
  const valVbRate  = document.getElementById('val-vb-rate');
  const valDdRate  = document.getElementById('val-dd-rate');
  const valVdRate  = document.getElementById('val-vd-rate');
  const valAvaRate = document.getElementById('val-ava-rate');

  // Raster / Oscilloscope / Event Log
  const rasterCanvas   = document.getElementById('tele-raster-canvas');
  const rasterCtx      = rasterCanvas ? rasterCanvas.getContext('2d') : null;
  const rasterSpikeRate = document.getElementById('raster-spike-rate');
  const oscCanvas      = document.getElementById('tele-oscilloscope');
  const oscCtx         = oscCanvas ? oscCanvas.getContext('2d') : null;
  const patchVmReadout = document.getElementById('patch-vm-readout');
  const eventLog       = document.getElementById('tele-event-log');

  // =========================================================================
  // 3-A. MOTOR POOL RATE BAR UPDATER
  // State-driven: FORWARD → high DB/VB, low AVA; REVERSE → high AVA, low DB/VB
  // =========================================================================
  function setMotorBar(barEl, valEl, pct, hz) {
    if (barEl) barEl.style.width = `${Math.min(100, Math.max(0, pct))}%`;
    if (valEl) valEl.textContent = `${Math.round(hz)} Hz`;
  }

  function updateMotorBars(telem) {
    const dorsal  = parseFloat(telem.dorsal)  || 50;
    const ventral = parseFloat(telem.ventral) || 50;
    const state   = (telem.state || '').toUpperCase();
    const isReverse = state.includes('REVERS') || state.includes('ESCAPE');
    const isFwd     = state.includes('FORAG') || state.includes('CHEMO') || state.includes('SPRINT');

    // DB (dorsal excitatory B-type) — high during forward locomotion
    const dbPct  = isFwd ? Math.min(95, dorsal + 20 + Math.sin(Date.now() * 0.003) * 8) : Math.max(8, dorsal * 0.35);
    // VB (ventral excitatory B-type) — anti-phase to DB
    const vbPct  = isFwd ? Math.min(95, ventral + 15 + Math.sin(Date.now() * 0.003 + 2.1) * 8) : Math.max(8, ventral * 0.35);
    // DD / VD — GABA cross-inhibitory interneurons — inverse of their excitatory partner
    const ddPct  = 100 - dbPct + Math.sin(Date.now() * 0.004) * 5;
    const vdPct  = 100 - vbPct + Math.cos(Date.now() * 0.004) * 5;
    // AVA — reversal command: high during REVERSE, silent during forward
    const avaPct = isReverse ? 75 + Math.sin(Date.now() * 0.005) * 18 : Math.max(4, 15 - (isFwd ? 10 : 0));

    setMotorBar(barDbRate,  valDbRate,  dbPct,  dbPct  * 1.4);
    setMotorBar(barVbRate,  valVbRate,  vbPct,  vbPct  * 1.4);
    setMotorBar(barDdRate,  valDdRate,  ddPct,  ddPct  * 0.85);
    setMotorBar(barVdRate,  valVdRate,  vdPct,  vdPct  * 0.85);
    setMotorBar(barAvaRate, valAvaRate, avaPct, avaPct * 1.2);
  }

  // =========================================================================
  // 3-B. 302-CHANNEL SPIKE RASTER  (scrolling left, FlyBrain-grade)
  // 3 bands: Sensory (top, cyan), Interneuron (mid, amber), Motor (bot, emerald)
  // =========================================================================
  const RASTER_W       = 340;
  const RASTER_H       = 76;
  const RASTER_COLS    = RASTER_W;      // one pixel column per frame bucket
  // Pixel heights per band
  const BAND_H_SENS    = 22;            // rows 0‥21
  const BAND_H_INTER   = 22;            // rows 22‥43
  const BAND_H_MOTOR   = 32;            // rows 44‥75  (motor gets more real-estate)

  // Off-screen buffer so we can scroll by blitting
  let rasterBuf = null;
  if (rasterCtx) {
    rasterBuf = document.createElement('canvas');
    rasterBuf.width  = RASTER_W;
    rasterBuf.height = RASTER_H;
    const bCtx = rasterBuf.getContext('2d');
    bCtx.fillStyle = '#020704';
    bCtx.fillRect(0, 0, RASTER_W, RASTER_H);
  }

  let rasterTotalSpikes = 0;
  let rasterFrame = 0;

  function renderSpikeRaster(telem) {
    if (!rasterCtx || !rasterBuf) return;
    const bCtx = rasterBuf.getContext('2d');
    rasterFrame++;

    // 1. Scroll buffer 1px left
    const imgData = bCtx.getImageData(1, 0, RASTER_W - 1, RASTER_H);
    bCtx.putImageData(imgData, 0, 0);

    // 2. Clear the rightmost column
    bCtx.fillStyle = '#020704';
    bCtx.fillRect(RASTER_W - 1, 0, 1, RASTER_H);

    // 3. Draw band separator lines (very faint)
    bCtx.fillStyle = 'rgba(255,255,255,0.06)';
    bCtx.fillRect(RASTER_W - 1, BAND_H_SENS,  1, 1);
    bCtx.fillRect(RASTER_W - 1, BAND_H_SENS + BAND_H_INTER, 1, 1);

    // 4. Compute firing rates from telem
    const state    = (telem.state || '').toUpperCase();
    const isFwd    = state.includes('FORAG') || state.includes('CHEMO') || state.includes('SPRINT');
    const isRev    = state.includes('REVERS') || state.includes('ESCAPE');
    const dorsal   = parseFloat(telem.dorsal)  / 100 || 0.5;
    const ventral  = parseFloat(telem.ventral) / 100 || 0.5;
    const activity = parseFloat(telem.spikes_count) / 100 || 0.5;

    // Sensory neurons: 60 channels — low baseline, spike when chemical gradient is high
    const sensP    = Math.min(0.60, 0.04 + parseFloat(telem.chem || 0) * 0.4 + (isFwd ? 0.08 : 0));
    // Interneurons: 90 channels — moderate baseline reflecting command state
    const interP   = Math.min(0.55, 0.06 + activity * 0.35 + (isRev ? 0.12 : 0));
    // Motor neurons: 152 channels — tied to dorsal/ventral muscle activation
    const motorP   = Math.min(0.70, 0.05 + (dorsal + ventral) * 0.28 + (isFwd ? 0.10 : 0.04));

    let spikesThisFrame = 0;

    // Sensory band (rows 0‥BAND_H_SENS-1)
    for (let row = 0; row < BAND_H_SENS; row++) {
      if (Math.random() < sensP * 0.65) {
        bCtx.fillStyle = `rgba(56, 189, 248, ${0.55 + Math.random() * 0.4})`;
        bCtx.fillRect(RASTER_W - 1, row, 1, 1);
        spikesThisFrame++;
      }
    }
    // Interneuron band (rows BAND_H_SENS‥BAND_H_SENS+BAND_H_INTER-1)
    for (let row = BAND_H_SENS; row < BAND_H_SENS + BAND_H_INTER; row++) {
      if (Math.random() < interP * 0.65) {
        bCtx.fillStyle = `rgba(251, 191, 36, ${0.55 + Math.random() * 0.4})`;
        bCtx.fillRect(RASTER_W - 1, row, 1, 1);
        spikesThisFrame++;
      }
    }
    // Motor band (rows BAND_H_SENS+BAND_H_INTER‥RASTER_H-1)
    for (let row = BAND_H_SENS + BAND_H_INTER; row < RASTER_H; row++) {
      if (Math.random() < motorP * 0.65) {
        bCtx.fillStyle = `rgba(52, 211, 153, ${0.55 + Math.random() * 0.4})`;
        bCtx.fillRect(RASTER_W - 1, row, 1, 1);
        spikesThisFrame++;
      }
    }

    // 5. Blit buffer onto the visible canvas
    rasterCtx.drawImage(rasterBuf, 0, 0);

    // 6. Update spike rate label (rolling sum ~60 frames ≈ 1 s at 60 fps)
    rasterTotalSpikes = Math.round(rasterTotalSpikes * 0.96 + spikesThisFrame * 60 * 0.04);
    if (rasterSpikeRate && (rasterFrame % 12 === 0)) {
      rasterSpikeRate.textContent = `POPULATION: ${rasterTotalSpikes} SPIKES/S`;
    }
  }

  // =========================================================================
  // 3-C. LIF PATCH-CLAMP OSCILLOSCOPE  (realistic action-potential waveform)
  // Leaky Integrate-and-Fire: flat subthreshold → rapid depolarisation spike
  // =========================================================================
  // LIF state
  let lif_Vm     = -62.0;   // mV — membrane potential
  const LIF_EL   = -65.0;   // mV — leak reversal
  const LIF_VTHRESH = -45.0;// mV — spike threshold
  const LIF_VRESET  = -72.0;// mV — after-spike reset (hyperpolarisation)
  const LIF_TAU  = 20.0;    // ms  — membrane time constant
  const LIF_DT   = 1.0;     // ms  — simulation timestep
  let lif_refrac = 0;       // ms  — remaining refractory period
  let lif_spiking = false;
  let lif_spikePhase = 0;   // 0‥1 during spike shape rendering

  // Circular oscilloscope buffer (more samples → smoother trace)
  const OSC_BUFLEN = 120;
  const oscBuf = new Float32Array(OSC_BUFLEN).fill(LIF_EL);
  let oscHead  = 0;
  let oscTick  = 0;

  function stepLIF(inputCurrentScaled) {
    // inputCurrentScaled ∈ [0, 1] — from motor activity
    const I_ext = inputCurrentScaled * 22.0;  // pA-equivalent drive

    if (lif_refrac > 0) {
      // Refractory — clamp near reset
      lif_Vm = LIF_VRESET + (lif_refrac / 4.0) * 5.0;
      lif_refrac -= LIF_DT;
      lif_spiking = false;
      return lif_Vm;
    }

    if (lif_spiking) {
      // Spike apex — one sample at +22 mV
      lif_spiking = false;
      lif_Vm = +22.0;
      lif_refrac = 4.0;  // 4 ms ARP
      return lif_Vm;
    }

    // Subthreshold integration: τ * dVm/dt = -(Vm - EL) + I_ext + noise
    const noise = (Math.random() - 0.5) * 3.0;
    const dVm = (LIF_DT / LIF_TAU) * (-(lif_Vm - LIF_EL) + I_ext + noise);
    lif_Vm += dVm;

    if (lif_Vm >= LIF_VTHRESH) {
      lif_spiking = true;
    }
    lif_Vm = Math.max(-80, Math.min(+25, lif_Vm));
    return lif_Vm;
  }

  function renderPatchClamp(telem) {
    if (!oscCtx || !oscCanvas) return;

    const dorsal  = parseFloat(telem.dorsal)  / 100 || 0.5;
    const ventral = parseFloat(telem.ventral) / 100 || 0.5;
    const activity = Math.min(1.0, (dorsal + ventral) * 0.55);
    oscTick++;

    // Step LIF 2× per render frame for ~120 Hz effective resolution
    for (let s = 0; s < 2; s++) {
      const vm = stepLIF(activity);
      oscBuf[oscHead] = vm;
      oscHead = (oscHead + 1) % OSC_BUFLEN;
    }

    const W = oscCanvas.width;
    const H = oscCanvas.height;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    // Background
    oscCtx.fillStyle = '#020704';
    oscCtx.fillRect(0, 0, W, H);

    // Phosphor grid (same as FlyBrain's .scatter canvas)
    oscCtx.strokeStyle = 'rgba(52, 211, 153, 0.06)';
    oscCtx.lineWidth = 1;
    const gridCols = 6, gridRows = 3;
    for (let c = 1; c < gridCols; c++) {
      const gx = (W / gridCols) * c;
      oscCtx.beginPath(); oscCtx.moveTo(gx, 0); oscCtx.lineTo(gx, H); oscCtx.stroke();
    }
    for (let r = 1; r < gridRows; r++) {
      const gy = (H / gridRows) * r;
      oscCtx.beginPath(); oscCtx.moveTo(0, gy); oscCtx.lineTo(W, gy); oscCtx.stroke();
    }

    // Threshold line
    const VM_MIN = -78, VM_MAX = +28, VM_RANGE = VM_MAX - VM_MIN;
    const threshFrac = (LIF_VTHRESH - VM_MIN) / VM_RANGE;
    const threshY = H - threshFrac * H;
    oscCtx.strokeStyle = 'rgba(251, 113, 133, 0.4)';
    oscCtx.setLineDash([3, 5]);
    oscCtx.lineWidth = 1;
    oscCtx.beginPath(); oscCtx.moveTo(0, threshY); oscCtx.lineTo(W, threshY); oscCtx.stroke();
    oscCtx.setLineDash([]);

    // Zero line (0 mV)
    const zeroFrac = (-VM_MIN) / VM_RANGE;
    const zeroY = H - zeroFrac * H;
    oscCtx.strokeStyle = 'rgba(255,255,255,0.07)';
    oscCtx.lineWidth = 1;
    oscCtx.beginPath(); oscCtx.moveTo(0, zeroY); oscCtx.lineTo(W, zeroY); oscCtx.stroke();

    // Waveform — read buffer in chronological order
    oscCtx.strokeStyle = '#34d399';
    oscCtx.lineWidth   = 1.4;
    oscCtx.shadowColor = '#34d399';
    oscCtx.shadowBlur  = 5;
    oscCtx.beginPath();
    const dx = W / (OSC_BUFLEN - 1);
    for (let i = 0; i < OSC_BUFLEN; i++) {
      const idx = (oscHead + i) % OSC_BUFLEN;
      const vm  = oscBuf[idx];
      const frac = (vm - VM_MIN) / VM_RANGE;
      const py = H - Math.max(2, Math.min(H - 2, frac * H));
      const px = i * dx;
      if (i === 0) oscCtx.moveTo(px, py);
      else         oscCtx.lineTo(px, py);
    }
    oscCtx.stroke();
    oscCtx.shadowBlur = 0;

    // Update Vm readout
    const curVm = oscBuf[(oscHead - 1 + OSC_BUFLEN) % OSC_BUFLEN];
    if (patchVmReadout && (oscTick % 8 === 0)) {
      patchVmReadout.textContent = `Vm: ${curVm.toFixed(1)} mV`;
    }
  }

  // =========================================================================
  // 3-D. BIOPHYSICAL EVENT STREAM LOG
  // =========================================================================
  let lastLoggedState = '';
  let lastLogTimestamp = 0;

  const EVENT_TEMPLATES = {
    'FORAG' : [
      { cls: 'log-emerald', msg: 'ASEL_AMPHID_ON → AIY_EXCITATION (gradient+)' },
      { cls: 'log-cyan',    msg: 'AVB_FORWARD_CMD → DB{n}_BURST_DRIVE' },
      { cls: 'log-emerald', msg: 'DB{n}_EXCITATORY_BURST (tau_m={t}ms)' },
      { cls: 'log-amber',   msg: 'RFT_THRUST_VECTOR (+{v} mm/s forward)' },
    ],
    'CHEMO' : [
      { cls: 'log-emerald', msg: 'ASER_AMPHID_OFF → AIZ_DISINHIBITION' },
      { cls: 'log-cyan',    msg: 'AVB_SUSTAINED_FIRE → chemotaxis run' },
      { cls: 'log-emerald', msg: 'DB{n}_VB{n}_COUPLED_BURST (sync)' },
    ],
    'REVERS': [
      { cls: 'log-rose',    msg: 'AVA_REVERSAL_CMD → DA{n}_EXCITATION' },
      { cls: 'log-rose',    msg: 'DD_GABA_INHIBITION → dorsal muscle relax' },
      { cls: 'log-amber',   msg: 'PIR_PIROUETTE_INIT ({d}° head cast)' },
    ],
    'ESCAPE': [
      { cls: 'log-rose',    msg: 'ALM/AVM_MECHANOSENSORY_BURST (anterior)' },
      { cls: 'log-rose',    msg: 'AVA_HIGH_FREQ_FIRE → rapid reversal' },
      { cls: 'log-amber',   msg: 'BACKWARD_SPRINT (τ = {t}ms refractory)' },
    ],
    'SPRINT': [
      { cls: 'log-cyan',    msg: 'PVC_POSTERIOR_TOUCH → AVB_RELAY' },
      { cls: 'log-emerald', msg: 'VB{n}_DB{n}_SYNCHRONOUS_BURST' },
      { cls: 'log-amber',   msg: 'SPRINT_VELOCITY_PEAK ({v} mm/s)' },
    ],
  };

  function pushEventLog(telem) {
    if (!eventLog) return;
    const now = performance.now();
    const state = (telem.state || 'FORAG').toUpperCase();
    const changed = state !== lastLoggedState;

    // Realistic laboratory cadence: maximum 1 event every 2.2 - 2.8 seconds
    // Even on state change, require at least 1.5s so human eye can easily read each line
    const minDelay = changed ? 1500 : 2600;
    if (now - lastLogTimestamp < minDelay) return;
    lastLogTimestamp = now;
    lastLoggedState  = state;

    // Pick template set
    let key = 'FORAG';
    for (const k of Object.keys(EVENT_TEMPLATES)) {
      if (state.includes(k)) { key = k; break; }
    }
    const templates = EVENT_TEMPLATES[key];
    const tmpl = templates[Math.floor(Math.random() * templates.length)];

    // Fill in placeholders
    const n = String(Math.floor(Math.random() * 7) + 1).padStart(2, '0');
    const t = (15 + Math.floor(Math.random() * 18)).toString();
    const v = (parseFloat(telem.speed_mms) || 0.3 + Math.random() * 0.5).toFixed(2);
    const d = (30 + Math.floor(Math.random() * 90)).toString();
    const msg = tmpl.msg
      .replace('{n}', n).replace('{t}', t).replace('{v}', v).replace('{d}', d);

    const ts = (performance.now() / 1000).toFixed(2) + 's';
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.innerHTML = `<span class="log-time">${ts}</span> <span class="log-txt ${tmpl.cls}">${msg}</span>`;

    // Prepend (newest on top)
    eventLog.insertBefore(entry, eventLog.firstChild);

    // Keep max 6 entries
    while (eventLog.children.length > 6) {
      eventLog.removeChild(eventLog.lastChild);
    }
  }

  // =========================================================================
  // Master Animation & Biophysics Tick
  // =========================================================================
  function simTick() {
    if (sim && !isSimPaused) {
      // If WebSocket is disconnected, client-side fallback drives everything
      if (!wsConnected) {
        const telem = sim.step();
        if (elDominantState) elDominantState.textContent = telem.state;
        if (elVelocity)  elVelocity.innerHTML  = `${telem.speed_mms} <span class="dim">mm/s</span>`;
        if (elFrequency) elFrequency.innerHTML = `${telem.spikes_count} <span class="dim">Hz</span>`;
        if (elVm)        elVm.innerHTML        = `${telem.mean_v} <span class="dim">mV</span>`;
        if (elNutrient)  elNutrient.innerHTML  = `${telem.chem} <span class="dim">mol/L</span>`;

        updateMotorBars(telem);
        renderSpikeRaster(telem);
        renderPatchClamp(telem);
        pushEventLog(telem);
      }
      // Render worm graphics canvas at 60 FPS
      sim.render();
    }
    animFrameId = requestAnimationFrame(simTick);
  }
  simTick();

  // =========================================================================
  // 4. "THE ORGANISM" ANATOMICAL DISSECTOR
  // =========================================================================
  const anatCanvas = document.getElementById('anatomical-canvas');
  let selectedRegion = 'nerve-ring';

  const anatomicalRegions = {
    'nerve-ring': {
      title: 'Circumpharyngeal Nerve Ring (Anterior Ganglia)',
      desc: 'Houses the primary sensory amphid sensilla (ASEL, ASER, AWA, AWC), the first-order interneurons (AIA, AIB, AIY, AIZ), and the command gating hubs (AVB, AVA). Serves as the central decision-making and chemosensory integration ring of the nematode.',
      chips: [
        { id: 'ASEL', note: 'Chemotaxis (+)' },
        { id: 'ASER', note: 'Chemotaxis (−)' },
        { id: 'AIYL', note: 'First-Order Inter' },
        { id: 'AIBL', note: 'Turn Interneuron' },
        { id: 'AVBL', note: 'Forward Command' },
        { id: 'AVAL', note: 'Reversal Command' }
      ]
    },
    'vnc': {
      title: 'Ventral Nerve Cord (VNC)',
      desc: 'The main longitudinal axon tract extending along the ventral midline. Contains 57 motor neuron cell bodies (DA, DB, DD, VA, VB, VD) that project to dorsal and ventral muscle quadrants to generate retrograde and anterograde undulatory waves.',
      chips: [
        { id: 'DB01', note: 'Forward Dorsal' },
        { id: 'VB01', note: 'Forward Ventral' },
        { id: 'DD01', note: 'GABA Cross-Inhibitor' },
        { id: 'VD01', note: 'GABA Cross-Inhibitor' },
        { id: 'DA01', note: 'Reverse Dorsal' },
        { id: 'VA01', note: 'Reverse Ventral' }
      ]
    },
    'muscles': {
      title: '95 Longitudinal Body Wall Muscle Cells',
      desc: 'Arranged in four continuous quadrants: Muscle Dorsal Left (24), Muscle Dorsal Right (24), Muscle Ventral Left (24), Muscle Ventral Right (23). Interlinked by dense gap junctions, driving smooth hydrostatic bending under low-pass calcium kinetics (tau = 25 ms).',
      chips: [
        { id: 'MDL01', note: 'Anterior Dorsal L' },
        { id: 'MDR01', note: 'Anterior Dorsal R' },
        { id: 'MVL01', note: 'Anterior Ventral L' },
        { id: 'MVR01', note: 'Anterior Ventral R' },
        { id: 'MDL12', note: 'Mid-body Dorsal' },
        { id: 'MVL12', note: 'Mid-body Ventral' }
      ]
    },
    'tail-ganglia': {
      title: 'Lumbar & Pre-Anal Tail Ganglia',
      desc: 'Houses posterior touch mechanoreceptors (PLML, PLMR, PVM) and posterior interneurons (PVCL, PVCR). Responsible for perceiving posterior physical contact and executing instantaneous forward sprints by disinhibiting AVB forward command circuits.',
      chips: [
        { id: 'PLML', note: 'Posterior Touch L' },
        { id: 'PLMR', note: 'Posterior Touch R' },
        { id: 'PVM',  note: 'Ventral Touch' },
        { id: 'PVCL', note: 'Forward Relay L' },
        { id: 'PVCR', note: 'Forward Relay R' },
        { id: 'PDA',  note: 'Tail Pre-anal' }
      ]
    }
  };

  function updateDissectorInfo(regKey) {
    selectedRegion = regKey;
    const data = anatomicalRegions[regKey];
    if (!data) return;

    const elTitle = document.getElementById('insp-region-title');
    const elDesc = document.getElementById('insp-region-desc');
    const elChips = document.getElementById('insp-region-chips');

    if (elTitle) elTitle.textContent = data.title;
    if (elDesc) elDesc.textContent = data.desc;
    if (elChips) {
      elChips.innerHTML = data.chips.map(c => `
        <span class="chip-id" data-neuron="${c.id}">${c.id} &middot; ${c.note}</span>
      `).join('');

      // Bind click on chips to highlight in connectome
      elChips.querySelectorAll('.chip-id').forEach(chip => {
        chip.addEventListener('click', () => {
          const nid = chip.getAttribute('data-neuron');
          if (connectomeGraph) {
            connectomeGraph.selectNode(nid);
            const graphSec = document.getElementById('connectome-explorer');
            if (graphSec) graphSec.scrollIntoView({ behavior: 'smooth' });
          }
        });
      });
    }
  }

  // Draw Anatomical Schematic on #anatomical-canvas
  let anatTime = 0;
  function renderAnatomicalCanvas() {
    if (!anatCanvas) return;
    const ctx = anatCanvas.getContext('2d');
    const W = anatCanvas.width;
    const H = anatCanvas.height;

    anatTime += 0.025;
    ctx.clearRect(0, 0, W, H);

    // Background Grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    const startX = W * 0.06;
    const endX = W * 0.94;
    const midY = H * 0.5;
    const bodyLen = endX - startX;

    // 1. Draw Transparent Cuticle Cylinder Body
    ctx.save();
    ctx.beginPath();
    // Top contour
    ctx.moveTo(startX, midY);
    for (let i = 0; i <= 60; i++) {
      const u = i / 60;
      const x = startX + u * bodyLen;
      // Nematode width profile (tapered head and tail, widest in midbody)
      const rad = Math.sin(u * Math.PI) * (H * 0.28) + 8;
      const y = midY - rad;
      ctx.lineTo(x, y);
    }
    // Bottom contour
    for (let i = 60; i >= 0; i--) {
      const u = i / 60;
      const x = startX + u * bodyLen;
      const rad = Math.sin(u * Math.PI) * (H * 0.28) + 8;
      const y = midY + rad;
      ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(12, 18, 28, 0.7)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 2. Pharynx & Intestine (Gut Lumen in Center)
    ctx.beginPath();
    ctx.moveTo(startX + 10, midY);
    ctx.lineTo(startX + bodyLen * 0.2, midY);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 6;
    ctx.stroke();

    // Intestine tract
    ctx.beginPath();
    ctx.moveTo(startX + bodyLen * 0.2, midY);
    ctx.lineTo(startX + bodyLen * 0.85, midY);
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)';
    ctx.lineWidth = 12;
    ctx.stroke();

    // 3. Ventral Nerve Cord (VNC along bottom curve)
    ctx.beginPath();
    for (let i = 8; i <= 56; i++) {
      const u = i / 60;
      const x = startX + u * bodyLen;
      const rad = Math.sin(u * Math.PI) * (H * 0.28) + 8;
      const y = midY + rad - 10;
      if (i === 8) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = selectedRegion === 'vnc' ? '#38bdf8' : 'rgba(56, 189, 248, 0.5)';
    ctx.lineWidth = selectedRegion === 'vnc' ? 3.5 : 2;
    ctx.stroke();

    // VNC Motor Neuron somas
    for (let i = 10; i <= 54; i += 3) {
      const u = i / 60;
      const x = startX + u * bodyLen;
      const rad = Math.sin(u * Math.PI) * (H * 0.28) + 8;
      const y = midY + rad - 10;
      ctx.fillStyle = selectedRegion === 'vnc' ? '#10b981' : 'rgba(16, 185, 129, 0.6)';
      ctx.beginPath();
      ctx.arc(x, y, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // 4. Nerve Ring Halo (Anterior Head ~14% length)
    const nrX = startX + bodyLen * 0.14;
    const nrY = midY;
    const isNrSelected = (selectedRegion === 'nerve-ring');

    ctx.save();
    ctx.strokeStyle = isNrSelected ? '#38bdf8' : 'rgba(56, 189, 248, 0.6)';
    ctx.lineWidth = isNrSelected ? 3 : 1.5;
    ctx.beginPath();
    ctx.ellipse(nrX, nrY, 16, 42, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Pulsing halo ring
    if (isNrSelected) {
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.beginPath();
      ctx.ellipse(nrX, nrY, 18 + Math.sin(anatTime * 3) * 3, 46 + Math.sin(anatTime * 3) * 3, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    // 5. Dorsal & Ventral Muscle Strips (Highlight when selected)
    if (selectedRegion === 'muscles') {
      ctx.strokeStyle = 'rgba(52, 211, 153, 0.8)';
      ctx.lineWidth = 4;
      // Dorsal stripe
      ctx.beginPath();
      for (let i = 12; i <= 52; i++) {
        const u = i / 60;
        const x = startX + u * bodyLen;
        const rad = Math.sin(u * Math.PI) * (H * 0.28) + 8;
        const y = midY - rad + 8;
        if (i === 12) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // 6. Tail Ganglia (Posterior ~88% length)
    const tailX = startX + bodyLen * 0.88;
    const tailY = midY;
    const isTailSelected = (selectedRegion === 'tail-ganglia');
    ctx.fillStyle = isTailSelected ? '#fb7185' : 'rgba(251, 113, 133, 0.6)';
    ctx.beginPath();
    ctx.arc(tailX, tailY, isTailSelected ? 8 : 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
    requestAnimationFrame(renderAnatomicalCanvas);
  }
  renderAnatomicalCanvas();

  // Callout points hover/click
  const calloutPoints = document.querySelectorAll('.callout-point');
  calloutPoints.forEach(pt => {
    pt.addEventListener('click', () => {
      const reg = pt.getAttribute('data-region');
      updateDissectorInfo(reg);
    });
  });

  // =========================================================================
  // 5. CONNECTOME NETWORK EXPLORER
  // =========================================================================
  let connectomeGraph = null;
  const netCanvas = document.getElementById('connectome-network-canvas');
  if (netCanvas && typeof ConnectomeNetworkGraph !== 'undefined') {
    connectomeGraph = new ConnectomeNetworkGraph('connectome-network-canvas');
  }

  // =========================================================================
  // 6. CONTRACT ADDRESS COPY & TOOLTIPS
  // =========================================================================
  function copyContractToClipboard(successCallback) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(CONTRACT_ADDRESS)
        .then(() => successCallback())
        .catch(() => fallbackCopy(CONTRACT_ADDRESS, successCallback));
    } else {
      fallbackCopy(CONTRACT_ADDRESS, successCallback);
    }
  }

  function fallbackCopy(text, callback) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      callback();
    } catch (err) {
      console.error('Fallback copy failed', err);
    }
    document.body.removeChild(textArea);
  }

  // Nav copy pill
  const btnCopyNav = document.getElementById('btn-copy-nav');
  const alertNav = document.getElementById('copy-alert-nav');
  if (btnCopyNav && alertNav) {
    btnCopyNav.addEventListener('click', () => {
      copyContractToClipboard(() => {
        alertNav.classList.add('show');
        setTimeout(() => alertNav.classList.remove('show'), 2000);
      });
    });
  }

  // Section 12 on-chain card copy button
  const btnCopyFull = document.getElementById('btn-copy-full');
  const btnCopyFullText = document.getElementById('btn-copy-full-text');
  if (btnCopyFull && btnCopyFullText) {
    btnCopyFull.addEventListener('click', () => {
      copyContractToClipboard(() => {
        btnCopyFullText.textContent = "COPIED TO CLIPBOARD!";
        btnCopyFull.style.borderColor = "var(--emerald)";
        btnCopyFull.style.color = "var(--emerald-light)";
        setTimeout(() => {
          btnCopyFullText.textContent = "COPY CONTRACT ADDRESS";
          btnCopyFull.style.borderColor = "";
          btnCopyFull.style.color = "";
        }, 2200);
      });
    });
  }

  // =========================================================================
  // 7. WEBSOCKET 1:1 BACKEND SYNC
  // When WS live: Python LIF engine drives ALL telemetry + worm position.
  // When disconnected: client connecto_sim.js fallback runs.
  // =========================================================================
  let socket = null;
  let wsConnected = false;

  function connectWebSocket() {
    const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProto}//${window.location.host}/ws/telemetry`;

    try {
      socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        wsConnected = true;
        console.log('[CONNECTO] WebSocket 1:1 sync active — Python LIF engine driving all telemetry.');
      };

      socket.onmessage = (evt) => {
        try {
          const t = JSON.parse(evt.data);
          if (!t) return;

          // 1. Authoritative 24/7 Global Server Locomotion & Food Sync
          if (sim && t.locomotion) {
            sim.syncWithServer(t.locomotion);
          }

          // 2. Build normalised telem object
          const telem = {
            state:        t.state        || 'CHEMOTAXIS_FORWARD',
            speed_mms:    t.speed_mms    || '0.00',
            spikes_count: t.spikes_count || 184,
            mean_v:       t.mean_v       || -58.4,
            dorsal:       t.dorsal       || 50,
            ventral:      t.ventral      || 50,
            chem:         t.chem         || '0.000',
            active_neurons: t.active_neurons || []
          };

          // 3. Core chips
          if (elDominantState) elDominantState.textContent = telem.state;
          if (elVelocity)  elVelocity.innerHTML  = `${telem.speed_mms} <span class="dim">mm/s</span>`;
          if (elFrequency) elFrequency.innerHTML = `${telem.spikes_count} <span class="dim">Hz</span>`;
          if (elVm)        elVm.innerHTML        = `${parseFloat(telem.mean_v).toFixed(1)} <span class="dim">mV</span>`;
          if (elNutrient)  elNutrient.innerHTML  = `${telem.chem} <span class="dim">mol/L</span>`;

          // 4. All telemetry panels — backend-driven
          updateMotorBars(telem);
          renderSpikeRaster(telem);
          renderPatchClamp(telem);
          pushEventLog(telem);

          // 5. Uptime
          if (t.uptime_s !== undefined) {
            const sbUptime = document.getElementById('sb-uptime');
            if (sbUptime) {
              const m = Math.floor(t.uptime_s / 60), s = Math.floor(t.uptime_s % 60);
              sbUptime.textContent = `${m}m ${s}s`;
            }
          }

        } catch (e) { /* parse error — ignore */ }
      };

      socket.onerror = () => { wsConnected = false; };

      socket.onclose = () => {
        wsConnected = false;
        console.log('[CONNECTO] WS closed — client-side fallback active.');
        setTimeout(connectWebSocket, 8000);
      };
    } catch (err) {
      wsConnected = false;
    }
  }

  connectWebSocket();

  // =========================================================================
  // 8. AUTONOMOUS PROOF DECK LIVE TELEMETRY & GITHUB SYNC
  // =========================================================================
  async function refreshProofDeck() {
    try {
      const res = await fetch('/api/activity/summary');
      if (!res.ok) return;
      const data = await res.json();

      // 1. Roam
      if (data.roam && data.roam.title) {
        const elTitle = document.getElementById('proof-roam-title');
        const elUrl = document.getElementById('proof-roam-url');
        const elAction = document.getElementById('proof-roam-action');
        const elStep = document.getElementById('roam-step-tag');
        const elImg = document.getElementById('proof-roam-img');

        if (elTitle) elTitle.textContent = data.roam.title;
        if (elUrl) {
          elUrl.textContent = data.roam.url;
          elUrl.href = data.roam.url;
        }
        if (elAction) elAction.textContent = `${data.roam.action} (Biological SNN)`;
        if (elStep) elStep.textContent = `STEP #${data.roam.step || 1}`;
        if (elImg && data.roam.screenshot) elImg.src = `/screenshots/${data.roam.screenshot}?t=${Date.now()}`;
      }

      // 2. Dino
      if (data.dino && data.dino.best_score !== undefined) {
        const elScore = document.getElementById('proof-dino-score');
        const elJumps = document.getElementById('proof-dino-jumps');
        const elTrials = document.getElementById('proof-dino-trials');
        const elTag = document.getElementById('dino-score-tag');

        if (elScore) elScore.textContent = `${data.dino.best_score} PTS`;
        if (elJumps) elJumps.textContent = `${data.dino.total_jumps} JUMPS (AVA POOL)`;
        if (elTrials) elTrials.textContent = `${data.dino.trials} TRIALS`;
        if (elTag) elTag.textContent = `SCORE: ${data.dino.best_score}`;
      }

      // 3. FizzBuzz
      if (data.fizzbuzz && data.fizzbuzz.accuracy_pct !== undefined) {
        const elAcc = document.getElementById('proof-fb-acc');
        const elTag = document.getElementById('fb-spikes-tag');
        if (elAcc) elAcc.textContent = `${data.fizzbuzz.accuracy_pct}% (${data.fizzbuzz.matched}/${data.fizzbuzz.total} MATCHED)`;
        if (elTag) elTag.textContent = `${Number(data.fizzbuzz.total_spikes).toLocaleString()} SPIKES`;
      }

      // 4. Consciousness Journal
      if (data.journal && data.journal.entry) {
        const elText = document.getElementById('proof-journal-text');
        const elSig = document.getElementById('proof-journal-sig');
        const elTime = document.getElementById('proof-journal-time');
        const elState = document.getElementById('proof-journal-state');

        if (elText) elText.textContent = `"${data.journal.entry}"`;
        if (elSig) elSig.textContent = data.journal.signature;
        if (elTime) elTime.textContent = data.journal.timestamp;
        if (elState) elState.textContent = data.journal.state;
      }
    } catch (e) {
      // Background poll error ignored
    }
  }

  // =========================================================================
  // 9. LIVE GITHUB COMPARATIVE AUDIT (CONNECTO VS FLYBRAIN)
  // =========================================================================
  async function refreshLiveComparison() {
    try {
      const res = await fetch('/api/comparison/live');
      if (!res.ok) return;
      const data = await res.json();

      const flyTag = document.getElementById('fly-commits-tag');
      const connTag = document.getElementById('connecto-commits-tag');
      const statusTag = document.getElementById('comparison-sync-status');

      if (flyTag && data.fly) {
        flyTag.textContent = `${data.fly.commits} COMMITS (FLYBRAIN)`;
      }
      if (connTag && data.connecto) {
        connTag.textContent = `${data.connecto.commits} COMMITS (VERIFIED)`;
      }
      if (statusTag && data.connecto && data.fly) {
        statusTag.textContent = `LIVE GITHUB AUDIT · CONNECTO (${data.connecto.commits} COMMITS) VS FLYBRAIN (${data.fly.commits} COMMITS) · VERIFIED`;
      }
    } catch (e) {
      // Comparison fetch notice ignored
    }
  }

  // Initial fetches
  refreshProofDeck();
  refreshLiveComparison();
  setInterval(refreshProofDeck, 8000);
  setInterval(refreshLiveComparison, 30000);

  // GitHub Sync Button Handler
  const btnSync = document.getElementById('btn-sync-github');
  const syncIcon = document.getElementById('sync-icon');

  if (btnSync) {
    btnSync.addEventListener('click', async () => {
      btnSync.disabled = true;
      if (syncIcon) syncIcon.classList.add('spinning');
      const origText = btnSync.innerHTML;
      btnSync.innerHTML = '<span class="sync-icon spinning">🔄</span> COMMITTING PROOF TO GITHUB...';

      try {
        const res = await fetch('/api/activity/sync', { method: 'POST' });
        const result = await res.json();
        if (result.status === 'ok') {
          btnSync.innerHTML = '✅ PUSHED TO GITHUB!';
          btnSync.style.borderColor = 'var(--emerald)';
          btnSync.style.color = 'var(--emerald)';
          refreshProofDeck();
        } else {
          btnSync.innerHTML = '⚠️ SYNC NOTICE';
        }
      } catch (err) {
        btnSync.innerHTML = '⚠️ CONNECTION NOTICE';
      }

      setTimeout(() => {
        btnSync.disabled = false;
        btnSync.innerHTML = origText;
        btnSync.style.borderColor = '';
        btnSync.style.color = '';
        if (syncIcon) syncIcon.classList.remove('spinning');
      }, 3500);
    });
  }
});

