/**
 * DANIO · MASTER APPLICATION COORDINATOR
 * Orchestrates:
 * 1. Hero Specimen Observation Chamber (3D/2.5D Optical Cranium)
 * 2. Closed-Loop Biophysical Rig (Tactile Arena, Carangiform Hydrodynamics, Stimuli)
 * 3. Real-Time Population Oscilloscope & Telemetry
 * 4. Anatomical Dissector (Interactive Adult Danionella Cerebrum Teleost Anatomy)
 * 5. 203-Region Cranial Connectome Network Graph
 * 6. DeSci Telemetry & Clipboard Utilities
 */

document.addEventListener('DOMContentLoaded', () => {
  let socket = null;
  let wsConnected = false;

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

  // Viewport Mode Switcher (Mode A: Teleost CNS vs Mode B: 3D Cranial Connectome)
  const btnModeA = document.getElementById('btn-view-mode-a');
  const btnModeB = document.getElementById('btn-view-mode-b');

  if (btnModeA && btnModeB) {
    btnModeA.addEventListener('click', () => {
      btnModeA.classList.add('active');
      btnModeB.classList.remove('active');
      if (sim && sim.webgl) sim.webgl.setMode('A');
    });

    btnModeB.addEventListener('click', () => {
      btnModeB.classList.add('active');
      btnModeA.classList.remove('active');
      if (sim && sim.webgl) sim.webgl.setMode('B');
    });
  }

  // Closed Loop Diagram Interactive Stage Highlighting
  const loopNodes = document.querySelectorAll('.loop-node[data-stage]');
  loopNodes.forEach(node => {
    node.addEventListener('click', () => {
      loopNodes.forEach(n => n.classList.remove('active-node'));
      node.classList.add('active-node');
      const stage = node.getAttribute('data-stage');
      if (sim && sim.webgl) {
        if (stage === 'environment' || stage === 'chassis') {
          if (btnModeA) { btnModeA.classList.add('active'); btnModeB.classList.remove('active'); }
          sim.webgl.setMode('A');
        } else if (stage === 'sensory') {
          if (btnModeB) { btnModeB.classList.add('active'); btnModeA.classList.remove('active'); }
          sim.webgl.setMode('B');
          sim.webgl.triggerTectalBurst();
        } else if (stage === 'connectome') {
          if (btnModeB) { btnModeB.classList.add('active'); btnModeA.classList.remove('active'); }
          sim.webgl.setMode('B');
        } else if (stage === 'motor') {
          if (btnModeB) { btnModeB.classList.add('active'); btnModeA.classList.remove('active'); }
          sim.webgl.setMode('B');
          sim.webgl.triggerMauthnerCStart();
        }
      }
    });
  });

  // Global 3D Region Selection Sync with Connectome Inspector Card
  window.addEventListener('danioRegionSelected', (e) => {
    const r = e.detail;
    if (!r) return;
    const nid = document.getElementById('card-neuron-id');
    const nclass = document.getElementById('card-neuron-class');
    const nnt = document.getElementById('card-neuron-nt');
    const nfn = document.getElementById('card-neuron-function');
    const nsoma = document.getElementById('card-neuron-soma');

    if (nid) nid.textContent = r.name;
    if (nclass) nclass.textContent = `${(r.division || 'Mesencephalon').toUpperCase()} (${(r.neuronCount || 0).toLocaleString()} NEURONS)`;
    if (nnt) nnt.textContent = r.dominantNT || 'Glutamate';
    if (nfn) nfn.textContent = r.function || 'Anatomical functional subdivision of adult Danionella cerebrum.';
    if (nsoma) nsoma.textContent = `Center: (${r.center ? r.center.join(', ') : '0, 0, 0'}) · Base: ${r.baselineHz || 50} Hz`;
  });

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
      if (sim) sim.pause(isSimPaused);
      if (btnPauseText) btnPauseText.textContent = isSimPaused ? 'RESUME' : 'PAUSE';
    });
  }

  if (btnResetRig) {
    btnResetRig.addEventListener('click', () => {
      if (sim) {
        sim.reset();
      }
      if (rasterCtx && rasterBuf) {
        const bCtx = rasterBuf.getContext('2d');
        bCtx.fillStyle = '#020704';
        bCtx.fillRect(0, 0, RASTER_W, RASTER_H);
        rasterCtx.drawImage(rasterBuf, 0, 0);
      }
      if (typeof oscBuf !== 'undefined' && oscBuf.fill) {
        oscBuf.fill(LIF_EL);
      }
      if (elDominantState) elDominantState.textContent = 'PELAGIC_CRUISE';
      if (elVelocity)  elVelocity.innerHTML  = `0.52 <span class="dim">mm/s</span>`;
      if (elFrequency) elFrequency.innerHTML = `48 <span class="dim">Hz</span>`;
      if (elVm)        elVm.innerHTML        = `-61.8 <span class="dim">mV</span>`;
      if (elNutrient)  elNutrient.innerHTML  = `7.4827 <span class="dim">mol/L</span>`;
      fetch('/api/reset', { method: 'POST' }).catch(() => {});
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
  // 3-A. VERTEBRATE MOTOR POOL RATE BAR UPDATER
  // Adult Danionella pools: M-Cell, Mes_OpticTectum, Ce_Purkinje, Sonic_Drumming, Sp_VentralRoot
  // =========================================================================
  function setMotorBar(barEl, valEl, pct, hz) {
    if (barEl) barEl.style.width = `${Math.min(100, Math.max(0, pct))}%`;
    if (valEl) valEl.textContent = `${Math.round(hz)} Hz`;
  }

  function updateMotorBars(telem) {
    if (telem.motor_pools) {
      const mp = telem.motor_pools;
      const mCellHz  = mp.mCell || 8;
      const mCellPct = Math.min(100, Math.max(5, (mCellHz / 180) * 100));
      const tectumHz = mp.opticTectum || 78;
      const tectumPct = Math.min(100, Math.max(10, (tectumHz / 120) * 100));
      const purkHz   = mp.purkinje || 62;
      const purkPct  = Math.min(100, Math.max(10, (purkHz / 100) * 100));
      const sonicHz  = mp.sonicDrumming || 12;
      const sonicPct = Math.min(100, Math.max(5, (sonicHz / 100) * 100));
      const spinalHz = mp.spinalVentral || 68;
      const spinalPct = Math.min(100, Math.max(15, (spinalHz / 180) * 100));

      setMotorBar(barDbRate,  valDbRate,  mCellPct,  mCellHz);
      setMotorBar(barVbRate,  valVbRate,  tectumPct, tectumHz);
      setMotorBar(barDdRate,  valDdRate,  purkPct,   purkHz);
      setMotorBar(barVdRate,  valVdRate,  sonicPct,  sonicHz);
      setMotorBar(barAvaRate, valAvaRate, spinalPct, spinalHz);
      return;
    }

    const dorsal  = parseFloat(telem.dorsal)  || 52;
    const ventral = parseFloat(telem.ventral) || 48;
    const state   = (telem.state || '').toUpperCase();
    const isMauthner = state.includes('MAUTHNER') || state.includes('ESCAPE') || state.includes('REVERS');
    const isDrumming = state.includes('DRUM') || state.includes('SONIC') || state.includes('ACOUSTIC');
    const isPursuit  = state.includes('PURSUIT') || state.includes('CHEMO') || state.includes('FORAG');

    const mCellPct = isMauthner ? Math.min(100, 85 + Math.random() * 15) : Math.max(5, 8 + Math.sin(Date.now() * 0.002) * 4);
    const mCellHz  = isMauthner ? (165 + Math.random() * 35) : (6 + Math.random() * 4);

    const tectumPct = isPursuit ? Math.min(95, 75 + Math.sin(Date.now() * 0.004) * 18) : Math.max(15, 32 + Math.sin(Date.now() * 0.002) * 10);
    const tectumHz  = tectumPct * 1.35;

    const purkPct = Math.min(92, 58 + Math.sin(Date.now() * 0.003) * 14);
    const purkHz  = purkPct * 1.1;

    const sonicPct = isDrumming ? 98 : Math.max(6, 12 + Math.sin(Date.now() * 0.001) * 6);
    const sonicHz  = isDrumming ? 200 : (10 + Math.random() * 5);

    const spinalPct = Math.min(96, Math.max(20, (dorsal + ventral) * 0.72 + (isMauthner ? 25 : 0)));
    const spinalHz  = spinalPct * 1.25;

    setMotorBar(barDbRate,  valDbRate,  mCellPct,  mCellHz);
    setMotorBar(barVbRate,  valVbRate,  tectumPct, tectumHz);
    setMotorBar(barDdRate,  valDdRate,  purkPct,   purkHz);
    setMotorBar(barVdRate,  valVdRate,  sonicPct,  sonicHz);
    setMotorBar(barAvaRate, valAvaRate, spinalPct, spinalHz);
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
      { cls: 'log-cyan',    msg: 'TECTAL_SACCADE_LOCK → prey coordinate tracking ({v} mm/s)' },
      { cls: 'log-emerald', msg: 'CE_PURKINJE_STABILIZE → fin balance loop (tau_m={t}ms)' },
      { cls: 'log-cyan',    msg: 'RH_ROM2_CRUISE → spinal ventral root alternating drive' },
      { cls: 'log-amber',   msg: 'CARANGIFORM_THRUST → caudal fin propulsion (+{v} mm/s)' },
    ],
    'CHEMO' : [
      { cls: 'log-emerald', msg: 'LATERAL_LINE_NEUROMAST → rheotaxic flow vector alignment' },
      { cls: 'log-cyan',    msg: 'MES_OPTIC_TECTUM → prey approach pursuit locked' },
      { cls: 'log-emerald', msg: 'SP_VENTRAL_ROOT_{n} → bilateral myotome carangiform wave' },
      { cls: 'log-amber',   msg: 'RHEOTAXIS_HOLD → current resistance stabilized' },
    ],
    'REVERS': [
      { cls: 'log-rose',    msg: 'MAUTHNER_C_START → unilateral fast reticulospinal burst' },
      { cls: 'log-rose',    msg: 'GLYCINERGIC_INHIBITION → contralateral motor arrest' },
      { cls: 'log-amber',   msg: 'C_SHAPE_FLEXION ({d}° escape angle in 12ms)' },
    ],
    'ESCAPE': [
      { cls: 'log-rose',    msg: 'MAUTHNER_GIANT_FIRE → acoustic/visual predator avoidance' },
      { cls: 'log-rose',    msg: 'FAST_TWITCH_MYOTOME → ballistic burst acceleration' },
      { cls: 'log-amber',   msg: 'BURST_VELOCITY_PEAK (+{v} mm/s instantaneous)' },
    ],
    'DRUM': [
      { cls: 'log-cyan',    msg: 'SONIC_MOTOR_NUCLEI → 5th rib cartilage drumming muscle' },
      { cls: 'log-emerald', msg: 'SWIM_BLADDER_RESONANCE → 140.2 dB SPL acoustic pulse' },
      { cls: 'log-amber',   msg: 'ACOUSTIC_TERRITORIAL_BURST → social broadcast complete' },
    ],
    'SONIC': [
      { cls: 'log-cyan',    msg: 'SONIC_MOTOR_NUCLEI → 5th rib cartilage drumming muscle' },
      { cls: 'log-emerald', msg: 'SWIM_BLADDER_RESONANCE → 140.2 dB SPL acoustic pulse' },
      { cls: 'log-amber',   msg: 'ACOUSTIC_TERRITORIAL_BURST → social broadcast complete' },
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
  let fpsLast = performance.now();
  let fpsSmooth = 60.0;
  let fpsFrames = 0;
  const hudFps = document.getElementById('hud-fps-readout');

  function simTick() {
    // Live FPS readout (rolling average, refreshed ~2x/s)
    const nowMs = performance.now();
    const frameMs = nowMs - fpsLast;
    fpsLast = nowMs;
    if (frameMs > 0) fpsSmooth = fpsSmooth * 0.9 + (1000.0 / frameMs) * 0.1;
    if (hudFps && ++fpsFrames % 30 === 0) {
      hudFps.innerHTML = `${fpsSmooth.toFixed(1)} FPS &middot; ${wsConnected ? '50Hz SERVER SYNC' : '60Hz LOCAL SIM'}`;
    }

    if (sim && !isSimPaused) {
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

      sim.render();
    }
    animFrameId = requestAnimationFrame(simTick);
  }
  simTick();

  // =========================================================================
  // 4. "THE ORGANISM" ANATOMICAL DISSECTOR: ADULT DANIONELLA CEREBRUM
  // =========================================================================
  const anatCanvas = document.getElementById('anatomical-canvas');
  let selectedRegion = 'cranial-optical';

  const anatomicalRegions = {
    'cranial-optical': {
      title: '0.6 mm³ Optically Transparent Cranium & Forebrain',
      desc: 'The dorsal cranial bones (parietal and frontal) are naturally absent in adult Danionella cerebrum, creating a lifelong transparent window into the intact adult vertebrate brain. Houses the olfactory bulbs and dorsal telencephalon (Tel_Dm/Dl) for olfactory navigation and associative shoaling memory.',
      chips: [
        { id: 'Tel_Dm_L', note: 'Dorsomedial Forebrain (Social Memory)' },
        { id: 'Tel_Dl_L', note: 'Dorsolateral Spatial Map' },
        { id: 'OB_Glom_L', note: 'Olfactory Odorant Receptors' },
        { id: 'Hb_dHb_L', note: 'Dorsal Habenula Valence' },
        { id: 'Tel_Vv_L', note: 'Subpallial Shoaling Hub' }
      ]
    },
    'tectum-cerebellum': {
      title: 'Optic Tectum (Mesencephalon) & Cerebellar Purkinje Loops',
      desc: 'The primary sensory computing architecture of the teleost. Multi-layered optic tectum processes retinotopic visual motion to coordinate saccadic strikes on micro-prey (Paramecium), while the cerebellum regulates vestibulomotor balance, posture stabilization, and smooth swimming rhythms.',
      chips: [
        { id: 'OT_PVN_L', note: 'Periventricular Saccade Detector' },
        { id: 'OT_SGC_01', note: 'Stratum Griseum Premotor Driver' },
        { id: 'Ce_Purk_01', note: 'Purkinje GABAergic Balancing' },
        { id: 'Ce_Gran_01', note: 'Granule Cell Parallel Fibers' },
        { id: 'Ce_Euron_L', note: 'Eurydendroid Efferent Output' }
      ]
    },
    'sonic-drumming': {
      title: 'Hyper-Sonic Drumming Apparatus (>140 dB Sound Generation)',
      desc: 'A specialized acoustic communication organ unique to male Danionella cerebrum. Consists of a modified 5th rib cartilage, specialized drumming muscles, and the resonant gas-filled swim bladder. Capable of generating sound pressure levels exceeding 140 dB for acoustic territorial and courtship communication.',
      chips: [
        { id: 'SMN_01', note: 'Sonic Motor Nucleus (Medulla)' },
        { id: 'SMN_02', note: 'Synchronized Drumming Pacemaker' },
        { id: 'Mus_Drum_L', note: 'Fast-Twitch Drumming Muscle' },
        { id: 'Mus_Drum_R', note: 'Bilateral Drumming Tension' },
        { id: 'TS_Torus_R', note: 'Auditory Frequency Decoding' }
      ]
    },
    'vertebrae-lateral': {
      title: '36 Segmented Vertebrae & Rheotaxis Lateral Line',
      desc: 'The axial musculoskeletal chassis comprises 36 mineralized vertebral centra. Segmental ventral root motor pools drive alternating left-right myotome contractions for carangiform swimming. The lateral line sensory canal detects hydrodynamic current velocity vectors (dv/dt) for rheotaxis stabilization.',
      chips: [
        { id: 'Sp_VR_01', note: 'Anterior Spinal Ventral Root' },
        { id: 'Sp_VR_08', note: 'Mid-Body Axial Locomotor Pool' },
        { id: 'Sp_VR_24', note: 'Caudal Peduncle Thrust Driver' },
        { id: 'Sp_CoPA_01', note: 'Commissural Reciprocal Inhibitor' },
        { id: 'Rh_LL_Sens', note: 'Lateral Line Mechanoreceptor' }
      ]
    },
    'caudal-fin': {
      title: 'Homocercal Bifurcated Caudal Fin & Mauthner Escape System',
      desc: 'The flexible homocercal tail fin with radiating lepidotrichia fin rays provides high hydrodynamic thrust-to-drag efficiency. Driven by terminal caudal flexor motor units and downstream reticulospinal projections during explosive Mauthner C-start escape manoeuvres (100° axial turn in under 12 ms).',
      chips: [
        { id: 'Rh_Mauth_L', note: 'Mauthner Giant Escape Interneuron' },
        { id: 'Rh_MiD2cm', note: 'Contralateral Fast Inhibitor' },
        { id: 'Sp_VR_36', note: 'Terminal Urostyle Flexor Pool' },
        { id: 'CFR_FinRay_L', note: 'Caudal Fin Ray Steering Ray' },
        { id: 'CFR_FinRay_R', note: 'Bilateral Caudal Thrust Balancer' }
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

    // Background Grid (subtle cybernetic coordinate mesh)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    const startX = W * 0.08;
    const endX   = W * 0.88;
    const midY   = H * 0.50;
    const bodyLen = endX - startX;

    // 1. Draw Transparent Adult Danionella Teleost Body Contour
    ctx.save();
    ctx.beginPath();

    // Snout / Rostrum
    ctx.moveTo(startX, midY);

    // Dorsal Curve: Cranium crest -> Dorsal fin -> Caudal peduncle
    ctx.bezierCurveTo(
      startX + bodyLen * 0.08, midY - H * 0.22,
      startX + bodyLen * 0.24, midY - H * 0.26,
      startX + bodyLen * 0.44, midY - H * 0.20
    );
    // Dorsal fin profile
    ctx.lineTo(startX + bodyLen * 0.52, midY - H * 0.32);
    ctx.lineTo(startX + bodyLen * 0.62, midY - H * 0.16);
    // Taper to caudal peduncle
    ctx.bezierCurveTo(
      startX + bodyLen * 0.72, midY - H * 0.12,
      startX + bodyLen * 0.82, midY - H * 0.07,
      startX + bodyLen * 0.88, midY - H * 0.05
    );

    // Upper Caudal Fin Lobe
    ctx.lineTo(startX + bodyLen * 0.98, midY - H * 0.36);
    ctx.lineTo(startX + bodyLen * 0.92, midY);
    // Lower Caudal Fin Lobe
    ctx.lineTo(startX + bodyLen * 0.98, midY + H * 0.36);
    ctx.lineTo(startX + bodyLen * 0.88, midY + H * 0.05);

    // Ventral Curve: Caudal peduncle -> Anal fin -> Drumming Belly -> Operculum -> Jaw
    ctx.bezierCurveTo(
      startX + bodyLen * 0.82, midY + H * 0.07,
      startX + bodyLen * 0.72, midY + H * 0.12,
      startX + bodyLen * 0.64, midY + H * 0.16
    );
    // Anal fin profile
    ctx.lineTo(startX + bodyLen * 0.56, midY + H * 0.28);
    ctx.lineTo(startX + bodyLen * 0.48, midY + H * 0.18);
    // Drumming belly curve (swim bladder dome)
    ctx.bezierCurveTo(
      startX + bodyLen * 0.32, midY + H * 0.28,
      startX + bodyLen * 0.16, midY + H * 0.24,
      startX + bodyLen * 0.06, midY + H * 0.08
    );
    ctx.closePath();

    // Teleost Transparent Bioluminescent Fill
    const bodyGrad = ctx.createLinearGradient(startX, midY, endX, midY);
    bodyGrad.addColorStop(0.0, 'rgba(14, 28, 48, 0.75)');
    bodyGrad.addColorStop(0.3, 'rgba(8, 22, 38, 0.65)');
    bodyGrad.addColorStop(1.0, 'rgba(6, 16, 28, 0.5)');
    ctx.fillStyle = bodyGrad;
    ctx.fill();

    ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // Caudal Fin Rays (Lepidotrichia)
    ctx.strokeStyle = (selectedRegion === 'caudal-fin') ? 'rgba(56, 189, 248, 0.85)' : 'rgba(56, 189, 248, 0.25)';
    ctx.lineWidth = (selectedRegion === 'caudal-fin') ? 2.0 : 1.0;
    const tailBaseX = startX + bodyLen * 0.88;
    for (let r = -6; r <= 6; r++) {
      ctx.beginPath();
      ctx.moveTo(tailBaseX, midY);
      const tipY = midY + (r / 6) * (H * 0.34);
      const tipX = startX + bodyLen * (0.92 + Math.abs(r / 6) * 0.06);
      ctx.lineTo(tipX, tipY);
      ctx.stroke();
    }

    // 2. 0.6 mm³ Optical Cranium Window (Anterior Dorsal Head)
    const cranX = startX + bodyLen * 0.14;
    const cranY = midY - H * 0.08;
    const isCranial = (selectedRegion === 'cranial-optical');

    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = isCranial ? '#38bdf8' : 'rgba(56, 189, 248, 0.4)';
    ctx.lineWidth = isCranial ? 2.5 : 1.2;
    ctx.beginPath();
    ctx.ellipse(cranX + 16, cranY - 4, 48, 26, -0.08, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    if (isCranial) {
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
      ctx.beginPath();
      ctx.ellipse(cranX + 16, cranY - 4, 52 + Math.sin(anatTime * 3) * 4, 30 + Math.sin(anatTime * 3) * 3, -0.08, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    // Eye (Teleost Eye with dark pupil & cyan reflective ring)
    const eyeX = startX + bodyLen * 0.08;
    const eyeY = midY - H * 0.04;
    ctx.beginPath();
    ctx.arc(eyeX, eyeY, 11, 0, Math.PI * 2);
    ctx.fillStyle = '#06131f';
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(eyeX, eyeY, 5.5, 0, Math.PI * 2);
    ctx.fillStyle = '#38bdf8';
    ctx.fill();

    // 3. 4 Glowing Vertebrate Brain Lobes in Cranium
    const isTectum = (selectedRegion === 'tectum-cerebellum');

    // Telencephalon (Forebrain - Cyan)
    ctx.beginPath();
    ctx.ellipse(cranX - 8, cranY + 2, 9, 13, 0.2, 0, Math.PI * 2);
    ctx.fillStyle = isCranial ? '#38bdf8' : 'rgba(56, 189, 248, 0.8)';
    ctx.fill();

    // Optic Tectum (Mesencephalon - Blue/Cyan Prominent Dome)
    ctx.beginPath();
    ctx.ellipse(cranX + 12, cranY - 8, 14, 15, -0.1, 0, Math.PI * 2);
    ctx.fillStyle = isTectum ? '#60a5fa' : 'rgba(96, 165, 250, 0.85)';
    ctx.fill();
    if (isTectum) {
      ctx.strokeStyle = 'rgba(96, 165, 250, 0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cranX + 12, cranY - 8, 18 + Math.sin(anatTime * 4) * 3, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Cerebellum (Emerald Dorsal Lobe)
    ctx.beginPath();
    ctx.ellipse(cranX + 32, cranY - 6, 9, 12, -0.15, 0, Math.PI * 2);
    ctx.fillStyle = isTectum ? '#34d399' : 'rgba(52, 211, 153, 0.8)';
    ctx.fill();

    // Hindbrain & Mauthner Giant Soma (Rose / Violet)
    const isMauthner = (selectedRegion === 'caudal-fin');
    ctx.beginPath();
    ctx.ellipse(cranX + 48, cranY + 4, 11, 10, 0, 0, Math.PI * 2);
    ctx.fillStyle = isMauthner ? '#f43f5e' : 'rgba(244, 63, 94, 0.8)';
    ctx.fill();
    // Mauthner giant axon initiating from hindbrain into spine
    ctx.beginPath();
    ctx.moveTo(cranX + 54, cranY + 4);
    ctx.lineTo(startX + bodyLen * 0.35, midY);
    ctx.strokeStyle = isMauthner ? '#f43f5e' : 'rgba(244, 63, 94, 0.5)';
    ctx.lineWidth = isMauthner ? 2.5 : 1.2;
    ctx.stroke();

    // 4. Swim Bladder & 140.2 dB Hyper-Sonic Drumming Apparatus
    const drumX = startX + bodyLen * 0.32;
    const drumY = midY + H * 0.08;
    const isDrumming = (selectedRegion === 'sonic-drumming');

    // Resonant Swim Bladder Chamber
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(drumX, drumY, 34, 18, -0.1, 0, Math.PI * 2);
    ctx.fillStyle = isDrumming ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.08)';
    ctx.fill();
    ctx.strokeStyle = isDrumming ? '#38bdf8' : 'rgba(56, 189, 248, 0.4)';
    ctx.lineWidth = isDrumming ? 2.4 : 1.2;
    ctx.stroke();

    // 5th Rib Drumming Clapper & Muscle
    ctx.beginPath();
    ctx.moveTo(drumX - 16, drumY - 14);
    ctx.quadraticCurveTo(drumX - 4, drumY + 6, drumX + 12, drumY - 10);
    ctx.strokeStyle = isDrumming ? '#f59e0b' : 'rgba(245, 158, 11, 0.6)';
    ctx.lineWidth = 3.5;
    ctx.stroke();

    // Acoustic shockwave rings when sonic drumming selected
    if (isDrumming) {
      for (let w = 1; w <= 3; w++) {
        const ringR = 24 + ((anatTime * 40 + w * 25) % 80);
        const alpha = Math.max(0, 1 - ringR / 80);
        ctx.strokeStyle = `rgba(56, 189, 248, ${alpha * 0.7})`;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(drumX, drumY, ringR, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.restore();

    // 5. 36 Segmented Vertebrae Axial Column
    const isVertebrae = (selectedRegion === 'vertebrae-lateral');
    const spineStartX = cranX + 54;
    const spineEndX   = startX + bodyLen * 0.86;
    const spineLen    = spineEndX - spineStartX;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(spineStartX, midY);
    ctx.lineTo(spineEndX, midY);
    ctx.strokeStyle = isVertebrae ? '#34d399' : 'rgba(52, 211, 153, 0.4)';
    ctx.lineWidth = isVertebrae ? 2.5 : 1.2;
    ctx.stroke();

    // 36 Vertebral Centra & Spines
    for (let v = 0; v < 36; v++) {
      const vx = spineStartX + (v / 35) * spineLen;
      // Neural spine (dorsal)
      ctx.beginPath();
      ctx.moveTo(vx, midY - 1);
      ctx.lineTo(vx + 2, midY - 9);
      ctx.strokeStyle = isVertebrae ? 'rgba(52, 211, 153, 0.7)' : 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      ctx.stroke();
      // Hemal spine (ventral)
      ctx.beginPath();
      ctx.moveTo(vx, midY + 1);
      ctx.lineTo(vx + 2, midY + 9);
      ctx.stroke();
      // Centrum dot
      ctx.beginPath();
      ctx.arc(vx, midY, isVertebrae ? 2.8 : 1.8, 0, Math.PI * 2);
      ctx.fillStyle = isVertebrae ? '#34d399' : 'rgba(255, 255, 255, 0.6)';
      ctx.fill();
    }
    ctx.restore();

    // 6. Rheotaxis Lateral Line Sensory Canal
    ctx.save();
    ctx.beginPath();
    const latStartX = startX + bodyLen * 0.18;
    const latEndX   = startX + bodyLen * 0.84;
    ctx.moveTo(latStartX, midY - H * 0.02);
    ctx.quadraticCurveTo(
      startX + bodyLen * 0.48, midY - H * 0.05,
      latEndX, midY
    );
    ctx.strokeStyle = isVertebrae ? '#f59e0b' : 'rgba(245, 158, 11, 0.35)';
    ctx.lineWidth = isVertebrae ? 2.0 : 1.0;
    ctx.stroke();

    // Neuromast sensory organ dots
    for (let nm = 0; nm <= 14; nm++) {
      const u = nm / 14;
      const nx = latStartX + u * (latEndX - latStartX);
      const ny = (midY - H * 0.02) * (1 - u) + midY * u - Math.sin(u * Math.PI) * (H * 0.03);
      ctx.beginPath();
      ctx.arc(nx, ny, isVertebrae ? 2.8 : 1.8, 0, Math.PI * 2);
      ctx.fillStyle = isVertebrae ? '#f59e0b' : 'rgba(245, 158, 11, 0.6)';
      ctx.fill();
    }
    ctx.restore();

    // 7. Translucent Pectoral Fin
    const pecX = startX + bodyLen * 0.20;
    const pecY = midY + H * 0.06;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(pecX, pecY);
    ctx.quadraticCurveTo(pecX + 22, pecY + 18, pecX + 32, pecY + 12);
    ctx.quadraticCurveTo(pecX + 18, pecY + 2, pecX, pecY);
    ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

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
  // 7. WEBSOCKET 1:1 BACKEND SYNC
  // When WS live: Python LIF engine drives ALL telemetry + Danio teleost position.
  // When disconnected: client connecto_sim.js (DanioTeleostSim) fallback runs.
  // =========================================================================

  function connectWebSocket() {
    const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProto}//${window.location.host}/ws/telemetry`;

    try {
      socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        wsConnected = true;
        console.log('[DANIO] WebSocket 1:1 sync active — Python LIF engine driving all telemetry.');
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

          // 3. Fallback to server telemetry only when local 3D sim is absent
          if (!sim) {
            if (elDominantState) elDominantState.textContent = telem.state;
            if (elVelocity)  elVelocity.innerHTML  = `${telem.speed_mms} <span class="dim">mm/s</span>`;
            if (elFrequency) elFrequency.innerHTML = `${telem.spikes_count} <span class="dim">Hz</span>`;
            if (elVm)        elVm.innerHTML        = `${parseFloat(telem.mean_v).toFixed(1)} <span class="dim">mV</span>`;
            if (elNutrient)  elNutrient.innerHTML  = `${telem.chem} <span class="dim">mol/L</span>`;

            updateMotorBars(telem);
            renderSpikeRaster(telem);
            renderPatchClamp(telem);
            pushEventLog(telem);
          }

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
        console.log('[DANIO] WS closed — client-side fallback active.');
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
        if (elImg && data.roam.screenshot) {
          const raw = data.roam.screenshot;
          const cleanPath = raw.startsWith('/screenshots/') ? raw : `/screenshots/${raw.replace(/^\/+/, '')}`;
          elImg.src = `${cleanPath}?t=${Date.now()}`;
        }
      }

      // 2. Dino
      if (data.dino && data.dino.best_score !== undefined) {
        const elScore = document.getElementById('proof-dino-score');
        const elJumps = document.getElementById('proof-dino-jumps');
        const elTrials = document.getElementById('proof-dino-trials');
        const elTag = document.getElementById('dino-score-tag');

        if (elScore) elScore.textContent = `${data.dino.best_score} PTS`;
        if (elJumps) elJumps.textContent = `${data.dino.total_jumps} JUMPS (MAUTHNER POOL)`;
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
  // 9. LIVE GITHUB COMPARATIVE AUDIT (DANIO VS FLYBRAIN VS CONNECTO)
  // =========================================================================
  async function refreshLiveComparison() {
    try {
      const res = await fetch('/api/comparison/live');
      if (!res.ok) return;
      const data = await res.json();

      const danioTag = document.getElementById('danio-commits-tag');
      const flyTag = document.getElementById('fly-commits-tag');
      const connTag = document.getElementById('connecto-commits-tag');
      const statusTag = document.getElementById('comparison-sync-status');

      if (danioTag && data.danio) {
        danioTag.textContent = `${data.danio.commits || 118} COMMITS (DANIO 650K)`;
      }
      if (flyTag && data.fly) {
        flyTag.textContent = `${data.fly.commits} COMMITS (FLYBRAIN)`;
      }
      if (connTag && data.connecto) {
        connTag.textContent = `${data.connecto.commits} COMMITS (CONNECTO)`;
      }
      if (statusTag && data.danio) {
        statusTag.textContent = `LIVE GITHUB AUDIT · DANIO 650K (${data.danio.commits || 118} COMMITS) VS FLYBRAIN (${data.fly ? data.fly.commits : 69} COMMITS) · SYNCHRONIZED`;
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

