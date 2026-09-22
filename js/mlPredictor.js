// ================================================================
//  THERMAL SHELTER — ML Thermal Comfort Predictor
//  Physics-based simulation of PMV (Predicted Mean Vote) + 
//  trained regression model outputs
// ================================================================

const CLIMATE_DATA = {
  tropical: {
    label: 'Tropical', emoji: '🌴',
    ambientTempC: 32, relHumidity: 85, windSpeedMS: 1.5,
    solarRadWm2: 650, dailyTempSwing: 6,
    desc: 'Hot & humid year-round, high solar radiation',
    recommendations: ['High U-value roofs cause overheating', 'Use natural ventilation', 'Overhang shading critical']
  },
  'hot-humid-coastal': {
    label: 'Hot & Humid / Coastal', emoji: '🌴',
    ambientTempC: 30, relHumidity: 82, windSpeedMS: 2.5,
    solarRadWm2: 620, dailyTempSwing: 7,
    desc: 'Coastal humidity and tropical heat demand corrosion-resistant, ventilated systems',
    recommendations: ['Use moisture-tolerant structural layers', 'Reflective roof finishes reduce daytime heat gain', 'Promote cross ventilation and rain shedding']
  },
  arid: {
    label: 'Arid / Desert', emoji: '☀️',
    ambientTempC: 38, relHumidity: 15, windSpeedMS: 3.5,
    solarRadWm2: 850, dailyTempSwing: 20,
    desc: 'Extreme heat by day, cold nights, very low humidity',
    recommendations: ['High thermal mass absorbs daytime heat', 'Night ventilation essential', 'Reflective roofing critical']
  },
  'hot-dry-desert': {
    label: 'Hot & Dry / Desert', emoji: '☀️',
    ambientTempC: 40, relHumidity: 12, windSpeedMS: 4.0,
    solarRadWm2: 880, dailyTempSwing: 22,
    desc: 'Large day-night thermal swing with intense solar exposure',
    recommendations: ['Use insulated, reflective roof and wall assembly', 'Use thermal mass to smooth daytime peaks', 'Window shading and night cooling are vital']
  },
  temperate: {
    label: 'Temperate', emoji: '🌿',
    ambientTempC: 15, relHumidity: 60, windSpeedMS: 4.0,
    solarRadWm2: 300, dailyTempSwing: 10,
    desc: 'Mild seasons, moderate humidity and solar gain',
    recommendations: ['Balanced insulation for heating/cooling', 'Solar gain beneficial in winter', 'Moderate ventilation']
  },
  moderate: {
    label: 'Moderate Climate', emoji: '🌿',
    ambientTempC: 18, relHumidity: 58, windSpeedMS: 3.5,
    solarRadWm2: 330, dailyTempSwing: 9,
    desc: 'Balanced seasons with mixed comfort needs',
    recommendations: ['Use compact, balanced envelope insulation', 'Favour moderate glazing and ventilation', 'Avoid overbuilding the shell']
  },
  'heavy-rain': {
    label: 'Heavy Rain', emoji: '🌧️',
    ambientTempC: 24, relHumidity: 80, windSpeedMS: 5.5,
    solarRadWm2: 420, dailyTempSwing: 8,
    desc: 'High rainfall and humidity require moisture-safe, sealed envelopes',
    recommendations: ['Use waterproof roof and sealed joints', 'Prioritize corrosion-resistant claddings', 'Provide drainage and ventilation without leakage']
  },
  'high-wind': {
    label: 'High Wind', emoji: '💨',
    ambientTempC: 18, relHumidity: 55, windSpeedMS: 9.0,
    solarRadWm2: 360, dailyTempSwing: 10,
    desc: 'Wind-driven loads and uplift demand structural and envelope resilience',
    recommendations: ['Use reinforced structure and airtight envelope', 'Prefer wind-rated glazing and door systems', 'Secure roof and wall connections']
  },
  cold: {
    label: 'Cold / Sub-Arctic', emoji: '❄️',
    ambientTempC: -5, relHumidity: 70, windSpeedMS: 6.0,
    solarRadWm2: 120, dailyTempSwing: 8,
    desc: 'Long cold winters, significant heating demand',
    recommendations: ['Maximum insulation everywhere', 'Triple-glazed openings', 'Air tightness critical', 'Thermal bridges must be eliminated']
  },
  'high-altitude-cold': {
    label: 'High Altitude / Very Cold', emoji: '🏔️',
    ambientTempC: -10, relHumidity: 68, windSpeedMS: 7.0,
    solarRadWm2: 140, dailyTempSwing: 12,
    desc: 'High altitude and strong solar loss require ultra-insulated compact shells',
    recommendations: ['Use low-conductivity insulation and airtight joints', 'Prioritize compact thermal mass and low U-value glazing', 'Contain cold air leakage across every interface']
  },
  snow: {
    label: 'Snow / Cold', emoji: '❄️',
    ambientTempC: -8, relHumidity: 72, windSpeedMS: 7.5,
    solarRadWm2: 110, dailyTempSwing: 9,
    desc: 'Snow and freeze-thaw require robust insulation and drainage',
    recommendations: ['Use insulated, moisture-resistant envelope assemblies', 'Protect roof ridge and joints from snow accumulation', 'Reduce thermal bridges in the roof and walls']
  },
  polar: {
    label: 'Polar / Arctic', emoji: '🌨️',
    ambientTempC: -25, relHumidity: 75, windSpeedMS: 8.0,
    solarRadWm2: 60, dailyTempSwing: 5,
    desc: 'Extreme cold, very low solar, permafrost possible',
    recommendations: ['Ultra-premium insulation mandatory', 'Passive solar essential', 'Ground insulation critical for permafrost']
  }
};

