"""
DRDO / IDEX Software Category — Passive Shelter Thermal Simulation Model
Deterministic Physics Engine: Multi-Node Lumped-Capacitance RC Thermal Network
Transient Heat-Balance Solver using SciPy solve_ivp (RK45 / Radau)
"""

import math
import numpy as np
from scipy.integrate import solve_ivp
from typing import Dict, Any, List

SIGMA = 5.670374419e-8      # Stefan-Boltzmann constant [W/(m²·K⁴)]
RHO_AIR_SEA = 1.204          # Air density at sea level [kg/m³]
CP_AIR = 1005.0              # Specific heat of air [J/(kg·K)]
H_IN = 8.29                  # Interior convective heat transfer coefficient [W/(m²·K)]
H_OUT_BASE = 15.0            # Exterior base convection coefficient [W/(m²·K)]

def get_air_density(elevation_m: float = 0.0) -> float:
    """Elevation-corrected air density using standard barometric formula."""
    if elevation_m <= 0:
        return RHO_AIR_SEA
    return RHO_AIR_SEA * math.exp(-elevation_m / 8500.0)

def calculate_solar_angles(latitude_deg: float, day_of_year: int, hour_of_day: float):
    """
    Compute solar altitude and azimuth based on standard Duffie & Beckman solar geometry.
    Latitude in degrees, hour in solar time (0.0 to 24.0).
    """
    rad = math.pi / 180.0
    lat_rad = latitude_deg * rad
    
    # Solar declination delta
    delta_rad = 23.45 * rad * math.sin((360.0 / 365.0) * (284 + day_of_year) * rad)
    # Hour angle omega
    omega_rad = (hour_of_day - 12.0) * 15.0 * rad
    
    sin_alpha = (math.sin(lat_rad) * math.sin(delta_rad) +
                 math.cos(lat_rad) * math.cos(delta_rad) * math.cos(omega_rad))
    altitude_rad = math.asin(max(-1.0, min(1.0, sin_alpha)))
    
    if altitude_rad <= 0:
        return 0.0, 0.0, False
        
    cos_gamma = ((math.sin(altitude_rad) * math.sin(lat_rad) - math.sin(delta_rad)) /
                 (math.cos(altitude_rad) * math.cos(lat_rad) + 1e-6))
    azimuth_rad = math.acos(max(-1.0, min(1.0, cos_gamma)))
    if omega_rad < 0:
        azimuth_rad = -azimuth_rad  # East (morning)
        
    return altitude_rad, azimuth_rad, True

def calculate_surface_insolation(alt_rad: float, az_rad: float, is_day: bool,
                                 tilt_rad: float, surf_az_rad: float,
                                 ghi: float, dhi: float, ground_albedo: float = 0.25) -> float:
    """Compute incident solar radiation on an oriented tilted surface [W/m²]."""
    if not is_day or ghi <= 1.0:
        return 0.0
        
    dni_h = max(0.0, ghi - dhi)
    dni_direct = dni_h / (math.sin(alt_rad) + 0.05)
    
    cos_theta = (math.sin(alt_rad) * math.cos(tilt_rad) +
                 math.cos(alt_rad) * math.sin(tilt_rad) * math.cos(az_rad - surf_az_rad))
    
    beam = dni_direct * max(0.0, cos_theta)
    diffuse = dhi * (1.0 + math.cos(tilt_rad)) * 0.5
    reflected = ghi * ground_albedo * (1.0 - math.cos(tilt_rad)) * 0.5
    
    return max(0.0, beam + diffuse + reflected)

