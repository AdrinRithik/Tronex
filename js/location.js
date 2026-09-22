// ================================================================
//  THERMAL SHELTER — Location Controller
//  OpenStreetMap Nominatim search + climate zone detection
// ================================================================

class LocationController {
  constructor() {
    this.selectedLocation = null;
    this.map = null;
    this.marker = null;
    this.searchTimeout = null;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    this.initialized = true;
    this._initMap();
    this._bindSearch();
    this._bindCoordInputs();
    this._bindClimateSelector();
    if (!this.selectedLocation) {
      this.selectLocation(34.1526, 77.5771, 'Leh, Ladakh', 'cold');
    }
  }

  _initMap() {
    this.map = L.map('map-container', {
      zoomControl: true,
      scrollWheelZoom: true
    }).setView([13.0827, 80.2707], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    // Click on map to place marker
    this.map.on('click', (e) => {
      this._reverseGeocode(e.latlng.lat, e.latlng.lng);
    });
  }

  _bindSearch() {
    const input = document.getElementById('location-search');
    const list  = document.getElementById('autocomplete-list');

    input.addEventListener('input', () => {
      clearTimeout(this.searchTimeout);
      const q = input.value.trim();
      if (q.length < 3) { list.classList.remove('open'); return; }
      this.searchTimeout = setTimeout(() => this._fetchSuggestions(q), 350);
    });

    input.addEventListener('keydown', e => {
      if (e.key === 'Escape') { list.classList.remove('open'); }
    });

    document.addEventListener('click', e => {
      if (!e.target.closest('.search-wrapper')) list.classList.remove('open');
    });
  }

  async _fetchSuggestions(query) {
    const list = document.getElementById('autocomplete-list');
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=6&addressdetails=1`;
      const res  = await fetch(url, { headers: { 'Accept-Language': 'en' } });
      const data = await res.json();

      if (!data.length) { list.classList.remove('open'); return; }

      list.innerHTML = data.map(place => `
        <div class="autocomplete-item" data-lat="${place.lat}" data-lon="${place.lon}" data-name="${place.display_name}">
          <span class="place-icon">📍</span>
          <span>${place.display_name}</span>
        </div>
      `).join('');
      list.classList.add('open');

      list.querySelectorAll('.autocomplete-item').forEach(item => {
        item.addEventListener('click', () => {
          const lat  = parseFloat(item.dataset.lat);
          const lon  = parseFloat(item.dataset.lon);
          const name = item.dataset.name;
          document.getElementById('location-search').value = name;
          list.classList.remove('open');
          this._selectLocation(lat, lon, name);
        });
      });
    } catch (err) {
      console.warn('Nominatim error:', err);
    }
  }

  async _reverseGeocode(lat, lon) {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;
      const res  = await fetch(url, { headers: { 'Accept-Language': 'en' } });
      const data = await res.json();
      const name = data.display_name || `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
      document.getElementById('location-search').value = name;
      this._selectLocation(lat, lon, name);
    } catch {
      this._selectLocation(lat, lon, `${lat.toFixed(4)}, ${lon.toFixed(4)}`);
    }
  }

  _normalizeClimateKey(key) {
    const normalized = (key || '').toString().toLowerCase().trim();
    if (!normalized) return 'cold';
    const aliases = {
      'high altitude / very cold': 'high-altitude-cold',
      'high altitude very cold': 'high-altitude-cold',
      'high-altitude-cold': 'high-altitude-cold',
      'snow / cold': 'snow-cold',
      'snow cold': 'snow-cold',
      'hot & dry / desert': 'hot-dry-desert',
      'hot and dry / desert': 'hot-dry-desert',
      'hot & dry desert': 'hot-dry-desert',
      'hot & humid / coastal': 'hot-humid-coastal',
      'hot and humid / coastal': 'hot-humid-coastal',
      'heavy rain': 'heavy-rain',
      'high wind': 'high-wind',
      'moderate climate': 'moderate',
      'moderate': 'moderate',
      'polar': 'polar',
      'cold': 'cold',
      'arid': 'arid',
      'tropical': 'tropical',
      'temperate': 'temperate'
    };
    return aliases[normalized] || normalized;
  }

