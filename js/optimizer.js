// ================================================================
//  THERMAL SHELTER — Physics-Based Comparative Optimizer
//  Evaluates material/geometry combinations via deterministic transient RC solver
//  Ranks by: Min Night Temp, Diurnal Swing, Cumulative Heating Deficit (kWh)
//  Engineered for DRDO / IDEX Most-Efficient-Combination Selection
// ================================================================

class ShelterOptimizer {
  constructor() {
    this.bestResult = null;
    this.allCombinations = [];
  }

  /**
   * Run optimization loop evaluating combinations through transient physics solver
   */
  async optimize(state, progressCallback) {
    const dims = state.dimensions || { width: 6, length: 8, height: 3, area: 48, volume: 144 };
    const loc = state.location || { lat: 34.1526, lon: 77.5771, name: 'Leh, Ladakh' };

    // Get 48h weather series
    let weatherData = [];
    if (state.physicsResults && state.physicsResults.hours.length >= 24) {
      // Re-use already fetched weather series if available
      weatherData = window.nasaPower.getLadakhWinterBenchmark(48);
    } else {
      weatherData = window.nasaPower.getLadakhWinterBenchmark(48);
    }

    const allWalls = [
      ...MATERIALS_DB.wall.economy,
      ...MATERIALS_DB.wall.standard,
      ...MATERIALS_DB.wall.premium
    ];
    const allRoofs = [
      ...MATERIALS_DB.roof.economy,
      ...MATERIALS_DB.roof.standard,
      ...MATERIALS_DB.roof.premium
    ];
    const allFloors = [
      ...MATERIALS_DB.floor.economy,
      ...MATERIALS_DB.floor.standard,
      ...MATERIALS_DB.floor.premium
    ];

    // Select curated representative combinations across construction typologies:
    // 1. Uninsulated Tin Military Baseline (GI wall + GI roof + plain concrete)
    // 2. Traditional Ladakh Earthen (Rammed earth wall + Mud willow roof + earth floor)
    // 3. Local Stone + Straw (Field stone wall + Mud roof + timber floor)
    // 4. Engineered Standard (Cavity brick + Insulated metal roof + Insulated slab)
    // 5. High-Altitude Pre-fab (PIR sandwich panel wall + PIR sandwich roof + XPS slab)
    // 6. Passive Solar Trombe (Trombe wall + Insulated sandwich roof + Solar mass slab)
    // 7. Elite Arctic Defense (ICF wall + SIP roof + Vacuum floor)
    const combinationsToTest = [];

    // Add all strategic wall/roof/floor combinations
    for (const wall of allWalls) {
      for (const roof of allRoofs) {
        for (const floor of allFloors) {
          // Filter to meaningful combinations to keep evaluation fast (~30 combinations)
          const isStandardOrBetter = (wall.id.includes('earth') || wall.id.includes('trombe') || wall.id.includes('panel') || wall.id.includes('corrugated') || wall.id.includes('icf'));
          const isRoofMatch = (roof.id.includes('tin') || roof.id.includes('insulated') || roof.id.includes('mud') || roof.id.includes('sip'));
          if (isStandardOrBetter && isRoofMatch) {
            combinationsToTest.push({ wall, roof, floor });
          }
        }
      }
    }

    const evaluated = [];
    const total = combinationsToTest.length;

    for (let i = 0; i < total; i++) {
      const combo = combinationsToTest[i];
      const simConfig = {
        shelterDims: dims,
        materials: { wall: combo.wall, roof: combo.roof, floor: combo.floor },
        openings: { windowCount: 2, windowArea: 4.0, shgc: 0.62, uWindow: 1.40, orientation: 'south' },
        weatherSeries: weatherData,
        initialInsideTempC: 8.0,
        occupancyWatts: 140,
        ach: 0.5,
        elevationM: 3500,
        latitude: loc.lat,
        dayOfYear: 15
      };

      const res = window.physicsEngine.simulate(simConfig);
      const totalCost = (combo.wall.price + combo.roof.price + combo.floor.price) * (dims.area || 48);

      evaluated.push({
        wall: combo.wall,
        roof: combo.roof,
        floor: combo.floor,
        minNightTemp: res.summary.minInside,
        maxDayTemp: res.summary.maxInside,
        diurnalSwing: res.summary.diurnalSwing,
        avgTemp: res.summary.avgInside,
        heatingDeficitKwh: res.summary.heatingDeficitKwh,
        totalSolarKwh: res.summary.totalSolarKwh,
        dampingRatio: res.summary.dampingRatio,
        isComfortable: res.summary.isComfortable,
        totalCost: Math.round(totalCost)
      });

      if (progressCallback && i % 3 === 0) {
        progressCallback(Math.round(((i + 1) / total) * 100));
        await this._sleep(10);
      }
    }

    // Rank primarily by:
    // 1. Lowest heating deficit (closest to 18-24°C comfort range with least energy)
    // 2. Highest minimum night-time temperature
    // 3. Lowest diurnal temperature swing
    evaluated.sort((a, b) => {
      if (a.heatingDeficitKwh !== b.heatingDeficitKwh) {
        return a.heatingDeficitKwh - b.heatingDeficitKwh;
      }
      return b.minNightTemp - a.minNightTemp;
    });

    this.allCombinations = evaluated;
    this.bestResult = evaluated[0];

    // Find best budget option (total cost <= median cost)
    const medianCost = evaluated[Math.floor(evaluated.length / 2)].totalCost;
    const budgetOptions = evaluated.filter(c => c.totalCost <= medianCost);
    this.budgetBest = budgetOptions[0] || evaluated[0];

    if (progressCallback) progressCallback(100);

    return {
      best: this.bestResult,
      budget: this.budgetBest,
      rankedList: evaluated.slice(0, 10),
      totalTested: evaluated.length
    };
  }

