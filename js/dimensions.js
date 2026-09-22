// ================================================================
//  THERMAL SHELTER — Shelter Dimensions & Model Controller
//  Brown roof/door · Navy blue windows · Location-adaptive
// ================================================================

const SHELTER_MODELS = [
  {
    id: 'aframe',
    name: 'A-Frame Shelter',
    desc: 'Steep-pitched alpine roof sheds heavy snow and high winds. Compact volume preserves vital heat.',
    pros: 'Superior snow-shedding, alpine wind resistance',
    bestFor: 'Cold, Polar',
    svgPath: `<svg viewBox="0 0 160 100" class="model-svg" fill="none">
      <polygon points="80,6 18,92 142,92" fill="#753A18"/>
      <polygon points="80,12 28,92 132,92" fill="#8B4513" opacity="0.85"/>
      <!-- Cream/Off-white front face -->
      <polygon points="80,18 36,92 124,92" fill="#F5F0E8"/>
      <!-- Brown door -->
      <rect x="68" y="66" width="24" height="26" fill="#4E240D" rx="2"/>
      <circle cx="86" cy="80" r="1.5" fill="#D4A820"/>
      <!-- Navy blue windows -->
      <rect x="48" y="58" width="14" height="14" fill="#0A2B6E" rx="2"/>
      <rect x="98" y="58" width="14" height="14" fill="#0A2B6E" rx="2"/>
      <polygon points="80,30 73,42 87,42" fill="#0A2B6E"/>
    </svg>`
  },
  {
    id: 'gable',
    name: 'Gable Roof Cabin',
    desc: 'Classic triangular pitched roof. Optimal for monsoon runoff and natural stack-effect attic ventilation.',
    pros: 'Rapid rainfall shedding, attic thermal buffer',
    bestFor: 'Temperate, Tropical, Cold',
    svgPath: `<svg viewBox="0 0 160 100" class="model-svg" fill="none">
      <!-- Cream walls -->
      <rect x="24" y="52" width="112" height="42" fill="#F5F0E8" rx="2"/>
      <!-- Brown roof -->
      <polygon points="80,10 14,52 146,52" fill="#753A18"/>
      <line x1="80" y1="10" x2="80" y2="52" stroke="#5C2A0E" stroke-width="2"/>
      <!-- Brown door -->
      <rect x="68" y="66" width="24" height="28" fill="#4E240D" rx="2"/>
      <circle cx="86" cy="80" r="1.5" fill="#D4A820"/>
      <!-- Navy blue windows -->
      <rect x="34" y="62" width="18" height="16" fill="#0A2B6E" rx="2"/>
      <line x1="43" y1="62" x2="43" y2="78" stroke="#D4A96A" stroke-width="1" opacity="0.6"/>
      <rect x="108" y="62" width="18" height="16" fill="#0A2B6E" rx="2"/>
      <line x1="117" y1="62" x2="117" y2="78" stroke="#D4A96A" stroke-width="1" opacity="0.6"/>
    </svg>`
  },
  {
    id: 'flat',
    name: 'Flat Roof Shelter',
    desc: 'Traditional desert vernacular. Minimizes surface area exposed to wind and hot daytime sun.',
    pros: 'Low solar exposure, nocturnal radiative cooling',
    bestFor: 'Arid / Desert',
    svgPath: `<svg viewBox="0 0 160 100" class="model-svg" fill="none">
      <!-- Brown roof slab & parapet -->
      <rect x="18" y="34" width="124" height="10" fill="#753A18" rx="2"/>
      <rect x="22" y="30" width="116" height="5" fill="#5C2A0E" rx="1"/>
      <!-- Cream walls -->
      <rect x="24" y="44" width="112" height="50" fill="#F5F0E8" rx="2"/>
      <!-- Brown door -->
      <rect x="68" y="64" width="24" height="30" fill="#4E240D" rx="2"/>
      <circle cx="86" cy="78" r="1.5" fill="#D4A820"/>
      <!-- Navy blue windows -->
      <rect x="34" y="56" width="20" height="18" fill="#0A2B6E" rx="2"/>
      <rect x="106" y="56" width="20" height="18" fill="#0A2B6E" rx="2"/>
    </svg>`
  },
  {
    id: 'dome',
    name: 'Geodesic Dome',
    desc: 'Hemispherical shell with minimal surface-area-to-volume ratio. Maximum resistance against blizzard winds.',
    pros: 'Minimal conductive heat loss, wind deflective',
    bestFor: 'Polar, Extreme Cold',
    svgPath: `<svg viewBox="0 0 160 100" class="model-svg" fill="none">
      <!-- Ground shadow -->
      <ellipse cx="80" cy="94" rx="60" ry="6" fill="#3A2010" opacity="0.4"/>
      <!-- Brown dome shell -->
      <path d="M22,78 Q22,14 80,14 Q138,14 138,78 Z" fill="#753A18"/>
      <!-- Geodesic lattice lines -->
      <path d="M22,78 Q45,36 80,30 Q115,36 138,78" stroke="#D4A96A" stroke-width="1.2" fill="none" opacity="0.4"/>
      <path d="M36,66 Q58,36 80,32 Q102,36 124,66" stroke="#D4A96A" stroke-width="1.2" fill="none" opacity="0.4"/>
      <!-- Cream base ring -->
      <rect x="24" y="78" width="112" height="16" fill="#F5F0E8" rx="2"/>
      <!-- Brown door -->
      <rect x="68" y="68" width="24" height="26" fill="#4E240D" rx="2"/>
      <circle cx="86" cy="81" r="1.5" fill="#D4A820"/>
      <!-- Navy blue observation windows -->
      <circle cx="48" cy="52" r="7" fill="#0A2B6E"/>
      <circle cx="112" cy="52" r="7" fill="#0A2B6E"/>
      <circle cx="80" cy="24" r="6" fill="#0A2B6E"/>
    </svg>`
  },
  {
    id: 'leanto',
    name: 'Lean-To Shelter',
    desc: 'Single-pitch roof designed for efficient runoff toward the rear and simple rapid field deployment.',
    pros: 'Rapid build, single-directional drainage',
    bestFor: 'Temperate, Arid',
    svgPath: `<svg viewBox="0 0 160 100" class="model-svg" fill="none">
      <!-- Cream walls -->
      <polygon points="22,34 138,58 138,94 22,94" fill="#F5F0E8"/>
      <!-- Brown sloped roof -->
      <polygon points="18,30 142,54 140,62 16,38" fill="#753A18"/>
      <!-- Brown door -->
      <rect x="92" y="66" width="22" height="28" fill="#4E240D" rx="2"/>
      <circle cx="108" cy="80" r="1.5" fill="#D4A820"/>
      <!-- Navy blue windows -->
      <rect x="36" y="58" width="18" height="18" fill="#0A2B6E" rx="2"/>
      <rect x="64" y="64" width="16" height="16" fill="#0A2B6E" rx="2"/>
    </svg>`
  },
  {
    id: 'barrel',
    name: 'Barrel Vault',
    desc: 'Curved arch geometry provides inherent structural strength, reduced edge turbulence, and high headroom.',
    pros: 'Arch load distribution, reduced wind drag',
    bestFor: 'Arid, Temperate',
    svgPath: `<svg viewBox="0 0 160 100" class="model-svg" fill="none">
      <!-- Cream base -->
      <rect x="22" y="66" width="116" height="28" fill="#F5F0E8" rx="2"/>
      <!-- Brown vaulted arch -->
      <path d="M22,66 Q22,16 80,16 Q138,16 138,66 Z" fill="#753A18"/>
      <path d="M22,66 Q22,26 80,26 Q138,26 138,66" stroke="#D4A96A" stroke-width="1.2" fill="none" opacity="0.3"/>
      <!-- Brown door -->
      <rect x="68" y="64" width="24" height="30" fill="#4E240D" rx="2"/>
      <circle cx="86" cy="78" r="1.5" fill="#D4A820"/>
      <!-- Navy blue arched windows -->
      <path d="M36,66 Q36,46 48,46 Q60,46 60,66 Z" fill="#0A2B6E"/>
      <path d="M100,66 Q100,46 112,46 Q124,46 124,66 Z" fill="#0A2B6E"/>
    </svg>`
  }
];

