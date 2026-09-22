"""
Materials Database (Python)
Physical and thermal properties for building materials, focusing on Indian & Himalayan construction.
"""

MATERIALS_CATALOG = {
    "wall": {
        "rammed_earth": {
            "name": "Rammed Earth (Pisé)",
            "k": 1.05, "density": 2050.0, "cp": 920.0, "thickness": 0.40,
            "absorptance": 0.70, "emissivity": 0.90, "cost_inr": 850
        },
        "adobe_mud": {
            "name": "Adobe / Mud Brick",
            "k": 0.72, "density": 1600.0, "cp": 840.0, "thickness": 0.35,
            "absorptance": 0.72, "emissivity": 0.90, "cost_inr": 670
        },
        "corrugated_gi": {
            "name": "Corrugated GI Sheet (Uninsulated Shed)",
            "k": 50.0, "density": 7800.0, "cp": 500.0, "thickness": 0.003,
            "absorptance": 0.45, "emissivity": 0.28, "cost_inr": 1000
        },
        "pir_sandwich": {
            "name": "PIR Insulated Sandwich Panel (80mm)",
            "k": 0.024, "density": 45.0, "cp": 1200.0, "thickness": 0.08,
            "absorptance": 0.40, "emissivity": 0.85, "cost_inr": 5000
        },
        "trombe_wall": {
            "name": "Passive Solar Trombe Wall",
            "k": 1.10, "density": 2100.0, "cp": 950.0, "thickness": 0.35,
            "absorptance": 0.92, "emissivity": 0.85, "cost_inr": 7800
        }
    },
    "roof": {
        "tin_bare": {
            "name": "Corrugated GI Tin Roof (Bare)",
            "k": 50.0, "density": 7800.0, "cp": 500.0, "thickness": 0.002,
            "absorptance": 0.55, "emissivity": 0.28, "cost_inr": 840
        },
        "ladakh_mud": {
            "name": "Traditional Ladakhi Mud + Willow Roof",
            "k": 0.45, "density": 1300.0, "cp": 950.0, "thickness": 0.25,
            "absorptance": 0.75, "emissivity": 0.90, "cost_inr": 1450
        },
        "insulated_sandwich": {
            "name": "Insulated Metal Sandwich (PIR 100mm)",
            "k": 0.022, "density": 35.0, "cp": 1200.0, "thickness": 0.10,
            "absorptance": 0.40, "emissivity": 0.85, "cost_inr": 4800
        }
    },
    "floor": {
        "rammed_earth": {
            "name": "Rammed Earth Floor / Silt Slab",
            "k": 1.20, "density": 1900.0, "cp": 880.0, "thickness": 0.25,
            "absorptance": 0.70, "emissivity": 0.90, "cost_inr": 250
        },
        "plain_concrete": {
            "name": "Plain Concrete Slab (100mm)",
            "k": 1.70, "density": 2400.0, "cp": 880.0, "thickness": 0.10,
            "absorptance": 0.60, "emissivity": 0.90, "cost_inr": 1680
        },
        "insulated_mass": {
            "name": "Solar Mass Slab + 100mm XPS Sub-Base",
            "k": 0.028, "density": 2200.0, "cp": 1000.0, "thickness": 0.20,
            "absorptance": 0.85, "emissivity": 0.90, "cost_inr": 8800
        }
    }
}
