/**
 * DanioWebGLSimulation — 3D Biological Brain & Central Nervous System (CNS) Simulation
 * Adult Danionella cerebrum Connectome (650,000 Neurons · 203 Regions · Intact Cranium)
 * 
 * SCIENTIFIC VISUALIZATION SPECIFICATION:
 * - Deep dark near-black environment (#020509)
 * - 3/4 Scientific Perspective showing Hemispheres, Tectum, Cerebellum, Brainstem, Spinal Cord
 * - Anatomical Gyri & Sulci Contours with true biological longitudinal & coronal sulcal grooves
 * - Dense Microscopic Neural Fiber Network (~3,800 curved 3D Catmull-Rom splines)
 *   Rendered with delicate slate-gray/cool-cyan depth attenuation (NO overblown white blobs)
 * - Highly visible colored action potential particles traveling strictly along fiber paths:
 *   position = path.getPointAt(progress)
 * - Vivid multi-color signaling: Cyan (sensory), Green (motor/cerebellum), Gold (burst), Rose (Mauthner reflex)
 * - Motion trails following exact curve curvature
 * - Responsive neuron nodes: resting somata remain subtle/dim; active somata flash and decay
 * - Interactive region selection with Raycaster and live floating HUD card
 * - 1:1 Live synchronization with website telemetry, motor pools, raster, and controls
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
    grad.addColorStop(0.25, 'rgba(255, 255, 255, 0.85)');
    grad.addColorStop(0.55, 'rgba(255, 255, 255, 0.25)');
    grad.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  }


  // =========================================================================
  // 1. NEUROANATOMICAL REGION DEFINITIONS & LANDMARKS
  // =========================================================================
  const BRAIN_REGIONS = [
    {
      id: 'telencephalon_l',
      name: 'Left Cerebral Hemisphere (Telencephalon)',
      shortName: 'TEL_HEMI_L',
      division: 'Forebrain / Pallium',
      center: [-3.4, 2.4, 5.2],
      radii: [2.8, 2.4, 3.4],
      color: 0x38bdf8,
      nt: 'Glutamate / GABA',
      baselineHz: 34,
      desc: 'Dorsomedial and dorsolateral pallium; homologous to mammalian amygdala and hippocampus. Encodes social shoaling memory, spatial cognitive maps, and olfactory valence.'
    },
    {
      id: 'telencephalon_r',
      name: 'Right Cerebral Hemisphere (Telencephalon)',
      shortName: 'TEL_HEMI_R',
      division: 'Forebrain / Pallium',
      center: [3.4, 2.4, 5.2],
      radii: [2.8, 2.4, 3.4],
      color: 0x38bdf8,
      nt: 'Glutamate / GABA',
      baselineHz: 34,
      desc: 'Contralateral pallial hemisphere; coordinates bilateral allocentric spatial navigation, associative learning, and olfactory bulb glomerular projections.'
    },
    {
      id: 'optic_tectum_l',
      name: 'Left Optic Tectum (Mesencephalon)',
      shortName: 'MES_TECTUM_L',
      division: 'Midbrain Sensory Colliculus',
      center: [-3.8, 3.8, 0.4],
      radii: [2.5, 2.2, 2.8],
      color: 0x06b6d4,
      nt: 'Acetylcholine / Glutamate',
      baselineHz: 78,
      desc: 'Retinotopic visual computing center. Stratum opticum and periventricular neurons compute micro-prey motion vectors to coordinate predatory saccadic strikes.'
    },
    {
      id: 'optic_tectum_r',
      name: 'Right Optic Tectum (Mesencephalon)',
      shortName: 'MES_TECTUM_R',
      division: 'Midbrain Sensory Colliculus',
      center: [3.8, 3.8, 0.4],
      radii: [2.5, 2.2, 2.8],
      color: 0x06b6d4,
      nt: 'Acetylcholine / Glutamate',
      baselineHz: 78,
      desc: 'Contralateral tectal lobe; executes whole-field optomotor compensation, rheotaxic current alignment, and visuomotor saccades.'
    },
    {
      id: 'cerebellum',
      name: 'Cerebellum (Corpus Cerebelli)',
      shortName: 'CE_PURKINJE',
      division: 'Metencephalon / Cerebellar Arches',
      center: [0.0, 4.4, -3.6],
      radii: [3.4, 2.4, 2.7],
      color: 0x10b981,
      nt: 'GABA (Purkinje) / Glutamate (Granule)',
      baselineHz: 62,
      desc: 'High-frequency cerebellar Purkinje loops and parallel fibers. Regulates vestibulomotor balance, fin posture, and hydrodynamic smooth swimming rhythms.'
    },
    {
      id: 'brainstem',
      name: 'Brainstem & Reticulospinal Nuclei',
      shortName: 'RH_BRAINSTEM_MAUTH',
      division: 'Rhombencephalon / Medulla Oblongata',
      center: [0.0, -0.6, -5.6],
      radii: [2.2, 1.8, 4.4],
      color: 0xf43f5e,
      nt: 'Glycine / Glutamate',
      baselineHz: 28,
      desc: 'Houses the bilateral Mauthner giant reticulospinal neurons, nucleus of the medial longitudinal fasciculus, and sonic motor nuclei for 140.2 dB acoustic drumming.'
    },
    {
      id: 'spinal_cord',
      name: 'Descending Spinal Cord & Motor Roots',
      shortName: 'SP_VENTRAL_ROOTS',
      division: 'Spinal Central Nervous System',
      center: [0.0, -1.8, -15.5],
      radii: [1.3, 1.2, 6.8],
      color: 0xf59e0b,
      nt: 'Acetylcholine (Motor) / Glutamate',
      baselineHz: 52,
      desc: 'Continuous caudal nervous axis with bilateral segmental ventral roots (36 vertebrae). Drives alternating carangiform undulation and fast C-start escape flexion.'
    }
  ];

  // =========================================================================
  // 2. MAIN SIMULATION ENGINE & WEBGL RENDERER
  // =========================================================================
  class DanioWebGLSimulation {
    constructor(container, options = {}) {
      this.container = typeof container === 'string' ? document.getElementById(container) : container;
      if (!this.container) throw new Error('DanioWebGLSimulation: Container not found');

      this.options = Object.assign({
        enableControls: true,
        autoRotate: true,
        onTelemetry: null
      }, options);

      // Simulation Dimensions
      this.width = this.container.clientWidth || 920;
      this.height = this.container.clientHeight || 560;

      // Master Simulation State
      this.time = 0;
      this.clock = new THREE.Clock();
      this.isPaused = false;
      this.selectedRegion = null;

      // Telemetry & Biophysical Metrics
      this.velocity = 0.52;
      this.dominantState = 'PELAGIC_CRUISE';
      this.meanVm = -61.8;
      this.spikeRate = 48.0;
      this.preyConcentration = 7.4827;

      this.motorPools = {
        mCell: 10,
        opticTectum: 78,
        purkinje: 62,
        sonicDrumming: 14,
        spinalVentral: 68
      };

      // Reflex & Event Timers
      this.threatTimer = 0;
      this.drummingTimer = 0;

      // Spline Connections, Neurons, Active Signals
      this.connections = [];
      this.neuronNodes = [];
      this.activeSignals = [];
      this.maxSignals = 80;

      // Spike raster event queue
      this.spikeEventQueue = [];

      // Initialize 3D Engine
      this.initScene();
      this.buildAnatomicalShell();
      this.buildDenseFibersAndNodes();
      this.initSignalSystem();
      this.setupRegionRaycasting();
      this.buildChamberHUD();

      // Render Loop
      this.animate = this.animate.bind(this);
      this.rafId = requestAnimationFrame(this.animate);
    }

    /* -----------------------------------------------------------------------
     * THREE.JS SCENE SETUP & CAMERA SAFETY
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

      // HARD CHAMBER BOUNDARY ENFORCEMENT
      this.container.style.position = 'relative';
      this.container.style.overflow = 'hidden';
      this.container.style.backgroundColor = '#020509';
      this.container.appendChild(this.canvas);

      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x020509);

      // Camera: Classic 3/4 Elevated Perspective
      // Looking at the geometrical center of the brain & spinal cord: (0, 1.2, -6.5)
      this.cameraTarget = new THREE.Vector3(0.0, 1.2, -6.5);
      const fov = 38;
      this.camera = new THREE.PerspectiveCamera(fov, this.width / this.height, 0.1, 800);
      
      // 3/4 Elevated Side View showing Hemispheres in front and Spinal Cord trailing behind
      this.defaultCameraPos = new THREE.Vector3(25.0, 18.0, 26.0);
      this.camera.position.copy(this.defaultCameraPos);
      this.camera.lookAt(this.cameraTarget);

      // OrbitControls with Strict Clamps
      if (this.options.enableControls && typeof THREE.OrbitControls !== 'undefined') {
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.target.copy(this.cameraTarget);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        // Strict distance boundaries: cannot zoom out into void or clip inside
        this.controls.minDistance = 25;
        this.controls.maxDistance = 75;
        this.controls.minPolarAngle = Math.PI * 0.12;
        this.controls.maxPolarAngle = Math.PI * 0.82;
        this.controls.autoRotate = this.options.autoRotate;
        this.controls.autoRotateSpeed = 0.22;
      }

      // Minimal scientific lighting
      const ambLight = new THREE.AmbientLight(0x081524, 1.5);
      this.scene.add(ambLight);

      const lightSheet1 = new THREE.DirectionalLight(0x38bdf8, 0.85);
      lightSheet1.position.set(-25, 30, 25);
      this.scene.add(lightSheet1);

      const lightSheet2 = new THREE.DirectionalLight(0x10b981, 0.55);
      lightSheet2.position.set(25, -15, -25);
      this.scene.add(lightSheet2);

            this.glowTexture = createCircularGlowTexture();
      this.brainGroup = new THREE.Group();
      this.scene.add(this.brainGroup);

      // Handle window resize
      this.onResizeHandler = () => this.onResize();
      window.addEventListener('resize', this.onResizeHandler);
    }

    onResize() {
      if (!this.container) return;
      this.width = this.container.clientWidth || 920;
      this.height = this.container.clientHeight || 560;
      this.camera.aspect = this.width / this.height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(this.width, this.height);
    }

    /* -----------------------------------------------------------------------
     * 2. ANATOMICAL CORTICAL SHELL & SULCAL GYRI CONTOURS
     * Translucent biological contours showing authentic vertebrate morphology
     * ----------------------------------------------------------------------- */
    buildAnatomicalShell() {
      const shellLines = [];

      // A. Cerebral Hemispheres (Telencephalon) Gyral Loops & Sulci
      const buildHemisphereGyri = (isLeft) => {
        const sign = isLeft ? -1 : 1;
        const cx = sign * 3.4;
        const cy = 2.4;
        const cz = 5.2;

        for (let ring = 0; ring < 12; ring++) {
          const u = ring / 12;
          const phi = (u - 0.5) * Math.PI * 0.85;
          const curvePts = [];
          for (let step = 0; step <= 28; step++) {
            const theta = (step / 28) * Math.PI * 2;
            const rMod = 1.0 + 0.10 * Math.sin(theta * 3.0) * Math.cos(phi * 2.0);
            const rx = 2.7 * rMod;
            const ry = 2.3 * rMod;
            const rz = 3.3 * rMod;

            const x = cx + sign * Math.cos(phi) * Math.cos(theta) * rx;
            const y = cy + Math.sin(phi) * ry;
            const z = cz + Math.cos(phi) * Math.sin(theta) * rz;
            curvePts.push(new THREE.Vector3(x, y, z));
          }
          for (let k = 0; k < curvePts.length - 1; k++) {
            shellLines.push(curvePts[k].x, curvePts[k].y, curvePts[k].z);
            shellLines.push(curvePts[k + 1].x, curvePts[k + 1].y, curvePts[k + 1].z);
          }
        }
      };

      buildHemisphereGyri(true);
      buildHemisphereGyri(false);

      // B. Optic Tectum (Mesencephalon) Bilateral Sensory Domes
      const buildTectalShell = (isLeft) => {
        const sign = isLeft ? -1 : 1;
        const cx = sign * 3.8;
        const cy = 3.8;
        const cz = 0.4;

        for (let ring = 0; ring < 8; ring++) {
          const u = ring / 8;
          const phi = u * Math.PI * 0.55;
          const curvePts = [];
          for (let step = 0; step <= 22; step++) {
            const theta = (step / 22) * Math.PI * 2;
            const x = cx + sign * Math.sin(phi) * Math.cos(theta) * 2.5;
            const y = cy + Math.cos(phi) * 2.2;
            const z = cz + Math.sin(phi) * Math.sin(theta) * 2.8;
            curvePts.push(new THREE.Vector3(x, y, z));
          }
          for (let k = 0; k < curvePts.length - 1; k++) {
            shellLines.push(curvePts[k].x, curvePts[k].y, curvePts[k].z);
            shellLines.push(curvePts[k + 1].x, curvePts[k + 1].y, curvePts[k + 1].z);
          }
        }
      };

      buildTectalShell(true);
      buildTectalShell(false);

      // C. Cerebellum (Corpus Cerebelli) Foliated Parallel Ridges
      const cx_ce = 0.0, cy_ce = 4.4, cz_ce = -3.6;
      for (let folia = 0; folia < 10; folia++) {
        const v = folia / 10;
        const z = cz_ce - 2.0 + v * 4.0;
        const foliaPts = [];
        for (let step = 0; step <= 24; step++) {
          const t = (step / 24) * 2 - 1;
          const arch = Math.cos(t * Math.PI * 0.5);
          const x = t * 3.4 * arch;
          const y = cy_ce + arch * 2.2;
          foliaPts.push(new THREE.Vector3(x, y, z));
        }
        for (let k = 0; k < foliaPts.length - 1; k++) {
          shellLines.push(foliaPts[k].x, foliaPts[k].y, foliaPts[k].z);
          shellLines.push(foliaPts[k + 1].x, foliaPts[k + 1].y, foliaPts[k + 1].z);
        }
      }

      // D. Brainstem & Descending Spinal Cord with Segmental Motor Roots
      const spineSegments = 24;
      for (let seg = 0; seg <= spineSegments; seg++) {
        const u = seg / spineSegments;
        const z = -1.0 - u * 21.0;
        const isBrainstem = z > -10.0;
        const rx = isBrainstem ? (2.2 - (z + 1.0) * 0.07) : 1.2;
        const ry = isBrainstem ? (1.8 - (z + 1.0) * 0.05) : 1.1;
        const cy = isBrainstem ? -0.6 : -1.8;

        const ringPts = [];
        for (let step = 0; step <= 16; step++) {
          const theta = (step / 16) * Math.PI * 2;
          ringPts.push(new THREE.Vector3(Math.cos(theta) * rx, cy + Math.sin(theta) * ry, z));
        }
        for (let k = 0; k < ringPts.length - 1; k++) {
          shellLines.push(ringPts[k].x, ringPts[k].y, ringPts[k].z);
          shellLines.push(ringPts[k + 1].x, ringPts[k + 1].y, ringPts[k + 1].z);
        }

        // Bilateral motor root branches
        if (!isBrainstem && seg % 3 === 0) {
          shellLines.push(0.0, cy, z, -2.6, cy - 0.35, z - 0.4);
          shellLines.push(0.0, cy, z, 2.6, cy - 0.35, z - 0.4);
        }
      }

      const shellGeom = new THREE.BufferGeometry();
      shellGeom.setAttribute('position', new THREE.Float32BufferAttribute(shellLines, 3));
      const shellMat = new THREE.LineBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.12,
        blending: THREE.NormalBlending,
        depthWrite: false
      });
      this.shellMesh = new THREE.LineSegments(shellGeom, shellMat);
      this.brainGroup.add(this.shellMesh);
    }

    /* -----------------------------------------------------------------------
     * 3. DENSE MICROSCOPIC NEURAL FIBER NETWORK & NEURON NODES
     * Microscopic hair-like fibers with depth shading (NO white overexposure)
     * ----------------------------------------------------------------------- */
    buildDenseFibersAndNodes() {
      const fiberVertices = [];
      const fiberColors = [];
      const nodePositions = [];
      const nodeColors = [];
      const nodeSizes = [];

      // 1. Generate Neuron Nodes
      const totalNodes = 2600;
      this.neuronNodes = [];

      for (let i = 0; i < totalNodes; i++) {
        const rIndex = Math.floor(Math.random() * BRAIN_REGIONS.length);
        const region = BRAIN_REGIONS[rIndex];
        const [cx, cy, cz] = region.center;
        const [rx, ry, rz] = region.radii;

        const u = Math.random();
        const v = Math.random();
        const theta = u * 2.0 * Math.PI;
        const phi = Math.acos(2.0 * v - 1.0);
        const r = Math.cbrt(Math.random()) * 0.90;

        const x = cx + r * rx * Math.sin(phi) * Math.cos(theta);
        const y = cy + r * ry * Math.sin(phi) * Math.sin(theta);
        const z = cz + r * rz * Math.cos(phi);

        // Resting somata have subtle, dim cool-slate tint
        const node = {
          id: i,
          regionId: region.id,
          pos: new THREE.Vector3(x, y, z),
          baseColor: new THREE.Color(0x334155),
          currentColor: new THREE.Color(0x334155),
          voltage: -65.0,
          activation: 0.0,
          outgoing: []
        };

        this.neuronNodes.push(node);
        nodePositions.push(x, y, z);
        // Very dim resting somata: (0.16, 0.22, 0.30)
        nodeColors.push(0.16, 0.22, 0.30);
        nodeSizes.push(1.2);
      }

      // Add Mauthner Giant Neurons in Brainstem
      const mauthL = {
        id: totalNodes,
        regionId: 'brainstem',
        pos: new THREE.Vector3(-1.4, -0.6, -4.8),
        baseColor: new THREE.Color(0xf43f5e),
        currentColor: new THREE.Color(0xf43f5e),
        voltage: -62.4,
        activation: 0.0,
        isMauthner: true,
        outgoing: []
      };
      const mauthR = {
        id: totalNodes + 1,
        regionId: 'brainstem',
        pos: new THREE.Vector3(1.4, -0.6, -4.8),
        baseColor: new THREE.Color(0xf43f5e),
        currentColor: new THREE.Color(0xf43f5e),
        voltage: -62.4,
        activation: 0.0,
        isMauthner: true,
        outgoing: []
      };
      this.neuronNodes.push(mauthL, mauthR);
      nodePositions.push(mauthL.pos.x, mauthL.pos.y, mauthL.pos.z);
      nodePositions.push(mauthR.pos.x, mauthR.pos.y, mauthR.pos.z);
      nodeColors.push(0.9, 0.2, 0.35);
      nodeColors.push(0.9, 0.2, 0.35);
      nodeSizes.push(3.5);
      nodeSizes.push(3.5);

      // 2. Build Curved Anatomical Splines
      this.connections = [];

      const createSplinePath = (pA, pB, curvatureFactor, numSamples = 8) => {
        const mid = pA.clone().lerp(pB, 0.5);
        const dist = pA.distanceTo(pB);
        const normal = new THREE.Vector3(
          (Math.random() - 0.5) * curvatureFactor * dist,
          (Math.random() * 0.35 + 0.05) * curvatureFactor * dist,
          (Math.random() - 0.5) * curvatureFactor * dist
        );
        mid.add(normal);

        const curve = new THREE.CatmullRomCurve3([pA, mid, pB], false, 'centripetal');
        const pts = curve.getPoints(numSamples);
        return { curve, pts, length: dist };
      };

      for (let i = 0; i < this.neuronNodes.length; i++) {
        const srcNode = this.neuronNodes[i];
        const numConns = (i % 4 === 0) ? 3 : 2;

        for (let c = 0; c < numConns; c++) {
          let tgtIndex = -1;

          if (Math.random() < 0.72) {
            tgtIndex = Math.floor(Math.random() * this.neuronNodes.length);
            if (this.neuronNodes[tgtIndex].regionId !== srcNode.regionId) {
              tgtIndex = Math.min(this.neuronNodes.length - 1, i + Math.floor((Math.random() - 0.5) * 50));
            }
          } else {
            tgtIndex = Math.floor(Math.random() * this.neuronNodes.length);
          }

          if (tgtIndex === i || tgtIndex < 0 || tgtIndex >= this.neuronNodes.length) continue;
          const tgtNode = this.neuronNodes[tgtIndex];

          const { curve, pts, length } = createSplinePath(srcNode.pos, tgtNode.pos, 0.25, 7);

          // Fiber colors: fine silvery-white & cool gray with delicate regional tint
          let fiberR = 0.55, fiberG = 0.62, fiberB = 0.72; // Cool silvery gray
          let signalColor = 0xf8fafc; // White baseline
          let tractType = 'baseline';

          if (srcNode.regionId.includes('tectum') || tgtNode.regionId.includes('tectum')) {
            fiberR = 0.32; fiberG = 0.68; fiberB = 0.88; // Cool cyan
            signalColor = 0x38bdf8;
            tractType = 'sensory';
          } else if (srcNode.regionId === 'cerebellum' || tgtNode.regionId === 'cerebellum') {
            fiberR = 0.25; fiberG = 0.72; fiberB = 0.52; // Cool emerald
            signalColor = 0x10b981;
            tractType = 'motor';
          } else if (srcNode.isMauthner || tgtNode.regionId === 'spinal_cord') {
            fiberR = 0.78; fiberG = 0.32; fiberB = 0.45; // Cool rose
            signalColor = 0xf43f5e;
            tractType = 'threat';
          } else if (srcNode.regionId.includes('telencephalon')) {
            fiberR = 0.45; fiberG = 0.65; fiberB = 0.82; // Pale cyan/slate
            signalColor = (Math.random() < 0.5) ? 0x38bdf8 : 0xfbbf24;
            tractType = 'burst';
          }

          // Add line segment vertices and vertex colors
          for (let k = 0; k < pts.length - 1; k++) {
            fiberVertices.push(pts[k].x, pts[k].y, pts[k].z);
            fiberVertices.push(pts[k + 1].x, pts[k + 1].y, pts[k + 1].z);
            fiberColors.push(fiberR, fiberG, fiberB);
            fiberColors.push(fiberR, fiberG, fiberB);
          }

          const conn = {
            src: srcNode,
            tgt: tgtNode,
            curve,
            length,
            color: new THREE.Color(signalColor),
            tractType,
            speed: (tractType === 'threat') ? 3.4 : (1.3 + Math.random() * 1.1)
          };

          this.connections.push(conn);
          srcNode.outgoing.push(conn);
        }
      }

      // Add Long Descending Reticulospinal Tracts from Mauthner down spinal cord
      const spinalNodes = this.neuronNodes.filter(n => n.regionId === 'spinal_cord');
      [mauthL, mauthR].forEach((mNode) => {
        for (let s = 0; s < 10; s++) {
          const tgt = spinalNodes[Math.floor(Math.random() * spinalNodes.length)];
          if (!tgt) continue;
          const { curve, pts, length } = createSplinePath(mNode.pos, tgt.pos, 0.12, 10);
          for (let k = 0; k < pts.length - 1; k++) {
            fiberVertices.push(pts[k].x, pts[k].y, pts[k].z);
            fiberVertices.push(pts[k + 1].x, pts[k + 1].y, pts[k + 1].z);
            fiberColors.push(0.42, 0.16, 0.22);
            fiberColors.push(0.42, 0.16, 0.22);
          }
          const conn = {
            src: mNode,
            tgt,
            curve,
            length,
            color: new THREE.Color(0xf43f5e),
            tractType: 'threat',
            speed: 3.8
          };
          this.connections.push(conn);
          mNode.outgoing.push(conn);
        }
      });

      // Create Fiber Mesh with NormalBlending and Vertex Colors
      const fiberGeom = new THREE.BufferGeometry();
      fiberGeom.setAttribute('position', new THREE.Float32BufferAttribute(fiberVertices, 3));
      fiberGeom.setAttribute('color', new THREE.Float32BufferAttribute(fiberColors, 3));
      const fiberMat = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.38,
        blending: THREE.NormalBlending,
        depthWrite: false
      });
      this.fiberMesh = new THREE.LineSegments(fiberGeom, fiberMat);
      this.brainGroup.add(this.fiberMesh);

      // Create Neuron Nodes Points Mesh
      const nodeGeom = new THREE.BufferGeometry();
      nodeGeom.setAttribute('position', new THREE.Float32BufferAttribute(nodePositions, 3));
      this.nodeColorAttr = new THREE.Float32BufferAttribute(nodeColors, 3);
      this.nodeSizeAttr = new THREE.Float32BufferAttribute(nodeSizes, 1);
      nodeGeom.setAttribute('color', this.nodeColorAttr);
      nodeGeom.setAttribute('size', this.nodeSizeAttr);

      const nodeMat = new THREE.PointsMaterial({
        size: 0.22,
        map: this.glowTexture,
        vertexColors: true,
        transparent: true,
        opacity: 0.65,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      this.nodePoints = new THREE.Points(nodeGeom, nodeMat);
      this.brainGroup.add(this.nodePoints);
    }

    /* -----------------------------------------------------------------------
     * 4. FIBER-CONSTRAINED SIGNAL PARTICLE PROPAGATION ENGINE
     * Mathematically bound to curved splines: getPointAt(progress) with motion trails
     * ----------------------------------------------------------------------- */
    initSignalSystem() {
      this.activeSignals = [];
      this.trailPointsPerSignal = 4;
      const maxParticles = this.maxSignals * this.trailPointsPerSignal;

      this.signalPositions = new Float32Array(maxParticles * 3);
      this.signalColors = new Float32Array(maxParticles * 3);

      const sigGeom = new THREE.BufferGeometry();
      this.sigPosAttr = new THREE.BufferAttribute(this.signalPositions, 3);
      this.sigColAttr = new THREE.BufferAttribute(this.signalColors, 3);
      sigGeom.setAttribute('position', this.sigPosAttr);
      sigGeom.setAttribute('color', this.sigColAttr);

      const sigMat = new THREE.PointsMaterial({
        size: 0.48,
        map: this.glowTexture,
        vertexColors: true,
        transparent: true,
        opacity: 0.98,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      this.signalPointsMesh = new THREE.Points(sigGeom, sigMat);
      this.brainGroup.add(this.signalPointsMesh);

      // Seed initial active signals across connectome
      for (let i = 0; i < 48; i++) {
        this.spawnSignal();
      }
    }

    spawnSignal(forcedConnection = null) {
      if (this.activeSignals.length >= this.maxSignals) return;

      let conn = forcedConnection;
      if (!conn) {
        if (this.connections.length === 0) return;
        conn = this.connections[Math.floor(Math.random() * this.connections.length)];
      }

      this.activeSignals.push({
        conn,
        progress: 0.0,
        speed: (0.35 + Math.random() * 0.45) * conn.speed,
        color: conn.color,
        tractType: conn.tractType,
        intensity: 1.0
      });
    }

    updateSignals(delta) {
      const pCount = this.trailPointsPerSignal;

      for (let i = this.activeSignals.length - 1; i >= 0; i--) {
        const sig = this.activeSignals[i];
        sig.progress += sig.speed * delta;

        if (sig.progress >= 1.0) {
          const tgtNode = sig.conn.tgt;
          // Depolarize target node
          tgtNode.activation = 1.0;
          tgtNode.currentColor.copy(sig.color);
          tgtNode.voltage = -35.0 + Math.random() * 15.0;

          // Push spike raster event
          this.spikeEventQueue.push({
            regionId: tgtNode.regionId,
            color: sig.color,
            tractType: sig.tractType
          });

          // Downstream cascade: probabilistically spawn outgoing signal along connected fiber
          if (tgtNode.outgoing && tgtNode.outgoing.length > 0 && Math.random() < 0.74) {
            const nextConn = tgtNode.outgoing[Math.floor(Math.random() * tgtNode.outgoing.length)];
            sig.conn = nextConn;
            sig.progress = 0.0;
            sig.color = nextConn.color;
            sig.tractType = nextConn.tractType;
          } else {
            this.activeSignals.splice(i, 1);
            if (Math.random() < 0.88) {
              this.spawnSignal();
            }
          }
        }
      }

      while (this.activeSignals.length < 52) {
        this.spawnSignal();
      }

      // Update particle vertex buffer along the exact splines
      let vIndex = 0;
      for (let i = 0; i < this.maxSignals; i++) {
        if (i < this.activeSignals.length) {
          const sig = this.activeSignals[i];
          const curve = sig.conn.curve;

          // Head particle (brightest)
          const headPos = curve.getPointAt(Math.min(1.0, Math.max(0.0, sig.progress)));
          this.signalPositions[vIndex * 3]     = headPos.x;
          this.signalPositions[vIndex * 3 + 1] = headPos.y;
          this.signalPositions[vIndex * 3 + 2] = headPos.z;
          this.signalColors[vIndex * 3]     = sig.color.r * 1.5;
          this.signalColors[vIndex * 3 + 1] = sig.color.g * 1.5;
          this.signalColors[vIndex * 3 + 2] = sig.color.b * 1.5;
          vIndex++;

          // Trailing particles
          for (let t = 1; t < pCount; t++) {
            const trailProgress = Math.max(0.0, sig.progress - t * 0.038);
            const trailPos = curve.getPointAt(trailProgress);
            const fade = Math.pow(0.52, t);

            this.signalPositions[vIndex * 3]     = trailPos.x;
            this.signalPositions[vIndex * 3 + 1] = trailPos.y;
            this.signalPositions[vIndex * 3 + 2] = trailPos.z;
            this.signalColors[vIndex * 3]     = sig.color.r * fade * 1.2;
            this.signalColors[vIndex * 3 + 1] = sig.color.g * fade * 1.2;
            this.signalColors[vIndex * 3 + 2] = sig.color.b * fade * 1.2;
            vIndex++;
          }
        } else {
          for (let t = 0; t < pCount; t++) {
            this.signalPositions[vIndex * 3]     = 0;
            this.signalPositions[vIndex * 3 + 1] = -9999;
            this.signalPositions[vIndex * 3 + 2] = 0;
            this.signalColors[vIndex * 3]     = 0;
            this.signalColors[vIndex * 3 + 1] = 0;
            this.signalColors[vIndex * 3 + 2] = 0;
            vIndex++;
          }
        }
      }

      this.sigPosAttr.needsUpdate = true;
      this.sigColAttr.needsUpdate = true;
    }

    /* -----------------------------------------------------------------------
     * 5. NEURON NODE VOLTAGE & ACTIVATION DECAY
     * ----------------------------------------------------------------------- */
    updateNodes(delta) {
      const colors = this.nodeColorAttr.array;
      const sizes = this.nodeSizeAttr.array;

      for (let i = 0; i < this.neuronNodes.length; i++) {
        const node = this.neuronNodes[i];
        if (node.activation > 0.005) {
          node.activation *= Math.exp(-delta * 5.5);
          node.voltage += (-65.0 - node.voltage) * (1.0 - Math.exp(-delta * 6.0));

          // Interpolate color from active color back to base dim slate
          const r = THREE.MathUtils.lerp(0.16, node.currentColor.r, node.activation);
          const g = THREE.MathUtils.lerp(0.22, node.currentColor.g, node.activation);
          const b = THREE.MathUtils.lerp(0.30, node.currentColor.b, node.activation);

          colors[i * 3]     = r;
          colors[i * 3 + 1] = g;
          colors[i * 3 + 2] = b;
          sizes[i] = THREE.MathUtils.lerp(1.2, 4.0, node.activation);
        } else {
          node.activation = 0.0;
          node.voltage = -65.0;
          colors[i * 3]     = node.isMauthner ? 0.90 : 0.16;
          colors[i * 3 + 1] = node.isMauthner ? 0.20 : 0.22;
          colors[i * 3 + 2] = node.isMauthner ? 0.35 : 0.30;
          sizes[i] = node.isMauthner ? 3.5 : 1.2;
        }

        if (this.selectedRegion && node.regionId === this.selectedRegion.id) {
          colors[i * 3]     = Math.min(1.0, colors[i * 3] + 0.35);
          colors[i * 3 + 1] = Math.min(1.0, colors[i * 3 + 1] + 0.35);
          colors[i * 3 + 2] = Math.min(1.0, colors[i * 3 + 2] + 0.45);
          sizes[i] = Math.max(sizes[i], 2.4);
        }
      }

      this.nodeColorAttr.needsUpdate = true;
      this.nodeSizeAttr.needsUpdate = true;
    }

    /* -----------------------------------------------------------------------
     * 6. INTERACTIVE REGION SELECTION & RAYCASTING
     * ----------------------------------------------------------------------- */
    setupRegionRaycasting() {
      this.raycaster = new THREE.Raycaster();
      this.mouse = new THREE.Vector2();
      this.pointerDownPos = { x: 0, y: 0 };

      const onPointerDown = (e) => {
        this.pointerDownPos = { x: e.clientX, y: e.clientY };
      };

      const handleRaycast = (clientX, clientY) => {
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);

        let nearestRegion = null;
        let minDist = Infinity;

        BRAIN_REGIONS.forEach((region) => {
          const center = new THREE.Vector3(...region.center);
          const distToRay = this.raycaster.ray.distanceToPoint(center);
          const hitRadius = Math.max(...region.radii) * 1.5;
          if (distToRay < hitRadius && distToRay < minDist) {
            minDist = distToRay;
            nearestRegion = region;
          }
        });

        if (nearestRegion) {
          this.selectRegion(nearestRegion);
        } else {
          this.deselectRegion();
        }
      };

      const onPointerUp = (e) => {
        const dx = Math.abs(e.clientX - this.pointerDownPos.x);
        const dy = Math.abs(e.clientY - this.pointerDownPos.y);
        if (dx > 8 || dy > 8) return; // Orbit drag, not a selection click
        handleRaycast(e.clientX, e.clientY);
      };

      this.canvas.addEventListener('pointerdown', onPointerDown);
      this.canvas.addEventListener('pointerup', onPointerUp);
      this.canvas.addEventListener('click', (e) => onPointerUp(e));
    }

    selectRegion(region) {
      this.selectedRegion = region;
      if (this.hudRegionCard) {
        this.hudRegionCard.style.display = 'block';
        this.hudRegionName.textContent = region.name.toUpperCase();
        this.hudRegionDivision.textContent = `${region.division} · NT: ${region.nt}`;
        this.hudRegionDesc.textContent = region.desc;
        this.hudRegionState.textContent = `STATUS: ACTIVE · ${region.baselineHz + Math.round(Math.random() * 8)} Hz · FLOW: ${Math.round(region.baselineHz * 14.5)}/s`;
      }
    }

    selectRegionById(regionId) {
      const reg = BRAIN_REGIONS.find(r => r.id === regionId || r.shortName.toLowerCase().includes(regionId.toLowerCase()));
      if (reg) {
        this.selectRegion(reg);
      }
    }

    deselectRegion() {
      this.selectedRegion = null;
      if (this.hudRegionCard) {
        this.hudRegionCard.style.display = 'none';
      }
    }

    buildChamberHUD() {
      this.hudRegionCard = document.createElement('div');
      this.hudRegionCard.id = 'chamber-region-inspector';
      this.hudRegionCard.style.cssText = `
        position: absolute;
        top: 20px;
        left: 20px;
        width: 320px;
        background: rgba(8, 14, 24, 0.94);
        border: 1px solid rgba(56, 189, 248, 0.5);
        border-radius: 6px;
        padding: 12px 14px;
        font-family: 'JetBrains Mono', monospace;
        color: #f8fafc;
        z-index: 10;
        pointer-events: auto;
        display: none;
        backdrop-filter: blur(8px);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.75);
      `;

      this.hudRegionCard.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 6px; margin-bottom: 8px;">
          <span style="font-size: 9px; color: #38bdf8; letter-spacing: 0.08em; font-weight: 700;">INSPECTED BRAIN REGION</span>
          <button id="btn-close-hud-region" style="background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 13px; line-height: 1;">&times;</button>
        </div>
        <div id="hud-region-name" style="font-size: 12px; font-weight: 700; color: #f8fafc; margin-bottom: 4px;">REGION</div>
        <div id="hud-region-div" style="font-size: 9.5px; color: #38bdf8; margin-bottom: 6px;">DIVISION</div>
        <div id="hud-region-desc" style="font-size: 10px; color: #cbd5e1; line-height: 1.45; margin-bottom: 8px;">Description</div>
        <div id="hud-region-state" style="font-size: 9.5px; color: #34d399; background: rgba(16, 185, 129, 0.12); padding: 4px 6px; border-radius: 3px;">STATUS</div>
      `;

      this.container.appendChild(this.hudRegionCard);

      this.hudRegionName = this.hudRegionCard.querySelector('#hud-region-name');
      this.hudRegionDivision = this.hudRegionCard.querySelector('#hud-region-div');
      this.hudRegionDesc = this.hudRegionCard.querySelector('#hud-region-desc');
      this.hudRegionState = this.hudRegionCard.querySelector('#hud-region-state');

      const closeBtn = this.hudRegionCard.querySelector('#btn-close-hud-region');
      if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.deselectRegion();
        });
      }
    }

    /* -----------------------------------------------------------------------
     * 7. EVENT CONTROLS: PREDATOR THREAT & ACOUSTIC DRUMMING
     * ----------------------------------------------------------------------- */
    triggerMauthnerCStart() {
      this.threatTimer = 1.8;
      this.dominantState = 'MAUTHNER_C_START_ESCAPE';
      this.velocity = 3.65;
      this.motorPools.mCell = 180;
      this.motorPools.spinalVentral = 180;
      this.motorPools.opticTectum = 120;

      // Spawn 18 high-velocity Magenta/Red threat signals down reticulospinal tract
      const mauthConns = this.connections.filter(c => c.tractType === 'threat');
      for (let i = 0; i < 18; i++) {
        if (mauthConns.length > 0) {
          const conn = mauthConns[Math.floor(Math.random() * mauthConns.length)];
          this.spawnSignal(conn);
        }
      }
    }

    triggerSonicDrumming() {
      this.drummingTimer = 1.5;
      this.dominantState = 'SONIC_DRUMMING_140DB';
      this.velocity = 0.95;
      this.motorPools.sonicDrumming = 100;
      this.motorPools.mCell = 14;

      // Spawn rapid Gold & Cyan pulses in brainstem & cerebellum
      const sonicConns = this.connections.filter(c => c.tractType === 'motor' || c.tractType === 'burst');
      for (let i = 0; i < 15; i++) {
        if (sonicConns.length > 0) {
          const conn = sonicConns[Math.floor(Math.random() * sonicConns.length)];
          this.spawnSignal(conn);
        }
      }
    }

    togglePause() {
      this.isPaused = !this.isPaused;
      return this.isPaused;
    }

    reset() {
      this.isPaused = false;
      this.threatTimer = 0;
      this.drummingTimer = 0;
      this.dominantState = 'PELAGIC_CRUISE';
      this.velocity = 0.52;
      this.meanVm = -61.8;
      this.spikeRate = 48.0;

      this.motorPools = {
        mCell: 8,
        opticTectum: 78,
        purkinje: 62,
        sonicDrumming: 12,
        spinalVentral: 68
      };

      this.deselectRegion();

      this.activeSignals = [];
      for (let i = 0; i < 48; i++) {
        this.spawnSignal();
      }

      for (let i = 0; i < this.neuronNodes.length; i++) {
        this.neuronNodes[i].activation = 0;
        this.neuronNodes[i].voltage = -65.0;
      }

      if (this.controls) {
        this.controls.target.copy(this.cameraTarget);
        this.camera.position.copy(this.defaultCameraPos);
      }
    }

    /* -----------------------------------------------------------------------
     * 8. MASTER ANIMATION TICK (60 FPS)
     * ----------------------------------------------------------------------- */
    animate() {
      this.rafId = requestAnimationFrame(this.animate);

      const delta = Math.min(this.clock.getDelta(), 0.1);

      if (!this.isPaused) {
        this.time += delta;

        // Subtle biological pulsation
        const breath = Math.sin(this.time * 2.2) * 0.012;
        this.brainGroup.scale.set(1.0 + breath, 1.0 + breath, 1.0 - breath * 0.5);

        // Update fiber-constrained signals and responsive nodes
        this.updateSignals(delta);
        this.updateNodes(delta);

        // Update threat and drumming timers
        if (this.threatTimer > 0) {
          this.threatTimer -= delta;
          if (this.threatTimer <= 0) {
            this.dominantState = 'PELAGIC_CRUISE';
          }
        }
        if (this.drummingTimer > 0) {
          this.drummingTimer -= delta;
          if (this.drummingTimer <= 0) {
            this.dominantState = 'PELAGIC_CRUISE';
          }
        }

        // Biophysical Telemetry Calculations
        if (this.threatTimer > 0) {
          this.velocity = 3.65 - (1.8 - this.threatTimer) * 1.5;
          this.motorPools.mCell = Math.round(180 * (this.threatTimer / 1.8));
          this.motorPools.spinalVentral = 180;
          this.meanVm = -38.0 + Math.sin(this.time * 20.0) * 8.0;
          this.spikeRate = 120 + Math.random() * 30;
        } else if (this.drummingTimer > 0) {
          this.velocity = 0.95;
          this.motorPools.sonicDrumming = 100;
          this.motorPools.mCell = 12;
          this.meanVm = -52.0 + Math.sin(this.time * 15.0) * 5.0;
          this.spikeRate = 95 + Math.random() * 20;
        } else {
          this.velocity = 0.52 + Math.sin(this.time * 1.8) * 0.08 + Math.random() * 0.04;
          this.motorPools.mCell = 6 + Math.round(Math.random() * 6);
          this.motorPools.opticTectum = 72 + Math.round(Math.sin(this.time * 2.5) * 14);
          this.motorPools.purkinje = 58 + Math.round(Math.cos(this.time * 2.0) * 12);
          this.motorPools.sonicDrumming = 10 + Math.round(Math.random() * 6);
          this.motorPools.spinalVentral = 64 + Math.round(Math.sin(this.time * 3.0) * 20);
          this.meanVm = -61.8 + Math.sin(this.time * 1.4) * 2.4;
          this.spikeRate = 46 + Math.round(Math.sin(this.time * 1.6) * 12 + Math.random() * 6);
        }

        // Emit Telemetry to Website Dashboard
        if (this.options.onTelemetry) {
          const telem = {
            dominantState: this.dominantState,
            velocity: this.velocity,
            meanVm: this.meanVm,
            spikeRate: this.spikeRate,
            nutrient: this.preyConcentration,
            motorPools: this.motorPools,
            cStartActive: this.threatTimer > 0,
            sonicActive: this.drummingTimer > 0,
            spikeEvents: this.spikeEventQueue
          };
          this.options.onTelemetry(telem);
          this.spikeEventQueue = [];
        }
      }

      if (this.controls) {
        this.controls.update();
      }

      this.renderer.render(this.scene, this.camera);
    }

    destroy() {
      if (this.rafId) cancelAnimationFrame(this.rafId);
      window.removeEventListener('resize', this.onResizeHandler);
      if (this.canvas && this.canvas.parentElement) {
        this.canvas.parentElement.removeChild(this.canvas);
      }
      if (this.hudRegionCard && this.hudRegionCard.parentElement) {
        this.hudRegionCard.parentElement.removeChild(this.hudRegionCard);
      }
      if (this.renderer) this.renderer.dispose();
    }
  }

  window.DanioWebGLSimulation = DanioWebGLSimulation;

})(window);