const referencePreviewSvg = (name, geometry) => {
  const shapes = {
    aframe: '<path d="M28 82 L80 12 L132 82 Z" fill="#6F7782"/><path d="M42 82 L80 25 L118 82 Z" fill="#D8DDE2"/>',
    dome: '<path d="M24 82 Q24 20 80 16 Q136 20 136 82 Z" fill="#6F7782"/><path d="M35 73 Q80 28 125 73" stroke="#D8DDE2" stroke-width="2"/>',
    gable: '<path d="M24 45 L80 14 L136 45" stroke="#6F7782" stroke-width="12"/><rect x="30" y="44" width="100" height="38" fill="#D8DDE2"/>',
    flat: '<rect x="25" y="30" width="110" height="12" fill="#6F7782"/><rect x="30" y="42" width="100" height="40" fill="#D8DDE2"/>',
    leanto: '<path d="M22 30 L138 52 L138 60 L22 38 Z" fill="#6F7782"/><path d="M28 38 L132 58 L132 82 L28 82 Z" fill="#D8DDE2"/>',
    barrel: '<path d="M24 76 Q24 18 80 18 Q136 18 136 76 Z" fill="#6F7782"/><path d="M38 70 Q80 30 122 70" stroke="#D8DDE2" stroke-width="2"/>'
  };
  return `<svg viewBox="0 0 160 100" class="model-svg" fill="none" aria-label="${name}">
    <rect x="18" y="84" width="124" height="4" fill="#8B7355"/>
    ${shapes[geometry] || shapes.gable}
    <rect x="70" y="58" width="20" height="24" fill="#4E240D"/>
    <text x="80" y="96" text-anchor="middle" fill="#102044" font-size="6">${name}</text>
  </svg>`;
};

