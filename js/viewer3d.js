// ================================================================
//  THERMAL SHELTER — Three.js 3D Shelter Viewer  v2
//  Brown roof/door · Half-white walls · Navy blue windows
//  Full 360° orbit · Interior view · Exact dimensions
// ================================================================

const BRAND = {
  WALL_EXT:   0xF5F0E8,   // Sandstone Cream / Off-White
  WALL_INT:   0xEDE5D5,   // Warm Sandstone Interior
  ROOF:       0x753A18,   // Rich Architectural Wood/Cedar Brown
  DOOR:       0x4E240D,   // Deep Architectural Walnut Brown
  DOOR_FRAME: 0x753A18,   // Architectural Brown Frame
  WIN_FRAME:  0x102044,   // Dark Navy Blue Frame
  WIN_GLASS:  0x0A2B6E,   // Vivid Rich Navy Blue Glass
  WIN_EMISS:  0x031238,   // Subtle Navy Blue Emissive Glow
  RIDGE:      0x5C2A0E,   // Deep Timber Brown Ridge
  GROUND:     0x8B7355,
};

class ShelterViewer {
  constructor(containerId) {
    this.containerId = containerId;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.shelterGroup = null;
    this.particles = null;
    this.animFrameId = null;
    this.initialized = false;
    this.insideMode = false;
    this._dims = null;
    this.roofEditMode = false;
    this._roofDrag = null;
    this.transformControls = null;
    this.designParts = {};
  }

  init() {
    if (this.initialized) return;
    const container = document.getElementById(this.containerId);
    if (!container) return;

    const W = container.clientWidth;
    const H = container.clientHeight;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0A0503);
    this.scene.fog = new THREE.Fog(0x0A0503, 30, 80);

