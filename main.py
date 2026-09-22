"""
FastAPI Server — Passive Shelter Thermal Simulation Model
Provides REST API endpoints for:
- /api/simulate (Deterministic SciPy solve_ivp RC network)
- /api/optimize (Comparative combinations)
- /api/weather/nasa (NASA POWER API proxy)
- /api/gemini/parse, /api/gemini/material, /api/gemini/report
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from pathlib import Path
from typing import Dict, Any, List, Optional
import os
import socket
import requests

PROJECT_ROOT = Path(__file__).resolve().parent.parent

def load_env_file():
    env_path = PROJECT_ROOT / ".env"
    if not env_path.exists():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        name, value = line.split("=", 1)
        os.environ.setdefault(name.strip(), value.strip().strip('"').strip("'"))

load_env_file()
GEMINI_API_KEY = os.getenv("API_KEY") or os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

def get_available_port(preferred_port: int = 8001, max_attempts: int = 20) -> int:
    for port in [preferred_port] + list(range(preferred_port + 1, preferred_port + max_attempts + 1)):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            try:
                sock.bind(("0.0.0.0", port))
                return port
            except OSError:
                continue
    raise RuntimeError(f"No free port found in range {preferred_port}..{preferred_port + max_attempts}")

PORT = int(os.getenv("PORT", str(get_available_port(8001))))

from physics_engine import ThermalRcEngine
from nasa_power import fetch_nasa_hourly
from materials import MATERIALS_CATALOG

app = FastAPI(
    title="DRDO Passive Shelter Thermal Simulation API",
    description="Deterministic RC thermal network ODE solver & Gemini AI evaluation layer",
    version="2.4.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if (PROJECT_ROOT / "css").exists():
    app.mount("/css", StaticFiles(directory=str(PROJECT_ROOT / "css")), name="css")
if (PROJECT_ROOT / "js").exists():
    app.mount("/js", StaticFiles(directory=str(PROJECT_ROOT / "js")), name="js")
if (PROJECT_ROOT / "assets").exists():
    app.mount("/assets", StaticFiles(directory=str(PROJECT_ROOT / "assets")), name="assets")

class SimulationRequest(BaseModel):
    shelterDims: Dict[str, float]
    materials: Dict[str, Dict[str, float]]
    openings: Optional[Dict[str, Any]] = None
    weatherSeries: Optional[List[Dict[str, Any]]] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    elevationM: Optional[float] = 0.0
    initialInsideTempC: Optional[float] = 10.0
    occupancyWatts: Optional[float] = 140.0
    ach: Optional[float] = 0.5
    dayOfYear: Optional[int] = 15

class GeminiRequest(BaseModel):
    prompt: str
    jsonMode: bool = False

@app.get("/")
def root():
    return {
        "status": "online",
        "service": "DRDO Passive Shelter Thermal Solver",
        "version": "2.4.0",
        "benchmark": "Location-aware NASA POWER weather"
    }

@app.get("/index.html")
def serve_index():
    return FileResponse(PROJECT_ROOT / "index.html")

@app.post("/api/simulate")
def simulate(req: SimulationRequest):
    """Execute deterministic transient RC network simulation."""
    latitude = req.latitude if req.latitude is not None else 34.1526
    longitude = req.longitude if req.longitude is not None else 77.5771
    weather = req.weatherSeries or fetch_nasa_hourly(latitude, longitude)
    engine = ThermalRcEngine(elevation_m=req.elevationM, latitude_deg=latitude)
    
    results = engine.solve(
        shelter_dims=req.shelterDims,
        materials=req.materials,
        openings=req.openings or {"windowArea": 4.0, "uWindow": 1.4, "shgc": 0.62},
        weather_series=weather,
        initial_inside_temp_c=req.initialInsideTempC,
        occupancy_watts=req.occupancyWatts,
        ach=req.ach,
        day_of_year=req.dayOfYear
    )
    return results

@app.get("/api/weather/nasa")
def get_weather(lat: float = 34.1526, lon: float = 77.5771, start: str = "20240115", end: str = "20240116"):
    """Fetch hourly weather data from NASA POWER API."""
    return fetch_nasa_hourly(lat, lon, start, end)

@app.get("/api/materials")
def get_materials():
    """Return published engineering materials catalog."""
    return MATERIALS_CATALOG

@app.post("/api/gemini/generate")
def generate_gemini(req: GeminiRequest):
    """Proxy Gemini requests so the API key remains server-side."""
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=503, detail="Gemini API key is not configured")

    generation_config = {}
    if req.jsonMode:
        generation_config["responseMimeType"] = "application/json"

    try:
        response = requests.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent",
            params={"key": GEMINI_API_KEY},
            headers={"Content-Type": "application/json"},
            json={
                "contents": [{"role": "user", "parts": [{"text": req.prompt}]}],
                "generationConfig": generation_config,
            },
            timeout=60,
        )
        if not response.ok:
            raise HTTPException(status_code=response.status_code, detail="Gemini request failed")
        data = response.json()
        text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text")
        if not text:
            raise HTTPException(status_code=502, detail="Gemini returned no content")
        return {"text": text}
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail="Unable to reach Gemini") from exc

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT, reload=False)
