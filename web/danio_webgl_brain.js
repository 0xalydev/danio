/**
 * DanioWebGLSimulation — Adult Danionella cerebrum 3D Neural Connectome Simulation
 * 
 * SCIENTIFIC TWO-PHOTON LIGHT SHEET MICROSCOPY SPECIFICATION:
 * - Pure deep black background (#000000)
 * - Centered floating biological/neural structure
 * - Dense fine white/gray neural fibers (axons, dendrites, long spinal & tectal tracts)
 * - Sparse colored neural activity & traveling action potential transits
 * - Subtle bioluminescent calcium flickering (Poisson dynamics, GCaMP transients)
 * - Minimal lower-left monospace telemetry
 * - Generous empty black space framing the transparent teleost
 * - 1:1 Synchronized biophysical motor pools, patch-clamp oscilloscope, and spike raster
 */

class DanioWebGLSimulation {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' ? document.getElementById(container) : container;
    if (!this.container) throw new Error('DanioWebGLSimulation: Container not found');

    this.options = Object.assign({
      isHero: false,
      enableControls: true,
      autoRotate: true,
      onTransit: null,
      onTelemetry: null
    }, options);

    this.width = this.container.clientWidth || 920;
    this.height = this.container.clientHeight || 560;

    // Biological state
    this.time = 0;
    this.isPaused = false;
    this.currentTract = 'TECTO_RETICULAR_TRACT';
    this.dominantState = 'PELAGIC_CRUISE';
    this.meanVm = -62.4;
    this.spikeRate = 38.0;
    this.calciumFlux = 1.15;
    this.cStartActive = false;
    this.cStartTimer = 0;
    this.sonicActive = false;
    this.sonicTimer = 0;

    // Transits pool (discrete traveling action potentials)
    this.transits = [];
    this.maxTransits = 52; // Sparse, distinct luminescent packets

    // Acoustic shockwaves (140.2 dB pulse)
    this.shockwaves = [];

    this.initScene();
    this.buildFishMorphology();
    this.buildConnectomeGraph();
    this.buildTelemetryHUD();
    this.setupInteractivity();

