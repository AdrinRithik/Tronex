// ================================================================
//  THERMAL SHELTER — App State Machine & Step Orchestration
//  Wired to DRDO Deterministic Physics Solver, Charts, & Gemini AI Layer
// ================================================================

// ── Global State ──
window.AppState = {
  step:         1,          // current step (1-7)
  location:     { lat: 34.1526, lon: 77.5771, name: 'Leh, Ladakh' }, // Default Ladakh
  climate:      'cold',
  dimensions:   { width: 6, length: 8, height: 3, roofPitch: 25, area: 48, volume: 144 },
  shelterType:  { id: 'aframe', name: 'A-Frame Shelter' },
  windowsEnabled: false,
  manualDesign: false,
  manualRoofShape: 'curved',
  suitableModel: null,
  materials:    { wall: null, roof: null, door: null, floor: null, window: null },
  physicsResults: null,
  results:      null,
  optimized:    null
};

window.syncClimateRecommendations = function() {
  if (!window.materialsCtrl) return;
  window.materialsCtrl._applyClimateRecommendation();
  window.materialsCtrl._renderRecommendationCard();
  window.materialsCtrl._renderSection();
  window.materialsCtrl._updateSummary();
  window.materialsCtrl.refreshGeminiRecommendation();
};

// ── Toast Notification System ──
window.showToast = function(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const icons     = { success:'✅', error:'❌', info:'ℹ️', warning:'⚠️' };
  const toast     = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type]||'📢'}</span><span class="toast-msg">${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
};

// ── Step Configuration ──
const STEPS = [
  { id:1, label:'Location',   icon:'📍', validate: () => window.AppState.location !== null },
  { id:2, label:'Dimensions', icon:'📐', validate: () => window.dimsCtrl ? window.dimsCtrl.isComplete() : true },
  { id:3, label:'Materials',  icon:'🧱', validate: () => window.materialsCtrl?.isComplete() },
  { id:4, label:'3D View',    icon:'🎯', validate: () => true },
  { id:5, label:'Simulation', icon:'⚙️', validate: () => window.AppState.results !== null },
  { id:6, label:'Results',    icon:'📊', validate: () => true },
  { id:7, label:'Optimize',   icon:'🔄', validate: () => true }
];

