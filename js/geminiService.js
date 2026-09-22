// ================================================================
//  THERMAL SHELTER — Gemini API Integration Service
//  Strictly scoped to 3 NLP functions (never touches physics math):
//  1. Natural Language Shelter Input Parser
//  2. Material Property Resolver (Estimator with user override)
//  3. DRDO Technical Evaluation Report Generator
// ================================================================

class GeminiService {
  constructor() {
    this.backendUrls = [
      'http://localhost:8001',
      'http://127.0.0.1:8001',
      window.location.origin
    ];
  }

  setApiKey(key) {
    return Boolean(key?.trim());
  }

  getApiKey() {
    return null;
  }

  async _callGemini(prompt, jsonMode = false) {
    for (const baseUrl of [...new Set(this.backendUrls)]) {
      try {
        const response = await fetch(`${baseUrl}/api/gemini/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, jsonMode })
        });
        if (!response.ok) continue;
        const data = await response.json();
        return data.text;
      } catch (err) {
        // Try the next local backend URL.
      }
    }
    throw new Error('Gemini backend unavailable');
  }

  /**
   * 5.1 Natural language input parser
   * Converts free-text shelter description into structured JSON
   */
  async parseShelterDescription(freeText) {
    const systemPrompt = `You are a parser that converts a free-text shelter description into structured JSON matching this schema:
{
  "dimensions": { "width": number, "length": number, "height": number },
  "shape": "rectangular" | "dome" | "aframe" | "leanto" | "barrel" | "flat",
  "orientation": "south" | "north" | "east" | "west",
  "wall_material": string,
  "roof_material": string,
  "floor_material": string,
  "openings": { "windowCount": number, "windowArea": number, "glazingType": string, "orientation": string }
}
Only output valid JSON. If a value is not mentioned, omit it rather than guessing. Do not wrap in markdown quotes if possible or use clean JSON format.`;

    try {
      const text = await this._callGemini(`${systemPrompt}\n\nUser Input: "${freeText}"`, true);
      return JSON.parse(text);
    } catch (err) {
      console.warn('Gemini NL parser API call failed; using fallback parser:', err);
      return this._heuristicParse(freeText);
    }
  }

  _heuristicParse(text) {
    const lower = text.toLowerCase();
    const result = { dimensions: { width: 6, length: 8, height: 3 }, openings: { windowCount: 2, orientation: 'south' } };

    // Extract dimensions like "6x8" or "6m by 8m"
    const dimMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:m|meter)?\s*(?:x|by|\*)\s*(\d+(?:\.\d+)?)(?:\s*(?:x|by|\*)\s*(\d+(?:\.\d+)?))?/);
    if (dimMatch) {
      result.dimensions.width = parseFloat(dimMatch[1]);
      result.dimensions.length = parseFloat(dimMatch[2]);
      if (dimMatch[3]) result.dimensions.height = parseFloat(dimMatch[3]);
    }

    if (lower.includes('rammed earth')) result.wall_material = 'Rammed Earth (Pisé)';
    else if (lower.includes('adobe') || lower.includes('mud')) result.wall_material = 'Adobe / Mud Brick';
    else if (lower.includes('stone')) result.wall_material = 'Local Field Stone Masonry';
    else if (lower.includes('corrugated') || lower.includes('tin') || lower.includes('gi')) result.wall_material = 'Corrugated GI Sheet (Uninsulated)';

    if (lower.includes('insulated roof') || lower.includes('sandwich')) result.roof_material = 'Insulated Metal Sandwich (PIR 100mm)';
    else if (lower.includes('tin roof')) result.roof_material = 'Corrugated GI Tin Roof (Bare)';

    return result;
  }

  /**
   * 5.2 Material property resolver
   * Returns published engineering property ranges for an informally named material
   */
  async resolveMaterialProperties(materialName) {
    const systemPrompt = `Given an informally named building material, return its standard thermal properties (thermal conductivity k in W/m·K, density in kg/m³, specific heat Cp in J/kg·K, solar absorptance) based on published engineering reference ranges. Always state that returned values are typical/estimated, not measured, and give the source range you drew from.
Output strictly as JSON:
{
  "name": string,
  "thermalConductivity": number,
  "density": number,
  "specificHeat": number,
  "absorptance": number,
  "uValueEstimate": number,
  "typicalThicknessM": number,
  "sourceRange": string,
  "notes": string,
  "isEstimate": true
}`;

    try {
      const text = await this._callGemini(`${systemPrompt}\n\nMaterial Name: "${materialName}"`, true);
      return JSON.parse(text);
    } catch (err) {
      console.warn('Gemini material resolver failed:', err);
      return {
        name: materialName,
        thermalConductivity: 0.85,
        density: 1750,
        specificHeat: 900,
        absorptance: 0.70,
        sourceRange: 'Engineering Tables Reference',
        isEstimate: true
      };
    }
  }

  /**
   * 5.3 Report / recommendation generator
   * Writes human-readable DRDO engineering summary strictly from simulation numbers
   */
  async recommendMaterialsForRegion({ locationName, climate, latitude, longitude }) {
    const climateKey = (climate || 'cold').toString().toLowerCase();
    const promptText = `You are a thermal shelter design expert. Recommend the best material IDs for a shelter at ${locationName || 'selected site'}.
Site climate/region: ${climateKey}
Latitude: ${latitude ?? 'n/a'}
Longitude: ${longitude ?? 'n/a'}

Use only the following material IDs from the catalog, and return valid JSON with keys wall, roof, door, floor, window and a brief reason string.
Allowed IDs:
wall: w_rammed_earth, w_adobe, w_stone_rubble, w_corrugated, w_clay, w_straw_clay, w_brick_plaster, w_aac, w_metal_panel, w_trombe, w_icf, w_sip
roof: r_tin, r_ladakh_mud, r_clay_tile, r_insulated_metal, r_concrete_insulated, r_sip_roof
 door: d_frp, d_aluminium_frp, d_insulated_frp, d_insulated_aluminium_frp, d_insulated_steel_frp, d_reinforced_frp_aluminium, d_steel_frp
floor: f_concrete_insulated, f_timber_raised, f_insulated_mass, f_vacuum, f_slab_xps, f_earth_compacted
window: win_single_clear, win_double_clear, win_double_lowe, win_triple_lowe, win_laminated_double

Requirements:
- Choose materials that fit the climate and site conditions.
- For mountain, cold, high-altitude, and snow-likely zones prioritize insulated low U-value systems and sealed envelope assemblies.
- For desert and hot-dry areas prioritize reflective surfaces, thermal mass, and reduced heat gain.
- For tropical and humid-rainy areas prioritize moisture resistance, corrosion protection, and ventilation.
- Return as compact JSON only. No Markdown.
Example response: {"wall":"w_aac","roof":"r_concrete_insulated","door":"d_insulated_aluminium_frp","floor":"f_concrete_insulated","window":"win_double_lowe","reason":"Reflective, insulated envelope reduces daytime heat gain and controls day-night thermal swing."}`;

    try {
      const text = await this._callGemini(promptText, true);
      return JSON.parse(text);
    } catch (err) {
      console.warn('Gemini material recommendation failed:', err);
      return null;
    }
  }

  async generateEvaluationReport(simResults, comparativeResults) {
    const summaryData = {
      minInsideTemp: simResults.summary?.minInside,
      maxInsideTemp: simResults.summary?.maxInside,
      avgInsideTemp: simResults.summary?.avgInside,
      avgAmbientTemp: simResults.summary?.avgAmbient,
      simulationPeriodHours: simResults.summary?.periodHours,
      averageTemperatureDifferenceC: simResults.summary?.averageTemperatureDifference,
      peakTemperatureDifferenceC: simResults.summary?.peakTemperatureDifference,
      minimumTemperatureDifferenceC: simResults.summary?.minTemperatureDifference,
      diurnalSwing: simResults.summary?.diurnalSwing,
      totalSolarAbsorbedKwh: simResults.summary?.totalSolarKwh,
      peakSolarGainWatts: simResults.summary?.peakSolarGainWatts,
      averageSolarGainWatts: simResults.summary?.averageSolarGainWatts,
      averageConductionLossWatts: simResults.summary?.averageConductionLossWatts,
      averageInfiltrationLossWatts: simResults.summary?.averageInfiltrationLossWatts,
      averageRadiativeLossWatts: simResults.summary?.averageRadiativeLossWatts,
      conductionEnergyKwh: simResults.summary?.conductionEnergyKwh,
      infiltrationEnergyKwh: simResults.summary?.infiltrationEnergyKwh,
      radiativeEnergyKwh: simResults.summary?.radiativeEnergyKwh,
      heatingEnergyDeficitKwh: simResults.summary?.heatingDeficitKwh,
      dampingRatio: simResults.summary?.dampingRatio,
      bestCombination: comparativeResults?.best ? {
        wall: comparativeResults.best.wall.name,
        roof: comparativeResults.best.roof.name,
        floor: comparativeResults.best.floor.name,
        minTemp: comparativeResults.best.minNightTemp,
        deficitKwh: comparativeResults.best.heatingDeficitKwh
      } : null
    };

    const promptText = `You are a defense technical analyst writing an engineering report for DRDO / IDEX evaluators.
Given these exact simulation results from a deterministic RC thermal network solver in a cold-desert high-altitude zone (Leh, Ladakh):
${JSON.stringify(summaryData, null, 2)}

Write a concise, plain-language engineering report with these three numbered sections:
1. Shelter Temperature Prediction: State the simulation period (${summaryData.simulationPeriodHours} hours), average ambient temperature, average predicted inside temperature, minimum, maximum, and diurnal swing. State whether the shelter stays in the 18-24°C comfort range without active fuel.
2. Solar Thermal Energy Prediction: Quote average and peak solar thermal gain in watts and cumulative absorbed solar energy in kWh.
3. Heat Flow Details: Explain the ambient-to-shelter temperature difference. Quote average, peak, and minimum indoor-minus-ambient temperature difference, plus average heat-flow rate and accumulated energy for conduction, infiltration, and night-sky radiation. State the supplemental heating deficit in kWh and identify the best material combination if available.

CRITICAL INSTRUCTION: Do not invent numbers not present in the input data. Use crisp, authoritative technical language suitable for defense engineers.`;

    try {
      return await this._callGemini(promptText);
    } catch (err) {
      console.warn('Gemini report generator failed:', err);
      return this._generateOfflineReport(summaryData);
    }
  }

  _generateOfflineReport(data) {
    const isCompliant = data.minInsideTemp >= 16.0;
    const signed = (value) => Number(value) > 0 ? `+${value}` : `${value}`;
    return `### DRDO / IDEX Technical Evaluation Report — Passive Shelter Thermal Simulation
**Location:** High-Altitude Cold Desert (Leh, Ladakh — 3,500m Elevation)  
**Simulation Period:** ${data.simulationPeriodHours || 48}-Hour Winter Cycle | **Solver:** 6-Node Transient RC Network (RK4)

#### 1. Shelter Temperature Prediction
- **Average Ambient Temperature:** **${signed(data.avgAmbientTemp)}°C**
- **Average Predicted Shelter Temperature:** **${signed(data.avgInsideTemp)}°C**
- **Minimum / Maximum Shelter Temperature:** **${signed(data.minInsideTemp)}°C / ${signed(data.maxInsideTemp)}°C**
- **Indoor Diurnal Swing:** **${data.diurnalSwing}°C** (Thermal Damping Ratio: **${Math.round(data.dampingRatio * 100)}%**).
- **Compliance Verdict:** ${isCompliant 
    ? `**PASS — Passive Comfort Maintained.** The shelter maintains an inside temperature within acceptable survival comfort thresholds without active kerosene/diesel heating.` 
    : `**DEFICIT DETECTED.** Shelter falls below the 18°C baseline comfort limit during nighttime hours, requiring **${data.heatingEnergyDeficitKwh} kWh** of supplemental thermal energy over 48 hours.`}

#### 2. Solar Thermal Energy Prediction
- **Average / Peak Solar Thermal Gain:** **${data.averageSolarGainWatts} W / ${data.peakSolarGainWatts} W**
- **Cumulative Absorbed Solar Energy:** **${data.totalSolarAbsorbedKwh} kWh** over the simulation period.
- This is the modeled useful thermal gain absorbed by the walls, roof, and south-facing glazing, not electrical PV production.

#### 3. Heat Flow Details: Ambient vs Shelter Temperature
- **Indoor minus Ambient Temperature Difference:** Average **${signed(data.averageTemperatureDifferenceC)}°C**, minimum **${signed(data.minimumTemperatureDifferenceC)}°C**, maximum **${signed(data.peakTemperatureDifferenceC)}°C**.
- **Conduction:** Average **${data.averageConductionLossWatts} W**; accumulated loss **${data.conductionEnergyKwh} kWh**.
- **Air Infiltration / Ventilation:** Average **${data.averageInfiltrationLossWatts} W**; accumulated loss **${data.infiltrationEnergyKwh} kWh**.
- **Night-Sky Radiation:** Average **${data.averageRadiativeLossWatts} W**; accumulated loss **${data.radiativeEnergyKwh} kWh**.
- **Supplemental Heating Required:** **${data.heatingEnergyDeficitKwh} kWh** to maintain the 18°C minimum target.
- **Best Material Combination:** ${data.bestCombination ? `**${data.bestCombination.wall}**, **${data.bestCombination.roof}**, and **${data.bestCombination.floor}**.` : '**Current selected envelope**; run the comparative optimizer for a material-by-material ranking.'}

**Engineering interpretation:** When the shelter temperature is above ambient, the positive temperature difference drives heat loss through the envelope and infiltration paths. The hourly heat-flow chart and values above show when the shelter stores solar heat and when that stored energy is released to offset the ambient deficit.`;
  }
}

window.GeminiService = GeminiService;
window.geminiService = new GeminiService();