// Reference-sheet shelter families used by the 3D view.
const IMAGE_SHELTER_MODELS = [
  ['snow-region', 'Snow Region Shelter', 'Steep alpine form for heavy snow and sub-zero conditions.', 'aframe', 'Cold, Snow'],
  ['cold-mountain', 'Cold Mountain Shelter', 'Compact dome form for cold mountain wind and insulation.', 'dome', 'Cold, Wind'],
  ['heavy-rain', 'Heavy Rain Shelter', 'Raised sloping roof for high rainfall and humid conditions.', 'leanto', 'Heavy Rain'],
  ['hot-humid', 'Hot-Humid Shelter', 'Raised ventilated shelter with generous roof overhangs.', 'gable', 'Tropical'],
  ['hot-desert', 'Hot Desert Shelter', 'Low-profile thermal-mass shelter for extreme heat and arid air.', 'flat', 'Hot, Arid'],
  ['cyclone-prone', 'Cyclone-Prone Shelter', 'Low aerodynamic shell for high wind and storm exposure.', 'dome', 'High Wind'],
  ['flood-prone', 'Flood-Prone Shelter', 'Elevated shelter form for floodwater and high water tables.', 'leanto', 'Flood, Heavy Rain'],
  ['coastal', 'Coastal Shelter', 'Curved wind-resistant shelter for salt air and strong coastal winds.', 'barrel', 'Coastal, High Wind'],
  ['cold-forest', 'Cold Forest Shelter', 'Steep compact roof for cold rain, snow, and forest sites.', 'aframe', 'Cold, Rain'],
  ['semi-arid', 'Semi-Arid Shelter', 'Moderate curved roof for hot days and cool nights.', 'barrel', 'Semi-Arid'],
  ['high-wind', 'High-Wind Shelter', 'Aerodynamic low-profile shell for exposed locations.', 'dome', 'High Wind'],
  ['rainforest', 'Rainforest Shelter', 'Raised open-sided form with large roof overhangs.', 'gable', 'Humid, Heavy Rain'],
  ['beach-sandy', 'Beach / Sandy Shelter', 'Lightweight tensile-inspired shelter for coastal sandy terrain.', 'leanto', 'Coastal, Sandy'],
  ['volcanic-extreme', 'Volcanic / Extreme Terrain Shelter', 'Modular durable shell for rough terrain and harsh conditions.', 'dome', 'Extreme Terrain'],
  ['emergency', 'Emergency Shelter', 'Quick-deploy compact form for disaster response zones.', 'flat', 'Disaster Zones']
].map(([id, name, desc, geometry, bestFor]) => ({
  id,
  name,
  desc,
  geometry,
  bestFor,
  pros: desc,
  svgPath: referencePreviewSvg(name, geometry)
}));