    // Camera
    this.camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 200);
    this.camera.position.set(18, 12, 18);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(W, H);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    container.appendChild(this.renderer.domElement);

    // Controls — full 360° orbit including look inside
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.07;
    this.controls.minDistance = 0.5;
    this.controls.maxDistance = 60;
    this.controls.maxPolarAngle = Math.PI;
    this.controls.enablePan = true;
    this.controls.enableDamping = true;
    this.controls.enableRotate = true;
    this.controls.enableZoom = true;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.6;
    this.controls.screenSpacePanning = true;
    this.renderer.domElement.style.touchAction = 'none';

    if (THREE.TransformControls) {
      this.transformControls = new THREE.TransformControls(this.camera, this.renderer.domElement);
      this.transformControls.addEventListener('dragging-changed', event => {
        this.controls.enabled = !event.value;
      });
      this.scene.add(this.transformControls);
    }

    // Lighting
    this._setupLighting();

    // Ground plane
    this._addGround();

    // Build initial shelter
    this.buildShelter();

    // Particles
    this._addParticles();

    // UI buttons (auto-rotate, reset, inside-view)
    this._bindViewerButtons();
    this._bindDesignControls();

    // Resize
    window.addEventListener('resize', () => this._onResize(container));

    // Animate
    this._animate();
    this.initialized = true;
  }

  _setupLighting() {
    // Ambient
    const ambient = new THREE.AmbientLight(0xFFE8C0, 0.4);
    this.scene.add(ambient);

    // Sun (directional)
    const sun = new THREE.DirectionalLight(0xFFD580, 1.6);
    sun.position.set(15, 25, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 60;
    sun.shadow.camera.left = -20;
    sun.shadow.camera.right = 20;
    sun.shadow.camera.top = 20;
    sun.shadow.camera.bottom = -20;
    sun.shadow.bias = -0.001;
    this.scene.add(sun);
    this.sun = sun;

    // Warm fill
    const fill = new THREE.HemisphereLight(0xFFD080, 0x442200, 0.5);
    this.scene.add(fill);

    // Interior warm glow (pulsing)
    this.interiorLight = new THREE.PointLight(0xFFAA66, 1.2, 14, 2);
    this.interiorLight.position.set(0, 2, 0);
    this.scene.add(this.interiorLight);
  }

  _addGround() {
    const geo = new THREE.PlaneGeometry(60, 60, 20, 20);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x3A2010,
      roughness: 0.95,
      metalness: 0.0
    });
    const ground = new THREE.Mesh(geo, mat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Grid helper
    const grid = new THREE.GridHelper(60, 30, 0x6B3A2A, 0x3A1808);
    grid.position.y = 0.01;
    grid.material.opacity = 0.3;
    grid.material.transparent = true;
    this.scene.add(grid);
  }

  buildShelter() {
    if (!this.scene) return;

    // Remove previous shelter
    if (this.shelterGroup) {
      this.scene.remove(this.shelterGroup);
      this.shelterGroup.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
      });
    }

    const state = window.AppState;
    const modelType = state.shelterType?.geometry || state.shelterType?.id || 'gable';
    const dims = Object.assign({ width: 8, length: 10, height: 3.5, roofPitch: 30 }, state.dimensions || {});
    this._climateProfile = this._getClimateProfile(state.climate);
    const imageProfile = this._getImageModelProfile(state.shelterType?.id);
    const recommendedPitch = Math.max(this._climateProfile.minRoofPitch, imageProfile.roofPitch || 0);
    dims.roofPitch = window.AppState.manualDesign
      ? Math.max(0, Number(dims.roofPitch) || recommendedPitch)
      : Math.max(Number(dims.roofPitch) || 0, recommendedPitch);
    this._dims = dims;

    const floorColor = new THREE.Color(state.materials?.floor?.color || 0xB0A898);

    this.shelterGroup = new THREE.Group();
    this.designParts = {};

    switch (modelType) {
      case 'flat': this._buildFlat(dims, floorColor); break;
      case 'dome': this._buildDome(dims, floorColor); break;
      case 'aframe': this._buildAFrame(dims, floorColor); break;
      case 'leanto': this._buildLeanTo(dims, floorColor); break;
      case 'barrel': this._buildBarrel(dims, floorColor); break;
      default: this._buildGable(dims, floorColor);
    }

    // Keep manual controls usable for builders that do not expose finer parts.
    ['roof', 'walls', 'door', 'windows'].forEach(part => {
      if (!this.designParts[part]) this.designParts[part] = this.shelterGroup;
    });

    this.scene.add(this.shelterGroup);
    this._setupTransformControls();
    this._centerGroup();

    const box = new THREE.Box3().setFromObject(this.shelterGroup);
    const ct = box.getCenter(new THREE.Vector3());
    this.interiorLight.position.set(ct.x, ct.y + dims.height * 0.25, ct.z);

    this._updateInfoPanel(dims, state);
    this.resetCamera();
  }

  _getClimateProfile(climate) {
    const profiles = {
      cold: { minRoofPitch: 40, windowScale: 0.78, windowHeight: 0.64, sideWindows: true, overhang: 0.55, shade: false },
      polar: { minRoofPitch: 45, windowScale: 0.68, windowHeight: 0.62, sideWindows: false, overhang: 0.35, shade: false },
      'high-altitude-cold': { minRoofPitch: 45, windowScale: 0.72, windowHeight: 0.64, sideWindows: false, overhang: 0.45, shade: false },
      'snow-cold': { minRoofPitch: 45, windowScale: 0.72, windowHeight: 0.64, sideWindows: false, overhang: 0.45, shade: false },
      arid: { minRoofPitch: 8, windowScale: 0.72, windowHeight: 0.58, sideWindows: true, overhang: 0.45, shade: true },
      'hot-dry-desert': { minRoofPitch: 8, windowScale: 0.72, windowHeight: 0.58, sideWindows: true, overhang: 0.45, shade: true },
      tropical: { minRoofPitch: 32, windowScale: 1.05, windowHeight: 0.52, sideWindows: true, overhang: 0.85, shade: true },
      'hot-humid-coastal': { minRoofPitch: 32, windowScale: 1.05, windowHeight: 0.52, sideWindows: true, overhang: 0.85, shade: true },
      'heavy-rain': { minRoofPitch: 35, windowScale: 0.92, windowHeight: 0.56, sideWindows: true, overhang: 0.95, shade: true },
      'high-wind': { minRoofPitch: 25, windowScale: 0.72, windowHeight: 0.58, sideWindows: false, overhang: 0.3, shade: false },
      moderate: { minRoofPitch: 25, windowScale: 0.9, windowHeight: 0.58, sideWindows: true, overhang: 0.65, shade: false },
      temperate: { minRoofPitch: 25, windowScale: 0.9, windowHeight: 0.58, sideWindows: true, overhang: 0.65, shade: false }
    };
    return profiles[(climate || 'cold').toLowerCase()] || profiles.temperate;
  }

  _getImageModelProfile(modelId) {
    const profiles = {
      'snow-region': { roofPitch: 55 },
      'cold-mountain': { roofPitch: 38 },
      'heavy-rain': { roofPitch: 38 },
      'hot-humid': { roofPitch: 32 },
      'hot-desert': { roofPitch: 8 },
      'cyclone-prone': { roofPitch: 18 },
      'flood-prone': { roofPitch: 24 },
      coastal: { roofPitch: 20 },
      'cold-forest': { roofPitch: 50 },
      'semi-arid': { roofPitch: 18 },
      'high-wind': { roofPitch: 16 },
      rainforest: { roofPitch: 34 },
      'beach-sandy': { roofPitch: 22 },
      'volcanic-extreme': { roofPitch: 28 },
      emergency: { roofPitch: 12 }
    };
    return profiles[modelId] || {};
  }

  _registerDesignPart(name, object) {
    object.userData.designPart = name;
    this.designParts[name] = object;
    return object;
  }

  _setupTransformControls() {
    if (!this.transformControls || !this.shelterGroup || !window.AppState.manualDesign) return;
    this.transformControls.detach();
    const selectedPart = window.AppState.manualPart || 'roof';
    const target = this.designParts[selectedPart] || this.designParts.roof;
    if (!target) return;
    this.transformControls.attach(target);
    this.transformControls.setMode(window.AppState.manualTransformMode || 'translate');
  }

  _addArchDoor(z, width, height, curvatureRadius = null) {
    const frameWidth = width + 0.18;
    const frameHeight = height + 0.12;
    const sideHeight = height - width / 2;
    const frameSideHeight = frameHeight - frameWidth / 2;
    const makeArchShape = (archWidth, archSideHeight) => {
      const shape = new THREE.Shape();
      shape.moveTo(-archWidth / 2, 0);
      shape.lineTo(archWidth / 2, 0);
      shape.lineTo(archWidth / 2, archSideHeight);
      shape.absarc(0, archSideHeight, archWidth / 2, 0, Math.PI, false);
      shape.closePath();
      return shape;
    };

    const frameShape = makeArchShape(frameWidth, frameSideHeight);
    const frameGeometry = new THREE.ExtrudeGeometry(frameShape, { depth: 0.12, bevelEnabled: false });
    const frameMesh = new THREE.Mesh(frameGeometry, this._mat(BRAND.DOOR_FRAME, 0.72));
    frameMesh.position.set(0, 0, z);
    frameMesh.castShadow = true;
    this.shelterGroup.add(frameMesh);

    const doorShape = makeArchShape(width, sideHeight);
    const doorGeometry = new THREE.ExtrudeGeometry(doorShape, { depth: 0.1, bevelEnabled: false });
    const doorMesh = new THREE.Mesh(doorGeometry, this._mat(BRAND.DOOR, 0.82));
    doorMesh.position.set(0, 0, z + 0.07);
    doorMesh.castShadow = true;
    this.shelterGroup.add(doorMesh);

    if (curvatureRadius) {
      [frameGeometry, doorGeometry].forEach(geometry => {
        const positions = geometry.attributes.position;
        for (let index = 0; index < positions.count; index += 1) {
          const x = positions.getX(index);
          const y = positions.getY(index);
          const surfaceOffset = Math.sqrt(Math.max(0, curvatureRadius ** 2 - x ** 2 - y ** 2)) - curvatureRadius;
          positions.setZ(index, positions.getZ(index) + surfaceOffset);
        }
        positions.needsUpdate = true;
        geometry.computeVertexNormals();
      });
    }

    const handle = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), this._mat(0xD4A820, 0.25, 0.85));
    handle.position.set(width * 0.34, height * 0.44, z + 0.16);
    this.shelterGroup.add(handle);
  }

  _mat(color, roughness = 0.78, metalness = 0.03, extra = {}) {
    return new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
  }
  _matDS(color, roughness = 0.78) {
    return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.02, side: THREE.DoubleSide });
  }

  _addWallBox(width, height, depth, position, material) {
    if (width <= 0 || height <= 0 || depth <= 0) return;
    const wall = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    wall.position.set(...position);
    wall.castShadow = true;
    wall.receiveShadow = true;
    this.shelterGroup.add(wall);
  }

  _addWallPanels(width, height, depth, openings, position, material, axis = 'x') {
    const sorted = openings
      .map(opening => ({ left: opening.x - opening.width / 2, right: opening.x + opening.width / 2, bottom: opening.bottom, top: opening.bottom + opening.height }))
      .sort((a, b) => a.left - b.left);
    const edges = [-(width / 2), ...sorted.flatMap(opening => [opening.left, opening.right]), width / 2]
      .filter((edge, index, values) => index === 0 || edge > values[index - 1]);

    for (let i = 0; i < edges.length - 1; i += 1) {
      const left = edges[i];
      const right = edges[i + 1];
      const segmentWidth = right - left;
      const midpoint = (left + right) / 2;
      const covered = sorted.filter(opening => midpoint > opening.left && midpoint < opening.right);
      const lowerTop = covered.length ? Math.min(...covered.map(opening => opening.bottom)) : 0;
      const upperBottom = covered.length ? Math.max(...covered.map(opening => opening.top)) : height;
      if (!covered.length) {
        const panelPosition = axis === 'x'
          ? [position[0] + midpoint, position[1] + height / 2, position[2]]
          : [position[0], position[1] + height / 2, position[2] + midpoint];
        const panelWidth = axis === 'x' ? segmentWidth : depth;
        const panelDepth = axis === 'x' ? depth : segmentWidth;
        this._addWallBox(panelWidth, height, panelDepth, panelPosition, material);
      } else {
        const lowerPosition = axis === 'x'
          ? [position[0] + midpoint, position[1] + lowerTop / 2, position[2]]
          : [position[0], position[1] + lowerTop / 2, position[2] + midpoint];
        const upperPosition = axis === 'x'
          ? [position[0] + midpoint, position[1] + (upperBottom + height) / 2, position[2]]
          : [position[0], position[1] + (upperBottom + height) / 2, position[2] + midpoint];
        const panelWidth = axis === 'x' ? segmentWidth : depth;
        const panelDepth = axis === 'x' ? depth : segmentWidth;
        this._addWallBox(panelWidth, lowerTop, panelDepth, lowerPosition, material);
        this._addWallBox(panelWidth, height - upperBottom, panelDepth, upperPosition, material);
      }
    }
  }

  _getFrontOpeningLayout(dims) {
    const { width: W, height: H } = dims;
    const doorWidth = Math.min(1.2, W * 0.17);
    const doorHeight = Math.min(2.2, H * 0.65);
    return [{ x: 0, width: doorWidth, bottom: 0, height: doorHeight, type: 'door' }];
  }

  _getSideOpeningLayout(dims) {
    if (!window.AppState.windowsEnabled) return [];
    const { length: L, height: H } = dims;
    const profile = this._climateProfile || this._getClimateProfile('cold');
    const windowWidth = 0.88 * profile.windowScale;
    const windowHeight = 0.78 * profile.windowScale;
    const windowY = H * profile.windowHeight;
    return [L * 0.27, -L * 0.27]
      .map(z => ({ x: z, width: windowWidth, bottom: windowY - windowHeight / 2, height: windowHeight }));
  }

  // ── Brown door with frame + handle, navy-blue windows on front ──
  _addFrontDoorWindows(dims) {
    const { width: W, length: L, height: H } = dims;
    const zF = L / 2;
    const layout = this._getFrontOpeningLayout(dims);
    const doorOpening = layout.find(opening => opening.type === 'door');
    const dW = doorOpening.width;
    const dH = doorOpening.height;

    // Door frame (brown)
    const fM = this._mat(BRAND.DOOR_FRAME, 0.72);
    [[dW + 0.14, 0.08, 0.12, 0, dH + 0.05],
    [0.07, dH + 0.1, 0.12, -(dW * 0.5 + 0.04), dH * 0.5],
    [0.07, dH + 0.1, 0.12, (dW * 0.5 + 0.04), dH * 0.5]
    ].forEach(([w, h, d, x, y]) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), fM);
      m.position.set(x, y, zF + 0.07);
      this.shelterGroup.add(m);
    });

    // Door panel (dark brown)
    const door = new THREE.Mesh(new THREE.BoxGeometry(dW, dH, 0.08), this._mat(BRAND.DOOR, 0.82));
    door.position.set(0, dH / 2, zF + 0.05);
    door.castShadow = true;
    this.shelterGroup.add(door);

    // Gold handle
    const handle = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), this._mat(0xD4A820, 0.25, 0.85));
    handle.position.set(dW * 0.34, dH * 0.44, zF + 0.10);
    this.shelterGroup.add(handle);

  }

  _placeWindow(x, y, zFace, xFace, face, wW = 0.88, wH = 0.78) {
    const profile = this._climateProfile || this._getClimateProfile('cold');
    const fM = this._mat(BRAND.WIN_FRAME, 0.7);
    const gM = new THREE.MeshPhysicalMaterial({
      color: 0x8CC9E8,
      roughness: 0.05,
      metalness: 0,
      transmission: 0.12,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    });
    const bM = this._mat(BRAND.WIN_FRAME, 0.75);
    if (face === 'front') {
      const frame = new THREE.Mesh(new THREE.BoxGeometry(wW + 0.12, wH + 0.12, 0.1), fM);
      frame.position.set(x, y, zFace + 0.04);
      this.shelterGroup.add(frame);
      const glass = new THREE.Mesh(new THREE.BoxGeometry(wW, wH, 0.06), gM);
      glass.position.set(x, y, zFace + 0.06);
      this.shelterGroup.add(glass);
      // Optional mullions sit on top of the glass pane.
      [new THREE.Mesh(new THREE.BoxGeometry(wW, 0.035, 0.07), bM),
      new THREE.Mesh(new THREE.BoxGeometry(0.035, wH, 0.07), bM)].forEach(b => {
        b.position.set(x, y, zFace + 0.08);
        this.shelterGroup.add(b);
      });
      if (profile.shade) {
        const canopy = new THREE.Mesh(new THREE.BoxGeometry(wW + 0.28, 0.1, 0.28), this._mat(BRAND.ROOF, 0.65, 0.08));
        canopy.position.set(x, y + wH / 2 + 0.1, zFace + 0.13);
        canopy.rotation.x = -0.15;
        this.shelterGroup.add(canopy);
      }
    } else {
      const norm = xFace > 0 ? 1 : -1;
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.1, wH + 0.12, wW + 0.12), fM);
      frame.position.set(xFace + norm * 0.04, y, zFace);
      this.shelterGroup.add(frame);
      const glass = new THREE.Mesh(new THREE.BoxGeometry(0.06, wH, wW), gM);
      glass.position.set(xFace + norm * 0.06, y, zFace);
      this.shelterGroup.add(glass);
      [new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.035, wW), bM),
      new THREE.Mesh(new THREE.BoxGeometry(0.07, wH, 0.035), bM)].forEach(b => {
        b.position.set(xFace + norm * 0.08, y, zFace);
        this.shelterGroup.add(b);
      });
      if (profile.shade) {
        const canopy = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.1, wW + 0.28), this._mat(BRAND.ROOF, 0.65, 0.08));
        canopy.position.set(xFace + norm * 0.13, y + wH / 2 + 0.1, zFace);
        canopy.rotation.z = norm * 0.15;
        this.shelterGroup.add(canopy);
      }
    }
  }

  _placeAFrameSideWindow(side, x, y, z, angle, wW = 0.9, wH = 0.78) {
    return;
    /* istanbul ignore next */
    const frameMaterial = this._mat(BRAND.WIN_FRAME, 0.7);
    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x8CC9E8,
      roughness: 0.05,
      metalness: 0,
      transmission: 0.12,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    });
    const frame = new THREE.Mesh(new THREE.BoxGeometry(wW + 0.12, wH + 0.12, 0.1), frameMaterial);
    frame.position.set(x, y, z);
    frame.rotation.z = -side * angle;
    this.shelterGroup.add(frame);

    const glass = new THREE.Mesh(new THREE.BoxGeometry(wW, wH, 0.06), glassMaterial);
    glass.position.set(x - side * 0.03, y, z);
    glass.rotation.z = -side * angle;
    this.shelterGroup.add(glass);
  }

  _addSideWindows(dims) {
    if (!window.AppState.windowsEnabled) return;
    const { width: W, length: L, height: H } = dims;
    const openings = this._getSideOpeningLayout(dims);
    if (!openings.length) return;
    [W / 2, -W / 2].forEach(xFace => {
      openings.forEach(opening => {
        this._placeWindow(0, opening.bottom + opening.height / 2, opening.x, xFace, 'side', opening.width, opening.height);
      });
    });
  }

  _addInteriorFloor(dims, floorColor) {
    const { width: W, length: L } = dims;
    const iF = new THREE.Mesh(
      new THREE.PlaneGeometry(W - 0.44, L - 0.44),
      this._mat(floorColor.getHex ? floorColor.getHex() : 0xB0A898, 0.92)
    );
    iF.rotation.x = -Math.PI / 2;
    iF.position.y = 0.23;
    iF.receiveShadow = true;
    this.shelterGroup.add(iF);
  }

  _addFurniture(dims) {
    const { width: W, length: L } = dims;
    const wood = this._mat(0x8B5E3C, 0.85);
    // Bed frame
    const bedF = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.15, 2.0), wood);
    bedF.position.set(-W * 0.28, 0.35, -L * 0.24);
    this.shelterGroup.add(bedF);
    const matt = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.18, 1.85), this._mat(0xEEDDCC, 0.95));
    matt.position.set(-W * 0.28, 0.52, -L * 0.24);
    this.shelterGroup.add(matt);
    // Table top
    const tab = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.06, 0.6), wood);
    tab.position.set(W * 0.24, 0.72, 0);
    this.shelterGroup.add(tab);
    [[0.32, 0.28], [0.32, -0.28], [-0.32, 0.28], [-0.32, -0.28]].forEach(([dx, dz]) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.7, 0.05), wood);
      leg.position.set(W * 0.24 + dx, 0.35, dz);
      this.shelterGroup.add(leg);
    });
  }

  _buildGable(dims, floorColor) {
    const { width: W, length: L, height: H } = dims;
    const profile = this._climateProfile || this._getClimateProfile('temperate');
    const pitch = (dims.roofPitch || 30) * Math.PI / 180;
    const roofH = (W / 2) * Math.tan(pitch);
    const wallThk = 0.22;

    // Ground slab
    const slab = new THREE.Mesh(new THREE.BoxGeometry(W + 0.6, 0.28, L + 0.6), this._mat(BRAND.GROUND, 0.96));
    slab.position.y = -0.05; slab.receiveShadow = true;
    this.shelterGroup.add(slab);

    // Exterior walls are panelized around the real door/window openings.
    const wM = this._mat(BRAND.WALL_EXT, 0.86, 0.02);
    const frontOpenings = this._getFrontOpeningLayout(dims);
    this._addWallPanels(W, H, wallThk, frontOpenings, [0, 0, L / 2], wM);
    this._addWallPanels(W, H, wallThk, [], [0, 0, -L / 2], wM);
    const sideOpenings = this._getSideOpeningLayout(dims);
    this._addWallPanels(L + wallThk, H, wallThk, sideOpenings, [W / 2, 0, 0], wM, 'z');
    this._addWallPanels(L + wallThk, H, wallThk, sideOpenings, [-W / 2, 0, 0], wM, 'z');

    // Gable triangles
    const gM = this._matDS(BRAND.WALL_EXT, 0.86);
    [L / 2, -L / 2].forEach(z => {
      const sh = new THREE.Shape();
      sh.moveTo(-W / 2, 0); sh.lineTo(W / 2, 0); sh.lineTo(0, roofH); sh.closePath();
      const mesh = new THREE.Mesh(new THREE.ShapeGeometry(sh), gM);
      mesh.position.set(0, H, z);
      mesh.rotation.x = z > 0 ? -Math.PI / 2 : Math.PI / 2;
      this.shelterGroup.add(mesh);
    });

    // Roof panels — brown
    const rM = this._mat(BRAND.ROOF, 0.65, 0.08);
    const roofBaseY = H;
    const roofThickness = 0.18;
    const slant = Math.sqrt((W / 2) ** 2 + roofH ** 2);
    const ang = Math.atan2(roofH, W / 2);
    [-1, 1].forEach(s => {
      // Extend each panel slightly past the ridge so the two planes overlap.
      const p = new THREE.Mesh(new THREE.BoxGeometry(slant + profile.overhang + 0.35, roofThickness, L + profile.overhang), rM);
      p.position.set(s * W / 4, roofBaseY + roofH / 2 + (roofThickness * Math.cos(ang)) / 2, 0);
      p.rotation.z = -s * ang;
      p.castShadow = true;
      p.receiveShadow = true;
      this.shelterGroup.add(p);
    });

    // Ridge cap
    const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.28, L + profile.overhang), this._mat(BRAND.RIDGE, 0.7, 0.05));
    ridge.position.set(0, roofBaseY + roofH + 0.08, 0);
    this.shelterGroup.add(ridge);

    // Vertical fascia closes the roof-to-wall seam at both eaves.
    [-1, 1].forEach(side => {
      const fascia = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.3, L + profile.overhang), rM);
      fascia.position.set(side * (W / 2 + 0.02), roofBaseY - 0.05, 0);
      fascia.castShadow = true;
      this.shelterGroup.add(fascia);
    });

    // A raised ridge vent makes the climate logic visible in the model:
    // humid sites receive ventilation, while cold/windy sites stay sealed.
    if (profile.shade && profile.windowScale > 0.9) {
      const vent = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, Math.min(2.4, L * 0.3)), this._mat(BRAND.RIDGE, 0.7, 0.05));
      vent.position.set(0, H + roofH + 0.2, -L * 0.08);
      this.shelterGroup.add(vent);
    }

    // Interior
    this._addInteriorFloor(dims, floorColor);
    this._addFurniture(dims);
    this._addFrontDoorWindows(dims);
    this._addSideWindows(dims);
  }

  _buildFlat(dims, floorColor) {
    const { width: W, length: L, height: H } = dims;
    const wallThk = 0.22;
    const wM = this._mat(BRAND.WALL_EXT, 0.86, 0.02);
    const rM = this._mat(BRAND.ROOF, 0.55, 0.1);

    const slab = new THREE.Mesh(new THREE.BoxGeometry(W + 0.5, 0.28, L + 0.5), this._mat(BRAND.GROUND, 0.96));
    slab.position.y = -0.05; slab.receiveShadow = true;
    this.shelterGroup.add(slab);

    const frontOpenings = this._getFrontOpeningLayout(dims);
    this._addWallPanels(W, H, wallThk, frontOpenings, [0, 0, L / 2], wM);
    this._addWallPanels(W, H, wallThk, [], [0, 0, -L / 2], wM);
    const sideOpenings = this._getSideOpeningLayout(dims);
    this._addWallPanels(L + wallThk, H, wallThk, sideOpenings, [W / 2, 0, 0], wM, 'z');
    this._addWallPanels(L + wallThk, H, wallThk, sideOpenings, [-W / 2, 0, 0], wM, 'z');

    const roof = new THREE.Mesh(new THREE.BoxGeometry(W + 0.5, 0.28, L + 0.5), rM);
    const roofBaseY = H;
    roof.position.y = roofBaseY + 0.14;
    roof.castShadow = true;
    roof.receiveShadow = true;
    this.shelterGroup.add(roof);

    // Parapet
    [[W + 0.5, 0.4, 0.12, [0, H + 0.48, L / 2 + 0.26]], [W + 0.5, 0.4, 0.12, [0, H + 0.48, -L / 2 - 0.26]],
    [0.12, 0.4, L + 0.5, [W / 2 + 0.26, H + 0.48, 0]], [0.12, 0.4, L + 0.5, [-W / 2 - 0.26, H + 0.48, 0]]
    ].forEach(([w, h, d, p]) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), rM);
      m.position.set(...p); this.shelterGroup.add(m);
    });

    this._addInteriorFloor(dims, floorColor);
    this._addFurniture(dims);
    this._addFrontDoorWindows(dims);
    this._addSideWindows(dims);
  }

  _buildDome(dims, floorColor) {
    const { width: W, length: L } = dims;
    const R = Math.min(W, L) / 2;

    const iF = new THREE.Mesh(new THREE.CircleGeometry(R * 0.95, 48), this._mat(floorColor.getHex ? floorColor.getHex() : 0xB0A898, 0.92));
    iF.rotation.x = -Math.PI / 2; iF.position.y = 0.22; iF.receiveShadow = true;
    this.shelterGroup.add(iF);

    // Outer dome shell — brown
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(R, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2),
      this._mat(BRAND.ROOF, 0.65, 0.08)
    );
    dome.castShadow = true;
    this.shelterGroup.add(dome);

    // Inner dome shell (interior visible)
    const iDome = new THREE.Mesh(
      new THREE.SphereGeometry(R - 0.22, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2),
      this._matDS(BRAND.WALL_INT, 0.9)
    );
    this.shelterGroup.add(iDome);

    // Base ring — half-white
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(R, R, 0.6, 48, 1, true),
      this._mat(BRAND.ROOF, 0.65, 0.08)
    );
    base.position.y = 0.3;
    this.shelterGroup.add(base);

    // The curved entrance follows the dome's rounded profile.
    this._addArchDoor(R + 0.02, 1.0, 1.9, R);

  }

  _buildAFrame(dims, floorColor) {
    const { width: W, length: L } = dims;
    const H = W * 0.85;
    const angle = Math.atan2(H, W / 2);
    const slant = Math.sqrt((W / 2) ** 2 + H ** 2);

    const slab = new THREE.Mesh(new THREE.BoxGeometry(W + 0.4, 0.25, L + 0.4), this._mat(BRAND.GROUND, 0.96));
    slab.position.y = -0.05; this.shelterGroup.add(slab);
    this._addInteriorFloor(dims, floorColor);

    const rM = this._mat(BRAND.ROOF, 0.62, 0.08);
    [-1, 1].forEach(s => {
      const p = new THREE.Mesh(new THREE.BoxGeometry(slant, 0.2, L + 0.3), rM);
      p.position.set(s * W / 4, H / 2, 0); p.rotation.z = -s * angle; p.castShadow = true;
      this.shelterGroup.add(p);
    });

    const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, L + 0.35), this._mat(BRAND.RIDGE, 0.7, 0.05));
    ridge.position.set(0, H + 0.05, 0);
    this.shelterGroup.add(ridge);

    const wM = this._matDS(BRAND.WALL_EXT, 0.86);
    const endWallShape = new THREE.Shape();
    endWallShape.moveTo(-W / 2, 0);
    endWallShape.lineTo(W / 2, 0);
    endWallShape.lineTo(0, H);
    endWallShape.closePath();
    const doorWidth = Math.min(1.2, W * 0.17);
    const doorHeight = Math.min(1.85, H * 0.45);
    const addRectangularHole = (shape, x, bottom, width, height) => {
      const hole = new THREE.Path();
      hole.moveTo(x - width / 2, bottom);
      hole.lineTo(x + width / 2, bottom);
      hole.lineTo(x + width / 2, bottom + height);
      hole.lineTo(x - width / 2, bottom + height);
      hole.closePath();
      shape.holes.push(hole);
    };
    addRectangularHole(endWallShape, 0, 0, doorWidth, doorHeight);
    [L / 2, -L / 2].forEach(z => {
      const mesh = new THREE.Mesh(new THREE.ShapeGeometry(endWallShape), wM);
      mesh.position.set(0, 0, z);
      this.shelterGroup.add(mesh);
    });

    const dFrame = new THREE.Mesh(new THREE.BoxGeometry(doorWidth + 0.14, doorHeight + 0.1, 0.1), this._mat(BRAND.DOOR_FRAME, 0.72));
    dFrame.position.set(0, doorHeight / 2, L / 2 + 0.04);
    this.shelterGroup.add(dFrame);

    const door = new THREE.Mesh(new THREE.BoxGeometry(doorWidth, doorHeight, 0.08), this._mat(BRAND.DOOR, 0.82));
    door.position.set(0, doorHeight / 2, L / 2 + 0.05);
    door.castShadow = true;
    this.shelterGroup.add(door);

    const handle = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), this._mat(0xD4A820, 0.25, 0.85));
    handle.position.set(doorWidth * 0.34, doorHeight * 0.44, L / 2 + 0.1);
    this.shelterGroup.add(handle);

    this._addSideWindows = () => {};
  }

  _buildLeanTo(dims, floorColor) {
    const { width: W, length: L, height: H } = dims;
    const Htall = H + 1.8;
    const wM = this._mat(BRAND.WALL_EXT, 0.86, 0.02);
    const rM = this._mat(BRAND.ROOF, 0.62, 0.08);

    const slab = new THREE.Mesh(new THREE.BoxGeometry(W + 0.4, 0.25, L + 0.4), this._mat(BRAND.GROUND, 0.96));
    slab.position.y = -0.05; this.shelterGroup.add(slab);
    this._addInteriorFloor(dims, floorColor);

    const back = new THREE.Mesh(new THREE.BoxGeometry(W, Htall, 0.22), wM);
    back.position.set(0, Htall / 2, -L / 2); back.castShadow = true;
    this.shelterGroup.add(back);

    const front = new THREE.Mesh(new THREE.BoxGeometry(W, H, 0.22), wM);
    front.position.set(0, H / 2, L / 2); front.castShadow = true;
    this.shelterGroup.add(front);

    const rLen = Math.sqrt(L * L + (Htall - H) * (Htall - H));
    const rAng = Math.atan2(Htall - H, L);
    const roofThickness = 0.2;

    // Side walls follow the sloped roof line instead of extending above it.
    [W / 2, -W / 2].forEach(x => {
      const sideShape = new THREE.Shape();
      sideShape.moveTo(-L / 2, 0);
      sideShape.lineTo(L / 2, 0);
      sideShape.lineTo(L / 2, H);
      sideShape.lineTo(-L / 2, Htall);
      sideShape.closePath();
      const sideGeometry = new THREE.ExtrudeGeometry(sideShape, {
        depth: 0.22,
        bevelEnabled: false
      });
      const sideWall = new THREE.Mesh(sideGeometry, wM);
      sideWall.rotation.y = -Math.PI / 2;
      sideWall.position.set(Math.sign(x) * (W / 2 - 0.11), 0, 0);
      sideWall.castShadow = true;
      sideWall.receiveShadow = true;
      this.shelterGroup.add(sideWall);
    });

    // The lower roof face ends exactly at the front/back wall tops.
    const roof = new THREE.Mesh(new THREE.BoxGeometry(W + 0.4, roofThickness, rLen + 0.5), rM);
    roof.position.set(0, (H + Htall) / 2 + (roofThickness * Math.cos(rAng)) / 2, 0);
    roof.rotation.x = rAng;
    roof.castShadow = true;
    roof.receiveShadow = true;
    this.shelterGroup.add(roof);

    this._addFrontDoorWindows(dims);
    this._addSideWindows(dims);
  }

  _buildBarrel(dims, floorColor) {
    const { width: W, length: L, height: H } = dims;
    const R = Math.max(W, 2.8) / 2;
    const isSemiArid = window.AppState.shelterType?.id === 'semi-arid';

    const slab = new THREE.Mesh(new THREE.BoxGeometry(W + 0.4, 0.25, L + 0.4), this._mat(BRAND.GROUND, 0.96));
    slab.position.y = -0.05; this.shelterGroup.add(slab);
    this._addInteriorFloor(dims, floorColor);

    // Coastal reference form: one raised, open-sided curved canopy.
    const canopyBaseY = isSemiArid ? H : 0.35;
    const roofShape = window.AppState.manualRoofShape || 'curved';
    let vault;
    if (isSemiArid && roofShape === 'flat') {
      vault = new THREE.Mesh(new THREE.BoxGeometry(W + 0.4, 0.22, L + 0.5), this._mat(BRAND.ROOF, 0.65, 0.08));
      vault.position.set(0, H + 0.11, 0);
    } else if (isSemiArid && roofShape === 'gabled') {
      const roofGroup = new THREE.Group();
      const rise = Math.max(0.8, ((Number(dims.roofPitch) || 18) / 18) * (W * 0.5));
      const halfSpan = W / 2;
      const panelLength = Math.sqrt(halfSpan ** 2 + rise ** 2);
      const panelAngle = Math.atan2(rise, halfSpan);
      [-1, 1].forEach(side => {
        const panel = new THREE.Mesh(new THREE.BoxGeometry(panelLength + 0.35, 0.22, L + 0.5), this._mat(BRAND.ROOF, 0.65, 0.08));
        panel.position.set(side * W / 4, H + rise / 2, 0);
        panel.rotation.z = -side * panelAngle;
        panel.castShadow = true;
        panel.receiveShadow = true;
        roofGroup.add(panel);
      });
      vault = roofGroup;
    } else if (isSemiArid && roofShape === 'sloped') {
      const rise = Math.max(0.6, ((Number(dims.roofPitch) || 18) / 18) * (W * 0.35));
      const slopeLength = Math.sqrt(W ** 2 + rise ** 2);
      vault = new THREE.Mesh(new THREE.BoxGeometry(slopeLength + 0.35, 0.22, L + 0.5), this._mat(BRAND.ROOF, 0.65, 0.08));
      vault.position.set(0, H + rise / 2, 0);
      vault.rotation.z = -Math.atan2(rise, W);
    } else {
      // Open-ended half-cylinder: its curved surface spans length and rises
      // from x = +/-R at wallHeight, with no flat cap bisecting the shelter.
      vault = new THREE.Mesh(
        new THREE.CylinderGeometry(R, R, L + 0.5, 64, 1, true, 0, Math.PI),
        this._mat(BRAND.ROOF, 0.65, 0.08, { side: THREE.FrontSide })
      );
      vault.rotation.x = -Math.PI / 2;
      vault.position.set(0, canopyBaseY, 0);
      if (isSemiArid) {
        const roofRise = Math.max(0.6, ((Number(dims.roofPitch) || 18) / 18) * (W * 0.5));
        vault.scale.z = roofRise / R;
      }
    }
    vault.castShadow = true;
    vault.receiveShadow = true;
    this._registerDesignPart('roof', vault);
    this.shelterGroup.add(vault);

    if (isSemiArid) {
      const wallMaterial = this._mat(BRAND.WALL_EXT, 0.86, 0.02);
      const wallsGroup = this._registerDesignPart('walls', new THREE.Group());
      [-R, R].forEach(x => {
        const wall = new THREE.Mesh(new THREE.BoxGeometry(0.22, H, L), wallMaterial);
        wall.position.set(x, H / 2, 0);
        wall.castShadow = true;
        wall.receiveShadow = true;
        wallsGroup.add(wall);
      });
      this.shelterGroup.add(wallsGroup);
    }

    const doorWidth = Math.min(1.1, W * 0.24);
    const doorHeight = Math.min(1.85, R * 1.15);
    const doorBaseY = isSemiArid ? 0 : canopyBaseY;
    const endShape = new THREE.Shape();
    endShape.moveTo(-R, isSemiArid ? 0 : canopyBaseY);
    endShape.lineTo(R, isSemiArid ? 0 : canopyBaseY);
    if (isSemiArid) endShape.lineTo(R, H);
    endShape.absarc(0, canopyBaseY, R, 0, Math.PI, false);
    if (isSemiArid) endShape.lineTo(-R, H);
    const doorHole = new THREE.Path();
    doorHole.moveTo(-doorWidth / 2, doorBaseY);
    doorHole.lineTo(doorWidth / 2, doorBaseY);
    doorHole.lineTo(doorWidth / 2, doorBaseY + doorHeight - doorWidth / 2);
    doorHole.absarc(0, doorBaseY + doorHeight - doorWidth / 2, doorWidth / 2, 0, Math.PI, false);
    doorHole.closePath();
    endShape.holes.push(doorHole);

    const doorShape = new THREE.Shape();
    doorShape.moveTo(-doorWidth / 2, doorBaseY);
    doorShape.lineTo(doorWidth / 2, doorBaseY);
    doorShape.lineTo(doorWidth / 2, doorBaseY + doorHeight - doorWidth / 2);
    doorShape.absarc(0, doorBaseY + doorHeight - doorWidth / 2, doorWidth / 2, 0, Math.PI, false);
    doorShape.closePath();

    const endMaterial = this._matDS(BRAND.WALL_EXT, 0.86);
    [-L / 2 - 0.02, L / 2 + 0.02].forEach(z => {
      const endWall = new THREE.Mesh(new THREE.ShapeGeometry(endShape), endMaterial);
      endWall.position.z = z;
      endWall.castShadow = true;
      endWall.receiveShadow = true;
      this.shelterGroup.add(endWall);
    });

    const doorFrame = new THREE.Mesh(
      new THREE.TorusGeometry(doorWidth / 2 + 0.08, 0.07, 8, 24, Math.PI),
      this._mat(BRAND.DOOR_FRAME, 0.72)
    );
    doorFrame.position.set(0, doorBaseY + doorHeight - doorWidth / 2, L / 2 + 0.08);
    doorFrame.rotation.z = Math.PI;
    this.shelterGroup.add(doorFrame);

    const door = new THREE.Mesh(
      new THREE.ShapeGeometry(doorShape),
      this._mat(BRAND.DOOR, 0.82)
    );
    door.position.z = L / 2 + 0.09;
    door.castShadow = true;
    this.shelterGroup.add(door);
    this._registerDesignPart('door', door);

    const handle = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), this._mat(0xD4A820, 0.25, 0.85));
    handle.position.set(doorWidth * 0.34, doorBaseY + doorHeight * 0.44, L / 2 + 0.14);
    this.shelterGroup.add(handle);

    if (isSemiArid) this._addSideWindows(dims);

  }

  _centerGroup() {
    const box = new THREE.Box3().setFromObject(this.shelterGroup);
    const c = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    this.shelterGroup.position.sub(c);
    this.shelterGroup.position.y += size.y / 2 + 0.12;
  }

  updateMaterials() { this.buildShelter(); }

  _bindViewerButtons() {
    document.getElementById('btn-auto-rotate')?.addEventListener('click', () => {
      this.controls.autoRotate = !this.controls.autoRotate;
      const b = document.getElementById('btn-auto-rotate');
      if (b) b.textContent = this.controls.autoRotate ? '⏸' : '🔄';
    });
    document.getElementById('btn-reset-cam')?.addEventListener('click', () => this.resetCamera());

    // Dynamically add Inside-view button
    const cont = document.getElementById(this.containerId);
    if (cont && !document.getElementById('btn-inside-view')) {
      const ov = cont.querySelector('.viewer-overlay-controls');
      if (ov) {
        const btn = document.createElement('button');
        btn.className = 'viewer-btn viewer-text-control';
        btn.id = 'btn-inside-view';
        btn.title = 'View Inside Shelter';
        btn.textContent = '🏠 Inside';
        btn.addEventListener('click', () => this.toggleInsideView());
        ov.appendChild(btn);
      }
    }
  }

  _bindDesignControls() {
    const cont = document.getElementById(this.containerId);
    const overlay = cont?.querySelector('.viewer-overlay-controls');
    if (!cont || !overlay) return;

    const roofButton = document.createElement('button');
    roofButton.className = 'viewer-btn viewer-text-control';
    roofButton.id = 'btn-edit-roof';
    roofButton.title = 'Rotate the roof freely in 360 degrees';
    roofButton.textContent = '🔄 360° Roof';
    roofButton.addEventListener('click', () => {
      this.roofEditMode = !this.roofEditMode;
      window.AppState.manualDesign = true;
      window.AppState.manualPart = 'roof';
      window.AppState.manualTransformMode = this.roofEditMode ? 'rotate' : 'translate';
      roofButton.classList.toggle('active', this.roofEditMode);
      roofButton.textContent = this.roofEditMode ? '✅ 360° Roof' : '🔄 360° Roof';
      const transformMode = document.getElementById('manual-transform-mode');
      if (transformMode) transformMode.value = window.AppState.manualTransformMode;
      if (this.transformControls) {
        if (this.roofEditMode) {
          this.transformControls.detach();
          this.transformControls.setMode('rotate');
          this._setupTransformControls();
          this.transformControls.setMode('rotate');
        }
        else this.transformControls.detach();
      }
      if (this.roofEditMode) {
        window.AppState.manualTransformMode = 'rotate';
        if (transformMode) transformMode.value = 'rotate';
      }
      if (typeof showToast === 'function') showToast(this.roofEditMode ? 'Use the red, green, and blue gizmo rings to rotate the roof in 360°' : 'Roof editing disabled', 'info');
    });
    overlay.appendChild(roofButton);

    const manualButton = document.createElement('button');
    manualButton.className = 'viewer-btn viewer-text-control';
    manualButton.id = 'btn-manual-design';
    manualButton.title = 'Enable transform handles for manual design';
    manualButton.textContent = '🛠 Manual Design';
    manualButton.addEventListener('click', () => {
      window.AppState.manualDesign = !window.AppState.manualDesign;
      manualButton.classList.toggle('active', window.AppState.manualDesign);
      if (this.transformControls) {
        if (window.AppState.manualDesign) this._setupTransformControls();
        else this.transformControls.detach();
      }
      if (typeof showToast === 'function') showToast(window.AppState.manualDesign ? 'Manual handles enabled' : 'Manual handles disabled', 'info');
    });
    overlay.appendChild(manualButton);

    const partSelect = document.createElement('select');
    partSelect.id = 'manual-part-select';
    partSelect.className = 'viewer-manual-select';
    partSelect.innerHTML = '<option value="roof">Roof</option><option value="walls">Walls</option><option value="door">Door</option><option value="windows">Windows</option>';
    partSelect.addEventListener('change', () => {
      window.AppState.manualPart = partSelect.value;
      this._setupTransformControls();
    });
    overlay.appendChild(partSelect);

    const modeSelect = document.createElement('select');
    modeSelect.id = 'manual-transform-mode';
    modeSelect.className = 'viewer-manual-select';
    modeSelect.innerHTML = '<option value="translate">Move</option><option value="scale">Resize</option><option value="rotate">Rotate</option>';
    modeSelect.addEventListener('change', () => {
      window.AppState.manualTransformMode = modeSelect.value;
      if (modeSelect.value !== 'rotate') this.roofEditMode = false;
      if (this.transformControls) this.transformControls.setMode(modeSelect.value);
    });
    overlay.appendChild(modeSelect);

    const shapeSelect = document.createElement('select');
    shapeSelect.id = 'manual-roof-shape';
    shapeSelect.className = 'viewer-manual-select';
    shapeSelect.innerHTML = '<option value="curved">Curved Roof</option><option value="flat">Flat Roof</option><option value="gabled">Gabled Roof</option><option value="sloped">Sloped Roof</option>';
    shapeSelect.value = window.AppState.manualRoofShape || 'curved';
    shapeSelect.addEventListener('change', () => {
      window.AppState.manualRoofShape = shapeSelect.value;
      this.buildShelter();
      this._updateClimateFit();
    });
    overlay.appendChild(shapeSelect);

    const resetButton = document.createElement('button');
    resetButton.className = 'viewer-btn viewer-text-control';
    resetButton.id = 'btn-reset-recommended';
    resetButton.title = 'Reset climate recommended shelter';
    resetButton.textContent = '↺ Reset';
    resetButton.addEventListener('click', () => {
      const recommended = window.locationCtrl?.getSuitableModelForLocation(window.AppState.climate, window.AppState.location?.name || '');
      if (recommended?.model) window.AppState.shelterType = recommended.model;
      window.AppState.manualRoofShape = 'curved';
      window.AppState.manualDesign = false;
      window.AppState.dimensions.roofPitch = this._climateProfile?.minRoofPitch || 30;
      if (window.dimsCtrl) window.dimsCtrl.dimensions.roofPitch = window.AppState.dimensions.roofPitch;
      this.transformControls?.detach();
      this.buildShelter();
    });
    overlay.appendChild(resetButton);

    const climateFit = document.createElement('div');
    climateFit.id = 'manual-climate-fit';
    climateFit.className = 'manual-climate-fit';
    overlay.parentElement?.appendChild(climateFit);
    this._updateClimateFit();

    const windowButton = document.createElement('button');
    windowButton.className = 'viewer-btn viewer-text-control';
    windowButton.id = 'btn-toggle-windows';
    windowButton.title = 'Toggle manually designed side windows';
    windowButton.textContent = '🪟 Windows: Off';
    windowButton.addEventListener('click', () => {
      window.AppState.windowsEnabled = !window.AppState.windowsEnabled;
      windowButton.textContent = window.AppState.windowsEnabled ? '🪟 Windows: On' : '🪟 Windows: Off';
      this.buildShelter();
      this._updateClimateFit();
    });
    overlay.appendChild(windowButton);

    const canvas = this.renderer.domElement;
    canvas.addEventListener('pointerdown', event => {
      // TransformControls owns pointer gestures in 360-degree roof mode.
      if (!this.roofEditMode || this.transformControls) return;
      this._roofDrag = { y: event.clientY, pitch: Number(window.AppState.dimensions?.roofPitch) || 30 };
      this.controls.enabled = false;
      canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener('pointermove', event => {
      if (!this._roofDrag) return;
      const nextPitch = Math.max(0, Math.min(80, this._roofDrag.pitch + (this._roofDrag.y - event.clientY) * 0.35));
      window.AppState.dimensions.roofPitch = nextPitch;
      if (window.dimsCtrl) window.dimsCtrl.dimensions.roofPitch = nextPitch;
      const slider = document.getElementById('slider-roofPitch');
      const value = document.getElementById('val-roofPitch');
      if (slider) slider.value = nextPitch;
      if (value) value.textContent = `${nextPitch.toFixed(0)}°`;
      this.buildShelter();
      this._updateClimateFit();
    });
    const finishDrag = event => {
      if (!this._roofDrag) return;
      this._roofDrag = null;
      this.controls.enabled = true;
      canvas.releasePointerCapture?.(event.pointerId);
    };
    canvas.addEventListener('pointerup', finishDrag);
    canvas.addEventListener('pointercancel', finishDrag);
  }

  _updateClimateFit() {
    const panel = document.getElementById('manual-climate-fit');
    if (!panel) return;
    const climate = (window.AppState.climate || 'temperate').toLowerCase();
    const pitch = Number(window.AppState.dimensions?.roofPitch) || 0;
    const shape = window.AppState.manualRoofShape || 'curved';
    let message = 'Climate Fit: Good';
    if ((climate === 'arid' || climate === 'hot-dry-desert') && (shape === 'flat' || pitch < 12)) message = 'Climate Fit: Warning - flat roofs can retain heat in arid climates; consider a curved or peaked roof.';
    if ((climate === 'tropical' || climate === 'hot-humid-coastal' || climate === 'heavy-rain') && pitch < 25) message = 'Climate Fit: Warning - increase roof pitch for tropical rain drainage.';
    if ((climate === 'cold' || climate === 'polar') && pitch < 35) message = 'Climate Fit: Warning - a steeper roof helps shed snow.';
    panel.textContent = message;
  }

  toggleInsideView() {
    this.insideMode = !this.insideMode;
    const btn = document.getElementById('btn-inside-view');
    if (this.insideMode) {
      const d = this._dims || { width: 8, length: 10, height: 3.5 };
      this.camera.position.set(0, d.height * 0.42, d.length * 0.1);
      this.controls.target.set(0, d.height * 0.42, -d.length * 0.2);
      this.controls.minDistance = 0.1;
      if (btn) { btn.textContent = '🚪 Outside'; btn.style.background = 'rgba(200,113,61,0.55)'; }
      if (typeof showToast === 'function') showToast('🏠 Inside view — drag to look around freely', 'info');
    } else {
      this.resetCamera();
      if (btn) { btn.textContent = '🏠 Inside'; btn.style.background = ''; }
    }
    this.controls.update();
  }

  _updateInfoPanel(dims, state) {
    const s = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    s('info-model', state.shelterType?.name || '—');
    s('info-climate', state.climate ? `${state.climate.toUpperCase()} Zone` : '—');
    s('info-width', `${dims.width} m`);
    s('info-length', `${dims.length} m`);
    s('info-height', `${dims.height} m`);
    s('info-area', `${(dims.width * dims.length).toFixed(1)} m²`);
    s('info-wall', state.materials?.wall?.name || '—');
    s('info-roof', state.materials?.roof?.name || '—');
    s('info-floor', state.materials?.floor?.name || '—');

    // Location suitability indication in sidebar
    const currentClimate = state.climate || 'cold';
    const currentLocName = state.location?.name?.split(',')[0] || 'Site';
    const suitable = state.suitableModel || (window.locationCtrl?.getSuitableModelForLocation(currentClimate, currentLocName));
    const suitEl = document.getElementById('info-model-suitability');
    if (suitEl) {
      const isMatch = state.shelterType?.id === suitable?.model?.id;
      if (isMatch) {
        suitEl.textContent = `⭐ Optimal for ${currentLocName}`;
        suitEl.style.color = '#4CAF50';
      } else {
        suitEl.textContent = `Alternative Architecture`;
        suitEl.style.color = 'var(--gold)';
      }
    }
  }

  _addParticles() {
    const count = 200;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i++) {
      pos[i] = (Math.random() - 0.5) * 40;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color: 0xD4A96A, size: 0.06, transparent: true, opacity: 0.4 });
    this.particles = new THREE.Points(geo, mat);
    this.scene.add(this.particles);
  }

  _animate() {
    this.animFrameId = requestAnimationFrame(() => this._animate());
    this.controls.update();
    if (this.particles) this.particles.rotation.y += 0.0002;
    // Pulse interior light
    if (this.interiorLight) {
      this.interiorLight.intensity = 1.0 + Math.sin(Date.now() * 0.0008) * 0.18;
    }
    this.renderer.render(this.scene, this.camera);
  }

  _onResize(container) {
    const W = container.clientWidth;
    const H = container.clientHeight;
    this.camera.aspect = W / H;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(W, H);
  }

  toggleAutoRotate() { this.controls.autoRotate = !this.controls.autoRotate; }

  resetCamera() {
    const d = this._dims || { width: 8, length: 10, height: 3.5 };
    const dist = Math.max(d.width, d.length) * 1.05 + 4;
    this.camera.position.set(dist, dist * 0.65, dist);
    this.controls.target.set(0, d.height * 0.55, 0);
    this.controls.autoRotate = true;
    this.controls.minDistance = 0.5;
    this.insideMode = false;
    this.controls.update();
  }

  destroy() {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    this.renderer?.dispose();
  }
}

window.ShelterViewer = ShelterViewer;
