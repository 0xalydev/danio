/**
 * HeroEnergyPathwaySimulation — Target Hero Visual
 * 
 * SPECIFICATIONS MET:
 * 1. Full-screen almost-black background (#010306)
 * 2. Subtle dark navy/black technical grid (low-opacity, static, large empty dark space)
 * 3. Single futuristic curved biological/energy pathway:
 *    - Starts from lower portion of screen
 *    - Curves naturally upward
 *    - Organic tube/path shape, relatively thin
 *    - Positioned mostly toward left/center area
 *    - Glowing cyan/white outer structure & bright white/cyan core
 *    - Rounded smooth edges, glowing softly into surrounding darkness
 * 4. Moving bright green rectangular/segmented blocks:
 *    - Inside/on the curved pathway
 *    - Follows curvature of the pathway
 *    - Moves continuously upward along the path
 *    - Discrete glowing green sections with soft green emission/glow
 *    - Maintains spacing between segments
 *    - Loops continuously
 * 5. Glowing Particle (Bright green orb):
 *    - Floats above the main pathway
 *    - Small and bright with strong green center
 *    - Soft large green glow around it
 *    - Pulses very subtly
 *    - Moves slightly in a smooth organic drift
 * 6. Small Signal Connection:
 *    - Top of pathway leading toward green orb
 *    - Very thin, cyan/white, low opacity, slightly animated
 * 7. Camera / Composition:
 *    - Fixed camera, no rotation of entire object
 *    - Minimalist, cinematic, dark, high contrast, generous negative space
 * 8. Performance:
 *    - 60 FPS WebGL, responsive, pauses when tab is hidden
 */

class HeroEnergyPathwaySimulation {
  constructor(canvas) {
    this.canvas = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;
    if (!this.canvas) throw new Error('HeroEnergyPathwaySimulation: Canvas element not found');

    this.container = this.canvas.parentElement;
    this.time = 0;
    this.isVisible = true;
    this.rafId = null;

    // Canvas sizing
    this.width = this.container.clientWidth || window.innerWidth;
    this.height = this.container.clientHeight || window.innerHeight;

    this.initScene();
    this.buildTechnicalGrid();
    this.buildCurvedPathway();
    this.buildMovingGreenSegments();
    this.buildGlowingOrb();
    this.buildSignalConnection();
    this.setupLifecycle();

    this.animate = this.animate.bind(this);
    this.rafId = requestAnimationFrame(this.animate);
  }