SHELTER_MODELS.splice(0, SHELTER_MODELS.length, ...IMAGE_SHELTER_MODELS);

class DimensionsController {
  constructor() {
    this.selectedModel = null;
    this.dimensions = { width: 8, length: 10, height: 3.5, roofPitch: 30 };
    this.initialized = false;
  }

  get area() { return this.dimensions.width * this.dimensions.length; }
  get volume() { return this.area * this.dimensions.height * 0.75; } // approx with roof

  init() {
    if (this.initialized) return;
    this.initialized = true;
    this._renderSliders();
  }

  // ── Render Shelter Models directly in Step 4 Virtual 3D View ──
  render3DModelSelector(containerId = 'viewer-models-strip') {
    const strip = document.getElementById(containerId);
    if (!strip) return;

    const currentClimate = window.AppState.climate || 'cold';
    const currentLocName = window.AppState.location?.name?.split(',')[0] || 'Selected Location';
    const suitable = window.locationCtrl?.getSuitableModelForLocation(currentClimate, currentLocName) || {
      model: SHELTER_MODELS[0],
      badge: 'Recommended'
    };

    const climateModelIds = {
      'high-altitude-cold': ['snow-region', 'cold-mountain'],
      'snow-cold': ['snow-region', 'cold-forest'],
      'cold': ['snow-region', 'cold-mountain'],
      'polar': ['cold-mountain', 'volcanic-extreme'],
      'high-wind': ['high-wind', 'cyclone-prone'],
      'hot-dry-desert': ['hot-desert', 'semi-arid'],
      'arid': ['hot-desert', 'semi-arid'],
      'hot-humid-coastal': ['hot-humid', 'coastal'],
      'heavy-rain': ['heavy-rain', 'flood-prone'],
      'tropical': ['hot-humid', 'rainforest'],
      'temperate': ['cold-forest', 'coastal'],
      'moderate': ['semi-arid', 'emergency']
    };

    const filteredModels = (climateModelIds[currentClimate] || ['gable', 'barrel'])
      .map(id => SHELTER_MODELS.find(m => m.id === id))
      .filter(Boolean);

    // Only show reference models suitable for the selected climate and region.
    const recommendedPool = filteredModels.length ? filteredModels : SHELTER_MODELS;

    if (!window.AppState.shelterType) {
      window.AppState.shelterType = suitable.model;
      this.selectedModel = suitable.model;
    }
    const activeModelId = window.AppState.shelterType?.id || suitable.model.id;

    const pillName = document.getElementById('viewer-suitability-model-name');
    if (pillName) {
      pillName.textContent = `${suitable.model.name} (${currentClimate.toUpperCase()} Zone)`;
    }

    strip.innerHTML = recommendedPool.map(m => {
      const isRecommended = m.id === suitable.model.id;
      const isSelected = m.id === activeModelId;

      return `
        <div class="viewer-model-tile ${isSelected ? 'selected' : ''} ${isRecommended ? 'recommended-tile' : ''}" data-model-id="${m.id}">
          ${isRecommended ? `<div class="model-rec-tag">⭐ Best for ${currentLocName}</div>` : ''}
          <div class="tile-svg-wrap">${m.svgPath}</div>
          <div class="tile-info">
            <div class="tile-name">${m.name}</div>
            <div class="tile-desc">${m.desc}</div>
            <div class="tile-meta">
              <span class="tile-best">Best: ${m.bestFor}</span>
              ${isSelected ? '<span class="tile-active-badge">✓ Active 3D</span>' : '<span class="tile-click-hint">Click to 3D View</span>'}
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Bind click listeners
    strip.querySelectorAll('.viewer-model-tile').forEach(tile => {
      tile.addEventListener('click', () => {
        const id = tile.dataset.modelId;
        const chosen = SHELTER_MODELS.find(m => m.id === id);
        if (!chosen) return;

        this.selectedModel = chosen;
        window.AppState.shelterType = chosen;

        // Update active class
        strip.querySelectorAll('.viewer-model-tile').forEach(t => t.classList.remove('selected'));
        tile.classList.add('selected');

        // Re-render badges
        strip.querySelectorAll('.tile-active-badge').forEach(b => {
          b.className = 'tile-click-hint';
          b.textContent = 'Click to 3D View';
        });
        const activeBadge = tile.querySelector('.tile-click-hint');
        if (activeBadge) {
          activeBadge.className = 'tile-active-badge';
          activeBadge.textContent = '✓ Active 3D';
        }

        // Rebuild 3D shelter in Three.js
        if (window.shelterViewer) {
          window.shelterViewer.buildShelter();
        }

        // Update sidebar
        if (typeof populateViewerSidebar === 'function') {
          populateViewerSidebar();
        }

        const isMatch = chosen.id === suitable.model.id;
        showToast(`🏠 Switched 3D View to ${chosen.name}${isMatch ? ' (Site Optimal)' : ''}`, 'info');
      });
    });
  }

  _renderSliders() {
    const container = document.getElementById('dims-sliders');
    if (!container) return;
    const sliders = [
      { key:'width',     label:'Width',      icon:'↔️', min:3, max:20, step:0.5, unit:'m' },
      { key:'length',    label:'Length',     icon:'↕️', min:3, max:30, step:0.5, unit:'m' },
      { key:'height',    label:'Wall Height',icon:'↕️', min:2, max:8,  step:0.1, unit:'m' },
      { key:'roofPitch', label:'Roof Pitch', icon:'📐', min:0, max:60, step:5,   unit:'°' }
    ];

    container.innerHTML = sliders.map(s => `
      <div class="slider-group">
        <div class="slider-label">
          <span class="lbl">${s.icon} ${s.label}</span>
          <span class="val" id="val-${s.key}">${this.dimensions[s.key]}${s.unit}</span>
        </div>
        <input type="range" id="slider-${s.key}"
          min="${s.min}" max="${s.max}" step="${s.step}"
          value="${this.dimensions[s.key]}"
          data-key="${s.key}" data-unit="${s.unit}">
      </div>
    `).join('');

    container.querySelectorAll('input[type=range]').forEach(inp => {
      inp.addEventListener('input', () => {
        const key  = inp.dataset.key;
        const unit = inp.dataset.unit;
        this.dimensions[key] = parseFloat(inp.value);
        document.getElementById(`val-${key}`).textContent = `${inp.value}${unit}`;
        this._updateAreaDisplay();
        window.AppState.dimensions = this._getDims();
        if (window.shelterViewer) window.shelterViewer.buildShelter();
      });
    });

    this._updateAreaDisplay();
  }

  _updateAreaDisplay() {
    const areaEl = document.getElementById('dims-area');
    const volEl  = document.getElementById('dims-vol');
    if (areaEl) areaEl.textContent = this.area.toFixed(1);
    if (volEl)  volEl.textContent  = this.volume.toFixed(1);
  }

  _getDims() {
    return {
      ...this.dimensions,
      area:   this.area,
      volume: this.volume
    };
  }

  isComplete() {
    return this.dimensions.width > 0 && this.dimensions.length > 0 && this.dimensions.height > 0;
  }
}

window.dimsCtrl       = new DimensionsController();
window.SHELTER_MODELS = SHELTER_MODELS;