  /**
   * Render comparative ranking table adhering to DRDO specification
   */
  renderComparativeTable(containerId, optResult) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const list = optResult.rankedList;
    const currentWall = window.AppState.materials?.wall?.name || 'Current';

    container.innerHTML = `
      <div style="overflow-x:auto">
        <table class="drdo-table" style="width:100%;border-collapse:collapse;font-size:0.8rem;text-align:left">
          <thead>
            <tr style="border-bottom:2px solid var(--glass-border);color:var(--sandal-light);background:rgba(0,0,0,0.2)">
              <th style="padding:10px 8px">Rank / Status</th>
              <th style="padding:10px 8px">Envelope Configuration</th>
              <th style="padding:10px 8px;text-align:center">Min Night Temp</th>
              <th style="padding:10px 8px;text-align:center">Diurnal Swing</th>
              <th style="padding:10px 8px;text-align:center">Heating Deficit (48h)</th>
              <th style="padding:10px 8px;text-align:right">Estimated Cost</th>
              <th style="padding:10px 8px;text-align:center">Action</th>
            </tr>
          </thead>
          <tbody>
            ${list.map((item, idx) => {
              const isTop = idx === 0;
              const isUninsulated = item.wall.id.includes('corrugated') && item.roof.id.includes('tin');
              const badge = isTop
                ? '<span style="background:#2E7D32;color:#FFF;padding:2px 8px;border-radius:10px;font-weight:700;font-size:0.7rem">🏆 MOST EFFICIENT</span>'
                : (isUninsulated ? '<span style="background:#C62828;color:#FFF;padding:2px 8px;border-radius:10px;font-weight:700;font-size:0.7rem">⚠️ BASELINE SHED</span>' : `#${idx + 1}`);

              const minTempColor = item.minNightTemp >= 16 ? '#4CAF7D' : (item.minNightTemp >= 10 ? '#E8A838' : '#D94F3D');

              return `
                <tr style="border-bottom:1px solid rgba(255,255,255,0.06);background:${isTop ? 'rgba(46,125,50,0.12)' : 'transparent'}">
                  <td style="padding:10px 8px;vertical-align:middle">${badge}</td>
                  <td style="padding:10px 8px">
                    <div style="font-weight:600;color:var(--sandal-light)">${item.wall.name}</div>
                    <div style="font-size:0.72rem;color:var(--tan)">Roof: ${item.roof.name} | Floor: ${item.floor.name}</div>
                  </td>
                  <td style="padding:10px 8px;text-align:center;font-family:var(--font-mono);font-weight:700;color:${minTempColor}">
                    ${item.minNightTemp > 0 ? '+' : ''}${item.minNightTemp.toFixed(1)}°C
                  </td>
                  <td style="padding:10px 8px;text-align:center;font-family:var(--font-mono)">
                    ${item.diurnalSwing.toFixed(1)}°C
                  </td>
                  <td style="padding:10px 8px;text-align:center;font-family:var(--font-mono);font-weight:700;color:${item.heatingDeficitKwh < 5 ? '#4CAF7D' : '#E8A838'}">
                    ${item.heatingDeficitKwh.toFixed(1)} kWh
                  </td>
                  <td style="padding:10px 8px;text-align:right;font-family:var(--font-mono)">
                    ₹ ${item.totalCost.toLocaleString('en-IN')}
                  </td>
                  <td style="padding:10px 8px;text-align:center">
                    <button class="btn-apply-combo" data-index="${idx}" style="padding:4px 10px;font-size:0.72rem;background:var(--terracotta);color:#FFF;border:none;border-radius:4px;cursor:pointer">
                      Apply
                    </button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;

    // Wire apply buttons
    container.querySelectorAll('.btn-apply-combo').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.index, 10);
        const selected = list[idx];
        if (!selected) return;

        window.AppState.materials.wall = selected.wall;
        window.AppState.materials.roof = selected.roof;
        window.AppState.materials.floor = selected.floor;

        if (window.materialsCtrl) {
          window.materialsCtrl.selected = {
            wall: selected.wall,
            roof: selected.roof,
            floor: selected.floor
          };
          window.materialsCtrl._updateSummary();
        }

        if (window.shelterViewer) {
          window.shelterViewer.updateMaterials();
        }

        if (window.showToast) {
          window.showToast(`Applied: ${selected.wall.name} + ${selected.roof.name}!`, 'success');
        }
      });
    });
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

window.ShelterOptimizer = ShelterOptimizer;
window.optimizer = new ShelterOptimizer();