  initScene() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    // 1. Full-screen almost-black background
    this.renderer.setClearColor(0x010306, 1.0);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x010306);

    // 8. Fixed Camera (No user rotation, no object rotation)
    const fov = 42;
    this.camera = new THREE.PerspectiveCamera(fov, this.width / this.height, 0.1, 1000);
    this.camera.position.set(0, 0, 85);
    this.camera.lookAt(0, 0, 0);

    this.mainGroup = new THREE.Group();
    this.scene.add(this.mainGroup);

    window.addEventListener('resize', () => this.onResize());
  }

  onResize() {
    if (!this.container) return;
    this.width = this.container.clientWidth || window.innerWidth;
    this.height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
  }

  /* -------------------------------------------------------------------------
   * 1. SUBTLE DARK NAVY / BLACK TECHNICAL GRID (Static, Large Empty Space)
   * ------------------------------------------------------------------------- */
  buildTechnicalGrid() {
    const gridLines = [];
    const spanX = 72;
    const spanY = 48;
    const step = 6.0;

    // Thin vertical lines
    for (let x = -spanX; x <= spanX; x += step) {
      gridLines.push(x, -spanY, -10, x, spanY, -10);
    }
    // Thin horizontal lines
    for (let y = -spanY; y <= spanY; y += step) {
      gridLines.push(-spanX, y, -10, spanX, y, -10);
    }

    const gridGeo = new THREE.BufferGeometry();
    gridGeo.setAttribute('position', new THREE.Float32BufferAttribute(gridLines, 3));
    const gridMat = new THREE.LineBasicMaterial({
      color: 0x09192b, // Subtle dark navy/black
      transparent: true,
      opacity: 0.22,   // Thin & low-opacity
      depthWrite: false
    });
    this.gridMesh = new THREE.LineSegments(gridGeo, gridMat);
    this.scene.add(this.gridMesh);

    // Subtle technical intersection crosshairs at major grid intervals
    const crossLines = [];
    for (let x = -spanX + step * 2; x <= spanX - step * 2; x += step * 3) {
      for (let y = -spanY + step * 2; y <= spanY - step * 2; y += step * 3) {
        const d = 0.35;
        crossLines.push(x - d, y, -9.9, x + d, y, -9.9);
        crossLines.push(x, y - d, -9.9, x, y + d, -9.9);
      }
    }
    const crossGeo = new THREE.BufferGeometry();
    crossGeo.setAttribute('position', new THREE.Float32BufferAttribute(crossLines, 3));
    const crossMat = new THREE.LineBasicMaterial({
      color: 0x0ea5e9,
      transparent: true,
      opacity: 0.12,
      depthWrite: false
    });
    this.crossMesh = new THREE.LineSegments(crossGeo, crossMat);
    this.scene.add(this.crossMesh);
  }

  /* -------------------------------------------------------------------------
   * 2. SINGLE FUTURISTIC CURVED BIOLOGICAL / ENERGY PATHWAY
   * ------------------------------------------------------------------------- */
  buildCurvedPathway() {
    // Perfectly framed curve: starts lower portion (-23, -38) and curves naturally upward to (-15.5, 19.5)
    const points = [
      new THREE.Vector3(-23.0, -38.0, 0.0),
      new THREE.Vector3(-25.5, -23.0, 0.3),
      new THREE.Vector3(-19.0, -8.0, -0.3),
      new THREE.Vector3(-22.0, 5.0, 0.2),
      new THREE.Vector3(-17.0, 15.0, 0.0),
      new THREE.Vector3(-15.5, 19.5, 0.0)
    ];

    this.pathCurve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);
    this.pathTopPoint = points[points.length - 1].clone();

    // A. Outer Glowing Cyan/White Tube Structure with Integrated Moving Green Segments Shader
    const tubeSegments = 240;
    const tubeRadius = 1.18; // Sleek, relatively thin organic tube
    const radialSegments = 24;
    const tubeGeo = new THREE.TubeGeometry(this.pathCurve, tubeSegments, tubeRadius, radialSegments, false);

    const vertexShader = `
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      varying vec2 vUv;

      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vViewPosition = -mvPosition.xyz;
        vUv = uv;
        gl_Position = projectionMatrix * mvPosition;
      }
    `;

    const fragmentShader = `
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      varying vec2 vUv;

      uniform float uTime;
      uniform float uSpeed;
      uniform float uNumSegments;
      uniform float uDutyCycle;

      void main() {
        vec3 normal = normalize(vNormal);
        vec3 viewDir = normalize(vViewPosition);

        // Optical Fresnel rim
        float fresnel = pow(1.0 - abs(dot(viewDir, normal)), 2.8);
        // Bright white/cyan core line
        float coreGlow = pow(abs(dot(viewDir, normal)), 3.0);

        // Glowing cyan/white outer biological structure
        vec3 baseCyan = vec3(0.015, 0.12, 0.22);
        vec3 rimCyan = vec3(0.14, 0.82, 0.98);
        vec3 coreWhite = vec3(0.92, 0.98, 1.0);
        vec3 sheathCol = mix(baseCyan, rimCyan, fresnel) + coreWhite * coreGlow * 0.38;

        // 3. MOVING GREEN SEGMENTS: Repeated bright green blocks moving upward
        float travel = vUv.x * uNumSegments - uTime * uSpeed;
        float segFrac = fract(travel);
        // Discrete glowing green sections with crisp spacing
        float segMask = smoothstep(0.0, 0.08, segFrac) * smoothstep(uDutyCycle, uDutyCycle - 0.08, segFrac);

        // Seamless entry at bottom and exit at top
        float edgeFade = smoothstep(0.0, 0.05, vUv.x) * smoothstep(1.0, 0.95, vUv.x);
        segMask *= edgeFade;

        // Vibrant neon green emission with bright green core
        vec3 greenCore = vec3(0.40, 1.0, 0.65);
        vec3 greenGlow = vec3(0.0, 1.0, 0.42);
        vec3 greenCol = mix(greenGlow, greenCore, coreGlow * 0.75);

        // Composite green segments onto cyan sheath
        vec3 finalColor = mix(sheathCol, greenCol * 1.5, segMask * 0.88);
        float finalAlpha = (0.15 + fresnel * 0.52 + coreGlow * 0.16) + segMask * 0.80;

        // Smooth rounded tube extremities
        finalAlpha *= smoothstep(0.0, 0.02, vUv.x) * smoothstep(1.0, 0.98, vUv.x);

        gl_FragColor = vec4(finalColor, finalAlpha);
      }
    `;

    this.tubeMaterial = new THREE.ShaderMaterial({
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uSpeed: { value: 0.32 },       // Continuous upward motion
        uNumSegments: { value: 12.0 },  // Repeated segmented blocks
        uDutyCycle: { value: 0.52 }     // Segment length with clean spacing
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    this.tubeMesh = new THREE.Mesh(tubeGeo, this.tubeMaterial);
    this.mainGroup.add(this.tubeMesh);

    // B. Inner Bright White/Cyan Core Filament
    const coreGeo = new THREE.TubeGeometry(this.pathCurve, 200, 0.24, 12, false);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xdcfce7,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.coreMesh = new THREE.Mesh(coreGeo, coreMat);
    this.mainGroup.add(this.coreMesh);

    // C. Outer Volumetric Soft Glow Halo (Glows softly into surrounding darkness)
    const haloGeo = new THREE.TubeGeometry(this.pathCurve, 180, 2.5, 16, false);
    const haloVertex = `
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      varying vec2 vUv;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vViewPosition = -mvPosition.xyz;
        vUv = uv;
        gl_Position = projectionMatrix * mvPosition;
      }
    `;
    const haloFragment = `
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      varying vec2 vUv;
      uniform float uTime;
      uniform float uSpeed;
      uniform float uNumSegments;
      uniform float uDutyCycle;

      void main() {
        vec3 normal = normalize(vNormal);
        vec3 viewDir = normalize(vViewPosition);
        float fresnel = pow(1.0 - abs(dot(viewDir, normal)), 2.2);

        float travel = vUv.x * uNumSegments - uTime * uSpeed;
        float segFrac = fract(travel);
        float segMask = smoothstep(0.0, 0.12, segFrac) * smoothstep(uDutyCycle, uDutyCycle - 0.12, segFrac);
        segMask *= smoothstep(0.0, 0.08, vUv.x) * smoothstep(1.0, 0.92, vUv.x);

        vec3 cyanHalo = vec3(0.04, 0.45, 0.75);
        vec3 greenHalo = vec3(0.0, 1.0, 0.42);
        vec3 haloCol = mix(cyanHalo, greenHalo, segMask * 0.85);

        float alpha = (0.04 + segMask * 0.15) * fresnel;
        alpha *= smoothstep(0.0, 0.03, vUv.x) * smoothstep(1.0, 0.97, vUv.x);

        gl_FragColor = vec4(haloCol, alpha);
      }
    `;

    this.haloMaterial = new THREE.ShaderMaterial({
      vertexShader: haloVertex,
      fragmentShader: haloFragment,
      uniforms: {
        uTime: { value: 0 },
        uSpeed: { value: 0.32 },
        uNumSegments: { value: 12.0 },
        uDutyCycle: { value: 0.52 }
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.BackSide
    });

    this.haloMesh = new THREE.Mesh(haloGeo, this.haloMaterial);
    this.mainGroup.add(this.haloMesh);
  }

  /* -------------------------------------------------------------------------
   * 3. DISCRETE 3D MOVING GREEN SEGMENTS (Discrete Rectangular Blocks)
   * ------------------------------------------------------------------------- */
  buildMovingGreenSegments() {
    this.numGreenBlocks = 12;
    this.greenBlocks = [];

    // Sleek rectangular/cylindrical collar sleeve geometry
    const sleeveGeo = new THREE.CylinderGeometry(1.26, 1.26, 1.9, 18, 1, true);
    sleeveGeo.rotateX(Math.PI / 2);

    const sleeveMat = new THREE.MeshBasicMaterial({
      color: 0x00ff88, // Pure neon green
      transparent: true,
      opacity: 0.80,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    for (let i = 0; i < this.numGreenBlocks; i++) {
      const mesh = new THREE.Mesh(sleeveGeo, sleeveMat.clone());
      this.mainGroup.add(mesh);
      this.greenBlocks.push({
        mesh: mesh,
        baseOffset: i / this.numGreenBlocks
      });
    }
  }

  /* -------------------------------------------------------------------------
   * 4. GLOWING PARTICLE (Bright Green Floating Orb)
   * ------------------------------------------------------------------------- */
  buildGlowingOrb() {
    this.orbGroup = new THREE.Group();
    this.mainGroup.add(this.orbGroup);

    // Floating cleanly above the pathway top terminal in open dark space
    this.orbBasePos = new THREE.Vector3(-14.0, 26.5, 0.0);
    this.orbGroup.position.copy(this.orbBasePos);

    // A. Bright white-hot center
    const coreGeo = new THREE.SphereGeometry(0.75, 32, 32);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending
    });
    this.orbCore = new THREE.Mesh(coreGeo, coreMat);
    this.orbGroup.add(this.orbCore);

    // B. Strong green emission inner shell
    const innerGeo = new THREE.SphereGeometry(1.15, 32, 32);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0x00ff88,
      transparent: true,
      opacity: 0.82,
      blending: THREE.AdditiveBlending
    });
    this.orbInner = new THREE.Mesh(innerGeo, innerMat);
    this.orbGroup.add(this.orbInner);

    // C. Soft large green glow halo
    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = 128;
    glowCanvas.height = 128;
    const gCtx = glowCanvas.getContext('2d');
    const grad = gCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
    grad.addColorStop(0.2, 'rgba(0, 255, 136, 0.90)');
    grad.addColorStop(0.5, 'rgba(0, 255, 136, 0.32)');
    grad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
    gCtx.fillStyle = grad;
    gCtx.fillRect(0, 0, 128, 128);

    const glowTexture = new THREE.CanvasTexture(glowCanvas);
    const planeGeo = new THREE.PlaneGeometry(12.0, 12.0);
    const planeMat = new THREE.MeshBasicMaterial({
      map: glowTexture,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.orbGlow = new THREE.Mesh(planeGeo, planeMat);
    this.orbGroup.add(this.orbGlow);
  }

  /* -------------------------------------------------------------------------
   * 5. SMALL SIGNAL CONNECTION (Top of Pathway -> Green Orb)
   * ------------------------------------------------------------------------- */
  buildSignalConnection() {
    this.numSignalDots = 8;
    this.signalDots = [];

    const dotCanvas = document.createElement('canvas');
    dotCanvas.width = 32;
    dotCanvas.height = 32;
    const dCtx = dotCanvas.getContext('2d');
    const dGrad = dCtx.createRadialGradient(16, 16, 0, 16, 16, 16);
    dGrad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
    dGrad.addColorStop(0.4, 'rgba(56, 189, 248, 0.7)');
    dGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
    dCtx.fillStyle = dGrad;
    dCtx.fillRect(0, 0, 32, 32);

    const dotTexture = new THREE.CanvasTexture(dotCanvas);
    const dotGeo = new THREE.PlaneGeometry(0.75, 0.75);
    const dotMat = new THREE.MeshBasicMaterial({
      map: dotTexture,
      transparent: true,
      opacity: 0.38, // Minimal, low-opacity, elegant
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    for (let i = 0; i < this.numSignalDots; i++) {
      const dot = new THREE.Mesh(dotGeo, dotMat.clone());
      this.mainGroup.add(dot);
      this.signalDots.push({
        mesh: dot,
        offset: i / this.numSignalDots
      });
    }

    // Very thin faint cyan/white dashed baseline
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute([
      this.pathTopPoint.x, this.pathTopPoint.y, this.pathTopPoint.z,
      this.orbBasePos.x, this.orbBasePos.y, this.orbBasePos.z
    ], 3));
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.20,
      blending: THREE.AdditiveBlending
    });
    this.connectionLine = new THREE.Line(lineGeo, lineMat);
    this.mainGroup.add(this.connectionLine);
  }

  /* -------------------------------------------------------------------------
   * 6. ANIMATION & SMOOTH CONTINUOUS LOOP (60 FPS)
   * ------------------------------------------------------------------------- */
  animate() {
    this.rafId = requestAnimationFrame(this.animate);
    if (!this.isVisible) return;

    this.time += 0.016;

    // A. Update Shader Uniforms for Continuous Upward Motion
    if (this.tubeMaterial) {
      this.tubeMaterial.uniforms.uTime.value = this.time;
    }
    if (this.haloMaterial) {
      this.haloMaterial.uniforms.uTime.value = this.time;
    }

    // B. Update Discrete 3D Green Segment Blocks along the Spline Curve
    const upVector = new THREE.Vector3(0, 1, 0);
    const speed = 0.058; // Smooth continuous travel speed

    for (let i = 0; i < this.greenBlocks.length; i++) {
      const block = this.greenBlocks[i];
      const u = (block.baseOffset + this.time * speed) % 1.0;

      // Position along curve
      const pos = this.pathCurve.getPointAt(u);
      block.mesh.position.copy(pos);

      // Orientation tangent to curve
      const tangent = this.pathCurve.getTangentAt(u);
      block.mesh.quaternion.setFromUnitVectors(upVector, tangent);

      // Smooth entry at u=0 and exit at u=1
      const edgeScale = Math.sin(u * Math.PI);
      const scale = Math.max(0.01, edgeScale);
      block.mesh.scale.set(scale, 1.0, scale);
      block.mesh.material.opacity = edgeScale * 0.85;
    }

    // C. Update Floating Green Orb (Subtle Organic Drift & Pulse)
    const driftX = this.orbBasePos.x + Math.sin(this.time * 1.1) * 0.40;
    const driftY = this.orbBasePos.y + Math.cos(this.time * 0.85) * 0.30;
    const driftZ = this.orbBasePos.z + Math.sin(this.time * 1.3) * 0.20;
    this.orbGroup.position.set(driftX, driftY, driftZ);

    // Subtle breathing pulse
    const pulse = 1.0 + Math.sin(this.time * 2.2) * 0.07;
    this.orbCore.scale.set(pulse, pulse, pulse);
    this.orbInner.scale.set(pulse * 1.04, pulse * 1.04, pulse * 1.04);
    this.orbGlow.scale.set(pulse * 1.06, pulse * 1.06, 1.0);

    // D. Update Animated Small Signal Connection Dots
    const orbPos = this.orbGroup.position;
    for (let i = 0; i < this.signalDots.length; i++) {
      const sDot = this.signalDots[i];
      const progress = (sDot.offset + this.time * 0.32) % 1.0;
      const curPos = this.pathTopPoint.clone().lerp(orbPos, progress);
      sDot.mesh.position.copy(curPos);

      // Fade out smoothly as dot approaches the green orb
      const fade = Math.sin(progress * Math.PI);
      sDot.mesh.material.opacity = fade * 0.40;
      sDot.mesh.scale.set(0.75 + fade * 0.35, 0.75 + fade * 0.35, 1.0);
    }

    // Update faint connection line coordinates
    if (this.connectionLine) {
      const posAttr = this.connectionLine.geometry.attributes.position;
      posAttr.setXYZ(0, this.pathTopPoint.x, this.pathTopPoint.y, this.pathTopPoint.z);
      posAttr.setXYZ(1, orbPos.x, orbPos.y, orbPos.z);
      posAttr.needsUpdate = true;
    }

    this.renderer.render(this.scene, this.camera);
  }

  setupLifecycle() {
    document.addEventListener('visibilitychange', () => {
      this.isVisible = !document.hidden;
    });

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        this.isVisible = entries[0].isIntersecting;
      }, { threshold: 0.05 });
      observer.observe(this.canvas);
    }
  }

  destroy() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    if (this.renderer) this.renderer.dispose();
  }
}

// Auto-initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('hero-organism-canvas');
  if (canvas && typeof THREE !== 'undefined') {
    window.heroSimulation = new HeroEnergyPathwaySimulation(canvas);
  }
});

window.HeroEnergyPathwaySimulation = HeroEnergyPathwaySimulation;
window.HeroObservationChamber = HeroEnergyPathwaySimulation;