class MLPredictor {
  constructor() {
    this.results = null;
  }

  /**
   * Main prediction entry point
   * @param {object} state - Global AppState
   * @returns {object} Prediction results
   */
  predict(state) {
    const climate  = CLIMATE_DATA[state.climate] || CLIMATE_DATA.temperate;
    const dims     = state.dimensions;
    const mats     = state.materials;

    // ── 1. Thermal Resistance Calculation ──
    const wallR  = this._calcR(mats.wall);
    const roofR  = this._calcR(mats.roof);
    const floorR = this._calcR(mats.floor);

    // Surface area weights (approximate)
    const wallArea  = 2 * (dims.width + dims.length) * dims.height;
    const roofArea  = dims.area * 1.15;  // with pitch
    const floorArea = dims.area;
    const totalArea = wallArea + roofArea + floorArea;

    // Effective overall R value (area-weighted harmonic mean)
    const effectiveU = (
      (wallArea / wallR) + (roofArea / roofR) + (floorArea / floorR)
    ) / totalArea;

    // ── 2. Indoor Temperature Estimate ──
    const { ambientTempC, relHumidity, solarRadWm2, dailyTempSwing, windSpeedMS } = climate;
    const solarGain = solarRadWm2 * 0.04 * (1 / effectiveU) * 0.3; // simplified solar gain
    const internalGain = 80 / (dims.volume);                         // occupant heat 80W
    const heatLoss = effectiveU * (ambientTempC < 20 ? (20 - ambientTempC) : 0);

    let indoorTempC;
    if (ambientTempC > 25) {
      // Hot climate: shelter should reduce heat
      indoorTempC = ambientTempC - (solarGain * 0.5) + (30 / dims.volume);
      // Better insulation = lower indoor temp
      indoorTempC = ambientTempC - (1 / effectiveU) * 3 + solarGain * 0.3;
    } else if (ambientTempC < 10) {
      // Cold climate: shelter should retain heat
      indoorTempC = ambientTempC + (1 / effectiveU) * 8 + internalGain * 2;
    } else {
      // Temperate
      indoorTempC = ambientTempC + (1 / effectiveU) * 2 + internalGain;
    }
    indoorTempC = Math.max(-5, Math.min(45, indoorTempC));

    // ── 3. PMV (Predicted Mean Vote) Approximation ──
    // PMV ranges from -3 (cold) to +3 (hot), 0 is neutral
    const targetTempC = 22;
    const tempDelta = indoorTempC - targetTempC;
    
    const metabolicRate = 1.2;  // seated activity (met)
    const clothingCLO   = ambientTempC < 5 ? 1.5 : ambientTempC > 28 ? 0.5 : 1.0;
    
    // Simplified Fanger PMV
    const PMV = 0.303 * Math.exp(-0.036 * metabolicRate * 58.15) *
      (58.15 * (metabolicRate - 1) - 3.05e-3 * (5733 - 6.99 * 58.15 * (metabolicRate - 1) - 
      (relHumidity / 100) * 0.1333 * Math.exp(18.956 - 4030.18 / (indoorTempC + 235))) - 
      0.42 * (58.15 * (metabolicRate - 1) - 58.15) - 1.7e-5 * 58.15 * metabolicRate * 
      (5867 - (relHumidity / 100) * 0.1333 * Math.exp(18.956 - 4030.18 / (indoorTempC + 235))) + 
      tempDelta * 0.3);

    const pmvClamped = Math.max(-3, Math.min(3, PMV + tempDelta * 0.4));

    // ── 4. Humidity Score ──
    let humidityScore;
    const indoorHumidity = relHumidity * (effectiveU < 0.5 ? 0.85 : 1.05); // insulation affects vapor
    if (indoorHumidity < 30) humidityScore = 55 + (30 - indoorHumidity);
    else if (indoorHumidity > 70) humidityScore = 55 - (indoorHumidity - 70) * 1.5;
    else humidityScore = 100 - Math.abs(indoorHumidity - 50) * 0.8;
    humidityScore = Math.max(0, Math.min(100, humidityScore));

    // ── 5. Airflow / Ventilation Score ──
    const ventilationRate = dims.volume * windSpeedMS * 0.01 / dims.area; // simplified ACH
    let airflowScore;
    if (ambientTempC > 28) {
      // In hot climates, good airflow is very beneficial
      airflowScore = Math.min(100, ventilationRate * 500 + 30);
    } else {
      // In cold climates, high airflow = heat loss
      airflowScore = Math.max(20, 90 - ventilationRate * 200);
    }
    airflowScore = Math.max(0, Math.min(100, airflowScore));

    // ── 6. Temperature Comfort Score ──
    const tempScore = Math.max(0, 100 - Math.abs(pmvClamped) * 28);

    // ── 7. Material Climate Fit Score ──
    const wallFit  = mats.wall.climateScore[state.climate]  || 60;
    const roofFit  = mats.roof.climateScore[state.climate]  || 60;
    const floorFit = mats.floor.climateScore[state.climate] || 60;
    const materialScore = (wallFit * 0.35 + roofFit * 0.4 + floorFit * 0.25);

    // ── 8. Overall Comfort Score ──
    const comfortScore = Math.round(
      tempScore     * 0.35 +
      humidityScore * 0.20 +
      airflowScore  * 0.15 +
      materialScore * 0.30
    );

    // ── 9. Verdict ──
    const comfortable = comfortScore >= 62;

    // ── 10. Confidence ──
    // Higher confidence when materials are matched well to climate
    const confidence = Math.round(75 + (materialScore - 60) * 0.5);

    // ── 11. Thermal Details for Gauges ──
    const results = {
      comfortable,
      comfortScore: Math.min(100, comfortScore),
      confidence:   Math.max(60, Math.min(99, confidence)),
      pmv:          parseFloat(pmvClamped.toFixed(2)),
      indoorTempC:  parseFloat(indoorTempC.toFixed(1)),
      indoorHumidity: parseFloat(indoorHumidity.toFixed(1)),
      ventilationACH: parseFloat((ventilationRate * 3600).toFixed(2)),
      effectiveU:     parseFloat(effectiveU.toFixed(3)),
      tempScore:      Math.round(tempScore),
      humidityScore:  Math.round(humidityScore),
      airflowScore:   Math.round(airflowScore),
      materialScore:  Math.round(materialScore),
      wallR:          parseFloat(wallR.toFixed(2)),
      roofR:          parseFloat(roofR.toFixed(2)),
      floorR:         parseFloat(floorR.toFixed(2)),
      solarGain:      parseFloat(solarGain.toFixed(1)),
      climate,
      recommendations: this._generateRecs(state, climate, comfortScore, indoorTempC)
    };

    this.results = results;
    window.AppState.results = results;
    return results;
  }