  getSuitableModelForLocation(climateKey, name = '') {
    const models = window.SHELTER_MODELS || [];
    const findModel = (id) => models.find(m => m.id === id) || models[0] || { id: 'gable', name: 'Gable Roof' };

    const climate = this._normalizeClimateKey(climateKey);
    const climateModelMap = {
      'high-altitude-cold': 'snow-region',
      'snow-cold': 'snow-region',
      'cold': 'snow-region',
      'polar': 'cold-mountain',
      'high-wind': 'high-wind',
      'hot-dry-desert': 'hot-desert',
      'arid': 'hot-desert',
      'hot-humid-coastal': 'hot-humid',
      'heavy-rain': 'heavy-rain',
      'tropical': 'hot-humid',
      'temperate': 'cold-forest',
      'moderate': 'semi-arid'
    };

    const preferredId = climateModelMap[climate] || 'gable';

    switch (climate) {
      case 'high-altitude-cold':
      case 'cold':
      case 'snow-cold':
        return {
          model: findModel(preferredId),
          reason: 'Steep-pitched A-Frame sheds severe alpine snow loads instantly, withstands high-velocity Himalayan winds, and minimizes volume to conserve interior heat.',
          badge: 'Snow Shedding & High Wind Resistance'
        };
      case 'polar':
        return {
          model: findModel(preferredId),
          reason: 'Geodesic Dome offers the minimum surface-area-to-volume ratio to resist extreme conductive heat loss, while rounded aerodynamics deflect blizzard winds.',
          badge: 'Maximum Aerodynamic & Thermal Retention'
        };
      case 'arid':
      case 'hot-dry-desert':
        return {
          model: findModel(preferredId),
          reason: 'Flat roof shelter minimizes windward surface exposure, optimizes thermal mass overhead, and provides maximum nocturnal radiative sky cooling in deserts.',
          badge: 'Low Surface Exposure & Night Sky Cooling'
        };
      case 'tropical':
      case 'hot-humid-coastal':
      case 'heavy-rain':
        return {
          model: findModel(preferredId),
          reason: 'Classic pitched gable roof sheds torrential tropical monsoon rains efficiently and promotes continuous stack-effect ventilation to discharge moist heat.',
          badge: 'Torrential Rain Shedding & Stack Ventilation'
        };
      case 'high-wind':
        return {
          model: findModel(preferredId),
          reason: 'The curved form limits uplift and distributes wind loads effectively while retaining a compact insulated envelope.',
          badge: 'Wind Load Reduction & Envelope Stability'
        };
      case 'temperate':
      case 'moderate':
      default:
        return {
          model: findModel(preferredId),
          reason: 'Balanced all-weather design providing reliable water drainage, attic thermal buffer, and year-round passive comfort.',
          badge: 'Balanced Four-Season Drainage & Envelope'
        };
    }
  }

  selectLocation(lat, lon, name, forcedClimate = null) {
    this._selectLocation(lat, lon, name, forcedClimate);
  }

  _selectLocation(lat, lon, name, forcedClimate = null) {
    // Place / move marker
    const icon = L.divIcon({
      html: `<div style="background:linear-gradient(135deg,#C8713D,#D4A96A);width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #FAF3E0;box-shadow:0 4px 16px rgba(200,113,61,0.6)"></div>`,
      className: '',
      iconAnchor: [14, 28]
    });

    if (this.marker) this.map.removeLayer(this.marker);
    this.marker = L.marker([lat, lon], { icon }).addTo(this.map);
    this.map.flyTo([lat, lon], 10, { duration: 1.5 });

    // Sync coordinate inputs
    this._syncCoordInputs(lat, lon);

    // Detect climate zone
    const climate = forcedClimate || this._detectClimate(lat, lon, name);
    this.selectedLocation = { lat, lon, name, climate };

    // Update global state
    window.AppState.location = this.selectedLocation;
    window.AppState.climate  = climate;

    const climateSelect = document.getElementById('climate-region-select');
    if (climateSelect) {
      climateSelect.value = climate;
    }

    // Automatically select the shelter model suitable for this location
    const suitable = this.getSuitableModelForLocation(climate, name);
    window.AppState.shelterType = suitable.model;
    window.AppState.suitableModel = suitable;
    if (window.dimsCtrl) window.dimsCtrl.selectedModel = suitable.model;

    // Update Step 2 banner
    const bannerDesc = document.getElementById('dims-model-banner-desc');
    if (bannerDesc) {
      bannerDesc.innerHTML = `Optimal shelter model <b>${suitable.model.name}</b> auto-selected for <b>${name.split(',')[0]}</b> (${climate.toUpperCase()} zone). Preview and switch in <b>Virtual 3D View (Step 4)</b>.`;
    }

    // Update 3D viewer if initialized
    if (window.shelterViewer) {
      window.shelterViewer.buildShelter();
    }

    this._renderClimateBadge(climate, lat, lon, suitable);
    window.syncClimateRecommendations?.();
    showToast(`📍 ${name.split(',')[0]} selected · Recommended: ${suitable.model.name}`, 'success');
  }