    // Animation loop
    this.animate = this.animate.bind(this);
    this.rafId = requestAnimationFrame(this.animate);
  }

  initScene() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearColor(0x000000, 1.0);

    this.canvas = this.renderer.domElement;
    this.canvas.style.display = 'block';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.container.style.position = 'relative';
    this.container.style.overflow = 'hidden';
    this.container.style.backgroundColor = '#000000';
    this.container.appendChild(this.canvas);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);

    // Centered viewpoint framing the 12mm adult Danionella with generous black void
    const fov = 36;
    this.camera = new THREE.PerspectiveCamera(fov, this.width / this.height, 0.1, 1000);
    // Centered perfectly on the organism (spans x = +34 to -52, midpoint x = -12)
    this.camera.position.set(-12, 4, 146);
    this.camera.lookAt(-12, 0, 0);

    if (this.options.enableControls && typeof THREE.OrbitControls !== 'undefined') {
      this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.05;
      this.controls.minDistance = 45;
      this.controls.maxDistance = 280;
      this.controls.target.set(-12, 0, 0);
      this.controls.autoRotate = this.options.autoRotate;
      this.controls.autoRotateSpeed = 0.18;
    }

    // Two-photon light sheet illumination
    const ambientLight = new THREE.AmbientLight(0x020812, 1.0);
    this.scene.add(ambientLight);

    const sheetLight1 = new THREE.DirectionalLight(0x38bdf8, 0.85);
    sheetLight1.position.set(-25, 35, 45);
    this.scene.add(sheetLight1);

    const sheetLight2 = new THREE.DirectionalLight(0x0ea5e9, 0.55);
    sheetLight2.position.set(35, -25, -35);
    this.scene.add(sheetLight2);

    this.fishGroup = new THREE.Group();
    this.scene.add(this.fishGroup);

    window.addEventListener('resize', () => this.onResize());
  }

  onResize() {
    if (!this.container) return;
    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
  }

  /* -------------------------------------------------------------------------
   * 1. 3D TRANSPARENT TELEOST FISH MORPHOLOGY (Danionella cerebrum)
   * ------------------------------------------------------------------------- */
  buildFishMorphology() {
    const numCrossSections = 44;
    const vertices = [];
    const indices = [];

    for (let i = 0; i <= numCrossSections; i++) {
      const u = i / numCrossSections;
      const x = 34 - u * 84; // from +34 (snout) down to -50 (caudal base)

      let ry = 0;
      let rz = 0;
      if (x > 24) {
        // Rostrum / Snout
        const t = (x - 24) / 10;
        ry = (1 - t * 0.72) * 5.4;
        rz = (1 - t * 0.72) * 4.4;
      } else if (x > 10) {
        // 0.6 mm³ Optically clear cranial vault
        ry = 6.4 + Math.sin(((24 - x) / 14) * Math.PI) * 1.5;
        rz = 5.4 + Math.sin(((24 - x) / 14) * Math.PI) * 1.2;
      } else if (x > -24) {
        // Trunk & Abdomen
        const t = (x - (-24)) / 34;
        ry = 2.4 + t * 4.4;
        rz = 1.7 + t * 3.7;
      } else {
        // Caudal Peduncle
        const t = (x - (-50)) / 26;
        ry = 1.2 + t * 1.2;
        rz = 0.6 + t * 1.1;
      }

      const numRadial = 22;
      for (let j = 0; j < numRadial; j++) {
        const theta = (j / numRadial) * Math.PI * 2;
        const cy = Math.sin(theta) * ry;
        const cz = Math.cos(theta) * rz;
        vertices.push(x, cy, cz);
      }
    }

    for (let i = 0; i < numCrossSections; i++) {
      const numRadial = 22;
      for (let j = 0; j < numRadial; j++) {
        const nextJ = (j + 1) % numRadial;
        const a = i * numRadial + j;
        const b = (i + 1) * numRadial + j;
        const c = (i + 1) * numRadial + nextJ;
        const d = i * numRadial + nextJ;
        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }

    const bodyGeo = new THREE.BufferGeometry();
    bodyGeo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    bodyGeo.setIndex(indices);
    bodyGeo.computeVertexNormals();

    this.baseBodyPositions = bodyGeo.attributes.position.clone();
    this.bodyGeometry = bodyGeo;

    // Optical glass Fresnel shader (delicate transparent teleost skin)
    const fresnelVertexShader = `
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vViewPosition = -mvPosition.xyz;
        gl_Position = projectionMatrix * mvPosition;
      }
    `;

    const fresnelFragmentShader = `
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      uniform vec3 uColor;
      uniform vec3 uRimColor;
      void main() {
        vec3 normal = normalize(vNormal);
        vec3 viewDir = normalize(vViewPosition);
        float fresnel = pow(1.0 - abs(dot(viewDir, normal)), 4.0);
        vec3 col = mix(uColor, uRimColor, fresnel);
        float alpha = 0.008 + fresnel * 0.20;
        gl_FragColor = vec4(col, alpha);
      }
    `;

    this.bodyMaterial = new THREE.ShaderMaterial({
      vertexShader: fresnelVertexShader,
      fragmentShader: fresnelFragmentShader,
      uniforms: {
        uColor: { value: new THREE.Color(0x010810) },
        uRimColor: { value: new THREE.Color(0x38bdf8) }
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    this.bodyMesh = new THREE.Mesh(bodyGeo, this.bodyMaterial);
    this.fishGroup.add(this.bodyMesh);

    // Subtle transverse myotome boundary rings (36 clean biological segments)
    const ringLines = [];
    for (let s = 1; s < numCrossSections; s += 2) {
      const numRadial = 22;
      for (let j = 0; j < numRadial; j++) {
        const idxA = (s * numRadial + j) * 3;
        const idxB = (s * numRadial + ((j + 1) % numRadial)) * 3;
        ringLines.push(
          vertices[idxA], vertices[idxA + 1], vertices[idxA + 2],
          vertices[idxB], vertices[idxB + 1], vertices[idxB + 2]
        );
      }
    }
    const myoGeo = new THREE.BufferGeometry();
    myoGeo.setAttribute('position', new THREE.Float32BufferAttribute(ringLines, 3));
    const myoMat = new THREE.LineBasicMaterial({
      color: 0x0284c7,
      transparent: true,
      opacity: 0.08,
      blending: THREE.AdditiveBlending
    });
    this.myotomeMesh = new THREE.LineSegments(myoGeo, myoMat);
    this.fishGroup.add(this.myotomeMesh);

    this.buildNotochord();
    this.buildFins();
    this.buildAcousticApparatus();
  }

  /* Notochord (Chorda dorsalis) */
  buildNotochord() {
    const points = [];
    for (let x = 11; x >= -49; x -= 1.8) {
      points.push(new THREE.Vector3(x, 0.1, 0));
    }
    const chordCurve = new THREE.CatmullRomCurve3(points);
    const chordGeo = new THREE.TubeGeometry(chordCurve, 36, 0.32, 6, false);
    const chordMat = new THREE.MeshBasicMaterial({
      color: 0x334155,
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending
    });
    this.notochordMesh = new THREE.Mesh(chordGeo, chordMat);
    this.fishGroup.add(this.notochordMesh);
  }

  /* Caudal, Dorsal, Anal, and Pectoral Fin Architecture */
  buildFins() {
    const finLineMat = new THREE.LineBasicMaterial({
      color: 0x0284c7,
      transparent: true,
      opacity: 0.12,
      blending: THREE.AdditiveBlending
    });

    // 1. Caudal Fin (Pivots at caudal peduncle joint x = -50)
    const tailLines = [];
    const numRays = 16;
    for (let i = 0; i < numRays; i++) {
      const frac = (i / (numRays - 1)) * 2 - 1; // -1 to +1
      const len = 11 + Math.abs(frac) * 4.5;
      const spreadY = frac * 8.0;
      const tipZ = frac * 0.45;
      tailLines.push(0, 0, 0, -len, spreadY, tipZ);
    }
    const tailGeo = new THREE.BufferGeometry();
    tailGeo.setAttribute('position', new THREE.Float32BufferAttribute(tailLines, 3));
    this.caudalMesh = new THREE.LineSegments(tailGeo, finLineMat);
    this.caudalMesh.position.set(-50, 0.1, 0);
    this.fishGroup.add(this.caudalMesh);

    // 2. Dorsal Fin
    const dorsalLines = [];
    for (let i = 0; i < 9; i++) {
      const bx = -14 - i * 1.5;
      const tx = bx - 2.2;
      const ty = 3.6 + (1.0 - Math.abs((i - 4) / 4.5)) * 3.8;
      dorsalLines.push(bx, 2.0, 0, tx, ty, 0);
    }
    const dorsalGeo = new THREE.BufferGeometry();
    dorsalGeo.setAttribute('position', new THREE.Float32BufferAttribute(dorsalLines, 3));
    this.fishGroup.add(new THREE.LineSegments(dorsalGeo, finLineMat));

    // 3. Anal Fin
    const analLines = [];
    for (let i = 0; i < 10; i++) {
      const bx = -12 - i * 1.4;
      const tx = bx - 1.8;
      const ty = -2.0 - (1.0 - Math.abs((i - 4) / 4.5)) * 3.2;
      analLines.push(bx, -1.4, 0, tx, ty, 0);
    }
    const analGeo = new THREE.BufferGeometry();
    analGeo.setAttribute('position', new THREE.Float32BufferAttribute(analLines, 3));
    this.fishGroup.add(new THREE.LineSegments(analGeo, finLineMat));

    // 4. Pectoral Fins (Pivots at fin base)
    this.pecFins = [];
    [-1, 1].forEach((side) => {
      const pecLines = [];
      for (let r = 0; r < 7; r++) {
        const angle = (r / 6) * 0.6 - 0.3;
        const tipX = -6.0 * Math.cos(angle);
        const tipY = -3.5 * Math.sin(angle);
        const tipZ = side * (1.6 + r * 0.3);
        pecLines.push(0, 0, 0, tipX, tipY, tipZ);
      }
      const pecGeo = new THREE.BufferGeometry();
      pecGeo.setAttribute('position', new THREE.Float32BufferAttribute(pecLines, 3));
      const pecMesh = new THREE.LineSegments(pecGeo, finLineMat);
      pecMesh.position.set(15, -1.2, side * 4.2);
      this.fishGroup.add(pecMesh);
      this.pecFins.push({ mesh: pecMesh, side: side });
    });
  }

  /* Danionella's 140.2 dB Acoustic Drumming Apparatus */
  buildAcousticApparatus() {
    const bladderGeo = new THREE.SphereGeometry(2.6, 14, 10);
    bladderGeo.scale(1.8, 0.72, 0.72);
    const bladderMat = new THREE.MeshBasicMaterial({
      color: 0x9333ea,
      transparent: true,
      opacity: 0.10,
      wireframe: true,
      blending: THREE.AdditiveBlending
    });
    this.bladderMesh = new THREE.Mesh(bladderGeo, bladderMat);
    this.bladderMesh.position.set(7.5, -1.6, 0);
    this.fishGroup.add(this.bladderMesh);

    const ribCurvePoints = [];
    for (let t = 0; t <= Math.PI; t += 0.25) {
      ribCurvePoints.push(new THREE.Vector3(10.2 + Math.cos(t) * 1.5, -0.6 - Math.sin(t) * 1.8, Math.sin(t) * 1.4));
    }
    const ribCurve = new THREE.CatmullRomCurve3(ribCurvePoints);
    const ribGeo = new THREE.TubeGeometry(ribCurve, 14, 0.18, 6, false);
    const ribMat = new THREE.MeshBasicMaterial({
      color: 0xc084fc,
      transparent: true,
      opacity: 0.26,
      blending: THREE.AdditiveBlending
    });
    this.drummingRib = new THREE.Mesh(ribGeo, ribMat);
    this.fishGroup.add(this.drummingRib);
  }

  /* -------------------------------------------------------------------------
   * 2. DENSE FINE WHITE/GRAY NEURAL FIBERS & CONNECTOME GRAPH
   * ------------------------------------------------------------------------- */
  buildConnectomeGraph() {
    this.brainGroup = new THREE.Group();
    this.fishGroup.add(this.brainGroup);

    // Anatomical CNS Lobes
    this.lobes = [
      { id: 'Telencephalon', center: [28.0, 1.0, 0], size: [3.6, 2.0, 2.6], count: 180, color: 0x38bdf8 },
      { id: 'Diencephalon', center: [23.5, -0.7, 0], size: [3.2, 2.2, 2.4], count: 160, color: 0xf59e0b },
      { id: 'OpticTectum_L', center: [20.0, 2.4, -2.5], size: [4.6, 2.8, 2.2], count: 220, color: 0x06b6d4 },
      { id: 'OpticTectum_R', center: [20.0, 2.4, 2.5], size: [4.6, 2.8, 2.2], count: 220, color: 0x06b6d4 },
      { id: 'Cerebellum', center: [15.5, 2.0, 0], size: [3.4, 2.6, 2.2], count: 180, color: 0x10b981 },
      { id: 'Rhombencephalon', center: [12.0, 0.2, 0], size: [4.0, 2.2, 2.4], count: 200, color: 0xf43f5e },
      { id: 'SonicDrummingNucleus', center: [9.5, -2.0, 0], size: [2.0, 1.5, 1.8], count: 65, color: 0xa855f7 },
      { id: 'SpinalMotorColumn', center: [-14.0, 0.1, 0], size: [32.0, 1.2, 1.4], count: 380, color: 0x38bdf8 }
    ];

    this.nodes = [];
    const allNodePositions = [];
    const allNodeColors = [];
    let globalId = 0;

    const randG = () => (Math.random() + Math.random() + Math.random() - 1.5) * 0.60;

    this.lobes.forEach((lobe) => {
      for (let i = 0; i < lobe.count; i++) {
        let x, y, z;
        if (lobe.id === 'SpinalMotorColumn') {
          const u = i / lobe.count;
          x = 9.5 - u * 56.0;
          y = randG() * 0.45;
          z = randG() * 0.65;
        } else {
          x = lobe.center[0] + randG() * lobe.size[0];
          y = lobe.center[1] + randG() * lobe.size[1];
          z = lobe.center[2] + randG() * lobe.size[2];
        }

        const node = {
          id: globalId++,
          lobe: lobe.id,
          basePos: new THREE.Vector3(x, y, z),
          pos: new THREE.Vector3(x, y, z),
          baseColor: new THREE.Color(lobe.color),
          voltage: -65.0 + (Math.random() - 0.5) * 4.0,
          calcium: 0.1 + Math.random() * 0.1,
          spikes: 0,
          neighbors: []
        };
        this.nodes.push(node);
        allNodePositions.push(x, y, z);
        allNodeColors.push(0.55, 0.65, 0.75);
      }
    });

    // Mauthner Giant Command Neurons
    this.mauthnerL = {
      id: globalId++,
      lobe: 'Rh_Mauth_L',
      basePos: new THREE.Vector3(12.4, 0.4, -1.8),
      pos: new THREE.Vector3(12.4, 0.4, -1.8),
      baseColor: new THREE.Color(0xf43f5e),
      voltage: -65.0,
      calcium: 0.2,
      spikes: 0,
      isMauthner: true,
      neighbors: []
    };
    this.mauthnerR = {
      id: globalId++,
      lobe: 'Rh_Mauth_R',
      basePos: new THREE.Vector3(12.4, 0.4, 1.8),
      pos: new THREE.Vector3(12.4, 0.4, 1.8),
      baseColor: new THREE.Color(0xf43f5e),
      voltage: -65.0,
      calcium: 0.2,
      spikes: 0,
      isMauthner: true,
      neighbors: []
    };
    this.nodes.push(this.mauthnerL);
    this.nodes.push(this.mauthnerR);
    allNodePositions.push(12.4, 0.4, -1.8, 12.4, 0.4, 1.8);
    allNodeColors.push(0.9, 0.3, 0.45, 0.9, 0.3, 0.45);

    // 1. Somata Points (Subtle, delicate point contacts)
    const somataGeo = new THREE.BufferGeometry();
    somataGeo.setAttribute('position', new THREE.Float32BufferAttribute(allNodePositions, 3));
    somataGeo.setAttribute('color', new THREE.Float32BufferAttribute(allNodeColors, 3));
    this.somataGeo = somataGeo;

    const pCanvas = document.createElement('canvas');
    pCanvas.width = 32;
    pCanvas.height = 32;
    const pCtx = pCanvas.getContext('2d');
    const grad = pCtx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(255,255,255,0.9)');
    grad.addColorStop(0.35, 'rgba(200,225,245,0.5)');
    grad.addColorStop(0.7, 'rgba(56,189,248,0.15)');
    grad.addColorStop(1.0, 'rgba(0,0,0,0)');
    pCtx.fillStyle = grad;
    pCtx.fillRect(0, 0, 32, 32);
    const pTexture = new THREE.CanvasTexture(pCanvas);

    const somataMat = new THREE.PointsMaterial({
      size: 0.30,
      map: pTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.26,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.somataMesh = new THREE.Points(somataGeo, somataMat);
    this.brainGroup.add(this.somataMesh);

    // 2. Dense Fine White/Gray Neural Fibers
    const lineVertices = [];
    const lineColors = [];
    const baseFiberColor = new THREE.Color(0x94a3b8);

    const addFiber = (nA, nB, intensity = 0.5) => {
      nA.neighbors.push(nB);
      nB.neighbors.push(nA);
      lineVertices.push(nA.pos.x, nA.pos.y, nA.pos.z);
      lineVertices.push(nB.pos.x, nB.pos.y, nB.pos.z);
      const r = baseFiberColor.r * intensity;
      const g = baseFiberColor.g * intensity;
      const b = baseFiberColor.b * intensity;
      lineColors.push(r, g, b, r, g, b);
    };

    // A. Local intra-lobar arbors
    const kMaxLocalDist = 3.0;
    for (let i = 0; i < this.nodes.length; i++) {
      const nA = this.nodes[i];
      let connCount = 0;
      const maxConn = nA.isMauthner ? 16 : 3;

      for (let j = i + 1; j < this.nodes.length; j++) {
        const nB = this.nodes[j];
        if (nA.lobe === nB.lobe) {
          const dist = nA.basePos.distanceTo(nB.basePos);
          if (dist < kMaxLocalDist) {
            addFiber(nA, nB, 0.32 + Math.random() * 0.32);
            connCount++;
            if (connCount >= maxConn) break;
          }
        }
      }
    }

    // B. Major Inter-lobar Axonal Highways
    const spinalNodes = this.nodes.filter(n => n.lobe === 'SpinalMotorColumn').sort((a, b) => b.pos.x - a.pos.x);
    const tectumLNodes = this.nodes.filter(n => n.lobe === 'OpticTectum_L');
    const tectumRNodes = this.nodes.filter(n => n.lobe === 'OpticTectum_R');
    const telenNodes = this.nodes.filter(n => n.lobe === 'Telencephalon');
    const dienNodes = this.nodes.filter(n => n.lobe === 'Diencephalon');
    const cerebNodes = this.nodes.filter(n => n.lobe === 'Cerebellum');
    const rhombNodes = this.nodes.filter(n => n.lobe === 'Rhombencephalon');
    const sonicNodes = this.nodes.filter(n => n.lobe === 'SonicDrummingNucleus');

    // Telencephalon -> Diencephalon
    telenNodes.slice(0, 30).forEach(nA => {
      const nB = dienNodes[Math.floor(Math.random() * dienNodes.length)];
      if (nB) addFiber(nA, nB, 0.55);
    });

    // Optic Tectum -> Rhombencephalon (Tecto-reticulospinal)
    [...tectumLNodes.slice(0, 35), ...tectumRNodes.slice(0, 35)].forEach(nA => {
      const nB = rhombNodes[Math.floor(Math.random() * rhombNodes.length)];
      if (nB) addFiber(nA, nB, 0.65);
    });

    // Cerebellum -> Hindbrain
    cerebNodes.slice(0, 35).forEach(nA => {
      const nB = rhombNodes[Math.floor(Math.random() * rhombNodes.length)];
      if (nB) addFiber(nA, nB, 0.60);
    });

    // Hindbrain -> Sonic Drumming Nucleus
    rhombNodes.slice(0, 20).forEach(nA => {
      const nB = sonicNodes[Math.floor(Math.random() * sonicNodes.length)];
      if (nB) addFiber(nA, nB, 0.70);
    });

    // Spinal Motor Column: Medial Longitudinal Fasciculus running entire spinal axis
    for (let k = 0; k < spinalNodes.length - 1; k++) {
      if (k % 2 === 0) {
        addFiber(spinalNodes[k], spinalNodes[k + 1], 0.70);
      }
      if (k + 3 < spinalNodes.length && Math.random() < 0.5) {
        addFiber(spinalNodes[k], spinalNodes[k + 3], 0.45);
      }
    }

    // Peripheral Motor Roots: Lateral branches to myotomes
    for (let k = 0; k < spinalNodes.length; k += 8) {
      const sn = spinalNodes[k];
      const side = (k % 16 === 0) ? 1 : -1;
      const rootEnd = {
        id: globalId++,
        lobe: 'PeripheralRoot',
        basePos: new THREE.Vector3(sn.pos.x, sn.pos.y - 0.3, side * 3.2),
        pos: new THREE.Vector3(sn.pos.x, sn.pos.y - 0.3, side * 3.2),
        baseColor: new THREE.Color(0x38bdf8),
        voltage: -65.0,
        calcium: 0.1,
        spikes: 0,
        neighbors: []
      };
      this.nodes.push(rootEnd);
      addFiber(sn, rootEnd, 0.45);
    }

    // Mauthner Giant Axon Decussation (X-crossing down contralateral spinal column)
    spinalNodes.slice(0, 22).forEach(sn => {
      if (sn.pos.z > 0) addFiber(this.mauthnerL, sn, 0.85);
      else addFiber(this.mauthnerR, sn, 0.85);
    });

    // Hindbrain to Spinal inputs
    rhombNodes.slice(0, 30).forEach(rn => {
      const sn = spinalNodes[Math.floor(Math.random() * 15)];
      if (sn) addFiber(rn, sn, 0.6);
    });

    const fibersGeo = new THREE.BufferGeometry();
    fibersGeo.setAttribute('position', new THREE.Float32BufferAttribute(lineVertices, 3));
    fibersGeo.setAttribute('color', new THREE.Float32BufferAttribute(lineColors, 3));
    this.fibersGeo = fibersGeo;

    const fibersMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.fibersMesh = new THREE.LineSegments(fibersGeo, fibersMat);
    this.brainGroup.add(this.fibersMesh);

    this.buildActionPotentialTransitPool();
  }

  /* -------------------------------------------------------------------------
   * 3. SPARSE COLORED ACTION POTENTIAL TRANSIT POOL (Reference Matched)
   * ------------------------------------------------------------------------- */
  buildActionPotentialTransitPool() {
    this.transitPositions = new Float32Array(this.maxTransits * 3);
    this.transitColors = new Float32Array(this.maxTransits * 3);

    const transitGeo = new THREE.BufferGeometry();
    transitGeo.setAttribute('position', new THREE.BufferAttribute(this.transitPositions, 3));
    transitGeo.setAttribute('color', new THREE.BufferAttribute(this.transitColors, 3));
    this.transitGeo = transitGeo;

    const tCanvas = document.createElement('canvas');
    tCanvas.width = 32;
    tCanvas.height = 32;
    const tCtx = tCanvas.getContext('2d');
    const tGrad = tCtx.createRadialGradient(16, 16, 0, 16, 16, 16);
    tGrad.addColorStop(0, 'rgba(255,255,255,1.0)');
    tGrad.addColorStop(0.3, 'rgba(255,255,255,0.9)');
    tGrad.addColorStop(0.7, 'rgba(56,189,248,0.4)');
    tGrad.addColorStop(1.0, 'rgba(0,0,0,0)');
    tCtx.fillStyle = tGrad;
    tCtx.fillRect(0, 0, 32, 32);
    const tTexture = new THREE.CanvasTexture(tCanvas);

    const transitMat = new THREE.PointsMaterial({
      size: 1.8,
      map: tTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.transitsMesh = new THREE.Points(transitGeo, transitMat);
    this.brainGroup.add(this.transitsMesh);

    // Color definitions
    this.tractColors = {
      visuomotor: new THREE.Color(0x00f0ff), // Cyan (Optic Tectum)
      cerebellar: new THREE.Color(0x10b981), // Emerald (Cerebellum)
      modulatory: new THREE.Color(0xf59e0b), // Amber (Diencephalon)
      sonic: new THREE.Color(0xc084fc),      // Violet (140.2 dB drumming)
      mauthner: new THREE.Color(0xff2a5f)    // Crimson (Mauthner C-Start)
    };
  }

  spawnTransitPacket(fromNode = null, tractType = 'visuomotor', customSpeed = null) {
    if (this.transits.length >= this.maxTransits) return;

    if (!fromNode) {
      const eligible = this.nodes.filter(n => n.neighbors && n.neighbors.length > 0);
      fromNode = eligible[Math.floor(Math.random() * eligible.length)];
    }
    if (!fromNode || !fromNode.neighbors || fromNode.neighbors.length === 0) return;

    const toNode = fromNode.neighbors[Math.floor(Math.random() * fromNode.neighbors.length)];

    let color = this.tractColors[tractType] || this.tractColors.visuomotor;
    if (fromNode.lobe && fromNode.lobe.includes('OpticTectum')) {
      color = this.tractColors.visuomotor;
      this.currentTract = 'TECTO_RETICULAR_TRACT';
    } else if (fromNode.lobe === 'Cerebellum') {
      color = this.tractColors.cerebellar;
      this.currentTract = 'CEREBELLO_VESTIBULAR_LOOP';
    } else if (fromNode.lobe === 'Diencephalon') {
      color = this.tractColors.modulatory;
      this.currentTract = 'HYPOTHALAMO_RETICULAR';
    } else if (fromNode.lobe === 'SonicDrummingNucleus') {
      color = this.tractColors.sonic;
      this.currentTract = 'SONIC_MOTOR_NUCLEUS_140DB';
    } else if (fromNode.isMauthner) {
      color = this.tractColors.mauthner;
      this.currentTract = 'MAUTHNER_C_START_REFLEX';
    }

    const speed = customSpeed || (0.024 + Math.random() * 0.032);

    this.transits.push({
      fromNode: fromNode,
      toNode: toNode,
      progress: 0.0,
      speed: speed,
      color: color,
      tract: this.currentTract
    });

    if (this.options.onTransit) {
      this.options.onTransit(fromNode, toNode, this.currentTract);
    }
  }

  /* -------------------------------------------------------------------------
   * 4. MINIMAL LOWER-LEFT MONOSPACE TELEMETRY HUD
   * ------------------------------------------------------------------------- */
  buildTelemetryHUD() {
    this.hudEl = document.createElement('div');
    this.hudEl.className = 'danio-webgl-hud';
    this.hudEl.style.position = 'absolute';
    this.hudEl.style.bottom = '76px';
    this.hudEl.style.left = '24px';
    this.hudEl.style.pointerEvents = 'none';
    this.hudEl.style.fontFamily = "'JetBrains Mono', 'Fira Code', monospace";
    this.hudEl.style.fontSize = '10.5px';
    this.hudEl.style.lineHeight = '1.6';
    this.hudEl.style.color = 'rgba(226, 232, 240, 0.88)';
    this.hudEl.style.background = 'rgba(6, 10, 18, 0.72)';
    this.hudEl.style.padding = '8px 14px';
    this.hudEl.style.borderRadius = '8px';
    this.hudEl.style.border = '1px solid rgba(56, 189, 248, 0.22)';
    this.hudEl.style.boxShadow = '0 6px 24px rgba(0, 0, 0, 0.85)';
    this.hudEl.style.backdropFilter = 'blur(8px)';
    this.hudEl.style.letterSpacing = '0.4px';
    this.hudEl.style.zIndex = '50';
    this.hudEl.style.maxWidth = '420px';

    this.hudEl.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 3px;">
        <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #38bdf8; box-shadow: 0 0 8px #38bdf8;"></span>
        <strong style="color: #ffffff; letter-spacing: 0.8px;">DANIONELLA CEREBRUM [ADULT VERTEBRATE CNS]</strong>
      </div>
      <div>TRACT: <span id="danio-hud-tract" style="color: #38bdf8; font-weight: 600;">${this.currentTract}</span></div>
      <div>CONDUCTION: <span id="danio-hud-freq" style="color: #4ade80;">${this.spikeRate.toFixed(1)} Hz</span> &nbsp;|&nbsp; Vm: <span id="danio-hud-vm" style="color: #f59e0b;">${this.meanVm.toFixed(1)} mV</span></div>
      <div>ΔF/F₀: <span id="danio-hud-ca" style="color: #c084fc;">${this.calciumFlux.toFixed(2)}</span> &nbsp;|&nbsp; STATE: <span id="danio-hud-state" style="color: #e2e8f0; font-weight: 600;">${this.dominantState}</span></div>
    `;

    this.container.appendChild(this.hudEl);
  }

  /* -------------------------------------------------------------------------
   * 5. INTERACTION & BIOPHYSICAL STIMULATION HOOKS
   * ------------------------------------------------------------------------- */
  setupInteractivity() {
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.canvas.addEventListener('pointerdown', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObject(this.bodyMesh);
      if (intersects.length > 0) {
        this.injectStimulusAtPoint(intersects[0].point);
      }
    });
  }

  injectStimulusAtPoint(point) {
    let closestNode = null;
    let minDist = 999;
    this.nodes.forEach(n => {
      const d = n.pos.distanceTo(point);
      if (d < minDist) {
        minDist = d;
        closestNode = n;
      }
    });

    if (closestNode) {
      closestNode.voltage = -20.0;
      closestNode.calcium = 2.2;
      closestNode.spikes = (closestNode.spikes || 0) + 4;
      for (let i = 0; i < 5; i++) {
        this.spawnTransitPacket(closestNode, 'visuomotor', 0.04);
      }
      this.dominantState = 'LOCAL_SOMATOSENSORY_BURST';
    }
  }

  triggerMauthnerCStart() {
    this.cStartActive = true;
    this.cStartTimer = 45;
    this.dominantState = 'C_START_ESCAPE_BURST';
    this.currentTract = 'MAUTHNER_C_START_REFLEX';

    const mCell = Math.random() < 0.5 ? this.mauthnerL : this.mauthnerR;
    mCell.voltage = 15.0;
    mCell.calcium = 2.8;
    mCell.spikes = (mCell.spikes || 0) + 12;

    for (let k = 0; k < 18; k++) {
      this.spawnTransitPacket(mCell, 'mauthner', 0.055 + Math.random() * 0.02);
    }
  }

  triggerSonicDrumming() {
    this.sonicActive = true;
    this.sonicTimer = 55;
    this.dominantState = '140.2dB_ACOUSTIC_DRUMMING';
    this.currentTract = 'SONIC_MOTOR_NUCLEUS_140DB';

    const sonicNodes = this.nodes.filter(n => n.lobe === 'SonicDrummingNucleus');
    sonicNodes.forEach(sn => {
      sn.voltage = -18.0;
      sn.calcium = 2.4;
      sn.spikes = (sn.spikes || 0) + 6;
      this.spawnTransitPacket(sn, 'sonic', 0.045);
    });

    this.createShockwaveMesh(new THREE.Vector3(7.5, -1.6, 0));
  }

  /* Expanding circular resonant acoustic blast wave (XY Camera Plane) */
  createShockwaveMesh(center) {
    const geo = new THREE.RingGeometry(0.8, 1.3, 40);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xc084fc,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
    const wave = new THREE.Mesh(geo, mat);
    wave.position.copy(center);
    this.fishGroup.add(wave);
    this.shockwaves.push({ mesh: wave, radius: 1.0, maxRadius: 28.0, opacity: 0.85 });
  }

  triggerVisuomotorSaccade() {
    this.dominantState = 'OPTIC_TECTUM_SACCADE';
    this.currentTract = 'TECTO_BULBAR_TRACK';
    const tectalNodes = this.nodes.filter(n => n.lobe && n.lobe.includes('OpticTectum'));
    for (let i = 0; i < 8; i++) {
      const tn = tectalNodes[Math.floor(Math.random() * tectalNodes.length)];
      if (tn) {
        tn.voltage = -24.0;
        tn.calcium = 2.0;
        tn.spikes = (tn.spikes || 0) + 3;
        this.spawnTransitPacket(tn, 'visuomotor', 0.038);
      }
    }
  }

  /* -------------------------------------------------------------------------
   * 6. MASTER SIMULATION LOOP
   * ------------------------------------------------------------------------- */
  animate() {
    this.rafId = requestAnimationFrame(this.animate);
    if (this.isPaused) return;

    this.time += 0.016;

    if (this.controls) {
      this.controls.update();
    }

    // A. Biological Undulation Swimming Kinematics
    const swimAmp = this.cStartActive ? 2.8 : 0.72;
    const swimFreq = this.cStartActive ? 8.0 : 3.0;
    const wavePhase = this.time * swimFreq;

    const posAttr = this.bodyGeometry.attributes.position;
    const basePos = this.baseBodyPositions;
    for (let i = 0; i < posAttr.count; i++) {
      const bx = basePos.getX(i);
      const by = basePos.getY(i);
      const bz = basePos.getZ(i);

      const tailFactor = Math.max(0, (10 - bx) / 60);
      const lateralBend = Math.sin(wavePhase + bx * 0.08) * swimAmp * Math.pow(tailFactor, 1.4);

      if (this.cStartActive) {
        const cBend = Math.sin((bx - 10) / 35) * 6.5 * Math.max(0, (14 - bx) / 45);
        posAttr.setZ(i, bz + cBend);
      } else {
        posAttr.setZ(i, bz + lateralBend);
      }
    }
    posAttr.needsUpdate = true;

    // Caudal fin tail whip
    if (this.caudalMesh) {
      const tailWhip = Math.sin(wavePhase - 2.5) * (this.cStartActive ? 0.95 : 0.28);
      this.caudalMesh.rotation.y = tailWhip;
    }

    // Pectoral fin flutter
    if (this.pecFins) {
      const pecFlutter = Math.sin(this.time * 5.5) * 0.18;
      this.pecFins.forEach(pf => {
        pf.mesh.rotation.y = pf.side * 0.25 + pecFlutter * pf.side;
      });
    }

    // Swim bladder acoustic resonance vibration
    if (this.sonicActive && this.bladderMesh) {
      const vibe = 1.0 + Math.sin(this.time * 75.0) * 0.22;
      this.bladderMesh.scale.set(1.8 * vibe, 0.72 * vibe, 0.72 * vibe);
    }

    // B. Action Potential Transits Propagation
    const pos = this.transitGeo.attributes.position;
    const col = this.transitGeo.attributes.color;

    if (Math.random() < 0.28 && this.transits.length < this.maxTransits) {
      this.spawnTransitPacket();
    }

    for (let i = this.transits.length - 1; i >= 0; i--) {
      const tr = this.transits[i];
      tr.progress += tr.speed;

      if (tr.progress >= 1.0) {
        const dest = tr.toNode;
        dest.voltage = -24.0 + Math.random() * 6.0;
        dest.calcium = Math.min(dest.calcium + 0.30, 2.6);
        dest.spikes = (dest.spikes || 0) + 1;

        if (Math.random() < 0.35 && this.transits.length < this.maxTransits) {
          this.spawnTransitPacket(dest, tr.tract, tr.speed * 0.95);
        }

        this.transits.splice(i, 1);
        continue;
      }

      const curX = tr.fromNode.pos.x + (tr.toNode.pos.x - tr.fromNode.pos.x) * tr.progress;
      const curY = tr.fromNode.pos.y + (tr.toNode.pos.y - tr.fromNode.pos.y) * tr.progress;
      const curZ = tr.fromNode.pos.z + (tr.toNode.pos.z - tr.fromNode.pos.z) * tr.progress;

      pos.setXYZ(i, curX, curY, curZ);
      col.setXYZ(i, tr.color.r, tr.color.g, tr.color.b);
    }

    for (let i = this.transits.length; i < this.maxTransits; i++) {
      pos.setXYZ(i, 0, -9999, 0);
    }
    pos.needsUpdate = true;
    col.needsUpdate = true;

    // C. Subtle Poisson Calcium Flickering (GCaMP in vivo dynamic look)
    const somataColors = this.somataGeo.attributes.color;
    let totalVm = 0;
    let totalCa = 0;
    let totalSpikes = 0;

    for (let i = 0; i < this.nodes.length; i++) {
      const n = this.nodes[i];
      n.voltage += (-65.0 - n.voltage) * 0.08;
      n.calcium += (0.08 - n.calcium) * 0.04;

      totalVm += n.voltage;
      totalCa += n.calcium;
      totalSpikes += (n.spikes || 0);

      // Fine luminescent transient intensity
      const intensity = Math.min(1.0, 0.20 + n.calcium * 0.45 + (n.voltage + 65.0) * 0.018);
      somataColors.setXYZ(i, n.baseColor.r * intensity, n.baseColor.g * intensity, n.baseColor.b * intensity);
    }
    somataColors.needsUpdate = true;

    this.meanVm = totalVm / this.nodes.length;
    this.calciumFlux = totalCa / this.nodes.length * 7.2;
    this.spikeRate = Math.max(14, Math.min(160, totalSpikes * 0.45 + (this.cStartActive ? 85 : 0) + (this.sonicActive ? 65 : 0)));

    // D. Acoustic Shockwaves Animation
    for (let s = this.shockwaves.length - 1; s >= 0; s--) {
      const sw = this.shockwaves[s];
      sw.radius += 1.3;
      sw.mesh.scale.set(sw.radius, sw.radius, 1.0);
      sw.opacity *= 0.92;
      sw.mesh.material.opacity = sw.opacity;

      if (sw.opacity < 0.05 || sw.radius > sw.maxRadius) {
        this.fishGroup.remove(sw.mesh);
        sw.mesh.geometry.dispose();
        sw.mesh.material.dispose();
        this.shockwaves.splice(s, 1);
      }
    }

    if (this.cStartActive) {
      this.cStartTimer--;
      if (this.cStartTimer <= 0) {
        this.cStartActive = false;
        this.dominantState = 'PELAGIC_CRUISE';
      }
    }
    if (this.sonicActive) {
      this.sonicTimer--;
      if (this.sonicTimer <= 0) {
        this.sonicActive = false;
        if (!this.cStartActive) this.dominantState = 'PELAGIC_CRUISE';
      }
    }

    this.updateHUD();

    if (this.options.onTelemetry && Math.random() < 0.35) {
      this.options.onTelemetry({
        dominantState: this.dominantState,
        meanVm: this.meanVm,
        spikeRate: this.spikeRate,
        calciumFlux: this.calciumFlux,
        activeTract: this.currentTract,
        cStartActive: this.cStartActive,
        sonicActive: this.sonicActive
      });
    }

    this.renderer.render(this.scene, this.camera);
  }

  updateHUD() {
    if (!this.hudEl) return;
    const tractEl = document.getElementById('danio-hud-tract');
    const freqEl = document.getElementById('danio-hud-freq');
    const vmEl = document.getElementById('danio-hud-vm');
    const caEl = document.getElementById('danio-hud-ca');
    const stateEl = document.getElementById('danio-hud-state');

    if (tractEl) tractEl.textContent = this.currentTract;
    if (freqEl) freqEl.textContent = `${this.spikeRate.toFixed(1)} Hz`;
    if (vmEl) vmEl.textContent = `${this.meanVm.toFixed(1)} mV`;
    if (caEl) caEl.textContent = this.calciumFlux.toFixed(2);
    if (stateEl) stateEl.textContent = this.dominantState;
  }

  destroy() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    if (this.renderer && this.renderer.domElement && this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
    if (this.hudEl && this.hudEl.parentElement) {
      this.hudEl.parentElement.removeChild(this.hudEl);
    }
  }
}

if (typeof window !== 'undefined') {
  window.DanioWebGLSimulation = DanioWebGLSimulation;
}