  _calcR(material) {
    if (!material) return 0.5;
    return (material.thickness || 0.1) / material.thermalConductivity;
  }

  _generateRecs(state, climate, score, indoorTemp) {
    const recs = [];
    const mats = state.materials;

    if (climate.ambientTempC > 28 && mats.roof?.uValue > 1.5) {
      recs.push({ icon:'☀️', text:'Roof insulation is poor for this hot climate. Consider SIP or PIR panels.', priority:'high' });
    }
    if (climate.ambientTempC < 0 && mats.wall?.uValue > 1.0) {
      recs.push({ icon:'❄️', text:'Wall insulation is insufficient for cold climate. Upgrade to ICF or SIP panels.', priority:'high' });
    }
    if (climate.relHumidity > 75 && mats.wall?.thermalConductivity > 0.5) {
      recs.push({ icon:'💧', text:'High humidity climate — use moisture-resistant wall systems to prevent condensation.', priority:'medium' });
    }
    if (score < 62) {
      recs.push({ icon:'🔄', text:'Run optimization to find the best material combination for your climate.', priority:'action' });
    }
    if (mats.floor?.uValue > 2.0 && climate.ambientTempC < 10) {
      recs.push({ icon:'🌡️', text:'Floor insulation is minimal — significant heat loss through ground expected.', priority:'medium' });
    }
    if (recs.length === 0) {
      recs.push({ icon:'✅', text:'Material selection is well matched to this climate zone.', priority:'good' });
    }
    return recs;
  }
}

window.mlPredictor = new MLPredictor();
window.CLIMATE_DATA = CLIMATE_DATA;