  _syncCoordInputs(lat, lon) {
    const latEl = document.getElementById('input-lat');
    const lonEl = document.getElementById('input-lon');
    if (!latEl || !lonEl) return;
    latEl.value = parseFloat(lat).toFixed(6);
    lonEl.value = parseFloat(lon).toFixed(6);
    // Brief green flash to signal update
    [latEl, lonEl].forEach(el => {
      el.classList.add('coord-updated');
      setTimeout(() => el.classList.remove('coord-updated'), 900);
    });
  }

  _bindCoordInputs() {
    const goBtn  = document.getElementById('coord-go-btn');
    const latEl  = document.getElementById('input-lat');
    const lonEl  = document.getElementById('input-lon');
    if (!goBtn || !latEl || !lonEl) return;

    const go = () => {
      const lat = parseFloat(latEl.value);
      const lon = parseFloat(lonEl.value);
      if (isNaN(lat) || isNaN(lon)) {
        showToast('⚠️ Enter valid latitude and longitude', 'warning');
        return;
      }
      if (lat < -90 || lat > 90) {
        showToast('⚠️ Latitude must be between -90 and 90', 'warning');
        return;
      }
      if (lon < -180 || lon > 180) {
        showToast('⚠️ Longitude must be between -180 and 180', 'warning');
        return;
      }
      this._reverseGeocode(lat, lon);
    };

    goBtn.addEventListener('click', go);

    // Allow pressing Enter in either field to trigger
    [latEl, lonEl].forEach(el => {
      el.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
    });
  }

  _detectClimate(lat, lon, name) {
    // Simplified Köppen-inspired classification by latitude + longitude + region keywords
    const absLat = Math.abs(lat);
    const lname = name.toLowerCase();

    if (absLat > 65) return 'polar';
    if (absLat > 50) return 'cold';

    // Desert regions
    const desertRegions = ['sahara','arabia','riyadh','dubai','abu dhabi','doha','kuwait',
      'muscat','karachi','rajasthan','nevada','arizona','atacama','gobi','namibia','qatar',
      'oman','bahrain','thar','jaisalmer','jodhpur','bikaner'];
    if (desertRegions.some(r => lname.includes(r))) return 'arid';

    // Tropical
    const tropRegions = ['kerala','goa','mumbai','chennai','bangalore','singapore',
      'jakarta','bangkok','manila','ho chi minh','colombo','maldives','bali',
      'amazon','brazil','nigeria','ghana','kenya','miami','hawaii','panama'];
    if ((absLat < 23 && !desertRegions.some(r => lname.includes(r))) ||
        tropRegions.some(r => lname.includes(r))) return 'tropical';

    if (absLat < 35) return 'arid';
    return 'temperate';
  }

  _bindClimateSelector() {
    const selector = document.getElementById('climate-region-select');
    if (!selector) return;

    selector.addEventListener('change', (event) => {
      const climate = event.target.value;
      const lat = this.selectedLocation?.lat ?? 34.1526;
      const lon = this.selectedLocation?.lon ?? 77.5771;
      const name = this.selectedLocation?.name || 'Manual climate selection';

      this.selectedLocation = { lat, lon, name, climate };
      window.AppState.location = this.selectedLocation;
      window.AppState.climate = climate;
      const suitable = this.getSuitableModelForLocation(climate, name);
      window.AppState.shelterType = suitable.model;
      window.AppState.suitableModel = suitable;
      if (window.dimsCtrl) window.dimsCtrl.selectedModel = suitable.model;
      this._renderClimateBadge(climate, lat, lon, suitable);
      window.syncClimateRecommendations?.();
      if (window.shelterViewer) window.shelterViewer.buildShelter();
    });

    const current = window.AppState?.climate || 'cold';
    selector.value = current;
  }

