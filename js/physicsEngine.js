// ================================================================
//  THERMAL SHELTER — Deterministic RC Thermal Network Physics Engine
//  Transient heat-balance solver (4th-Order Runge-Kutta ODE Integrator)
//  Engineered for DRDO / IDEX Passive Shelter Thermal Simulation
// ================================================================

class PhysicsEngine {
  constructor() {
    this.SIGMA = 5.670374419e-8; // Stefan-Boltzmann constant [W/(m²·K⁴)]
    this.RHO_AIR_SEA = 1.204;     // Air density at sea level [kg/m³]
    this.CP_AIR = 1005;          // Specific heat capacity of air [J/(kg·K)]
    this.H_IN = 8.29;            // Interior surface convection coeff [W/(m²·K)]
    this.H_OUT_BASE = 15.0;      // Exterior base convection coeff [W/(m²·K)]
    this.MIN_RESISTANCE = 0.02;
  }

  /**
   * Air density adjusted for elevation (barometric formula)
   * High-altitude Ladakh (elevation ~3500m): rho ~ 0.82 - 0.85 kg/m³
   */
  getAirDensity(elevationM = 0) {
    if (elevationM <= 0) return this.RHO_AIR_SEA;
    return this.RHO_AIR_SEA * Math.exp(-elevationM / 8500);
  }

  /**
   * Solar position equations (declination, hour angle, altitude, azimuth)
   * Based on Duffie & Beckman / ASHRAE standard solar geometry.
   * @param {number} lat - Latitude in degrees
   * @param {number} dayOfYear - Day of year (1-365)
   * @param {number} hourOfDay - Local solar time (0.0 - 24.0)
   */
  getSolarPosition(lat, dayOfYear, hourOfDay) {
    const rad = Math.PI / 180;
    const latRad = lat * rad;

    // Solar declination delta (Spencer / Cooper equation)
    const b = (2 * Math.PI * (dayOfYear - 1)) / 365;
    const declinationRad = 23.45 * rad * Math.sin((360 / 365) * (284 + dayOfYear) * rad);

    // Solar hour angle omega (15 deg per hour from solar noon)
    const hourAngleRad = (hourOfDay - 12) * 15 * rad;

    // Solar altitude angle alpha_s
    const sinAlpha = Math.sin(latRad) * Math.sin(declinationRad) +
                     Math.cos(latRad) * Math.cos(declinationRad) * Math.cos(hourAngleRad);
    const altitudeRad = Math.asin(Math.max(-1, Math.min(1, sinAlpha)));

    if (altitudeRad <= 0) {
      return { altitude: 0, azimuth: 0, isDay: false };
    }

    // Solar azimuth angle gamma_s (0 = South, East = -90, West = +90)
    const cosGamma = (Math.sin(altitudeRad) * Math.sin(latRad) - Math.sin(declinationRad)) /
                     (Math.cos(altitudeRad) * Math.cos(latRad) + 1e-6);
    let azimuthRad = Math.acos(Math.max(-1, Math.min(1, cosGamma)));
    if (hourAngleRad < 0) {
      azimuthRad = -azimuthRad; // Morning (East)
    }

    return {
      altitude: altitudeRad,
      azimuth: azimuthRad,
      isDay: true
    };
  }

  /**
   * Calculate incident solar irradiance on a planar surface (W/m²)
   * @param {object} solarPos - { altitude, azimuth, isDay }
   * @param {number} surfTilt - Surface tilt in rad (0 = horiz, PI/2 = vertical)
   * @param {number} surfAzimuth - Surface azimuth in rad (0 = South, PI/2 = West, -PI/2 = East, PI = North)
   * @param {number} ghi - Global Horizontal Irradiance [W/m²]
   * @param {number} dhi - Diffuse Horizontal Irradiance [W/m²]
   * @param {number} groundAlbedo - Ground reflectance (0.25 normal, 0.60 snow)
   */
  getIncidentSolar(solarPos, surfTilt, surfAzimuth, ghi, dhi, groundAlbedo = 0.25) {
    if (!solarPos.isDay || ghi <= 1) return 0;

    const dniHorizontal = Math.max(0, ghi - dhi);
    const dniDirect = dniHorizontal / (Math.sin(solarPos.altitude) + 0.05);

    // Angle of incidence cos(theta)
    const cosIncidence = Math.sin(solarPos.altitude) * Math.cos(surfTilt) +
                         Math.cos(solarPos.altitude) * Math.sin(surfTilt) * Math.cos(solarPos.azimuth - surfAzimuth);

    const beamOnSurface = dniDirect * Math.max(0, cosIncidence);
    const diffuseOnSurface = dhi * (1 + Math.cos(surfTilt)) * 0.5;
    const groundReflected = ghi * groundAlbedo * (1 - Math.cos(surfTilt)) * 0.5;

    return Math.max(0, beamOnSurface + diffuseOnSurface + groundReflected);
  }