class ThermalRcEngine:
    """
    Deterministic RC Thermal Network Solver.
    Models 5 coupled state variables:
      T[0] = Indoor Air Temperature (T_air)
      T[1] = Wall Exterior Surface (T_w_ext)
      T[2] = Wall Core Thermal Mass (T_w_core)
      T[3] = Roof Node (T_roof)
      T[4] = Floor Node (T_floor)
    """
    def __init__(self, elevation_m: float = 3500.0, latitude_deg: float = 34.15):
        self.elevation_m = elevation_m
        self.latitude_deg = latitude_deg
        self.rho_air = get_air_density(elevation_m)

    @staticmethod
    def _normalize_material(material: Dict[str, float]) -> Dict[str, float]:
        if not material:
            return {}
        normalized = dict(material)
        if "k" not in normalized and "thermalConductivity" in normalized:
            normalized["k"] = normalized["thermalConductivity"]
        if "cp" not in normalized and "specificHeat" in normalized:
            normalized["cp"] = normalized["specificHeat"]
        if "absorptance" not in normalized and "solarAbsorptance" in normalized:
            normalized["absorptance"] = normalized["solarAbsorptance"]
        return normalized
        
    def solve(self, shelter_dims: Dict[str, float],
              materials: Dict[str, Dict[str, float]],
              openings: Dict[str, Any],
              weather_series: List[Dict[str, float]],
              initial_inside_temp_c: float = 10.0,
              occupancy_watts: float = 140.0,
              ach: float = 0.5,
              day_of_year: int = 15) -> Dict[str, Any]:
        """
        Integrate the system of transient energy-balance ODEs across the time series.
        Uses scipy.integrate.solve_ivp.
        """
        w = shelter_dims.get("width", 6.0)
        l = shelter_dims.get("length", 8.0)
        h = shelter_dims.get("height", 3.0)
        v = shelter_dims.get("volume", w * l * h)
        a_floor = shelter_dims.get("area", w * l)
        a_roof = a_floor
        a_wall_total = 2.0 * (w + l) * h
        
        a_win = openings.get("windowArea", 4.0)
        u_win = openings.get("uWindow", 1.40)
        shgc = openings.get("shgc", 0.62)
        r_win = 1.0 / (u_win * a_win)
        
        a_wall_opaque = max(5.0, a_wall_total - a_win)
        a_wall_south = max(0.0, l * h - a_win)
        a_wall_north = l * h
        a_wall_ew = 2.0 * w * h
        
        # Materials
        wall_m = self._normalize_material(materials.get("wall", {"k": 0.75, "density": 1600.0, "cp": 840.0, "thickness": 0.35, "absorptance": 0.70}))
        roof_m = self._normalize_material(materials.get("roof", {"k": 0.20, "density": 800.0, "cp": 1200.0, "thickness": 0.20, "absorptance": 0.75}))
        floor_m = self._normalize_material(materials.get("floor", {"k": 1.10, "density": 1800.0, "cp": 900.0, "thickness": 0.25, "absorptance": 0.60}))
        
        # Thermal capacitance
        c_air = v * self.rho_air * CP_AIR
        c_wall = a_wall_opaque * wall_m["thickness"] * wall_m["density"] * wall_m["cp"]
        c_roof = a_roof * roof_m["thickness"] * roof_m["density"] * roof_m["cp"] * 0.5
        c_floor = a_floor * floor_m["thickness"] * floor_m["density"] * floor_m["cp"] * 0.5
        
        r_wall_half = (wall_m["thickness"] * 0.5) / (wall_m["k"] * a_wall_opaque)
        r_wall_conv_in = 1.0 / (H_IN * a_wall_opaque)
        r_roof_cond = roof_m["thickness"] / (roof_m["k"] * a_roof)
        r_roof_conv_in = 1.0 / (H_IN * a_roof)
        r_floor_cond = floor_m["thickness"] / (floor_m["k"] * a_floor)
        r_floor_conv_in = 1.0 / (H_IN * a_floor)
        
        u_inf = (ach * v * self.rho_air * CP_AIR) / 3600.0
        t_ground = 6.0 # Ground stable temperature in Ladakh winter
        
        hours_count = len(weather_series)
        time_hours = np.arange(hours_count)
        
        # State vector: [T_air, T_w_ext, T_w_core, T_roof, T_floor]
        t_init = [initial_inside_temp_c, initial_inside_temp_c - 2.0, initial_inside_temp_c, initial_inside_temp_c, initial_inside_temp_c]
        
        # Time-interpolated weather lookup
        amb_temps = np.array([w["ambTempC"] for w in weather_series])
        ghis = np.array([w["ghi"] for w in weather_series])
        dhis = np.array([w.get("dhi", w["ghi"] * 0.2) for w in weather_series])
        winds = np.array([w.get("windSpeed", 3.0) for w in weather_series])
        
        def weather_at(t_sec):
            h_float = (t_sec / 3600.0) % hours_count
            idx = int(h_float)
            frac = h_float - idx
            idx_next = (idx + 1) % hours_count
            return (
                amb_temps[idx] + frac * (amb_temps[idx_next] - amb_temps[idx]),
                ghis[idx] + frac * (ghis[idx_next] - ghis[idx]),
                dhis[idx] + frac * (dhis[idx_next] - dhis[idx]),
                winds[idx] + frac * (winds[idx_next] - winds[idx]),
                h_float % 24.0
            )

        def ode_system(t_sec, y):
            t_a, t_we, t_wc, t_r, t_f = y
            amb_t, ghi, dhi, wind, solar_hour = weather_at(t_sec)
            
            # Solar geometry
            alt, az, is_day = calculate_solar_angles(self.latitude_deg, day_of_year, solar_hour)
            i_south = calculate_surface_insolation(alt, az, is_day, math.pi / 2, 0.0, ghi, dhi)
            i_north = calculate_surface_insolation(alt, az, is_day, math.pi / 2, math.pi, ghi, dhi)
            i_ew = calculate_surface_insolation(alt, az, is_day, math.pi / 2, math.pi / 2, ghi, dhi)
            i_roof = calculate_surface_insolation(alt, az, is_day, 0.0, 0.0, ghi, dhi)
            
            # Absorbed solar
            q_sol_wall = wall_m["absorptance"] * (i_south * a_wall_south + i_north * a_wall_north + i_ew * a_wall_ew)
            q_sol_roof = roof_m["absorptance"] * (i_roof * a_roof)
            q_sol_win = a_win * shgc * i_south
            
            # Convective resistances
            h_out = H_OUT_BASE + 3.8 * wind
            r_w_conv_out = 1.0 / (h_out * a_wall_opaque)
            r_r_conv_out = 1.0 / (h_out * a_roof)
            
            # Night sky radiation: use a stable linearized exchange model for cold desert conditions
            t_sky_c = amb_t - 20.0
            h_rad = 5.5
            q_rad_sky = h_rad * a_roof * (t_r - t_sky_c)
            
            # Balance 1: Exterior wall surface
            q_we_to_amb = (t_we - amb_t) / r_w_conv_out
            q_we_to_core = (t_we - t_wc) / r_wall_half
            dt_we_dt = (q_sol_wall - q_we_to_amb - q_we_to_core) / (c_wall * 0.1)
            
            # Balance 2: Wall core thermal mass
            q_core_to_in = (t_wc - t_a) / (r_wall_half + r_wall_conv_in)
            dt_wc_dt = (q_we_to_core - q_core_to_in) / c_wall
            
            # Balance 3: Roof node
            q_r_to_amb = (t_r - amb_t) / r_r_conv_out
            q_r_to_in = (t_r - t_a) / (r_roof_cond + r_roof_conv_in)
            dt_r_dt = (q_sol_roof - q_rad_sky - q_r_to_amb - q_r_to_in) / c_roof
            
            # Balance 4: Floor node
            q_f_to_in = (t_f - t_a) / r_floor_conv_in
            q_f_to_ground = (t_f - t_ground) / r_floor_cond
            dt_f_dt = (0.7 * q_sol_win - q_f_to_in - q_f_to_ground) / c_floor
            
            # Balance 5: Indoor air node
            q_win_cond = (amb_t - t_a) / r_win
            q_inf = u_inf * (amb_t - t_a)
            dt_a_dt = (q_core_to_in + q_r_to_in + q_f_to_in + q_win_cond + q_inf + 0.3 * q_sol_win + occupancy_watts) / c_air
            
            return [dt_a_dt, dt_we_dt, dt_wc_dt, dt_r_dt, dt_f_dt]
        
        # Run SciPy integrator
        t_span = (0.0, hours_count * 3600.0)
        t_eval = np.linspace(0.0, hours_count * 3600.0, hours_count)
        
        sol = solve_ivp(ode_system, t_span, t_init, t_eval=t_eval, method="RK45", rtol=1e-4, atol=1e-4)
        
        t_inside_series = sol.y[0]
        t_wall_core = sol.y[2]
        
        # Energy metrics calculation
        solar_gain_w = []
        cumulative_kwh = []
        conduction_w = []
        infiltration_w = []
        radiative_w = []
        storage_w = []
        
        total_joules = 0.0
        for i in range(hours_count):
            amb_t = amb_temps[i]
            t_in = t_inside_series[i]
            t_r = sol.y[3][i]
            
            alt, az, is_day = calculate_solar_angles(self.latitude_deg, day_of_year, (i % 24))
            i_south = calculate_surface_insolation(alt, az, is_day, math.pi / 2, 0.0, ghis[i], dhis[i])
            i_roof = calculate_surface_insolation(alt, az, is_day, 0.0, 0.0, ghis[i], dhis[i])
            
            q_solar_total = (wall_m["absorptance"] * i_south * a_wall_south +
                             roof_m["absorptance"] * i_roof * a_roof +
                             a_win * shgc * i_south)
            total_joules += q_solar_total * 3600.0
            
            cond_loss = max(0.0, (t_in - amb_t) * ((a_wall_opaque * wall_m["k"] / wall_m["thickness"]) +
                                                  (a_roof * roof_m["k"] / roof_m["thickness"]) +
                                                  (a_win * u_win)))
            inf_loss = max(0.0, u_inf * (t_in - amb_t))
            t_sky_c = amb_t - 20.0
            rad_loss = max(0.0, 5.5 * a_roof * max(0.0, t_r - t_sky_c))
            storage_rate = (c_wall * (t_wall_core[i] - amb_t) / 86400.0) + (c_air * (t_in - amb_t) / 3600.0)
            
            solar_gain_w.append(round(q_solar_total))
            cumulative_kwh.append(round(total_joules / 3.6e6, 2))
            conduction_w.append(round(cond_loss))
            infiltration_w.append(round(inf_loss))
            radiative_w.append(round(rad_loss))
            storage_w.append(round(storage_rate))
            
        min_in = float(np.min(t_inside_series))
        max_in = float(np.max(t_inside_series))
        avg_in = float(np.mean(t_inside_series))
        swing = round(max_in - min_in, 1)
        temperature_difference = t_inside_series - amb_temps
        average_of = lambda values: float(np.mean(values)) if len(values) else 0.0
        energy_kwh = lambda values: float(np.sum(np.maximum(values, 0.0)) * 3600.0 / 3.6e6)
        
        # Heating energy deficit (to stay >= 18°C)
        deficit_j = sum(max(0.0, 18.0 - t) * ((a_wall_opaque * wall_m["k"] / wall_m["thickness"]) + u_inf) * 3600.0
                        for t in t_inside_series)
        
        return {
            "hours": [w.get("label", f"H{i}") for i, w in enumerate(weather_series)],
            "ambientTemp": [round(float(t), 1) for t in amb_temps],
            "insideTemp": [round(float(t), 1) for t in t_inside_series],
            "temperatureDifferenceC": [round(float(t), 1) for t in temperature_difference],
            "wallCoreTemp": [round(float(t), 1) for t in t_wall_core],
            "solarGainWatts": solar_gain_w,
            "cumulativeSolarKwh": cumulative_kwh,
            "conductionLossWatts": conduction_w,
            "infiltrationLossWatts": infiltration_w,
            "radiativeLossWatts": radiative_w,
            "netStorageRateWatts": storage_w,
            "summary": {
                "periodHours": hours_count,
                "minInside": round(min_in, 1),
                "maxInside": round(max_in, 1),
                "avgInside": round(avg_in, 1),
                "avgAmbient": round(average_of(amb_temps), 1),
                "averageTemperatureDifference": round(average_of(temperature_difference), 1),
                "peakTemperatureDifference": round(float(np.max(temperature_difference)), 1),
                "minTemperatureDifference": round(float(np.min(temperature_difference)), 1),
                "diurnalSwing": swing,
                "totalSolarKwh": cumulative_kwh[-1],
                "peakSolarGainWatts": max(solar_gain_w) if solar_gain_w else 0,
                "averageSolarGainWatts": round(average_of(solar_gain_w), 1),
                "averageConductionLossWatts": round(average_of(conduction_w), 1),
                "averageInfiltrationLossWatts": round(average_of(infiltration_w), 1),
                "averageRadiativeLossWatts": round(average_of(radiative_w), 1),
                "conductionEnergyKwh": round(energy_kwh(np.array(conduction_w)), 2),
                "infiltrationEnergyKwh": round(energy_kwh(np.array(infiltration_w)), 2),
                "radiativeEnergyKwh": round(energy_kwh(np.array(radiative_w)), 2),
                "heatingDeficitKwh": round(deficit_j / 3.6e6, 2),
                "isComfortable": min_in >= 16.0
            }
        }