  _renderClimateBadge(climateKey, lat, lon, suitable = null) {
    const cd   = window.CLIMATE_DATA[climateKey] || window.CLIMATE_DATA.cold;
    const cont = document.getElementById('climate-info-container');
    const recModel = suitable || this.getSuitableModelForLocation(climateKey);

    cont.innerHTML = `
      <div class="climate-badge">
        <div class="climate-emoji">${cd.emoji}</div>
        <div class="climate-info">
          <div class="climate-label">Detected Climate Zone</div>
          <div class="climate-type">${cd.label}</div>
          <div class="climate-desc">${cd.desc}</div>
        </div>
      </div>
      <div class="climate-params">
        <div class="param-chip">
          <div class="param-icon">🌡️</div>
          <div class="param-val">${cd.ambientTempC}°C</div>
          <div class="param-lbl">Avg Temp</div>
        </div>
        <div class="param-chip">
          <div class="param-icon">💧</div>
          <div class="param-val">${cd.relHumidity}%</div>
          <div class="param-lbl">Humidity</div>
        </div>
        <div class="param-chip">
          <div class="param-icon">💨</div>
          <div class="param-val">${cd.windSpeedMS} m/s</div>
          <div class="param-lbl">Wind Speed</div>
        </div>
        <div class="param-chip">
          <div class="param-icon">☀️</div>
          <div class="param-val">${cd.solarRadWm2}</div>
          <div class="param-lbl">Solar W/m²</div>
        </div>
        <div class="param-chip">
          <div class="param-icon">🌓</div>
          <div class="param-val">${cd.dailyTempSwing}°C</div>
          <div class="param-lbl">Daily Swing</div>
        </div>
        <div class="param-chip">
          <div class="param-icon">🗺️</div>
          <div class="param-val">${Math.abs(lat).toFixed(1)}°${lat>=0?'N':'S'}</div>
          <div class="param-lbl">Latitude</div>
        </div>
      </div>

      <!-- Recommended Shelter Model for this Location -->
      <div style="padding:14px 16px;background:linear-gradient(135deg,rgba(92,51,23,0.5),rgba(200,113,61,0.22));border:1.5px solid var(--gold);border-radius:var(--radius-md);margin-bottom:12px;box-shadow:0 4px 20px rgba(0,0,0,0.3)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:20px">🏠</span>
            <span style="font-size:0.75rem;font-weight:700;color:var(--gold);text-transform:uppercase;letter-spacing:1px">Site-Optimized Model</span>
          </div>
          <span style="font-size:0.68rem;padding:3px 8px;background:rgba(76,175,80,0.2);color:#4CAF50;border:1px solid rgba(76,175,80,0.4);border-radius:12px;font-weight:700">✓ Auto-Selected</span>
        </div>
        <div style="font-size:0.98rem;font-weight:800;color:var(--sandal-light)">${recModel.model.name}</div>
        <div style="font-size:0.75rem;color:var(--tan);margin-top:4px;line-height:1.45">${recModel.reason}</div>
        <div style="display:flex;align-items:center;gap:6px;margin-top:8px;font-size:0.72rem;color:var(--sandal-light)">
          <span style="color:var(--gold)">✦</span>
          <span><b>Key advantage:</b> ${recModel.badge}</span>
        </div>
      </div>

      <div style="padding:14px 16px;background:rgba(26,13,6,0.4);border:1px solid var(--glass-border);border-radius:var(--radius-md)">
        <div style="font-size:0.72rem;font-weight:700;color:var(--tan);text-transform:uppercase;letter-spacing:1px;margin-bottom:10px">Design Recommendations</div>
        ${cd.recommendations.map(r => `
          <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:6px;font-size:0.8rem;color:var(--sandal-light)">
            <span style="color:var(--gold);flex-shrink:0">→</span>
            <span>${r}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  isComplete() {
    return !!this.selectedLocation;
  }
}

window.locationCtrl = new LocationController();
