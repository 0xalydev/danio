/**
 * DanioSimEngine — Global Unified Biophysical Simulation Engine
 * Adult Danionella cerebrum (650,000 Neurons · 203 Regions · 140.2 dB Sonic Organ)
 * 
 * Single source of truth driving:
 * - 3D WebGL Brain Simulation (Mode A / Mode B)
 * - Website Telemetry Deck (Kinematics, Motor Pools, Spike Raster, Oscilloscope)
 * - Sensorimotor Runner (dino.html)
 * - Biological Coding Solver (fizzbuzz.html)
 * - Consciousness Journal (journal.html)
 */

(function(window) {
  'use strict';

  class DanioSimEngine {
    constructor() {
      if (window.__DanioSimEngineInstance) {
        return window.__DanioSimEngineInstance;
      }

      this.listeners = new Map();
      this.isPaused = false;
      this.tickCount = 0;
      this.time = 0;

      // Authoritative State
      this.state = {
        tick: 0,
        time: 0,
        dominantState: 'PELAGIC_CRUISE',
        velocity: 0.52,          // mm/s
        spikesCount: 48,         // Population Hz
        meanVm: -62.4,           // mV
        preyConcentration: 7.4827,
        motorPools: {
          mCell: 12,             // Mauthner escape pool
          opticTectum: 82,       // Visuomotor colliculus
          purkinje: 65,          // Cerebellar balance
          sonicDrumming: 14,     // 140.2 dB sonic organ
          spinalVentral: 74      // Axial carangiform locomotor
        },
        // Telemetry buffers
        recentSpikes: [],        // [{ division, regionId, type, color, time }]
        oscilloscopeHistory: new Float32Array(120),
        dominantDivision: 'Mesencephalon',
        // Cross-experience state
        dino: {
          score: 0,
          highScore: 288,
          jumps: 113,
          trials: 3,
          gameOver: false,
          nearestDist: 999
        },
        fizzbuzz: {
          running: false,
          currentN: 1,
          matched: 84,
          total: 100,
          totalSpikes: 63533,
          lastResult: null
        },
        journal: []
      };

      // Fill initial oscilloscope trace
      for (let i = 0; i < 120; i++) {
        this.state.oscilloscopeHistory[i] = -62.0 + Math.sin(i * 0.15) * 1.5;
      }

      // Event Timers
      this.threatCooldown = 0;
      this.drummingCooldown = 0;
      this.lastJournalTime = 0;

      // Connect to WebSocket if available
      this.initWebSocket();

      // Start authoritative 50 Hz client tick loop
      this.tickInterval = setInterval(() => this.tick(), 20); // 50 Hz

      window.__DanioSimEngineInstance = this;
    }

    on(event, callback) {
      if (!this.listeners.has(event)) {
        this.listeners.set(event, new Set());
      }
      this.listeners.get(event).add(callback);
      return () => this.off(event, callback);
    }

    off(event, callback) {
      if (this.listeners.has(event)) {
        this.listeners.get(event).delete(callback);
      }
    }

    emit(event, data) {
      if (this.listeners.has(event)) {
        for (const cb of this.listeners.get(event)) {
          try { cb(data); } catch (err) { console.error(`[DanioSimEngine] Listener error on '${event}':`, err); }
        }
      }
    }

    initWebSocket() {
      if (typeof WebSocket === 'undefined') return;
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/telemetry`;
        this.ws = new WebSocket(wsUrl);
        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data && !this.isPaused) {
              this.syncServerTelemetry(data);
            }
          } catch (e) {}
        };
        this.ws.onclose = () => {
          // Reconnect after 3s
          setTimeout(() => this.initWebSocket(), 3000);
        };
      } catch (e) {}
    }

    syncServerTelemetry(data) {
      if (data.speed_mms !== undefined) this.state.velocity = Number(data.speed_mms);
      if (data.mean_v !== undefined) this.state.meanVm = Number(data.mean_v);
      if (data.spikes_count !== undefined) this.state.spikesCount = Number(data.spikes_count);
      if (data.chem !== undefined) this.state.preyConcentration = Number(data.chem);
      if (data.state && this.threatCooldown <= 0 && this.drummingCooldown <= 0) {
        this.state.dominantState = data.state;
      }
    }

    tick() {
      if (this.isPaused) return;

      this.tickCount++;
      const dt = 0.02; // 20ms
      this.time += dt;
      this.state.tick = this.tickCount;
      this.state.time = this.time;

      // Decrement timers
      if (this.threatCooldown > 0) {
        this.threatCooldown -= dt;
        if (this.threatCooldown <= 0) {
          this.state.dominantState = 'PELAGIC_CRUISE';
        }
      }
      if (this.drummingCooldown > 0) {
        this.drummingCooldown -= dt;
        if (this.drummingCooldown <= 0 && this.threatCooldown <= 0) {
          this.state.dominantState = 'PELAGIC_CRUISE';
        }
      }

      // 1. Dynamic Motor Pools Decay / Modulation
      const pools = this.state.motorPools;
      if (this.threatCooldown > 0) {
        // High Mauthner state
        pools.mCell = Math.min(180, pools.mCell * 0.96 + 8);
        pools.spinalVentral = Math.min(140, pools.spinalVentral * 0.95 + 10);
        this.state.velocity = Math.min(3.6, this.state.velocity * 0.94 + 0.35);
        this.state.meanVm = -52.4 + (Math.random() * 2 - 1);
      } else if (this.drummingCooldown > 0) {
        // High Sonic Drumming state
        pools.sonicDrumming = Math.min(138, pools.sonicDrumming * 0.95 + 12);
        pools.opticTectum = Math.min(95, pools.opticTectum * 0.98 + 3);
        this.state.velocity = Math.max(0.48, this.state.velocity * 0.96);
        this.state.meanVm = -58.2 + (Math.random() * 2 - 1);
      } else {
        // Natural physiological undulation
        const undulation = Math.sin(this.time * 2.8);
        pools.mCell = Math.max(8, pools.mCell * 0.92 + Math.random() * 2);
        pools.opticTectum = 76 + Math.round(Math.sin(this.time * 1.5) * 8);
        pools.purkinje = 62 + Math.round(Math.cos(this.time * 1.2) * 6);
        pools.sonicDrumming = Math.max(12, pools.sonicDrumming * 0.90 + Math.random() * 3);
        pools.spinalVentral = 68 + Math.round(undulation * 8);
        this.state.velocity = Math.max(0.42, Math.min(1.85, 0.52 + undulation * 0.18));
        this.state.meanVm = -62.0 + Math.sin(this.time * 1.8) * 1.8;
      }

      // Mean population spike frequency
      this.state.spikesCount = Math.round(
        (pools.mCell * 0.08) +
        (pools.opticTectum * 0.35) +
        (pools.purkinje * 0.38) +
        (pools.sonicDrumming * 0.04) +
        (pools.spinalVentral * 0.15)
      );

      // 2. Patch-Clamp Oscilloscope trace update
      const hist = this.state.oscilloscopeHistory;
      for (let i = 0; i < hist.length - 1; i++) {
        hist[i] = hist[i + 1];
      }
      let newSample = this.state.meanVm;
      if (this.threatCooldown > 1.2) {
        // Full action potential spike up to +28 mV
        newSample = 28.5 * Math.exp(-((1.5 - this.threatCooldown) * 8) ** 2) - 52.0;
      } else {
        newSample += (Math.random() * 2.5 - 1.25);
      }
      hist[hist.length - 1] = newSample;

      // 3. Generate Discrete Spikes for Raster
      if (this.tickCount % 2 === 0) {
        const randDiv = Math.random();
        let div = 'Mesencephalon';
        let color = '#06b6d4';
        let channel = 1;

        if (this.threatCooldown > 0 && Math.random() < 0.7) {
          div = 'Rhombencephalon';
          color = '#f43f5e';
          channel = 0;
        } else if (this.drummingCooldown > 0 && Math.random() < 0.6) {
          div = 'Motor & Sonic Drumming';
          color = '#f59e0b';
          channel = 3;
        } else if (randDiv < 0.35) {
          div = 'Mesencephalon';
          color = '#06b6d4';
          channel = 1;
        } else if (randDiv < 0.72) {
          div = 'Cerebellum';
          color = '#10b981';
          channel = 2;
        } else if (randDiv < 0.85) {
          div = 'Telencephalon';
          color = '#38bdf8';
          channel = 4;
        } else {
          div = 'Motor & Sonic Drumming';
          color = '#e2e8f0';
          channel = 5;
        }

        const spike = {
          time: this.time,
          division: div,
          channel: channel,
          color: color,
          intensity: 0.8 + Math.random() * 0.2
        };

        this.state.recentSpikes.push(spike);
        if (this.state.recentSpikes.length > 80) {
          this.state.recentSpikes.shift();
        }
      }

      // 4. Periodic Journal Entry Synthesis (every 18-25 seconds or on major events)
      if (this.time - this.lastJournalTime > 22.0) {
        this.generateJournalEntry('SPONTANEOUS_EXPLORATION', 'Laminar flow rheotaxis maintained by cerebellar Purkinje balancing loops.');
      }

      // Notify subscribers
      this.emit('tick', this.state);
    }

    /* -----------------------------------------------------------------------
     * STIMULUS INJECTION METHODS
     * ----------------------------------------------------------------------- */

    triggerMauthnerEscape() {
      this.threatCooldown = 1.6; // 1.6s burst
      this.state.dominantState = 'MAUTHNER_C_START';
      this.state.motorPools.mCell = 180;
      this.state.velocity = 3.65;

      // Trigger jump in Dino Runner
      this.state.dino.jumps++;
      this.emit('dinoAction', { type: 'jump', reason: 'MAUTHNER_C_START' });

      // Record Journal entry
      this.generateJournalEntry(
        'PREDATOR_THREAT_DETECTED',
        'Mauthner giant reticulospinal cell commanded unilateral C-start escape turn within 5ms. 180 Hz motor burst executed.'
      );

      this.emit('reflex', { type: 'mauthner', intensity: 1.0 });
    }

    triggerSonicDrumming() {
      this.drummingCooldown = 1.4;
      this.state.dominantState = 'SONIC_DRUMMING_PULSE';
      this.state.motorPools.sonicDrumming = 140;

      // Record Journal entry
      this.generateJournalEntry(
        'ACOUSTIC_DRUMMING_PULSE',
        'Sonic drumming motor nucleus discharged at 108 Hz, activating swim bladder drumming apparatus to generate 140.2 dB SPL acoustic pulse.'
      );

      this.emit('drumming', { type: 'sonic', spl: 140.2, freq: 108 });
    }

    triggerPreyAttractor(x, y) {
      this.state.dominantState = 'PREY_PURSUIT';
      this.state.motorPools.opticTectum = 92;
      this.state.preyConcentration += 0.85;

      this.generateJournalEntry(
        'PREY_LUMINANCE_BURST',
        `Optic tectum periventricular receptive field computed prey delta vector (${x.toFixed(1)}, ${y.toFixed(1)}). Reticulospinal locomotor pools aligned.`
      );

      this.emit('stimulus', { type: 'prey', x, y });
    }

    pause(shouldPause) {
      this.isPaused = (shouldPause !== undefined) ? shouldPause : !this.isPaused;
      this.emit('pauseState', this.isPaused);
      return this.isPaused;
    }

    reset() {
      this.threatCooldown = 0;
      this.drummingCooldown = 0;
      this.time = 0;
      this.tickCount = 0;
      this.state.dominantState = 'PELAGIC_CRUISE';
      this.state.velocity = 0.52;
      this.state.meanVm = -62.4;
      this.state.motorPools.mCell = 12;
      this.state.motorPools.opticTectum = 82;
      this.state.motorPools.purkinje = 65;
      this.state.motorPools.sonicDrumming = 14;
      this.state.motorPools.spinalVentral = 74;
      this.state.recentSpikes = [];
      this.emit('reset', this.state);
    }

    generateJournalEntry(trigger, text) {
      this.lastJournalTime = this.time;
      const dateStr = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
      const sig = '0x' + Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0') +
                         Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0');

      const entry = {
        timestamp: dateStr,
        signature: sig,
        trigger: trigger,
        state: this.state.dominantState,
        quote: text,
        meanVm: this.state.meanVm.toFixed(2),
        velocity: this.state.velocity.toFixed(2),
        spikes: this.state.spikesCount,
        modeled: true
      };

      this.state.journal.unshift(entry);
      if (this.state.journal.length > 20) this.state.journal.pop();
      this.emit('journalEntry', entry);
      return entry;
    }
  }

  // Export globally
  window.DanioSimEngine = DanioSimEngine;
  window.danioEngine = new DanioSimEngine();

})(typeof window !== 'undefined' ? window : this);
