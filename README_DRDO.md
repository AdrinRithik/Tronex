# Passive Shelter Thermal Simulation Model
### DRDO / Department of Defence Production — IDEX (Software Category)

A physics-based, deterministic transient thermal modeling platform designed to predict and optimize the thermal performance of passive shelters across Indian climate zones, with specific high-fidelity engineering for **high-altitude cold desert regions (Ladakh / Leh / Dras)**.

---

## 1. System Architecture & Governing Physics

The core simulation engine uses a **deterministic transient heat-balance solver (Lumped-Capacitance RC Network)**, numerically integrated over time. The LLM (Gemini API) is strictly isolated to natural-language parsing, material estimation, and plain-language engineering report generation.

```
┌─────────────────────────────────────────────────────────┐
│  FRONTEND (Web Application)                             │
│  - 3D Interactive Virtual Shelter (Three.js)            │
│  - Leaflet / OpenStreetMap with Exact Coordinates      │
│  - DRDO Task 1: Indoor vs Ambient Temp Chart (48h)     │
│  - DRDO Task 2: Solar Thermal Gain Chart (W & kWh)      │
│  - DRDO Task 3: Heat Flow Breakdown (Losses & Storage) │
│  - Comparative Ranking Table (Most Efficient Selection) │
│  - Gemini AI Assistant Modal (NL Prompt & Report)       │
└───────────────────────┬─────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────┐
│  PHYSICS ENGINE (Deterministic Transient Solver)        │
│  - 6-Node Lumped Capacitance RC Thermal Network         │
│  - Solar Geometry Model (Duffie & Beckman / ASHRAE)    │
│  - Multi-layer Composite Wall & Thermal Mass Dynamics   │
│  - Infiltration Energy Loss (ACH Model)                │
│  - High-Altitude Clear-Sky Night Radiative Loss         │
│  - 4th-Order Runge-Kutta (JS) / SciPy solve_ivp (Python)│
└───────────────────────┬─────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────┐
│  DATA & MATERIALS LAYER                                 │
│  - NASA POWER API (Hourly GHI, DHI, T2M, Wind Speed)    │
│  - Authentic High-Altitude Ladakh Winter Field Benchmark│
│  - Indian Materials Database (Rammed Earth, Adobe, etc.)│
└─────────────────────────────────────────────────────────┘
```

---

## 2. Mathematical Equations

### 2.1 Lumped-Capacitance Energy Balance ODE
For each thermal node $i \in \{\text{Air, Wall Ext, Wall Core Mass, Roof, Floor}\}$:
$$C_i \frac{dT_i}{dt} = \sum_{j} \frac{T_j - T_i}{R_{ij}} + Q_{solar,i} - Q_{loss,i} + Q_{internal}$$

Where:
- $C_i = m_i \cdot C_{p,i} = \rho_i \cdot V_i \cdot C_{p,i}$ (Thermal capacitance in $\text{J/K}$)
- $R_{ij} = \frac{d_k}{k_k \cdot A}$ (Conduction) or $\frac{1}{h \cdot A}$ (Convection)
- $h_{in} = 8.29\ \text{W/(m}^2\cdot\text{K)}$, $h_{out} = 15.0 + 3.8 \cdot v_{wind}\ \text{W/(m}^2\cdot\text{K)}$

### 2.2 Solar Gain Sub-Model
$$Q_{solar} = \sum_{s} \left[ A_s \cdot \tau_s \cdot I_s(t) \cdot \max(0, \cos \theta_i) \right]$$
- Surface incident radiation computed via solar declination $\delta$, hour angle $\omega$, solar altitude $\alpha_s$, and surface azimuth $\gamma_s$.
- South-facing vertical walls receive peak winter insolation due to low solar elevation in Ladakh (~32° at solar noon).

### 2.3 Ladakh Thermal Mass Dynamics
High-mass materials (40cm Rammed Earth, 35cm Trombe Wall) possess high thermal capacitance ($C_{wall} \approx 6.5 \times 10^7\ \text{J/K}$), inducing an **8-to-10 hour thermal phase delay** ($\phi \approx \sqrt{\frac{\pi C_{wall}}{k}}$). Solar heat absorbed during noon is conducted into the living quarters between 22:00 and 06:00, preventing nighttime freezing.

### 2.4 Infiltration Energy Loss
$$Q_{inf} = \frac{\text{ACH} \cdot V \cdot \rho_{air} \cdot C_{p,air}}{3600} \cdot (T_{inside} - T_{ambient})$$
Elevation-corrected air density at 3,500m (Leh): $\rho_{air} \approx 0.82\ \text{kg/m}^3$.

### 2.5 Night-Sky Radiative Cooling (High-Altitude Ladakh)
$$Q_{rad} = \varepsilon \sigma A_{roof} (T_{roof}^4 - T_{sky}^4)$$
With $T_{sky} \approx T_{ambient} - 20\text{ K}$ under cloud-free desert skies.

---

## 3. Physical Validation Benchmark (Leh, Ladakh Case Study)

The validation script (`backend/validation_ladakh.py`) evaluates three shelter typologies over a 48-hour winter cycle (Ambient: -15.6°C to +1.8°C, GHI peak: 910 W/m²):

| Metric | 1. Bare GI Metal Shed | 2. Rammed Earth (Pisé) | 3. Passive Solar Trombe |
| :--- | :---: | :---: | :---: |
| **Minimum Night Temperature** | **-12.8°C** *(Severe Freeze)* | **+14.2°C** *(Survival)* | **+16.8°C** *(Comfort)* |
| **Maximum Day Temperature** | +18.4°C | +22.1°C | +23.8°C |
| **Diurnal Inside Swing ($\Delta T$)** | **31.2°C** *(Extreme)* | **7.9°C** *(Damped)* | **7.0°C** *(Stabilized)* |
| **Supplemental Heat Deficit (48h)** | **74.6 kWh** | **3.8 kWh** | **0.6 kWh** |

### Credibility Findings:
- Results closely mirror published field measurements from the **Ladakh Ecological Development Group (LEDeG)**, **SECMOL**, and **TERI**, where uninsulated military tin huts suffer sub-zero internal drops, while 40cm earthen walls with South glazing stay above freezing with zero active fuel.

---

## 4. How to Run

### Option A: Browser-Native (Instant Zero-Setup)
1. Open `index.html` in any modern web browser.
2. Select **"🏔️ Leh, Ladakh (Cold Desert Benchmark)"** in Step 1.
3. Configure dimensions in Step 2, inspect materials in Step 3, and rotate the 3D shelter in Step 4.
4. Click **"Run Thermal Analysis"** (Step 5) to observe the 4th-Order Runge-Kutta numerical solver execute.
5. Review **DRDO Task 1, 2, and 3 interactive charts** in Step 6.
6. Click **"Run Comparative Optimizer"** in Step 7 to view the ranked table identifying the **Most Efficient Combination**.
7. Click **"Generate DRDO Evaluation Report"** or **"✨ Gemini AI Assistant"** for natural language queries.

### Option B: Python FastAPI Backend
```bash
cd backend
pip install -r requirements.txt

# Configure Gemini on the backend (never in browser storage)
# Create .env in the project root with: API_KEY=your_gemini_api_key

# Run physical validation benchmark
python validation_ladakh.py

# Start FastAPI server
python main.py
```
Open Swagger API docs at `http://localhost:8001/docs`.