// ── Navigate to Step ──
function goToStep(n) {
  const prev = window.AppState.step;
  window.AppState.step = n;

  // Update step indicators
  document.querySelectorAll('.step-item').forEach(el => {
    const s = parseInt(el.dataset.step);
    el.classList.remove('active','completed');
    if (s === n)        el.classList.add('active');
    else if (s < n)     el.classList.add('completed');
  });

  // Update connector fills
  document.querySelectorAll('.step-connector').forEach(el => {
    const s = parseInt(el.dataset.after);
    el.classList.toggle('active', s < n);
  });

  // Show/hide panels
  document.querySelectorAll('.step-panel').forEach(panel => {
    panel.classList.remove('active');
  });
  const target = document.getElementById(`step-${n}`);
  if (target) target.classList.add('active');

  // Step-specific initialization
  onStepEnter(n, prev);

  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function onStepEnter(step, prevStep) {
  switch (step) {
    case 1:
      window.locationCtrl?.init();
      break;

    case 2:
      window.dimsCtrl?.init();
      break;

    case 3:
      window.materialsCtrl?.init();
      break;

    case 4:
      window.dimsCtrl?.render3DModelSelector('viewer-models-strip');
      if (window.shelterViewer) {
        window.shelterViewer.buildShelter();
      } else {
        window.shelterViewer = new ShelterViewer('threejs-container');
        window.shelterViewer.init();
      }
      populateViewerSidebar();
      break;

    case 5:
      // Clear terminal
      const term = document.getElementById('sim-terminal-body');
      if (term) term.textContent = '';
      document.querySelectorAll('.sim-stage').forEach(s => {
        s.classList.remove('running','done');
        const fill = s.querySelector('.stage-progress-fill');
        if (fill) fill.style.width = '0%';
        const status = s.querySelector('.stage-status');
        if (status) status.textContent = 'Waiting...';
      });
      break;

    case 6:
      if (window.AppState.results) {
        renderResults(window.AppState.results);
      }
      break;

    case 7:
      runOptimization();
      break;
  }
}

// ── Step 4: Sidebar info ──
function populateViewerSidebar() {
  const state = window.AppState;
  const dims  = state.dimensions;
  const mats  = state.materials;
  const climate = window.CLIMATE_DATA?.[state.climate];

  const setText = (id, txt) => {
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
  };

  setText('info-model',   state.shelterType?.name   || '—');
  setText('info-climate', climate?.label            || 'Cold Desert (Ladakh)');
  setText('info-width',   `${dims.width} m`);
  setText('info-length',  `${dims.length} m`);
  setText('info-height',  `${dims.height} m`);
  setText('info-area',    `${dims.area?.toFixed(1)} m²`);
  setText('info-wall',    mats.wall?.name           || '—');
  setText('info-roof',    mats.roof?.name           || '—');
  setText('info-door',    mats.door?.name           || '—');
  setText('info-floor',   mats.floor?.name          || '—');
  setText('info-window',  mats.window?.name         || '—');
}

// ── Global chart references ──
window.drdoCharts = {
  temp: null,
  solar: null,
  heatflow: null
};

// ── Step 6: Render Results & DRDO Charts ──
function renderResults(res) {
  // Verdict badge
  const safeNum = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

  const badge = document.getElementById('verdict-badge');
  if (badge) {
    const comfortable = Boolean(res.comfortable);
    const heatingDeficit = safeNum(res.heatingDeficitKwh, 0);
    badge.className = `verdict-badge ${comfortable ? 'comfortable' : 'uncomfortable'}`;
    badge.innerHTML = comfortable
      ? `<span>🟢</span> PASSIVE COMFORT MAINTAINED`
      : `<span>🔴</span> COLD DEFICIT (${heatingDeficit.toFixed(2)} kWh Needed)`;
  }

  // Confidence & summary stats
  const confText = document.getElementById('confidence-text');
  if (confText) {
    const damping = safeNum(res.dampingRatio, 0) * 100;
    const pmv = safeNum(res.pmv, 0);
    confText.textContent = `Deterministic RC Solver (RK4) | Thermal Damping: ${damping.toFixed(0)}% | PMV Index: ${pmv}`;
  }

  const statTemp = document.getElementById('stat-temp-summary');
  if (statTemp) {
    const minInside = safeNum(res.minInsideC, 0);
    const maxInside = safeNum(res.maxInsideC, 0);
    const swing = safeNum(res.diurnalSwing, 0);
    statTemp.textContent = `Min Night: ${minInside > 0 ? '+' : ''}${minInside.toFixed(1)}°C | Max Day: +${maxInside.toFixed(1)}°C | Diurnal Swing: ${swing.toFixed(1)}°C`;
  }

  const statSolar = document.getElementById('stat-solar-total');
  if (statSolar) {
    statSolar.textContent = `Cumulative Solar Absorbed: ${safeNum(res.totalSolarKwh, 0).toFixed(2)} kWh`;
  }

  // Gauges
  animateGauge('gauge-temp',
    `${res.indoorTempC}`, '°C',
    res.tempScore,
    getGaugeColor(res.tempScore));

  animateGauge('gauge-humidity',
    `${res.indoorHumidity}`, '%',
    res.humidityScore,
    getGaugeColor(res.humidityScore));

  animateGauge('gauge-airflow',
    `${res.ventilationACH}`, 'ACH',
    res.airflowScore,
    getGaugeColor(res.airflowScore));

  // Score bars
  const bars = [
    { id:'bar-temp',      val: res.tempScore },
    { id:'bar-humidity',  val: res.humidityScore },
    { id:'bar-airflow',   val: res.airflowScore },
    { id:'bar-material',  val: res.materialScore },
  ];
  bars.forEach(b => {
    const el = document.getElementById(b.id);
    if (el) {
      el.style.width = '0%';
      el.style.background = `linear-gradient(90deg, ${getGaugeColor(b.val)}, ${getGaugeColor(b.val)}AA)`;
      setTimeout(() => { el.style.width = `${b.val}%`; }, 200);
    }
    const valEl = document.getElementById(b.id + '-val');
    if (valEl) valEl.textContent = b.val;
  });

  // Recommendations
  const recList = document.getElementById('recommendations-list');
  if (recList && res.recommendations) {
    recList.innerHTML = res.recommendations.map(r => `
      <div style="display:flex;align-items:flex-start;gap:10px;padding:10px 14px;margin-bottom:8px;
                  background:rgba(26,13,6,0.4);border:1px solid var(--glass-border);border-radius:var(--radius-sm)">
        <span style="font-size:18px;flex-shrink:0">${r.icon}</span>
        <span style="font-size:0.82rem;color:var(--sandal-light)">${r.text}</span>
      </div>
    `).join('');
  }

  // Render the 3 DRDO Task Charts
  renderDrdoCharts(window.AppState.physicsResults);

  // Show "Run Optimizer" button
  const optBtn = document.getElementById('btn-go-optimize');
  if (optBtn) optBtn.style.display = 'flex';
}

function getGaugeColor(score) {
  if (score >= 75) return '#4CAF7D';
  if (score >= 50) return '#E8A838';
  return '#D94F3D';
}

function animateGauge(id, numStr, unit, score, color) {
  const container = document.getElementById(id);
  if (!container) return;

  const circumference = 2 * Math.PI * 50;
  const fill = container.querySelector('.gauge-fill');
  if (!fill) return;
  fill.style.stroke = color;
  fill.style.strokeDasharray  = circumference;
  fill.style.strokeDashoffset = circumference;

  const num  = container.querySelector('.gauge-num');
  const unitEl = container.querySelector('.gauge-unit');
  if (num) num.textContent = numStr;
  if (unitEl) unitEl.textContent = unit;

  setTimeout(() => {
    const offset = circumference - (score / 100) * circumference;
    fill.style.strokeDashoffset = offset;
  }, 300);
}

// ── Render 3 DRDO Output Charts ──
function renderDrdoCharts(pRes) {
  if (!pRes || !window.Chart) return;

  const labels = pRes.hours;

  // 1. TASK 1: Inside vs Ambient Temperature Chart
  const ctxTemp = document.getElementById('chart-drdo-temp');
  if (ctxTemp) {
    if (window.drdoCharts.temp) window.drdoCharts.temp.destroy();
    window.drdoCharts.temp = new Chart(ctxTemp, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Predicted Inside Air Temp (°C)',
            data: pRes.insideTemp,
            borderColor: '#E8A838',
            backgroundColor: 'rgba(232, 168, 56, 0.1)',
            borderWidth: 3,
            tension: 0.35,
            fill: false
          },
          {
            label: 'Wall Core Mass Temp (°C)',
            data: pRes.wallCoreTemp,
            borderColor: '#D47A4A',
            borderDash: [3, 3],
            borderWidth: 2,
            tension: 0.3,
            fill: false
          },
          {
            label: 'Ambient Outdoor Temp (°C) [NASA POWER]',
            data: pRes.ambientTemp,
            borderColor: '#5B9BD5',
            borderDash: [6, 4],
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.35,
            fill: false
          },
          {
            label: 'Comfort Upper (24°C)',
            data: pRes.comfortZoneUpper,
            borderColor: 'rgba(76, 175, 80, 0.4)',
            borderWidth: 1,
            pointRadius: 0,
            fill: '+1',
            backgroundColor: 'rgba(76, 175, 80, 0.12)'
          },
          {
            label: 'Comfort Lower (18°C)',
            data: pRes.comfortZoneLower,
            borderColor: 'rgba(76, 175, 80, 0.4)',
            borderWidth: 1,
            pointRadius: 0,
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            position: 'top',
            labels: { color: '#E8D5B5', font: { size: 10 }, boxWidth: 12 }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: { color: '#A08060', maxTicksLimit: 12, font: { size: 9 } }
          },
          y: {
            grid: { color: 'rgba(255,255,255,0.08)' },
            ticks: { color: '#A08060', font: { size: 10 } },
            title: { display: true, text: 'Temperature (°C)', color: '#A08060', font: { size: 10 } }
          }
        }
      }
    });
  }

  // 2. TASK 2: Solar Thermal Energy Gain Chart
  const ctxSolar = document.getElementById('chart-drdo-solar');
  if (ctxSolar) {
    if (window.drdoCharts.solar) window.drdoCharts.solar.destroy();
    window.drdoCharts.solar = new Chart(ctxSolar, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            type: 'bar',
            label: 'Hourly Solar Thermal Gain (Watts)',
            data: pRes.solarGainWatts,
            backgroundColor: 'rgba(232, 168, 56, 0.65)',
            borderColor: '#E8A838',
            borderWidth: 1,
            yAxisID: 'yWatts'
          },
          {
            type: 'line',
            label: 'Cumulative Absorbed Energy (kWh)',
            data: pRes.cumulativeSolarKwh,
            borderColor: '#4CAF50',
            backgroundColor: 'rgba(76, 175, 80, 0.1)',
            borderWidth: 2.5,
            fill: true,
            tension: 0.25,
            yAxisID: 'yKwh'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { color: '#E8D5B5', font: { size: 10 }, boxWidth: 12 }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: { color: '#A08060', maxTicksLimit: 12, font: { size: 9 } }
          },
          yWatts: {
            type: 'linear',
            position: 'left',
            grid: { color: 'rgba(255,255,255,0.08)' },
            ticks: { color: '#E8A838', font: { size: 10 } },
            title: { display: true, text: 'Solar Flux (W)', color: '#E8A838', font: { size: 10 } }
          },
          yKwh: {
            type: 'linear',
            position: 'right',
            grid: { drawOnChartArea: false },
            ticks: { color: '#4CAF50', font: { size: 10 } },
            title: { display: true, text: 'Cumulative (kWh)', color: '#4CAF50', font: { size: 10 } }
          }
        }
      }
    });
  }

  // 3. TASK 3: Heat Flow Breakdown Chart
  const ctxHeat = document.getElementById('chart-drdo-heatflow');
  if (ctxHeat) {
    if (window.drdoCharts.heatflow) window.drdoCharts.heatflow.destroy();
    window.drdoCharts.heatflow = new Chart(ctxHeat, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Conduction Loss (W)',
            data: pRes.conductionLossWatts,
            borderColor: '#D94F3D',
            backgroundColor: 'rgba(217, 79, 61, 0.1)',
            borderWidth: 2,
            tension: 0.3
          },
          {
            label: 'Infiltration Loss (W)',
            data: pRes.infiltrationLossWatts,
            borderColor: '#5B9BD5',
            backgroundColor: 'rgba(91, 155, 213, 0.1)',
            borderWidth: 2,
            tension: 0.3
          },
          {
            label: 'Night Sky Radiative Loss (W)',
            data: pRes.radiativeLossWatts,
            borderColor: '#9C27B0',
            backgroundColor: 'rgba(156, 39, 176, 0.1)',
            borderWidth: 2,
            tension: 0.3
          },
          {
            label: 'Net Thermal Mass Storage (W)',
            data: pRes.netStorageRateWatts,
            borderColor: '#4CAF50',
            borderDash: [4, 4],
            borderWidth: 1.5,
            tension: 0.3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { color: '#E8D5B5', font: { size: 10 }, boxWidth: 12 }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: { color: '#A08060', maxTicksLimit: 12, font: { size: 9 } }
          },
          y: {
            grid: { color: 'rgba(255,255,255,0.08)' },
            ticks: { color: '#A08060', font: { size: 10 } },
            title: { display: true, text: 'Heat Flow Rate (W)', color: '#A08060', font: { size: 10 } }
          }
        }
      }
    });
  }
}

