/**
 * DanioWebGLSimulation — 3D Biological Brain & Central Nervous System (CNS) Simulation
 * Adult Danionella cerebrum Connectome (650,000 Neurons · 203 Regions · 0.6 mm³ Cranium)
 * 
 * SCIENTIFIC VISUALIZATION SPECIFICATION:
 * - Deep dark near-black environment (#020509)
 * - Dual Connected Modes:
 *   * MODE A (Full Teleost CNS): 12mm adult body envelope, 36 vertebrae, lateral line, cranial vault in situ
 *   * MODE B (3D Cranial Connectome): 203 biological regions, dense tract splines, somata
 * - True LOD (Far / Mid / Near) & Decoupled Loops (Zero Zoom Lag)
 * - Fiber-Constrained Traveling Particles: position = spline.getPointAt(progress)
 * - Multi-colored signaling: Cyan, Green, Gold, Red/Magenta, White with motion trails
 * - 203 Selectable Regions from danio_atlas_203.json
 * - Hard chamber containment & strict camera clamping
 */

(function(window) {
  'use strict';

  function createCircularGlowTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
    grad.addColorStop(0.22, 'rgba(255, 255, 255, 0.85)');
    grad.addColorStop(0.55, 'rgba(255, 255, 255, 0.22)');
    grad.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  }

  // 6 Cranial Divisions
  const DIVISION_COLORS = {
    'Telencephalon': 0x38bdf8,         // Sky blue
    'Diencephalon': 0xa855f7,          // Purple
    'Mesencephalon': 0x06b6d4,         // Cyan (Optic Tectum)
    'Cerebellum': 0x10b981,            // Emerald green
    'Rhombencephalon': 0xf43f5e,       // Rose / Red (Mauthner)
    'Motor & Sonic Drumming': 0xf59e0b // Amber / Gold
  };

  class DanioWebGLSimulation {
    constructor(container, options = {}) {
      this.container = typeof container === 'string' ? document.getElementById(container) : container;
      if (!this.container) throw new Error('DanioWebGLSimulation: Container not found');

      this.options = Object.assign({
        enableControls: true,
        autoRotate: false,
        onTelemetry: null,
        onRegionSelect: null
      }, options);

      this.width = this.container.clientWidth || 920;
      this.height = this.container.clientHeight || 560;

      // Mode state: 'A' (Full Teleost CNS) or 'B' (3D Cranial Connectome)
      this.mode = 'B'; 
      this.targetMode = 'B';
      this.modeTransition = 1.0; // 0.0 = Mode A, 1.0 = Mode B

      // Simulation State
      this.time = 0;
      this.clock = new THREE.Clock();
      this.isPaused = false;
      this.selectedRegion = null;
      this.hoveredRegion = null;

      // Camera positions for modes
      this.camPosModeA = new THREE.Vector3(38.0, 16.0, 32.0);
      this.camTargetModeA = new THREE.Vector3(0.0, 0.0, -4.0);

      this.camPosModeB = new THREE.Vector3(22.0, 15.0, 24.0);
      this.camTargetModeB = new THREE.Vector3(0.0, 1.0, -2.5);

      // LOD State
      this.currentLOD = 2; // 0=Far, 1=Mid, 2=Near

      // Signal Propagation
      this.activeSignals = [];
      this.maxSignals = 75;

      // Atlas & Regions
      this.regions = [];
      this.tractCurves = [];
      this.regionCentroids = [];
      this.divisionGroups = {};

      // Initialize Scene & Engine
      this.initScene();
      this.buildLoadingIndicator();
      this.loadAtlasData();

      // Hook DanioSimEngine if available
      if (window.danioEngine) {
        this.bindSimulationEngine(window.danioEngine);
      }

      // Render Loop
      this.animate = this.animate.bind(this);
      this.rafId = requestAnimationFrame(this.animate);
    }

    /* -----------------------------------------------------------------------
     * 1. SCENE SETUP & HARD CHAMBER ENFORCEMENT
     * ----------------------------------------------------------------------- */
    initScene() {
      this.renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance'
      });
      this.renderer.setSize(this.width, this.height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.setClearColor(0x020509, 1.0);

      this.canvas = this.renderer.domElement;
      this.canvas.id = 'webgl-brain-canvas';
      this.canvas.style.position = 'absolute';
      this.canvas.style.top = '0';
      this.canvas.style.left = '0';
      this.canvas.style.width = '100%';
      this.canvas.style.height = '100%';
      this.canvas.style.display = 'block';
      this.canvas.style.zIndex = '1';

      // HARD CHAMBER BOUNDARY: The chamber is sacred
      this.container.style.position = 'relative';
      this.container.style.overflow = 'hidden';
      this.container.style.backgroundColor = '#020509';
      this.container.appendChild(this.canvas);

      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x020509);

      // Camera
      const fov = 40;
      this.camera = new THREE.PerspectiveCamera(fov, this.width / this.height, 0.1, 800);
      this.camera.position.copy(this.camPosModeB);
      this.camera.lookAt(this.camTargetModeB);

      // OrbitControls with Strict Clamps
      if (this.options.enableControls && typeof THREE.OrbitControls !== 'undefined') {
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.target.copy(this.camTargetModeB);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.08;
        this.controls.minDistance = 18;
        this.controls.maxDistance = 75;
        this.controls.minPolarAngle = Math.PI * 0.12;
        this.controls.maxPolarAngle = Math.PI * 0.85;
        this.controls.autoRotate = this.options.autoRotate;
        this.controls.autoRotateSpeed = 0.25;
      }

      // Lighting
      const ambLight = new THREE.AmbientLight(0x0a1628, 1.8);
      this.scene.add(ambLight);

      const keyLight = new THREE.DirectionalLight(0x38bdf8, 0.9);
      keyLight.position.set(-25, 30, 25);
      this.scene.add(keyLight);

      const fillLight = new THREE.DirectionalLight(0x10b981, 0.6);
      fillLight.position.set(25, -15, -25);
      this.scene.add(fillLight);

      this.glowTexture = createCircularGlowTexture();

      // Master Display Groups
      this.rootGroup = new THREE.Group();
      this.scene.add(this.rootGroup);

      // Mode A Group: Full Teleost Body & CNS
      this.modeAGroup = new THREE.Group();
      this.rootGroup.add(this.modeAGroup);

      // Mode B Group: 3D Cranial Connectome & 203 Regions
      this.modeBGroup = new THREE.Group();
      this.rootGroup.add(this.modeBGroup);

      // Shared Dynamic Signals Group
      this.signalsGroup = new THREE.Group();
      this.rootGroup.add(this.signalsGroup);

      // Resize listener
      this.onResizeHandler = () => this.onResize();
      window.addEventListener('resize', this.onResizeHandler);

      // Raycasting for Region Selection
      this.setupRaycasting();
    }

    onResize() {
      if (!this.container) return;
      this.width = this.container.clientWidth || 920;
      this.height = this.container.clientHeight || 560;
      this.camera.aspect = this.width / this.height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(this.width, this.height);
    }

    buildLoadingIndicator() {
      this.loadingEl = document.createElement('div');
      this.loadingEl.style.position = 'absolute';
      this.loadingEl.style.top = '50%';
      this.loadingEl.style.left = '50%';
      this.loadingEl.style.transform = 'translate(-50%, -50%)';
      this.loadingEl.style.color = '#38bdf8';
      this.loadingEl.style.fontFamily = 'monospace';
      this.loadingEl.style.fontSize = '12px';
      this.loadingEl.style.letterSpacing = '2px';
      this.loadingEl.style.zIndex = '5';
      this.loadingEl.style.pointerEvents = 'none';
      this.loadingEl.innerHTML = 'INITIALIZING DANIO 203-REGION CONNECTOME...';
      this.container.appendChild(this.loadingEl);
    }

    /* -----------------------------------------------------------------------
     * 2. ATLAS DATA LOADING (web/data/danio_atlas_203.json)
     * ----------------------------------------------------------------------- */
    async loadAtlasData() {
      try {
        const res = await fetch('/data/danio_atlas_203.json');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const atlas = await res.json();

        if (this.loadingEl && this.loadingEl.parentNode) {
          this.loadingEl.parentNode.removeChild(this.loadingEl);
        }

        this.atlasMetadata = atlas.metadata;
        this.divisions = atlas.divisions;
        this.regions = atlas.regions;
        this.tracts = atlas.tracts;
        this.neuronPointsData = atlas.neuronPoints;

        // Build 3D structures
        this.buildModeAFullFishCNS();
        this.buildModeBCranialConnectome();
        this.buildTractFibers();
        this.buildNeuronPointsCloud();
        this.initSignalPool();

        // Notify app
        if (this.options.onAtlasLoaded) {
          this.options.onAtlasLoaded(atlas);
        }
      } catch (err) {
        console.warn('[DanioWebGLSimulation] Could not fetch atlas JSON, initializing built-in model:', err);
        if (this.loadingEl) {
          this.loadingEl.innerHTML = 'LOADED BUILT-IN DANIELLA MODEL';
          setTimeout(() => { if (this.loadingEl.parentNode) this.loadingEl.parentNode.removeChild(this.loadingEl); }, 1500);
        }
        this.buildFallbackModel();
      }
    }

    /* -----------------------------------------------------------------------
     * 3. MODE A: FULL DANIONELLA TELEOST & CNS VIEW
     * Transparent 12mm body, 36 vertebrae, lateral line, spinal cord, cranial vault
     * ----------------------------------------------------------------------- */
    buildModeAFullFishCNS() {
      // 1. Transparent 12mm Teleost Body Outline / Ribs
      const bodyPts = [];
      const numRings = 40;
      // Fish body extends along Z from +18 (snout) to -38 (caudal peduncle)
      for (let r = 0; r <= numRings; r++) {
        const u = r / numRings;
        const z = 18.0 - u * 56.0; // Total length: 56 units (~12mm scale)

        // Lateral and Dorsoventral profile of Danionella
        let w, h;
        if (u < 0.2) {
          // Cranium & Snout (tapering to snout)
          const f = u / 0.2;
          w = 2.0 + 3.8 * Math.sin(f * Math.PI * 0.5);
          h = 1.8 + 3.2 * Math.sin(f * Math.PI * 0.5);
        } else if (u < 0.55) {
          // Abdomen & Cranial vault
          const f = (u - 0.2) / 0.35;
          w = 5.8 * Math.cos(f * 0.45);
          h = 5.0 * Math.cos(f * 0.40);
        } else {
          // Tail taper to caudal fin
          const f = (u - 0.55) / 0.45;
          w = 5.0 * (1.0 - f * 0.85);
          h = 4.2 * (1.0 - f * 0.88);
        }

        const ringGeom = new THREE.BufferGeometry();
        const ringVerts = [];
        const segs = 24;
        for (let s = 0; s <= segs; s++) {
          const theta = (s / segs) * Math.PI * 2;
          const x = Math.sin(theta) * w;
          const y = (Math.cos(theta) * h) + 0.2;
          ringVerts.push(x, y, z);
        }
        ringGeom.setAttribute('position', new THREE.Float32BufferAttribute(ringVerts, 3));
        const ringMat = new THREE.LineBasicMaterial({
          color: 0x1e293b,
          transparent: true,
          opacity: 0.28
        });
        this.modeAGroup.add(new THREE.Line(ringGeom, ringMat));
      }

      // 2. 36 Mineralized Vertebral Centra Representation
      const vertGeom = new THREE.BufferGeometry();
      const vertPositions = [];
      const vertColors = [];
      for (let v = 0; v < 36; v++) {
        const vz = 8.0 - (v / 35) * 44.0; // Across trunk
        const vy = -0.4 + Math.sin(v * 0.1) * 0.2;
        vertPositions.push(0.0, vy, vz);
        // Cool slate gray for vertebrae
        vertColors.push(0.58, 0.64, 0.72);
      }
      vertGeom.setAttribute('position', new THREE.Float32BufferAttribute(vertPositions, 3));
      vertGeom.setAttribute('color', new THREE.Float32BufferAttribute(vertColors, 3));
      const vertMat = new THREE.PointsMaterial({
        size: 3.2,
        map: this.glowTexture,
        vertexColors: true,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      this.modeAGroup.add(new THREE.Points(vertGeom, vertMat));

      // Connecting Spinal Axis Line
      const spineGeom = new THREE.BufferGeometry();
      spineGeom.setAttribute('position', new THREE.Float32BufferAttribute(vertPositions, 3));
      const spineMat = new THREE.LineBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.65,
        linewidth: 2
      });
      this.modeAGroup.add(new THREE.Line(spineGeom, spineMat));

      // 3. Bilateral Lateral Line Neuromast Sensory Columns
      [-1, 1].forEach((sign) => {
        const llPts = [];
        for (let s = 0; s <= 30; s++) {
          const u = s / 30;
          const z = 8.0 - u * 42.0;
          const x = sign * (4.2 * (1.0 - u * 0.6));
          const y = 0.5 - u * 0.8;
          llPts.push(new THREE.Vector3(x, y, z));
        }
        const llCurve = new THREE.CatmullRomCurve3(llPts);
        const llGeom = new THREE.BufferGeometry().setFromPoints(llCurve.getPoints(50));
        const llMat = new THREE.LineDashedMaterial({
          color: 0x06b6d4,
          dashSize: 0.8,
          gapSize: 0.5,
          transparent: true,
          opacity: 0.55
        });
        const llLine = new THREE.Line(llGeom, llMat);
        llLine.computeLineDistances();
        this.modeAGroup.add(llLine);
      });

      // 4. Optic System & Cranial Vault in Situ
      [-1, 1].forEach((sign) => {
        // Eye / Optic cup
        const eyeGeom = new THREE.RingGeometry(1.6, 2.2, 16);
        const eyeMat = new THREE.MeshBasicMaterial({
          color: 0x0284c7,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.6
        });
        const eyeMesh = new THREE.Mesh(eyeGeom, eyeMat);
        eyeMesh.position.set(sign * 4.8, 1.8, 8.5);
        eyeMesh.rotation.y = Math.PI * 0.5;
        this.modeAGroup.add(eyeMesh);
      });

      // 5. Caudal Fin Bifurcation
      const finGeom = new THREE.BufferGeometry();
      const finVerts = [
        0.0, 0.0, -36.0,
        0.0, 4.8, -44.0,
        0.0, 1.2, -41.0,
        0.0, 0.0, -36.0,
        0.0, 1.2, -41.0,
        0.0, -1.2, -41.0,
        0.0, 0.0, -36.0,
        0.0, -1.2, -41.0,
        0.0, -4.8, -44.0
      ];
      finGeom.setAttribute('position', new THREE.Float32BufferAttribute(finVerts, 3));
      const finMat = new THREE.MeshBasicMaterial({
        color: 0x06b6d4,
        wireframe: true,
        transparent: true,
        opacity: 0.4
      });
      this.modeAGroup.add(new THREE.Mesh(finGeom, finMat));

      // Initial visibility for Mode A
      this.modeAGroup.visible = (this.mode === 'A');
    }

    /* -----------------------------------------------------------------------
     * 4. MODE B: 3D CRANIAL CONNECTOME (203 REGIONS)
     * High-resolution lobes, gyral sulci, and biological landmarks
     * ----------------------------------------------------------------------- */
    buildModeBCranialConnectome() {
      // Create collision & visual spheres for all 203 regions
      this.regionSpheres = [];

      this.regions.forEach((reg) => {
        const divColor = DIVISION_COLORS[reg.division] || 0x38bdf8;

        // Collision sphere for raycasting
        const sphereGeom = new THREE.SphereGeometry(reg.radius, 12, 10);
        const sphereMat = new THREE.MeshBasicMaterial({
          color: divColor,
          wireframe: true,
          transparent: true,
          opacity: 0.14,
          depthWrite: false
        });
        const sphere = new THREE.Mesh(sphereGeom, sphereMat);
        sphere.position.set(reg.center[0], reg.center[1], reg.center[2]);
        sphere.userData = { region: reg };
        this.modeBGroup.add(sphere);
        this.regionSpheres.push(sphere);
      });

      // Anatomical Sulcal Grooves (Longitudinal Cerebral Fissure & Coronal Sulci)
      const fissurePts = [
        new THREE.Vector3(0.0, 2.8, 14.0),
        new THREE.Vector3(0.0, 3.2, 8.0),
        new THREE.Vector3(0.0, 3.6, 2.0),
        new THREE.Vector3(0.0, 4.2, -4.0),
        new THREE.Vector3(0.0, 1.8, -12.0)
      ];
      const fissureGeom = new THREE.BufferGeometry().setFromPoints(
        new THREE.CatmullRomCurve3(fissurePts).getPoints(40)
      );
      const fissureMat = new THREE.LineBasicMaterial({
        color: 0x0f172a,
        linewidth: 3,
        transparent: true,
        opacity: 0.8
      });
      this.modeBGroup.add(new THREE.Line(fissureGeom, fissureMat));

      // Translucent Cranial Window Shell
      const shellGeom = new THREE.SphereGeometry(14.0, 24, 16);
      shellGeom.scale(0.85, 0.65, 1.15);
      const shellMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        wireframe: true,
        transparent: true,
        opacity: 0.05,
        depthWrite: false
      });
      const shellMesh = new THREE.Mesh(shellGeom, shellMat);
      shellMesh.position.set(0.0, 1.2, 0.0);
      this.modeBGroup.add(shellMesh);
    }

    /* -----------------------------------------------------------------------
     * 5. TRACT FIBERS (600 CATMULL-ROM SPLINES)
     * Real curved pathways connecting region pairs
     * ----------------------------------------------------------------------- */
    buildTractFibers() {
      this.tractCurves = [];
      const fiberPositions = [];
      const fiberColors = [];

      this.tracts.forEach((t) => {
        const srcReg = this.regions[t.src];
        const dstReg = this.regions[t.dst];
        if (!srcReg || !dstReg) return;

        const p0 = new THREE.Vector3(...srcReg.center);
        const p1 = new THREE.Vector3(...t.mid);
        const p2 = new THREE.Vector3(...dstReg.center);

        const curve = new THREE.CatmullRomCurve3([p0, p1, p2]);
        this.tractCurves.push({
          curve: curve,
          src: t.src,
          dst: t.dst,
          srcName: t.srcName,
          dstName: t.dstName,
          weight: t.weight,
          isInhibitory: t.isInhibitory
        });

        // Sample curve points for static fiber mesh
        const pts = curve.getPoints(16);
        const isCyan = (srcReg.division === 'Mesencephalon' || dstReg.division === 'Mesencephalon');
        const isGreen = (srcReg.division === 'Cerebellum' || dstReg.division === 'Cerebellum');
        const isRose = (srcReg.division === 'Rhombencephalon' || dstReg.division === 'Rhombencephalon');

        const cr = isRose ? 0.95 : (isCyan ? 0.05 : (isGreen ? 0.08 : 0.65));
        const cg = isRose ? 0.25 : (isCyan ? 0.72 : (isGreen ? 0.75 : 0.75));
        const cb = isRose ? 0.38 : (isCyan ? 0.85 : (isGreen ? 0.52 : 0.85));

        for (let i = 0; i < pts.length - 1; i++) {
          fiberPositions.push(pts[i].x, pts[i].y, pts[i].z);
          fiberPositions.push(pts[i + 1].x, pts[i + 1].y, pts[i + 1].z);
          fiberColors.push(cr, cg, cb);
          fiberColors.push(cr, cg, cb);
        }
      });

      const fiberGeom = new THREE.BufferGeometry();
      fiberGeom.setAttribute('position', new THREE.Float32BufferAttribute(fiberPositions, 3));
      fiberGeom.setAttribute('color', new THREE.Float32BufferAttribute(fiberColors, 3));

      const fiberMat = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.22,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      this.fiberLineSegments = new THREE.LineSegments(fiberGeom, fiberMat);
      this.modeBGroup.add(this.fiberLineSegments);
    }

    /* -----------------------------------------------------------------------
     * 6. REPRESENTATIVE 20,000 NEURON SOMATA (HIGH-PERFORMANCE BUFFER)
     * ----------------------------------------------------------------------- */
    buildNeuronPointsCloud() {
      if (!this.neuronPointsData) return;

      const positions = new Float32Array(this.neuronPointsData.positions);
      const regIds = this.neuronPointsData.regions;
      const count = this.neuronPointsData.count;

      const colors = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        const rid = regIds[i];
        const reg = this.regions[rid];
        const div = reg ? reg.division : 'Mesencephalon';
        const hex = DIVISION_COLORS[div] || 0x38bdf8;
        const color = new THREE.Color(hex);

        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
      }

      this.pointsGeometry = new THREE.BufferGeometry();
      this.pointsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      this.pointsGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      this.pointsMaterial = new THREE.PointsMaterial({
        size: 1.8,
        map: this.glowTexture,
        vertexColors: true,
        transparent: true,
        opacity: 0.70,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      this.pointsMesh = new THREE.Points(this.pointsGeometry, this.pointsMaterial);
      this.modeBGroup.add(this.pointsMesh);
    }

    /* -----------------------------------------------------------------------
     * 7. FIBER-CONSTRAINED SIGNAL PROPAGATION SYSTEM
     * Particles strictly follow spline curves: position = curve.getPointAt(progress)
     * ----------------------------------------------------------------------- */
    initSignalPool() {
      this.signalPool = [];
      for (let i = 0; i < this.maxSignals; i++) {
        this.spawnSignal();
      }
    }

    spawnSignal(forcedType = null) {
      if (this.tractCurves.length === 0) return;

      const tractIdx = Math.floor(Math.random() * this.tractCurves.length);
      const tract = this.tractCurves[tractIdx];
      const srcReg = this.regions[tract.src];

      let type = forcedType;
      let colorHex = 0x38bdf8; // Default cyan

      if (!type) {
        if (srcReg && srcReg.division === 'Mesencephalon') {
          type = 'sensory';
          colorHex = 0x06b6d4; // Cyan
        } else if (srcReg && srcReg.division === 'Cerebellum') {
          type = 'motor';
          colorHex = 0x10b981; // Green
        } else if (srcReg && srcReg.division === 'Rhombencephalon') {
          type = 'reflex';
          colorHex = 0xf43f5e; // Rose
        } else if (Math.random() < 0.2) {
          type = 'burst';
          colorHex = 0xf59e0b; // Gold
        } else {
          type = 'baseline';
          colorHex = 0xe2e8f0; // White
        }
      } else {
        if (type === 'reflex') colorHex = 0xf43f5e;
        else if (type === 'sonic') colorHex = 0xf59e0b;
        else if (type === 'sensory') colorHex = 0x06b6d4;
      }

      // Trail geometry (small line segment following curve)
      const trailPts = [new THREE.Vector3(), new THREE.Vector3()];
      const trailGeom = new THREE.BufferGeometry().setFromPoints(trailPts);
      const trailMat = new THREE.LineBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const trailMesh = new THREE.Line(trailGeom, trailMat);
      this.signalsGroup.add(trailMesh);

      // Core point sprite
      const pointGeom = new THREE.BufferGeometry();
      pointGeom.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0], 3));
      const pointMat = new THREE.PointsMaterial({
        size: 3.8,
        color: colorHex,
        map: this.glowTexture,
        transparent: true,
        opacity: 1.0,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const pointMesh = new THREE.Points(pointGeom, pointMat);
      this.signalsGroup.add(pointMesh);

      this.activeSignals.push({
        tract: tract,
        progress: Math.random() * 0.9,
        speed: 0.35 + Math.random() * 0.65, // Variable propagation speed
        color: colorHex,
        type: type,
        trailMesh: trailMesh,
        pointMesh: pointMesh
      });
    }

    updateSignals(delta) {
      for (let i = this.activeSignals.length - 1; i >= 0; i--) {
        const s = this.activeSignals[i];
        s.progress += s.speed * delta;

        if (s.progress >= 1.0) {
          // Depolarize target region!
          this.onSignalArrival(s);

          // Recycle signal
          s.progress = 0.0;
          // Pick new connected tract if available or random
          const nextTractIdx = Math.floor(Math.random() * this.tractCurves.length);
          s.tract = this.tractCurves[nextTractIdx];
        }

        // Calculate visual position mathematically on the Catmull-Rom spline
        const curPos = s.tract.curve.getPointAt(s.progress);
        const trailProgress = Math.max(0.0, s.progress - 0.08);
        const prevPos = s.tract.curve.getPointAt(trailProgress);

        // Update core point
        const posAttr = s.pointMesh.geometry.attributes.position;
        posAttr.setXYZ(0, curPos.x, curPos.y, curPos.z);
        posAttr.needsUpdate = true;

        // Update trail segment
        const trailAttr = s.trailMesh.geometry.attributes.position;
        trailAttr.setXYZ(0, curPos.x, curPos.y, curPos.z);
        trailAttr.setXYZ(1, prevPos.x, prevPos.y, prevPos.z);
        trailAttr.needsUpdate = true;
      }
    }

    onSignalArrival(signal) {
      const dstIdx = signal.tract.dst;
      const dstReg = this.regions[dstIdx];
      if (!dstReg) return;

      // Pulse the region sphere briefly
      const sphere = this.regionSpheres[dstIdx];
      if (sphere && sphere.material) {
        sphere.material.opacity = 0.45;
        setTimeout(() => { if (sphere.material) sphere.material.opacity = 0.14; }, 180);
      }
    }

    /* -----------------------------------------------------------------------
     * 8. LEVEL OF DETAIL (LOD) SYSTEM & VIEWPORT OPTIMIZATION
     * ----------------------------------------------------------------------- */
    updateLOD() {
      if (!this.controls) return;
      const dist = this.camera.position.distanceTo(this.controls.target);

      let newLOD = 2; // Near
      if (dist > 52.0) {
        newLOD = 0; // Far
      } else if (dist > 35.0) {
        newLOD = 1; // Mid
      }

      if (newLOD !== this.currentLOD) {
        this.currentLOD = newLOD;
        this.applyLOD(newLOD);
      }
    }

    applyLOD(lod) {
      if (lod === 0) {
        // Far: Dim soma points, hide local trails, keep major division tracts
        if (this.pointsMaterial) this.pointsMaterial.opacity = 0.35;
        if (this.fiberLineSegments) this.fiberLineSegments.material.opacity = 0.12;
      } else if (lod === 1) {
        // Mid: Medium density
        if (this.pointsMaterial) this.pointsMaterial.opacity = 0.60;
        if (this.fiberLineSegments) this.fiberLineSegments.material.opacity = 0.22;
      } else {
        // Near: Full detail
        if (this.pointsMaterial) this.pointsMaterial.opacity = 0.85;
        if (this.fiberLineSegments) this.fiberLineSegments.material.opacity = 0.32;
      }
    }

    /* -----------------------------------------------------------------------
     * 9. DUAL MODE TRANSITION (MODE A <-> MODE B)
     * ----------------------------------------------------------------------- */
    setMode(mode) {
      if (mode !== 'A' && mode !== 'B') return;
      this.targetMode = mode;
    }

    updateModeTransition(delta) {
      if (this.mode === this.targetMode && this.modeTransition === (this.targetMode === 'B' ? 1.0 : 0.0)) {
        return;
      }

      const speed = 2.5; // Smooth transition in ~0.4s
      if (this.targetMode === 'B') {
        this.modeTransition = Math.min(1.0, this.modeTransition + delta * speed);
      } else {
        this.modeTransition = Math.max(0.0, this.modeTransition - delta * speed);
      }

      // Smooth step
      const t = this.modeTransition * this.modeTransition * (3 - 2 * this.modeTransition);

      // Interpolate camera position & target
      this.camera.position.lerpVectors(this.camPosModeA, this.camPosModeB, t);
      if (this.controls) {
        this.controls.target.lerpVectors(this.camTargetModeA, this.camTargetModeB, t);
      }

      // Crossfade groups
      this.modeAGroup.visible = (t < 0.95);
      this.modeBGroup.visible = (t > 0.05);

      if (this.modeAGroup.children.length > 0) {
        this.modeAGroup.traverse((obj) => {
          if (obj.material) obj.material.opacity = (1.0 - t) * 0.7;
        });
      }

      if (this.modeTransition <= 0.0) this.mode = 'A';
      if (this.modeTransition >= 1.0) this.mode = 'B';
    }

    /* -----------------------------------------------------------------------
     * 10. RAYCASTING & REGION SELECTION
     * ----------------------------------------------------------------------- */
    setupRaycasting() {
      this.raycaster = new THREE.Raycaster();
      this.mouse = new THREE.Vector2(-999, -999);
      let isDragging = false;
      let dragStart = { x: 0, y: 0 };

      this.canvas.addEventListener('pointerdown', (e) => {
        isDragging = false;
        dragStart = { x: e.clientX, y: e.clientY };
      });

      this.canvas.addEventListener('pointermove', (e) => {
        if (Math.abs(e.clientX - dragStart.x) > 4 || Math.abs(e.clientY - dragStart.y) > 4) {
          isDragging = true;
        }
      });

      this.canvas.addEventListener('pointerup', (e) => {
        if (isDragging) return; // Ignore drag end

        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.regionSpheres || []);

        if (intersects.length > 0) {
          const hit = intersects[0].object.userData.region;
          this.selectRegion(hit);
        }
      });
    }

    selectRegion(region) {
      this.selectedRegion = region;

      // Highlight region in 3D
      if (this.regionSpheres) {
        this.regionSpheres.forEach((s) => {
          if (s.userData.region.id === region.id) {
            s.material.opacity = 0.85;
            s.material.wireframe = false;
          } else {
            s.material.opacity = 0.10;
            s.material.wireframe = true;
          }
        });
      }

      // Emit to callback
      if (this.options.onRegionSelect) {
        this.options.onRegionSelect(region);
      }

      // Also fire global event
      window.dispatchEvent(new CustomEvent('danioRegionSelected', { detail: region }));
    }

    /* -----------------------------------------------------------------------
     * 11. BINDING TO DanioSimEngine
     * ----------------------------------------------------------------------- */
    bindSimulationEngine(engine) {
      engine.on('reflex', () => this.triggerMauthnerCStart());
      engine.on('drumming', () => this.triggerSonicDrumming());
      engine.on('stimulus', (s) => {
        if (s.type === 'prey') this.triggerTectalBurst();
      });
      engine.on('pauseState', (paused) => {
        this.isPaused = paused;
      });
      engine.on('reset', () => this.resetSimulation());
    }

    triggerMauthnerCStart() {
      // Spawn rapid burst of red/magenta signals along Rhombencephalon -> Spinal tracts
      for (let i = 0; i < 16; i++) {
        this.spawnSignal('reflex');
      }
    }

    triggerSonicDrumming() {
      // Spawn rapid burst of gold/cyan signals in Sonic Drumming nuclei
      for (let i = 0; i < 14; i++) {
        this.spawnSignal('sonic');
      }
    }

    triggerTectalBurst() {
      // Spawn sensory cyan signals in Optic Tectum
      for (let i = 0; i < 12; i++) {
        this.spawnSignal('sensory');
      }
    }

    resetSimulation() {
      // Reset signals and restore Mode B default orientation
      this.targetMode = 'B';
      this.modeTransition = 1.0;
      if (this.controls) {
        this.controls.target.copy(this.camTargetModeB);
        this.camera.position.copy(this.camPosModeB);
      }
    }

    /* -----------------------------------------------------------------------
     * 12. FALLBACK MODEL (Safety Net)
     * ----------------------------------------------------------------------- */
    buildFallbackModel() {
      // Minimal fallback to guarantee continuous 60 FPS rendering if offline
      this.regions = [
        { id: 0, name: 'Tel_DorsalPallium_Medial_L', division: 'Telencephalon', center: [-3.4, 2.4, 6.0], radius: 2.8, neuronCount: 26000, dominantNT: 'Glutamate', baselineHz: 34, color: '#38bdf8', function: 'Spatial navigation' },
        { id: 1, name: 'Mes_OpticTectum_StratumOpticum_L', division: 'Mesencephalon', center: [-3.8, 3.8, 1.0], radius: 2.5, neuronCount: 114000, dominantNT: 'Glutamate', baselineHz: 78, color: '#06b6d4', function: 'Visual computing' },
        { id: 2, name: 'Ce_CorpusCerebelli_Purkinje_L', division: 'Cerebellum', center: [0.0, 4.4, -4.0], radius: 3.4, neuronCount: 123500, dominantNT: 'GABA', baselineHz: 62, color: '#10b981', function: 'Motor balance' },
        { id: 3, name: 'Rh_Mauthner_Neuron_CellBody_L', division: 'Rhombencephalon', center: [0.0, -0.6, -7.0], radius: 2.2, neuronCount: 26000, dominantNT: 'Glutamate', baselineHz: 28, color: '#f43f5e', function: 'Fast escape reflex' },
        { id: 4, name: 'Sonic_Drumming_MotorNucleus_L', division: 'Motor & Sonic Drumming', center: [0.0, -1.8, -12.0], radius: 2.0, neuronCount: 13000, dominantNT: 'Acetylcholine', baselineHz: 52, color: '#f59e0b', function: '140.2 dB sonic drumming' }
      ];
      this.tracts = [
        { src: 1, dst: 3, weight: 0.92, mid: [-2.0, 1.5, -3.0], isInhibitory: false },
        { src: 2, dst: 4, weight: 0.85, mid: [0.0, 1.0, -8.0], isInhibitory: false },
        { src: 3, dst: 4, weight: 0.98, mid: [0.0, -1.2, -9.5], isInhibitory: false }
      ];
      this.buildModeAFullFishCNS();
      this.buildModeBCranialConnectome();
      this.buildTractFibers();
      this.initSignalPool();
    }

    /* -----------------------------------------------------------------------
     * 13. MAIN ANIMATION & RENDER LOOP
     * Decoupled: only updates camera/particles, zero geometry rebuilding
     * ----------------------------------------------------------------------- */
    animate() {
      this.rafId = requestAnimationFrame(this.animate);

      const delta = Math.min(this.clock.getDelta(), 0.1);
      this.time += delta;

      // Update camera controls
      if (this.controls) {
        this.controls.update();
      }

      // Smooth Mode A <-> Mode B transition
      this.updateModeTransition(delta);

      // Update dynamic signals along splines
      if (!this.isPaused && this.activeSignals.length > 0) {
        this.updateSignals(delta);
      }

      // Dynamic Level of Detail
      this.updateLOD();

      // Render Three.js Scene
      this.renderer.render(this.scene, this.camera);
    }

    destroy() {
      if (this.rafId) cancelAnimationFrame(this.rafId);
      window.removeEventListener('resize', this.onResizeHandler);
      if (this.renderer && this.renderer.domElement && this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
    }
  }

  window.DanioWebGLSimulation = DanioWebGLSimulation;

})(typeof window !== 'undefined' ? window : this);