  /**
   * Run deterministic transient RC thermal network simulation
   * @param {object} config - Simulation parameters
   * @returns {object} Hourly time-series results (temperatures, solar gains, heat flows)
   */
  simulate(config) {
    const {
      shelterDims = { width: 6, length: 8, height: 3, area: 48, volume: 144 },
      materials = {},
      openings = { windowCount: 2, windowArea: 3.0, shgc: 0.65, uWindow: 2.8, orientation: 'south' },
      weatherSeries = [], // Hourly { hour, ambTempC, ghi, dhi, windSpeed }
      initialInsideTempC = 12.0,
      occupancyWatts = 120, // 1-2 occupants body heat + small lamp
      ach = 0.6,           // Air changes per hour
      elevationM = 3500,   // Default high-altitude Ladakh (Leh)
      latitude = 34.15,    // Leh, Ladakh latitude
      dayOfYear = 15       // Mid-January cold winter benchmark
    } = config;

    const rhoAir = this.getAirDensity(elevationM);
    const V = shelterDims.volume || (shelterDims.width * shelterDims.length * shelterDims.height);
    const C_air = V * rhoAir * this.CP_AIR; // Air node capacitance [J/K]

    // Surface areas
    const A_wallTotal = 2 * (shelterDims.width + shelterDims.length) * shelterDims.height;
    const A_win = openings.windowArea || (openings.windowCount * 1.5);
    const A_wallOpaque = Math.max(10, A_wallTotal - A_win);
    const A_roof = shelterDims.area || (shelterDims.width * shelterDims.length);
    const A_floor = A_roof;

    // Wall breakdown by orientation (assuming long axis East-West, primary windows South)
    // South wall receives highest low-elevation winter solar gain in Ladakh!
    const A_wallSouth = Math.max(0, shelterDims.length * shelterDims.height - A_win);
    const A_wallNorth = shelterDims.length * shelterDims.height;
    const A_wallEastWest = 2 * shelterDims.width * shelterDims.height;

    // Material thermal properties
    const wallMat = materials.wall || { thermalConductivity: 0.75, density: 1600, specificHeat: 840, thickness: 0.35, absorptance: 0.70 };
    const roofMat = materials.roof || { thermalConductivity: 0.20, density: 800,  specificHeat: 1200, thickness: 0.20, absorptance: 0.75 };
    const floorMat = materials.floor || { thermalConductivity: 1.10, density: 1800, specificHeat: 900, thickness: 0.25, absorptance: 0.60 };

    // Wall Thermal Capacitance & Conduction Resistance
    const wallThick = wallMat.thickness || 0.35;
    const wallK = wallMat.thermalConductivity || 0.75;
    const wallRho = wallMat.density || 1600;
    const wallCp = wallMat.specificHeat || 840;
    const C_wall = A_wallOpaque * wallThick * wallRho * wallCp; // J/K

    // Split wall into exterior surface, thermal mass core, and interior surface (2-step RC network)
    const R_wall_half = Math.max(this.MIN_RESISTANCE, (wallThick * 0.5) / (wallK * A_wallOpaque)); // K/W
    const R_wall_conv_in = Math.max(this.MIN_RESISTANCE, 1 / (this.H_IN * A_wallOpaque));

    // Roof properties
    const roofThick = roofMat.thickness || 0.20;
    const roofK = roofMat.thermalConductivity || 0.20;
    const roofRho = roofMat.density || 800;
    const roofCp = roofMat.specificHeat || 1200;
    const C_roof = A_roof * roofThick * roofRho * roofCp * 0.5; // J/K
    const R_roof_cond = Math.max(this.MIN_RESISTANCE, roofThick / (roofK * A_roof));
    const R_roof_conv_in = Math.max(this.MIN_RESISTANCE, 1 / (this.H_IN * A_roof));

    // Floor properties (coupled to ground temperature)
    const T_ground = 6.0; // Deep ground temperature in Ladakh winter (~6-8°C)
    const floorThick = floorMat.thickness || 0.25;
    const floorK = floorMat.thermalConductivity || 1.10;
    const C_floor = A_floor * floorThick * (floorMat.density || 1800) * (floorMat.specificHeat || 900) * 0.5;
    const R_floor_cond = Math.max(this.MIN_RESISTANCE, floorThick / (floorK * A_floor));
    const R_floor_conv_in = Math.max(this.MIN_RESISTANCE, 1 / (this.H_IN * A_floor));

    // Glazing properties
    const U_win = openings.uWindow || 2.8;
    const SHGC = openings.shgc || 0.62;
    const R_win = Math.max(this.MIN_RESISTANCE, 1 / (U_win * A_win));

    // Initial node temperatures [°C]
    let T_air = initialInsideTempC;
    let T_w_core = initialInsideTempC;
    let T_w_ext = initialInsideTempC - 2.0;
    let T_roof = initialInsideTempC;
    let T_floor = Math.max(initialInsideTempC, T_ground + 2.0);

    const timeStepSec = 300; // 5-minute internal sub-stepping for RK4 stability
    const hoursCount = weatherSeries.length;
    const infiltrationConductance = (ach * V * rhoAir * this.CP_AIR) / 3600;
    const results = {
      hours: [],
      ambientTemp: [],
      insideTemp: [],
      temperatureDifferenceC: [],
      wallCoreTemp: [],
      solarGainWatts: [],
      cumulativeSolarKwh: [],
      conductionLossWatts: [],
      infiltrationLossWatts: [],
      radiativeLossWatts: [],
      netStorageRateWatts: [],
      comfortZoneUpper: [],
      comfortZoneLower: []
    };

    let totalSolarJoules = 0;

    // Simulation loop across hourly weather intervals
    for (let h = 0; h < hoursCount; h++) {
      const weather = weatherSeries[h];
      const ambTemp = weather.ambTempC;
      const ghi = weather.ghi;
      const dhi = weather.dhi || ghi * 0.3;
      const windSpeed = weather.windSpeed || 3.0;

      // Exterior convection coefficient depending on wind speed (Jurges formula)
      const h_out = this.H_OUT_BASE + 3.8 * windSpeed;
      const R_wall_conv_out = Math.max(this.MIN_RESISTANCE, 1 / (h_out * A_wallOpaque));
      const R_roof_conv_out = Math.max(this.MIN_RESISTANCE, 1 / (h_out * A_roof));

      // Solar angles for this hour
      const solarPos = this.getSolarPosition(latitude, dayOfYear, weather.hour % 24);

      // Incident solar irradiance on each surface
      // South vertical wall (azimuth = 0)
      const I_south = this.getIncidentSolar(solarPos, Math.PI / 2, 0, ghi, dhi);
      // North vertical wall (azimuth = PI)
      const I_north = this.getIncidentSolar(solarPos, Math.PI / 2, Math.PI, ghi, dhi);
      // East & West vertical walls (azimuth = -PI/2, +PI/2)
      const I_east = this.getIncidentSolar(solarPos, Math.PI / 2, -Math.PI / 2, ghi, dhi);
      const I_west = this.getIncidentSolar(solarPos, Math.PI / 2, Math.PI / 2, ghi, dhi);
      // Horizontal Roof (tilt = 0)
      const I_roof = this.getIncidentSolar(solarPos, 0, 0, ghi, dhi);

      // Total solar radiation absorbed by opaque walls [Watts]
      const alphaWall = wallMat.absorptance || 0.70;
      const Q_solar_wall = alphaWall * (
        I_south * A_wallSouth +
        I_north * A_wallNorth +
        (I_east + I_west) * (A_wallEastWest * 0.5)
      );

      // Solar absorbed by roof [Watts]
      const alphaRoof = roofMat.absorptance || 0.75;
      const Q_solar_roof = alphaRoof * I_roof * A_roof;

      // Solar radiation transmitted through South-facing windows [Watts]
      const Q_solar_window = A_win * SHGC * I_south;

      // Total solar thermal gain entering the shelter system
      const Q_solar_total = Q_solar_wall + Q_solar_roof + Q_solar_window;

      // Night-sky temperature (high altitude cold desert clear sky approx)
      // T_sky = T_amb - 20K
      const T_sky_C = ambTemp - 20.0;
      const T_sky_K = Math.max(180, (ambTemp + 273.15) - 20);
      const epsRoof = 0.90;
      const h_rad = 5.5; // stable linearized radiative exchange for cold desert sky

      // Infiltration conductance [W/K]
      const U_inf = infiltrationConductance;

      // Sub-step RK4 integration across the hour (12 sub-steps of 300s = 3600s)
      const subSteps = 3600 / timeStepSec;
      for (let s = 0; s < subSteps; s++) {
        // Evaluate ODE derivatives: dT/dt = f(T)
        const computeDerivatives = (T_a, T_wc, T_we, T_r, T_f) => {
          const q_we_to_amb = (T_we - ambTemp) / R_wall_conv_out;
          const q_we_to_core = (T_we - T_wc) / R_wall_half;
          const dT_we_dt = (Q_solar_wall - q_we_to_amb - q_we_to_core) / (C_wall * 0.1);

          const q_core_to_in = (T_wc - T_a) / (R_wall_half + R_wall_conv_in);
          const dT_wc_dt = (q_we_to_core - q_core_to_in) / C_wall;

          const Q_rad_sky = h_rad * A_roof * (T_r - T_sky_C);
          const q_r_to_amb = (T_r - ambTemp) / R_roof_conv_out;
          const q_r_to_in = (T_r - T_a) / (R_roof_cond + R_roof_conv_in);
          const dT_r_dt = (Q_solar_roof - Q_rad_sky - q_r_to_amb - q_r_to_in) / C_roof;

          const q_f_to_in = (T_f - T_a) / R_floor_conv_in;
          const q_f_to_ground = (T_f - T_ground) / R_floor_cond;
          const dT_f_dt = (0.7 * Q_solar_window - q_f_to_in - q_f_to_ground) / C_floor;

          const q_win_cond = (ambTemp - T_a) / R_win;
          const q_inf = U_inf * (ambTemp - T_a);
          const q_conv_net = q_core_to_in + q_r_to_in + q_f_to_in;
          const q_direct_solar = 0.3 * Q_solar_window;

          const dT_a_dt = (q_conv_net + q_win_cond + q_inf + q_direct_solar + occupancyWatts) / C_air;

          return {
            dT_a_dt: Number.isFinite(dT_a_dt) ? dT_a_dt : 0,
            dT_wc_dt: Number.isFinite(dT_wc_dt) ? dT_wc_dt : 0,
            dT_we_dt: Number.isFinite(dT_we_dt) ? dT_we_dt : 0,
            dT_r_dt: Number.isFinite(dT_r_dt) ? dT_r_dt : 0,
            dT_f_dt: Number.isFinite(dT_f_dt) ? dT_f_dt : 0
          };
        };

        // RK4 Step
        const k1 = computeDerivatives(T_air, T_w_core, T_w_ext, T_roof, T_floor);

        const k2 = computeDerivatives(
          T_air + 0.5 * timeStepSec * k1.dT_a_dt,
          T_w_core + 0.5 * timeStepSec * k1.dT_wc_dt,
          T_w_ext + 0.5 * timeStepSec * k1.dT_we_dt,
          T_roof + 0.5 * timeStepSec * k1.dT_r_dt,
          T_floor + 0.5 * timeStepSec * k1.dT_f_dt
        );

        const k3 = computeDerivatives(
          T_air + 0.5 * timeStepSec * k2.dT_a_dt,
          T_w_core + 0.5 * timeStepSec * k2.dT_wc_dt,
          T_w_ext + 0.5 * timeStepSec * k2.dT_we_dt,
          T_roof + 0.5 * timeStepSec * k2.dT_r_dt,
          T_floor + 0.5 * timeStepSec * k2.dT_f_dt
        );

        const k4 = computeDerivatives(
          T_air + timeStepSec * k3.dT_a_dt,
          T_w_core + timeStepSec * k3.dT_wc_dt,
          T_w_ext + timeStepSec * k3.dT_we_dt,
          T_roof + timeStepSec * k3.dT_r_dt,
          T_floor + timeStepSec * k3.dT_f_dt
        );

        const deltaAir = (timeStepSec / 6) * (k1.dT_a_dt + 2 * k2.dT_a_dt + 2 * k3.dT_a_dt + k4.dT_a_dt);
        const deltaWallCore = (timeStepSec / 6) * (k1.dT_wc_dt + 2 * k2.dT_wc_dt + 2 * k3.dT_wc_dt + k4.dT_wc_dt);
        const deltaWallExt = (timeStepSec / 6) * (k1.dT_we_dt + 2 * k2.dT_we_dt + 2 * k3.dT_we_dt + k4.dT_we_dt);
        const deltaRoof = (timeStepSec / 6) * (k1.dT_r_dt + 2 * k2.dT_r_dt + 2 * k3.dT_r_dt + k4.dT_r_dt);
        const deltaFloor = (timeStepSec / 6) * (k1.dT_f_dt + 2 * k2.dT_f_dt + 2 * k3.dT_f_dt + k4.dT_f_dt);

        T_air += Number.isFinite(deltaAir) ? Math.max(-3, Math.min(3, deltaAir)) : 0;
        T_w_core += Number.isFinite(deltaWallCore) ? Math.max(-3, Math.min(3, deltaWallCore)) : 0;
        T_w_ext += Number.isFinite(deltaWallExt) ? Math.max(-3, Math.min(3, deltaWallExt)) : 0;
        T_roof += Number.isFinite(deltaRoof) ? Math.max(-3, Math.min(3, deltaRoof)) : 0;
        T_floor += Number.isFinite(deltaFloor) ? Math.max(-3, Math.min(3, deltaFloor)) : 0;
      }

      // Record hourly metrics
      totalSolarJoules += Q_solar_total * 3600;
      const conductionLossW = Math.max(0, (T_air - ambTemp) * (
        (A_wallOpaque * wallK / wallThick) +
        (A_roof * roofK / roofThick) +
        (A_win * U_win)
      ));
      const infiltrationLossW = Math.max(0, U_inf * (T_air - ambTemp));
      const T_r_K = T_roof + 273.15;
      const skyRadLossW = Math.max(0, h_rad * A_roof * Math.max(0, T_roof - T_sky_C));
      const netStorageRateW = (C_wall * (T_w_core - ambTemp) / 86400) + (C_air * (T_air - ambTemp) / 3600);

      results.hours.push(weather.label || `Hour ${h + 1}`);
      results.ambientTemp.push(parseFloat(ambTemp.toFixed(1)));
      results.insideTemp.push(parseFloat(T_air.toFixed(1)));
      results.temperatureDifferenceC.push(parseFloat((T_air - ambTemp).toFixed(1)));
      results.wallCoreTemp.push(parseFloat(T_w_core.toFixed(1)));
      results.solarGainWatts.push(Math.round(Q_solar_total));
      results.cumulativeSolarKwh.push(parseFloat((totalSolarJoules / 3.6e6).toFixed(2)));
      results.conductionLossWatts.push(Math.round(conductionLossW));
      results.infiltrationLossWatts.push(Math.round(infiltrationLossW));
      results.radiativeLossWatts.push(Math.round(skyRadLossW));
      results.netStorageRateWatts.push(Math.round(netStorageRateW));
      results.comfortZoneUpper.push(24);
      results.comfortZoneLower.push(18);
    }

    // Compute key summary statistics
const finiteInside = results.insideTemp.filter(v => Number.isFinite(v));
      const minInside = finiteInside.length ? Math.min(...finiteInside) : initialInsideTempC;
      const maxInside = finiteInside.length ? Math.max(...finiteInside) : initialInsideTempC;
      const diurnalSwing = parseFloat((maxInside - minInside).toFixed(1));
      const avgInside = finiteInside.length ? parseFloat((finiteInside.reduce((a, b) => a + b, 0) / finiteInside.length).toFixed(1)) : initialInsideTempC;

    // Reuse same infiltration conductance used in the transient solver for a consistent deficit estimate.
    const U_inf = infiltrationConductance;

    // Calculate cumulative heating deficit in kWh to keep shelter >= 18°C
    let heatingDeficitJoules = 0;
    for (let i = 0; i < results.insideTemp.length; i++) {
      if (results.insideTemp[i] < 18.0) {
        const deltaT = 18.0 - results.insideTemp[i];
        // Power needed to offset losses at 18°C:
        const hourlyLossW = deltaT * (
          (A_wallOpaque * wallK / wallThick) +
          (A_roof * roofK / roofThick) +
          (A_win * U_win) +
          U_inf
        );
        heatingDeficitJoules += hourlyLossW * 3600;
      }
    }
    const heatingDeficitKwh = parseFloat((heatingDeficitJoules / 3.6e6).toFixed(2));

    // Thermal damping ratio and phase lag vs ambient
    const minAmb = Math.min(...results.ambientTemp);
    const maxAmb = Math.max(...results.ambientTemp);
    const ambSwing = maxAmb - minAmb;
    const dampingRatio = ambSwing > 0 ? parseFloat((1 - (diurnalSwing / ambSwing)).toFixed(2)) : 0.5;
    const averageOf = (values) => values.length
      ? values.reduce((sum, value) => sum + value, 0) / values.length
      : 0;
    const energyKwh = (values) => values.reduce((sum, value) => sum + Math.max(0, value) * 3600, 0) / 3.6e6;
    const periodHours = results.hours.length;
    const averageTemperatureDifference = averageOf(results.temperatureDifferenceC);

    results.summary = {
      periodHours,
      minInside,
      maxInside,
      avgInside,
      avgAmbient: parseFloat(averageOf(results.ambientTemp).toFixed(1)),
      averageTemperatureDifference: parseFloat(averageTemperatureDifference.toFixed(1)),
      peakTemperatureDifference: results.temperatureDifferenceC.length ? Math.max(...results.temperatureDifferenceC) : 0,
      minTemperatureDifference: results.temperatureDifferenceC.length ? Math.min(...results.temperatureDifferenceC) : 0,
      diurnalSwing,
      heatingDeficitKwh,
      dampingRatio: Math.max(0, dampingRatio),
      totalSolarKwh: results.cumulativeSolarKwh[results.cumulativeSolarKwh.length - 1],
      peakSolarGainWatts: results.solarGainWatts.length ? Math.max(...results.solarGainWatts) : 0,
      averageSolarGainWatts: parseFloat(averageOf(results.solarGainWatts).toFixed(1)),
      conductionEnergyKwh: parseFloat(energyKwh(results.conductionLossWatts).toFixed(2)),
      infiltrationEnergyKwh: parseFloat(energyKwh(results.infiltrationLossWatts).toFixed(2)),
      radiativeEnergyKwh: parseFloat(energyKwh(results.radiativeLossWatts).toFixed(2)),
      averageConductionLossWatts: parseFloat(averageOf(results.conductionLossWatts).toFixed(1)),
      averageInfiltrationLossWatts: parseFloat(averageOf(results.infiltrationLossWatts).toFixed(1)),
      averageRadiativeLossWatts: parseFloat(averageOf(results.radiativeLossWatts).toFixed(1)),
      isComfortable: minInside >= 16.0 && maxInside <= 26.0
    };

    return results;
  }
}

// Attach to window
window.PhysicsEngine = PhysicsEngine;
window.physicsEngine = new PhysicsEngine();