// ── Step 7: Run Comparative Optimization ──
async function runOptimization() {
  const optContainer = document.getElementById('opt-progress-container');
  const optBar       = document.getElementById('opt-progress-bar');
  const optLabel     = document.getElementById('opt-progress-label');

  if (optContainer) optContainer.classList.remove('hidden');

  const origState = { ...window.AppState };
  const optResult = await window.optimizer.optimize(origState, (pct) => {
    if (optBar)   optBar.style.width = `${pct}%`;
    if (optLabel) optLabel.textContent = `Evaluating RC network combinations... ${pct}%`;
  });

  window.AppState.optimized = optResult;
  if (optContainer) optContainer.classList.add('hidden');

  // Render DRDO Comparative Table
  window.optimizer.renderComparativeTable('comparison-table-container', optResult);

  // Performance score comparison
  const compContainer = document.getElementById('score-comparison-container');
  if (compContainer && optResult.best) {
    compContainer.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:12px">
        <div style="display:flex;justify-content:space-between;padding:8px 12px;background:rgba(0,0,0,0.3);border-radius:6px">
          <span style="color:var(--tan)">Minimum Night Temp:</span>
          <span><span style="color:#D94F3D">${window.AppState.results?.minInsideC || 0}°C</span> ➔ <span style="color:#4CAF50;font-weight:700">${optResult.best.minNightTemp > 0 ? '+' : ''}${optResult.best.minNightTemp}°C</span></span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:8px 12px;background:rgba(0,0,0,0.3);border-radius:6px">
          <span style="color:var(--tan)">Heating Deficit (48h):</span>
          <span><span style="color:#D94F3D">${window.AppState.results?.heatingDeficitKwh || 0} kWh</span> ➔ <span style="color:#4CAF50;font-weight:700">${optResult.best.heatingDeficitKwh} kWh</span></span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:8px 12px;background:rgba(0,0,0,0.3);border-radius:6px">
          <span style="color:var(--tan)">Diurnal Temperature Swing:</span>
          <span><span style="color:#E8A838">${window.AppState.results?.diurnalSwing || 0}°C</span> ➔ <span style="color:#4CAF50;font-weight:700">${optResult.best.diurnalSwing}°C</span></span>
        </div>
      </div>
    `;
  }

  showToast(`🏆 Comparative optimization complete! Top combination identified`, 'success');
}

// ── Navigation Buttons ──
function setupNavButtons() {
  document.querySelectorAll('[data-next]').forEach(btn => {
    btn.addEventListener('click', () => {
      const next = parseInt(btn.dataset.next);
      const curr = window.AppState.step;
      const stepConf = STEPS.find(s => s.id === curr);

      if (stepConf && !stepConf.validate()) {
        const msgs = {
          1: '📍 Please select a location first',
          2: '📐 Please enter valid shelter dimensions',
          3: '🧱 Please select wall, roof AND floor materials',
        };
        showToast(msgs[curr] || 'Please complete this step', 'warning');
        return;
      }
      goToStep(next);
    });
  });

  document.querySelectorAll('[data-back]').forEach(btn => {
    btn.addEventListener('click', () => {
      goToStep(parseInt(btn.dataset.back));
    });
  });

  document.querySelectorAll('.step-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      const s = parseInt(dot.closest('.step-item').dataset.step);
      if (s < window.AppState.step || s === window.AppState.step + 1) goToStep(s);
    });
  });
}

// ── Run Analysis from Step 4 ──
function runAnalysis() {
  goToStep(5);
  requestAnimationFrame(() => {
    window.simCtrl.run((res) => {
      window.AppState.results = res;
      setTimeout(() => {
        goToStep(6);
      }, 1000);
    });
  });
}

// ── Wire Modal Dialogs & Presets ──
function setupModalsAndPresets() {
  // Preset: Leh, Ladakh
  document.getElementById('preset-leh')?.addEventListener('click', () => {
    if (window.locationCtrl) {
      window.locationCtrl.selectLocation(34.1526, 77.5771, 'Leh, Ladakh', 'cold');
      showToast('🏔️ Selected: Leh, Ladakh (Cold Desert Benchmark — 3,500m)', 'success');
    }
  });

  // Preset: Jodhpur
  document.getElementById('preset-jodhpur')?.addEventListener('click', () => {
    if (window.locationCtrl) {
      window.locationCtrl.selectLocation(26.2389, 73.0243, 'Jodhpur, Rajasthan', 'arid');
      showToast('☀️ Selected: Jodhpur, Rajasthan (Hot Arid Zone)', 'info');
    }
  });

  // Gemini Modal Open/Close
  const modalGemini = document.getElementById('modal-gemini');
  document.getElementById('btn-open-gemini')?.addEventListener('click', () => {
    if (modalGemini) modalGemini.style.display = 'flex';
  });
  document.getElementById('modal-gemini-close')?.addEventListener('click', () => {
    if (modalGemini) modalGemini.style.display = 'none';
  });

  // Gemini Modal Tabs
  document.querySelectorAll('.gemini-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.gemini-tab').forEach(t => {
        t.classList.remove('active');
        t.style.borderBottom = 'none';
        t.style.color = 'var(--tan)';
      });
      tab.classList.add('active');
      tab.style.borderBottom = '2px solid var(--gold)';
      tab.style.color = 'var(--sandal-light)';

      const tabId = tab.dataset.tab;
      document.querySelectorAll('.gemini-tab-content').forEach(c => c.style.display = 'none');
      const activeContent = document.getElementById(`tab-gemini-${tabId}`);
      if (activeContent) activeContent.style.display = 'block';
    });
  });

  // Gemini Parser Execution
  document.getElementById('btn-run-gemini-parse')?.addEventListener('click', async () => {
    const promptInput = document.getElementById('gemini-prompt-input');
    const statusEl = document.getElementById('gemini-parse-status');
    if (!promptInput || !promptInput.value.trim()) return;

    if (statusEl) statusEl.textContent = 'Parsing shelter description...';
    try {
      const parsed = await window.geminiService.parseShelterDescription(promptInput.value);
      if (parsed.dimensions) {
        window.AppState.dimensions.width = parsed.dimensions.width || 6;
        window.AppState.dimensions.length = parsed.dimensions.length || 8;
        if (parsed.dimensions.height) window.AppState.dimensions.height = parsed.dimensions.height;
        window.AppState.dimensions.area = window.AppState.dimensions.width * window.AppState.dimensions.length;
        window.AppState.dimensions.volume = window.AppState.dimensions.area * window.AppState.dimensions.height;
      }
      if (statusEl) statusEl.textContent = '✓ Configured shelter dimensions & materials!';
      showToast('✨ Shelter auto-configured from natural language prompt!', 'success');
      setTimeout(() => {
        if (modalGemini) modalGemini.style.display = 'none';
        goToStep(2);
      }, 900);
    } catch (e) {
      if (statusEl) statusEl.textContent = 'Parsing failed, check input';
    }
  });

  // Gemini Material Lookup
  document.getElementById('btn-run-gemini-mat')?.addEventListener('click', async () => {
    const q = document.getElementById('gemini-mat-query')?.value;
    const resBox = document.getElementById('gemini-mat-result');
    if (!q || !resBox) return;

    resBox.style.display = 'block';
    resBox.textContent = 'Querying engineering property database...';

    const mat = await window.geminiService.resolveMaterialProperties(q);
    resBox.innerHTML = `
      <div style="font-weight:700;color:var(--gold);margin-bottom:6px">${mat.name}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px">
        <div>Conductivity (k): <b>${mat.thermalConductivity} W/m·K</b></div>
        <div>Density: <b>${mat.density} kg/m³</b></div>
        <div>Specific Heat: <b>${mat.specificHeat} J/kg·K</b></div>
        <div>Solar Absorptance: <b>${mat.absorptance}</b></div>
      </div>
      <div style="font-size:0.72rem;color:var(--tan)">Source: ${mat.sourceRange || 'Engineering Handbook Reference'}</div>
      <div style="font-size:0.7rem;color:#E8A838;margin-top:4px">⚠️ Flagged as typical engineering estimate. Verify with lab test before manufacturing.</div>
    `;
  });

  // Gemini API Key Save
  document.getElementById('btn-save-gemini-key')?.addEventListener('click', () => {
    showToast('Gemini is connected through the backend .env configuration', 'success');
  });

  // DRDO Report Modal Open
  const modalReport = document.getElementById('modal-report');
  document.getElementById('btn-generate-drdo-report')?.addEventListener('click', async () => {
    if (modalReport) modalReport.style.display = 'flex';
    const contentEl = document.getElementById('drdo-report-content');
    if (contentEl) contentEl.textContent = 'Generating plain-language defense technical evaluation report...';

    const reportMarkdown = await window.geminiService.generateEvaluationReport(
      window.AppState.physicsResults || { summary: {} },
      window.AppState.optimized || null
    );
    if (contentEl) contentEl.textContent = reportMarkdown;
  });

  document.getElementById('modal-report-close')?.addEventListener('click', () => {
    if (modalReport) modalReport.style.display = 'none';
  });
  document.getElementById('btn-close-report')?.addEventListener('click', () => {
    if (modalReport) modalReport.style.display = 'none';
  });

  document.getElementById('btn-copy-report')?.addEventListener('click', () => {
    const txt = document.getElementById('drdo-report-content')?.textContent;
    if (txt) {
      navigator.clipboard.writeText(txt).then(() => {
        showToast('📋 Report copied to clipboard!', 'success');
      });
    }
  });
}

// ── Init ──
document.addEventListener('DOMContentLoaded', () => {
  setupNavButtons();
  setupModalsAndPresets();

  const runBtn = document.getElementById('btn-run-analysis');
  if (runBtn) runBtn.addEventListener('click', runAnalysis);

  document.getElementById('btn-auto-rotate')?.addEventListener('click', () => {
    window.shelterViewer?.toggleAutoRotate();
  });
  document.getElementById('btn-reset-cam')?.addEventListener('click', () => {
    window.shelterViewer?.resetCamera();
  });
  document.getElementById('btn-go-optimize')?.addEventListener('click', () => {
    goToStep(7);
  });

  document.getElementById('btn-start')?.addEventListener('click', () => {
    const landing = document.getElementById('landing');
    const shell = document.getElementById('app-shell');
    if (landing) landing.classList.add('hidden');
    if (shell) shell.classList.remove('hidden');
    goToStep(1);
  });
});
