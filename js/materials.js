// ================================================================
//  THERMAL SHELTER — Materials Catalog & Engineering Database
//  Three tiers: Economy, Standard, Premium
//  Each material: physical/thermal properties (k, rho, Cp, alpha, eps, thickness, uValue)
//  Specialized for Indian climate zones and Ladakh cold-desert high altitude
// ================================================================

const MATERIALS_RECOMMENDATIONS = {
  'high-altitude-cold': {
    wall: 'w_metal_panel', roof: 'r_insulated_metal', door: 'd_insulated_frp', floor: 'f_concrete_insulated', window: 'win_double_lowe'
  },
  'snow-cold': {
    wall: 'w_sip', roof: 'r_sip_roof', door: 'd_insulated_steel_frp', floor: 'f_insulated_mass', window: 'win_triple_lowe'
  },
  'hot-dry-desert': {
    wall: 'w_aac', roof: 'r_concrete_insulated', door: 'd_insulated_aluminium_frp', floor: 'f_insulated_mass', window: 'win_double_lowe'
  },
  'hot-humid-coastal': {
    wall: 'w_aac', roof: 'r_concrete_insulated', door: 'd_frp', floor: 'f_timber_raised', window: 'win_double_lowe'
  },
  'heavy-rain': {
    wall: 'w_brick_plaster', roof: 'r_insulated_metal', door: 'd_reinforced_frp_aluminium', floor: 'f_concrete_insulated', window: 'win_laminated_double'
  },
  'high-wind': {
    wall: 'w_sip', roof: 'r_sip_roof', door: 'd_reinforced_frp_aluminium', floor: 'f_concrete_insulated', window: 'win_laminated_double'
  },
  'moderate': {
    wall: 'w_brick_plaster', roof: 'r_insulated_metal', door: 'd_aluminium_frp', floor: 'f_concrete_insulated', window: 'win_double_clear'
  },
  cold: {
    wall: 'w_metal_panel', roof: 'r_insulated_metal', door: 'd_insulated_frp', floor: 'f_concrete_insulated', window: 'win_double_lowe'
  },
  polar: {
    wall: 'w_sip', roof: 'r_sip_roof', door: 'd_insulated_frp', floor: 'f_vacuum', window: 'win_triple_lowe'
  },
  arid: {
    wall: 'w_aac', roof: 'r_concrete_insulated', door: 'd_insulated_aluminium_frp', floor: 'f_insulated_mass', window: 'win_double_lowe'
  },
  tropical: {
    wall: 'w_aac', roof: 'r_concrete_insulated', door: 'd_frp', floor: 'f_concrete_insulated', window: 'win_double_lowe'
  },
  temperate: {
    wall: 'w_brick_plaster', roof: 'r_insulated_metal', door: 'd_aluminium_frp', floor: 'f_concrete_insulated', window: 'win_double_lowe'
  }
};

const MATERIALS_DB = {
  wall: {
    economy: [
      {
        id: 'w_rammed_earth', name: 'Rammed Earth (Pisé)', icon: '🏛️',
        price: 850, priceUnit: '₹/m²',
        thermalConductivity: 1.05,   // W/m·K
        density: 2050,               // kg/m³
        specificHeat: 920,           // J/kg·K
        absorptance: 0.70,
        emissivity: 0.90,
        uValue: 1.45,                // W/m²·K
        thickness: 0.40,             // 40 cm traditional wall
        description: 'Traditional Ladakhi earthen construction. Exceptional thermal mass and diurnal temperature damping.',
        pros: ['Massive thermal inertia', 'Low embodied carbon', 'Locally available in Ladakh'],
        cons: ['Labor intensive', 'Must protect from direct moisture'],
        color: 0xC89D7C,
        climateScore: { tropical: 60, arid: 88, temperate: 75, cold: 82, polar: 60 }
      },
      {
        id: 'w_adobe', name: 'Adobe / Mud Brick', icon: '🧱',
        price: 670, priceUnit: '₹/m²',
        thermalConductivity: 0.72,
        density: 1600,
        specificHeat: 840,
        absorptance: 0.72,
        emissivity: 0.90,
        uValue: 1.65,
        thickness: 0.35,
        description: 'Sun-dried mud brick. Heritage material across Leh & Spiti valleys with good heat buffering.',
        pros: ['High thermal mass', 'Low cost', 'Eco-friendly'],
        cons: ['Water sensitive', 'Slow construction'],
        color: 0xC4956A,
        climateScore: { tropical: 55, arid: 85, temperate: 65, cold: 75, polar: 40 }
      },
      {
        id: 'w_stone_rubble', name: 'Local Field Stone Masonry', icon: '🪨',
        price: 980, priceUnit: '₹/m²',
        thermalConductivity: 2.10,
        density: 2350,
        specificHeat: 820,
        absorptance: 0.65,
        emissivity: 0.88,
        uValue: 2.20,
        thickness: 0.45,
        description: 'Granite / metamorphic stone with mud mortar. Enormous thermal storage, ideal when paired with insulation.',
        pros: ['Indestructible', 'Extreme thermal mass', 'Local resource'],
        cons: ['High conductivity without insulation', 'Heavy'],
        color: 0x8A8075,
        climateScore: { tropical: 45, arid: 70, temperate: 60, cold: 65, polar: 35 }
      },
      {
        id: 'w_corrugated', name: 'Corrugated GI Sheet (Uninsulated)', icon: '🏗️',
        price: 1000, priceUnit: '₹/m²',
        thermalConductivity: 50.0,
        density: 7800,
        specificHeat: 500,
        absorptance: 0.45,
        emissivity: 0.28,
        uValue: 6.80,
        thickness: 0.003,
        description: 'Standard military field shed cladding. Extremely high heat loss at night and rapid freezing in winter.',
        pros: ['Rapid deployment', 'Durable', 'Waterproof'],
        cons: ['Zero thermal mass', 'Disastrous winter freezing', 'Severe condensation'],
        color: 0x9E9E9E,
        climateScore: { tropical: 30, arid: 20, temperate: 40, cold: 10, polar: 5 }
      },
      {
        id: 'w_clay', name: 'Fired Clay Brick (230mm)', icon: '🧱',
        price: 1500, priceUnit: '₹/m²',
        thermalConductivity: 0.84,
        density: 1900,
        specificHeat: 800,
        absorptance: 0.70,
        emissivity: 0.90,
        uValue: 2.10,
        thickness: 0.23,
        description: 'Classic fired red brick masonry. Moderate mass, requires insulation in cold zones.',
        pros: ['Durable', 'Fire resistant', 'Universal availability'],
        cons: ['High embodied energy', 'Moderate heat retention'],
        color: 0xB5593A,
        climateScore: { tropical: 55, arid: 70, temperate: 65, cold: 45, polar: 20 }
      }
    ],
    standard: [
      {
        id: 'w_straw_clay', name: 'Straw-Clay Composite', icon: '🌾',
        price: 2400, priceUnit: '₹/m²',
        thermalConductivity: 0.18,
        density: 600,
        specificHeat: 1400,
        absorptance: 0.60,
        emissivity: 0.90,
        uValue: 0.55,
        thickness: 0.30,
        description: 'Light earthen construction mixing clay slip with barley/wheat straw. Balanced insulation + mass.',
        pros: ['Excellent insulation', 'Breathable', 'High local content'],
        cons: ['Requires drying season', 'Labor intensive'],
        color: 0xBA9860,
        climateScore: { tropical: 65, arid: 75, temperate: 85, cold: 84, polar: 60 }
      },
      {
        id: 'w_brick_plaster', name: 'Cavity Brick + Plaster', icon: '🏠',
        price: 3780, priceUnit: '₹/m²',
        thermalConductivity: 0.45,
        density: 1500,
        specificHeat: 900,
        absorptance: 0.68,
        emissivity: 0.90,
        uValue: 0.80,
        thickness: 0.28,
        description: 'Double-leaf brick with 50mm air gap. Good all-round barrier.',
        pros: ['Proven construction', 'Good thermal resistance', 'Robust'],
        cons: ['Heavyweight', 'Slow erection'],
        color: 0xD4956A,
        climateScore: { tropical: 65, arid: 75, temperate: 80, cold: 62, polar: 35 }
      },
      {
        id: 'w_aac', name: 'AAC Block (Autoclaved)', icon: '🪨',
        price: 3200, priceUnit: '₹/m²',
        thermalConductivity: 0.18,
        density: 650,
        specificHeat: 1000,
        absorptance: 0.55,
        emissivity: 0.88,
        uValue: 0.60,
        thickness: 0.20,
        description: 'Lightweight aerated concrete block. Cellular structure traps insulating air pockets.',
        pros: ['Low density', 'Good thermal insulation', 'Fire resistant'],
        cons: ['Brittle', 'Needs exterior waterproof plaster'],
        color: 0xD0C8B8,
        climateScore: { tropical: 70, arid: 75, temperate: 82, cold: 72, polar: 45 }
      },
      {
        id: 'w_metal_panel', name: 'PIR Insulated Sandwich Panel (80mm)', icon: '⚙️',
        price: 5000, priceUnit: '₹/m²',
        thermalConductivity: 0.024,
        density: 45,
        specificHeat: 1200,
        absorptance: 0.40,
        emissivity: 0.85,
        uValue: 0.28,
        thickness: 0.08,
        description: 'GI skins with polyisocyanurate foam core. Defense standard for high-altitude pre-fab shelters.',
        pros: ['Rapid assembly', 'Superb insulation', 'Lightweight'],
        cons: ['Negligible thermal mass', 'Prone to rapid cooling once heat is turned off'],
        color: 0xA8B8C8,
        climateScore: { tropical: 65, arid: 70, temperate: 80, cold: 88, polar: 82 }
      }
    ],
    premium: [
      {
        id: 'w_trombe', name: 'Passive Solar Trombe Wall (South)', icon: '☀️',
        price: 7800, priceUnit: '₹/m²',
        thermalConductivity: 1.10,
        density: 2100,
        specificHeat: 950,
        absorptance: 0.92, // Dark selective absorber surface
        emissivity: 0.85,
        uValue: 0.40,
        thickness: 0.35,
        description: '35cm dark rammed earth/stone with double glazing cover and convective dampers. Collects solar heat all day, releases it into room 8-10 hours later at night.',
        pros: ['Continuous nighttime radiant heat', 'Passive zero-energy operation', 'Gold standard in Ladakh architecture'],
        cons: ['South orientation strictly required', 'Higher upfront complexity'],
        color: 0x4A3E38,
        climateScore: { tropical: 40, arid: 70, temperate: 80, cold: 96, polar: 90 }
      },
      {
        id: 'w_icf', name: 'ICF (Insulated Concrete Form)', icon: '🏛️',
        price: 9200, priceUnit: '₹/m²',
        thermalConductivity: 0.038,
        density: 65,
        specificHeat: 1300,
        absorptance: 0.50,
        emissivity: 0.90,
        uValue: 0.19,
        thickness: 0.30,
        description: 'Reinforced concrete core flanked by exterior and interior EPS insulation. Unites extreme thermal mass with elite insulation.',
        pros: ['World-class R-value', 'Extreme structural strength', 'Eliminates thermal bridges'],
        cons: ['Expensive', 'Specialized contractor needed'],
        color: 0xC8B8A0,
        climateScore: { tropical: 80, arid: 88, temperate: 90, cold: 95, polar: 92 }
      },
      {
        id: 'w_sip', name: 'SIP Panel (Structural Insulated)', icon: '🧩',
        price: 10900, priceUnit: '₹/m²',
        thermalConductivity: 0.025,
        density: 30,
        specificHeat: 1400,
        absorptance: 0.45,
        emissivity: 0.85,
        uValue: 0.15,
        thickness: 0.165,
        description: 'OSB/fiber cement boards encapsulating high-density EPS core. Airtight envelope.',
        pros: ['Near zero infiltration', 'Very fast erection', 'Low U-value'],
        cons: ['Low thermal mass', 'High cost'],
        color: 0xF0E8D0,
        climateScore: { tropical: 78, arid: 82, temperate: 88, cold: 92, polar: 85 }
      }
    ]
  },

  roof: {
    economy: [
      {
        id: 'r_tin', name: 'Corrugated GI Tin Roof (Bare)', icon: '🏚️',
        price: 840, priceUnit: '₹/m²',
        thermalConductivity: 50.0,
        density: 7800,
        specificHeat: 500,
        absorptance: 0.55,
        emissivity: 0.28,
        uValue: 7.20,
        thickness: 0.002,
        description: 'Bare corrugated galvanized steel. Severe radiation losses to night sky (-20K) cause rapid sub-zero indoor drop.',
        pros: ['Cheap', 'Waterproof', 'Lightweight'],
        cons: ['Severe night sky freezing', 'High daytime overheating'],
        color: 0x8D9AA8,
        climateScore: { tropical: 20, arid: 15, temperate: 30, cold: 8, polar: 4 }
      },
      {
        id: 'r_ladakh_mud', name: 'Traditional Ladakhi Mud + Willow Roof', icon: '🪵',
        price: 1450, priceUnit: '₹/m²',
        thermalConductivity: 0.45,
        density: 1300,
        specificHeat: 950,
        absorptance: 0.75,
        emissivity: 0.90,
        uValue: 1.30,
        thickness: 0.25,
        description: 'Poplar rafters, willow twigs (talu), straw bedding, and 15cm compacted silt/clay. Good thermal inertia.',
        pros: ['Local materials', 'Good mass buffer', 'Traditional heritage'],
        cons: ['Requires annual maintenance', 'Heavy structure'],
        color: 0xB89060,
        climateScore: { tropical: 45, arid: 80, temperate: 70, cold: 78, polar: 50 }
      },
      {
        id: 'r_clay_tile', name: 'Clay / Terracotta Tiles', icon: '🏠',
        price: 1850, priceUnit: '₹/m²',
        thermalConductivity: 0.85,
        density: 1900,
        specificHeat: 800,
        absorptance: 0.70,
        emissivity: 0.90,
        uValue: 2.50,
        thickness: 0.03,
        description: 'Interlocking fired clay tiles on battens. Ventilated air cavity dampens solar gain.',
        pros: ['Aesthetic', 'Natural ventilation', 'Durable'],
        cons: ['Heavy', 'Moderate cold insulation'],
        color: 0xC06040,
        climateScore: { tropical: 65, arid: 65, temperate: 68, cold: 35, polar: 15 }
      }
    ],
    standard: [
      {
        id: 'r_insulated_metal', name: 'Insulated Metal Sandwich (PIR 100mm)', icon: '🔩',
        price: 4800, priceUnit: '₹/m²',
        thermalConductivity: 0.022,
        density: 35,
        specificHeat: 1200,
        absorptance: 0.40,
        emissivity: 0.85,
        uValue: 0.21,
        thickness: 0.10,
        description: 'Corrugated roof sheet with 100mm PIR/PUF insulation core. Drastically curbs night sky radiative heat loss.',
        pros: ['Blocks night sky radiation', 'Waterproof', 'Lightweight'],
        cons: ['Requires seal integrity at ridges'],
        color: 0xB0C0D0,
        climateScore: { tropical: 75, arid: 85, temperate: 85, cold: 90, polar: 82 }
      },
      {
        id: 'r_concrete_insulated', name: 'RCC Slab + 75mm EPS Insulation', icon: '🏗️',
        price: 6200, priceUnit: '₹/m²',
        thermalConductivity: 0.036,
        density: 1200,
        specificHeat: 900,
        absorptance: 0.65,
        emissivity: 0.90,
        uValue: 0.42,
        thickness: 0.22,
        description: '150mm reinforced concrete slab topped with 75mm EPS insulation and screed. Combines thermal mass and insulation.',
        pros: ['Massive thermal storage', 'Low heat loss', 'Durable'],
        cons: ['Heavy load on walls', 'Long curing time'],
        color: 0xB0A898,
        climateScore: { tropical: 70, arid: 85, temperate: 82, cold: 84, polar: 65 }
      }
    ],
    premium: [
      {
        id: 'r_sip_roof', name: 'SIP Roof Panel (200mm EPS Core)', icon: '🧩',
        price: 11800, priceUnit: '₹/m²',
        thermalConductivity: 0.024,
        density: 28,
        specificHeat: 1400,
        absorptance: 0.35,
        emissivity: 0.85,
        uValue: 0.12,
        thickness: 0.20,
        description: '200mm structural insulated panel roof. Exceptional resistance to sub-zero Himalayan blizzards.',
        pros: ['Ultra-low U-value', 'Rapid installation', 'Airtight'],
        cons: ['High capital cost'],
        color: 0xF0DEC0,
        climateScore: { tropical: 82, arid: 88, temperate: 92, cold: 96, polar: 92 }
      },
      {
        id: 'r_phase_change', name: 'PCM Tiles + High-Density Insulation', icon: '💎',
        price: 23500, priceUnit: '₹/m²',
        thermalConductivity: 0.12,
        density: 900,
        specificHeat: 18000,
        absorptance: 0.45,
        emissivity: 0.85,
        uValue: 0.14,
        thickness: 0.15,
        description: 'Roof incorporates paraffin wax Phase Change Material that melts at 22°C, absorbing daytime peak heat and solidifying at night to heat shelter.',
        pros: ['Passive phase-change stabilization', 'Zero daytime overheating', 'Maintains warmth all night'],
        cons: ['Very expensive', 'Specialized engineering'],
        color: 0xC8E8F8,
        climateScore: { tropical: 92, arid: 95, temperate: 90, cold: 94, polar: 85 }
      }
    ]
  },

  floor: {
    economy: [
      {
        id: 'f_earth', name: 'Rammed Earth Floor / Silt Slab', icon: '🌍',
        price: 250, priceUnit: '₹/m²',
        thermalConductivity: 1.20,
        density: 1900,
        specificHeat: 880,
        absorptance: 0.70,
        emissivity: 0.90,
        uValue: 2.60,
        thickness: 0.25,
        description: 'Traditional compacted earth floor with oil seal. Direct coupling to sub-surface ground warmth (approx +6°C in winter).',
        pros: ['Near-zero cost', 'High mass buffer', 'Locally constructed'],
        cons: ['Needs moisture barrier', 'Moderate conduction loss'],
        color: 0x8B6347,
        climateScore: { tropical: 55, arid: 70, temperate: 55, cold: 50, polar: 20 }
      },
      {
        id: 'f_concrete_plain', name: 'Plain Concrete Slab (100mm)', icon: '⬜',
        price: 1680, priceUnit: '₹/m²',
        thermalConductivity: 1.70,
        density: 2400,
        specificHeat: 880,
        absorptance: 0.60,
        emissivity: 0.90,
        uValue: 2.20,
        thickness: 0.10,
        description: 'Cast concrete slab directly on grade without insulation.',
        pros: ['Durable', 'Sanitary', 'Stiff foundation'],
        cons: ['Cold floor surface', 'Ground heat leak'],
        color: 0xC8C0B8,
        climateScore: { tropical: 58, arid: 65, temperate: 55, cold: 35, polar: 20 }
      }
    ],
    standard: [
      {
        id: 'f_concrete_insulated', name: 'Concrete Slab + 50mm XPS Board', icon: '🔷',
        price: 4620, priceUnit: '₹/m²',
        thermalConductivity: 0.034,
        density: 1500,
        specificHeat: 950,
        absorptance: 0.60,
        emissivity: 0.90,
        uValue: 0.38,
        thickness: 0.15,
        description: 'Heavy concrete mass slab insulated from frozen ground by high-compressive-strength XPS foam. Absorbs direct sunlight through south windows.',
        pros: ['Acts as internal solar thermal sink', 'Thermal mass stays warm', 'Ground freeze decoupled'],
        cons: ['Requires proper edge insulation'],
        color: 0xC0D0E0,
        climateScore: { tropical: 70, arid: 80, temperate: 84, cold: 88, polar: 75 }
      },
      {
        id: 'f_timber_raised', name: 'Raised Timber Floor + Glasswool', icon: '🪵',
        price: 5900, priceUnit: '₹/m²',
        thermalConductivity: 0.045,
        density: 450,
        specificHeat: 1400,
        absorptance: 0.65,
        emissivity: 0.88,
        uValue: 0.35,
        thickness: 0.18,
        description: 'Suspended wood deck with 100mm glasswool blanket. Creates an insulating barrier above cold ground/permafrost.',
        pros: ['Warm underfoot', 'Protects against permafrost thawing', 'Rapid assembly'],
        cons: ['Lower thermal mass than concrete'],
        color: 0xA07850,
        climateScore: { tropical: 65, arid: 60, temperate: 78, cold: 82, polar: 70 }
      }
    ],
    premium: [
      {
        id: 'f_insulated_mass', name: 'Solar Mass Slab + 100mm XPS Sub-Base', icon: '♨️',
        price: 8800, priceUnit: '₹/m²',
        thermalConductivity: 0.028,
        density: 2200,
        specificHeat: 1000,
        absorptance: 0.85, // Dark slate or dyed concrete floor to absorb direct solar
        emissivity: 0.90,
        uValue: 0.22,
        thickness: 0.20,
        description: 'Dark-finished high-density concrete slab on 100mm extruded polystyrene. Specifically tuned to soak up winter sunlight from south glazing and re-radiate heat at night.',
        pros: ['Maximum passive heat storage', 'Eliminates floor heat loss', 'Maintains room base temp'],
        cons: ['High material cost'],
        color: 0x3E3832,
        climateScore: { tropical: 60, arid: 85, temperate: 88, cold: 96, polar: 90 }
      },
      {
        id: 'f_vacuum', name: 'Vacuum Insulation Floor Assembly', icon: '🔬',
        price: 16800, priceUnit: '₹/m²',
        thermalConductivity: 0.005,
        density: 200,
        specificHeat: 800,
        absorptance: 0.50,
        emissivity: 0.85,
        uValue: 0.08,
        thickness: 0.05,
        description: 'Evacuated nano-porous core panels. Extreme insulation for extreme sub-zero arctic/polar ground conditions.',
        pros: ['Thinnest elite insulator in existence', 'Near-zero ground conduction'],
        cons: ['Cannot be punctured/cut', 'Very high cost'],
        color: 0xE8F8F0,
        climateScore: { tropical: 80, arid: 82, temperate: 88, cold: 98, polar: 98 }
      }
    ]
  },

window: {
    economy: [
      { id: 'win_single_clear', name: 'Single Glazed Clear 4mm', icon: '🪟', price: 1200, priceUnit: '₹/m²', thermalConductivity: 1.0, density: 2500, specificHeat: 840, absorptance: 0.80, emissivity: 0.10, uValue: 5.80, thickness: 0.004, description: 'Basic single glass with severe conductive losses and high winter discomfort.', pros: ['Low cost'], cons: ['High heat loss', 'Poor winter comfort'], color: 0x90C6FF, climateScore: { tropical: 40, arid: 30, temperate: 45, cold: 10, polar: 5 } },
      { id: 'win_double_clear', name: 'Double Glazed Clear (6-12-6mm)', icon: '🪟', price: 3400, priceUnit: '₹/m²', thermalConductivity: 1.0, density: 2500, specificHeat: 840, absorptance: 0.72, emissivity: 0.10, uValue: 2.80, thickness: 0.02, description: 'Standard double-glazing for typical balanced performance and air gap insulation.', pros: ['Improved insulation'], cons: ['Moderate solar gain'], color: 0x81B7FF, climateScore: { tropical: 55, arid: 50, temperate: 70, cold: 65, polar: 25 } },
      { id: 'win_double_lowe', name: 'Double Glazed Low-E (Argon)', icon: '🛡️', price: 5800, priceUnit: '₹/m²', thermalConductivity: 0.026, density: 2500, specificHeat: 840, absorptance: 0.36, emissivity: 0.07, uValue: 1.40, thickness: 0.024, description: 'Low-E double glazing suppresses radiative heat loss and is suitable for cold or desert climates.', pros: ['Low U-value', 'Good solar control'], cons: ['Higher cost'], color: 0x3D77C9, climateScore: { tropical: 80, arid: 88, temperate: 85, cold: 94, polar: 80 } }
    ],
    standard: [
      { id: 'win_laminated_double', name: 'Laminated Double Glazing', icon: '🧱', price: 7200, priceUnit: '₹/m²', thermalConductivity: 0.026, density: 2500, specificHeat: 840, absorptance: 0.30, emissivity: 0.08, uValue: 1.20, thickness: 0.026, description: 'Laminated glass with interlayer strength for storm resilience and good acoustic performance.', pros: ['High impact resistance', 'Good safety'], cons: ['More expensive'], color: 0x6FA7D8, climateScore: { tropical: 72, arid: 84, temperate: 80, cold: 88, polar: 75 } },
      { id: 'win_double_lowe', name: 'Double Glazed Low-E (Argon)', icon: '🛡️', price: 5800, priceUnit: '₹/m²', thermalConductivity: 0.026, density: 2500, specificHeat: 840, absorptance: 0.36, emissivity: 0.07, uValue: 1.40, thickness: 0.024, description: 'General-purpose high-performance glazing recommended for most climates.', pros: ['Good balance'], cons: ['Cost still moderate'], color: 0x3D77C9, climateScore: { tropical: 80, arid: 88, temperate: 85, cold: 94, polar: 80 } },
      { id: 'win_triple_lowe', name: 'Triple Glazed Low-E (Krypton)', icon: '❄️', price: 11500, priceUnit: '₹/m²', thermalConductivity: 0.024, density: 2500, specificHeat: 840, absorptance: 0.28, emissivity: 0.05, uValue: 0.75, thickness: 0.038, description: 'Extreme cold glazing retaining heat effectively for high-altitude and polar shelters.', pros: ['Excellent thermal retention'], cons: ['High cost'], color: 0x2D62A4, climateScore: { tropical: 68, arid: 80, temperate: 86, cold: 98, polar: 96 } }
    ],
    premium: [
      { id: 'win_triple_lowe', name: 'Triple Glazed Low-E (Krypton)', icon: '❄️', price: 11500, priceUnit: '₹/m²', thermalConductivity: 0.024, density: 2500, specificHeat: 840, absorptance: 0.28, emissivity: 0.05, uValue: 0.75, thickness: 0.038, description: 'Best-in-class glazing for extreme cold, windy, and high-elevation conditions.', pros: ['Elite insulation', 'Minimal heat loss'], cons: ['Premium price'], color: 0x2D62A4, climateScore: { tropical: 68, arid: 80, temperate: 86, cold: 98, polar: 96 } },
      { id: 'win_laminated_double', name: 'Laminated Double Glazing', icon: '🧱', price: 7200, priceUnit: '₹/m²', thermalConductivity: 0.026, density: 2500, specificHeat: 840, absorptance: 0.30, emissivity: 0.08, uValue: 1.20, thickness: 0.026, description: 'Strong and storm-resistant glazing for windy high-rain conditions.', pros: ['Impact resistant'], cons: ['Less insulating than triple'], color: 0x6FA7D8, climateScore: { tropical: 72, arid: 84, temperate: 80, cold: 88, polar: 75 } },
      { id: 'win_double_lowe', name: 'Double Glazed Low-E (Argon)', icon: '🛡️', price: 5800, priceUnit: '₹/m²', thermalConductivity: 0.026, density: 2500, specificHeat: 840, absorptance: 0.36, emissivity: 0.07, uValue: 1.40, thickness: 0.024, description: 'Cost-effective premium glazing for the most common climate scenarios.', pros: ['Balanced performance'], cons: ['Not as strong as laminated'], color: 0x3D77C9, climateScore: { tropical: 80, arid: 88, temperate: 85, cold: 94, polar: 80 } }
    ]
  },
  door: {
    economy: [
      { id: 'd_frp', name: 'FRP Door', icon: '🚪', price: 2800, priceUnit: '₹/m²', thermalConductivity: 0.22, density: 1200, specificHeat: 900, absorptance: 0.45, emissivity: 0.72, uValue: 1.30, thickness: 0.04, description: 'Lightweight FRP door with serviceable insulation and corrosion resistance.', pros: ['Lightweight', 'Corrosion resistant'], cons: ['Lower structural ruggedness'], color: 0xD6D9DE, climateScore: { tropical: 74, arid: 68, temperate: 70, cold: 62, polar: 40 } },
      { id: 'd_aluminium_frp', name: 'Aluminium/FRP Door', icon: '🚪', price: 4200, priceUnit: '₹/m²', thermalConductivity: 0.18, density: 1800, specificHeat: 900, absorptance: 0.40, emissivity: 0.70, uValue: 0.98, thickness: 0.05, description: 'Composite door with better insulation and wind resistance for moderate to severe climates.', pros: ['Better thermal break'], cons: ['Can conduct heat if not insulated'], color: 0xA7B3C5, climateScore: { tropical: 70, arid: 82, temperate: 81, cold: 75, polar: 58 } },
      { id: 'd_insulated_frp', name: 'Insulated FRP/Aluminium Door', icon: '🚪', price: 6200, priceUnit: '₹/m²', thermalConductivity: 0.040, density: 600, specificHeat: 1200, absorptance: 0.35, emissivity: 0.80, uValue: 0.56, thickness: 0.06, description: 'Robust insulated door that cuts heat loss, suits cold and high-altitude shelters.', pros: ['Low thermal conductivity', 'Good insulation'], cons: ['Higher price'], color: 0x6D7D8D, climateScore: { tropical: 66, arid: 74, temperate: 80, cold: 96, polar: 92 } }
    ],
    standard: [
      { id: 'd_insulated_frp', name: 'Insulated FRP/Aluminium Door', icon: '🚪', price: 6200, priceUnit: '₹/m²', thermalConductivity: 0.040, density: 600, specificHeat: 1200, absorptance: 0.35, emissivity: 0.80, uValue: 0.56, thickness: 0.06, description: 'Preferred for cold and windy shelters because it reduces conductive heat loss while preserving light mass.', pros: ['Low heat loss', 'Durable'], cons: ['Premium cost'], color: 0x6D7D8D, climateScore: { tropical: 66, arid: 74, temperate: 80, cold: 96, polar: 92 } },
      { id: 'd_insulated_steel_frp', name: 'Insulated Steel/FRP Door', icon: '🚪', price: 7800, priceUnit: '₹/m²', thermalConductivity: 0.036, density: 750, specificHeat: 1150, absorptance: 0.32, emissivity: 0.82, uValue: 0.48, thickness: 0.07, description: 'Steel exterior with insulating core for snow and cold zone reliability.', pros: ['Strong', 'Snow ready'], cons: ['Heavier'], color: 0x62717e, climateScore: { tropical: 60, arid: 72, temperate: 76, cold: 95, polar: 88 } },
      { id: 'd_reinforced_frp_aluminium', name: 'Reinforced FRP/Aluminium Door', icon: '🚪', price: 9200, priceUnit: '₹/m²', thermalConductivity: 0.038, density: 800, specificHeat: 1100, absorptance: 0.30, emissivity: 0.75, uValue: 0.45, thickness: 0.08, description: 'High wind and heavy rain resistant door with insulated core and structural frame.', pros: ['Wind resistant', 'Waterproof'], cons: ['Costly'], color: 0x9BAEBB, climateScore: { tropical: 72, arid: 80, temperate: 82, cold: 90, polar: 86 } }
    ],
    premium: [
      { id: 'd_reinforced_frp_aluminium', name: 'Reinforced FRP/Aluminium Door', icon: '🚪', price: 9200, priceUnit: '₹/m²', thermalConductivity: 0.038, density: 800, specificHeat: 1100, absorptance: 0.30, emissivity: 0.75, uValue: 0.45, thickness: 0.08, description: 'Premium shelter door designed for severe wind and heavy rain with premium thermal control.', pros: ['Strongest shell'], cons: ['Expensive'], color: 0x9BAEBB, climateScore: { tropical: 72, arid: 80, temperate: 82, cold: 90, polar: 86 } },
      { id: 'd_insulated_steel_frp', name: 'Insulated Steel/FRP Door', icon: '🚪', price: 7800, priceUnit: '₹/m²', thermalConductivity: 0.036, density: 750, specificHeat: 1150, absorptance: 0.32, emissivity: 0.82, uValue: 0.48, thickness: 0.07, description: 'Cold-climate door with steel durability and good insulation.', pros: ['Good protection'], cons: ['Heavier'], color: 0x62717e, climateScore: { tropical: 60, arid: 72, temperate: 76, cold: 95, polar: 88 } },
      { id: 'd_insulated_aluminium_frp', name: 'Insulated Aluminium/FRP Door', icon: '🚪', price: 6800, priceUnit: '₹/m²', thermalConductivity: 0.045, density: 700, specificHeat: 1000, absorptance: 0.38, emissivity: 0.76, uValue: 0.62, thickness: 0.06, description: 'Balanced hot-dry performance with insulation and reflective surface for daytime sun control.', pros: ['Reflective', 'Moderate cost'], cons: ['Not as rugged as reinforced'], color: 0xC3D1E4, climateScore: { tropical: 72, arid: 92, temperate: 78, cold: 74, polar: 60 } }
    ]
  }
};

// ──────────────────────────────────────────────
//  Materials UI Controller
// ──────────────────────────────────────────────
class MaterialsController {
  constructor() {
    this.selected = {
      wall: null,
      roof: null,
      door: null,
      floor: null,
      window: null
    };
    this.activeComponent = 'wall';
    this.activeTier = 'standard';
    this.initialized = false;
  }

  _normalizeClimateKey(key) {
    const normalized = (key || '').toString().toLowerCase().trim();
    if (!normalized) return 'cold';
    const aliases = {
      'high altitude / very cold': 'high-altitude-cold',
      'high-altitude / very cold': 'high-altitude-cold',
      'high altitude very cold': 'high-altitude-cold',
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

  _getRecommendedMaterialSet() {
    const climateKey = this._normalizeClimateKey(window.AppState?.climate || 'cold');
    const recommendation = MATERIALS_RECOMMENDATIONS[climateKey] || MATERIALS_RECOMMENDATIONS.cold;
    const set = {};
    Object.keys(recommendation).forEach(component => {
      set[component] = this._findMaterialById(component, recommendation[component]);
    });
    return set;
  }

  _findMaterialById(component, id) {
    const componentDb = MATERIALS_DB[component];
    if (!componentDb) return null;
    for (const tier of ['economy', 'standard', 'premium']) {
      const candidate = (componentDb[tier] || []).find(item => item.id === id);
      if (candidate) return candidate;
    }
    return null;
  }

  _applyClimateRecommendation() {
    const recommended = this._getRecommendedMaterialSet();
    this.selected = {
      wall: recommended.wall || this.selected.wall,
      roof: recommended.roof || this.selected.roof,
      door: recommended.door || this.selected.door,
      floor: recommended.floor || this.selected.floor,
      window: recommended.window || this.selected.window
    };

    if (window.AppState) {
      window.AppState.materials = { ...window.AppState.materials, ...this.selected };
    }
  }

  async refreshGeminiRecommendation() {
    const service = window.geminiService;
    if (!service || !service.getApiKey?.()) return;

    const location = window.AppState?.location || {};
    const climateKey = this._normalizeClimateKey(window.AppState?.climate || 'cold');

    try {
      const result = await service.recommendMaterialsForRegion({
        locationName: location.name || 'Selected site',
        climate: climateKey,
        latitude: location.lat,
        longitude: location.lon
      });

      if (!result || typeof result !== 'object') return;
      const recommended = {};
      for (const component of ['wall', 'roof', 'door', 'floor', 'window']) {
        const chosenId = result[component];
        recommended[component] = this._findMaterialById(component, chosenId);
      }

      const hasAll = Object.values(recommended).every(Boolean);
      if (!hasAll) return;

      this.selected = { ...this.selected, ...recommended };
      if (window.AppState) {
        window.AppState.materials = { ...window.AppState.materials, ...this.selected };
      }
      this._renderRecommendationCard();
      this._renderSection();
      this._updateSummary();
      if (window.shelterViewer) window.shelterViewer.updateMaterials();
    } catch (err) {
      console.warn('Gemini-backed material refresh failed:', err);
    }
  }

  _getClimateLabel() {
    const climateKey = this._normalizeClimateKey(window.AppState?.climate || 'cold');
    const labelMap = {
      'high-altitude-cold': 'High Altitude / Very Cold',
      'snow-cold': 'Snow / Cold',
      'hot-dry-desert': 'Hot & Dry / Desert',
      'hot-humid-coastal': 'Hot & Humid / Coastal',
      'heavy-rain': 'Heavy Rain',
      'high-wind': 'High Wind',
      'moderate': 'Moderate Climate',
      cold: 'Cold / Sub-Arctic',
      polar: 'Polar / Arctic',
      arid: 'Arid / Desert',
      tropical: 'Tropical',
      temperate: 'Temperate'
    };
    return labelMap[climateKey] || 'Cold / Sub-Arctic';
  }

  _renderRecommendationCard() {
    const container = document.getElementById('material-recommendation-panel');
    if (!container) return;
    const climateKey = this._normalizeClimateKey(window.AppState?.climate || 'cold');
    const recommended = this._getRecommendedMaterialSet();
    const climateOptions = [
      ['high-altitude-cold', 'High Altitude / Very Cold'],
      ['snow-cold', 'Snow / Cold'],
      ['hot-dry-desert', 'Hot & Dry / Desert'],
      ['hot-humid-coastal', 'Hot & Humid / Coastal'],
      ['heavy-rain', 'Heavy Rain'],
      ['high-wind', 'High Wind'],
      ['moderate', 'Moderate Climate'],
      ['cold', 'Cold / Sub-Arctic'],
      ['arid', 'Arid / Desert'],
      ['tropical', 'Tropical'],
      ['temperate', 'Temperate'],
      ['polar', 'Polar / Arctic']
    ];

    const reasons = {
      'high-altitude-cold': 'Low thermal conductivity and low U-value reduce heat escape, while lightweight composite skins stay manageable for mountain deployment and snow resilience.',
      'snow-cold': 'Insulated, moisture-resistant composites control snow-driven heat loss and maintain structural integrity against freeze-thaw cycles and wind loading.',
      'hot-dry-desert': 'Reflective surfaces and high thermal mass limit daytime heat gain, while insulated assemblies prevent radiant heat transfer so the interior remains cooler at night and during the day.',
      'hot-humid-coastal': 'Corrosion-resistant and moisture-tolerant materials reduce humidity damage while reflective and insulated layers keep the inside stable.',
      'heavy-rain': 'Waterproof and sealed panel systems give superior moisture resistance and reduce ingress, corrosion and mildew risk in prolonged rainfall.',
      'high-wind': 'High-strength composite skins and laminated glazing withstand uplift forces and maintain envelope integrity under turbulent wind loads.',
      'moderate': 'Balanced insulation, durability and cost make this combination suitable for mixed seasonal conditions without overbuilding the envelope.',
      cold: 'The recommended system minimizes heat leak through low-conductivity panels and insulated glazing while limiting infiltration in cold, windy seasons.',
      arid: 'High solar reflectivity and insulated mass limit daytime overheating, while retaining cool air and stabilizing day-night temperature swings.',
      tropical: 'Moisture resistance, reflective surfaces and corrosion-tolerant materials limit humidity damage and reduce heat buildup.',
      temperate: 'This combination balances insulation, durability and cost for variable seasonal conditions and moderate weather swings.',
      polar: 'Very low U-value materials and exceptional insulation reduce conductive losses in the coldest climate conditions.'
    };

    container.innerHTML = `
      <div class="material-recommendation-card">
        <div class="material-recommendation-head">
          <div class="material-recommendation-title">Climate-Adaptive Material Recommendation</div>
          <select id="material-climate-select" class="material-climate-select" aria-label="Select climate condition">
            ${climateOptions.map(([value, label]) => `<option value="${value}" ${value === climateKey ? 'selected' : ''}>${label}</option>`).join('')}
          </select>
        </div>
        <div class="material-recommendation-grid">
          ${['wall','roof','door','floor','window'].map(component => {
            const material = recommended[component];
            const labelMap = { wall: 'Wall', roof: 'Roof', door: 'Door', floor: 'Floor', window: 'Window' };
            return `<div class="material-recommendation-item"><strong>${labelMap[component]}</strong><span>${material ? material.name : '—'}</span></div>`;
          }).join('')}
        </div>
        <div class="material-recommendation-reason"><strong>Reason:</strong> ${reasons[climateKey] || 'Selected materials have low conductivity and are suitable for the chosen climate conditions.'}</div>
      </div>
    `;

    const climateSelect = document.getElementById('material-climate-select');
    if (climateSelect) {
      climateSelect.addEventListener('change', async (event) => {
        const nextClimate = event.target.value;
        if (window.AppState) {
          window.AppState.climate = nextClimate;
        }
        if (window.locationCtrl && window.locationCtrl.selectedLocation) {
          window.locationCtrl.selectedLocation.climate = nextClimate;
        }
        this._applyClimateRecommendation();
        this._renderSection();
        this._updateSummary();
        this.refreshGeminiRecommendation();
        if (window.shelterViewer) window.shelterViewer.buildShelter();
        if (window.showToast) window.showToast(`Climate updated to ${this._getClimateLabel()}. Recommended materials refreshed.`, 'info');
      });
    }
  }

  _buildUI() {
    const tabsEl = document.getElementById('mat-component-tabs');
    if (!tabsEl) return;
    const components = ['wall', 'roof', 'door', 'floor', 'window'];
    const icons = { wall: '🧱', roof: '🏠', door: '🚪', floor: '⬛', window: '🪟' };
    tabsEl.innerHTML = components.map(c =>
      `<button class="mat-tab ${c === this.activeComponent ? 'active' : ''}" data-component="${c}">
        ${icons[c]} ${c.charAt(0).toUpperCase() + c.slice(1)}
      </button>`
    ).join('');

    this._renderRecommendationCard();
    this._renderSection();
  }

  _renderSection() {
    const container = document.getElementById('mat-section-container');
    if (!container) return;
    const c = this.activeComponent;

    container.innerHTML = `
      <div class="tier-tabs" id="tier-tabs">
        ${['economy', 'standard', 'premium'].map(t =>
          `<button class="tier-btn ${t === this.activeTier ? 'active' : ''}" data-tier="${t}">
            <span class="tier-icon">${{ economy: '💰', standard: '⭐', premium: '💎' }[t]}</span>
            ${t.charAt(0).toUpperCase() + t.slice(1)}
            <span style="font-size:0.65rem;opacity:0.7">${{ economy: 'Indigenous/Budget', standard: 'Engineered', premium: 'High-Performance' }[t]}</span>
          </button>`
        ).join('')}
      </div>
      <div class="materials-grid" id="materials-grid"></div>
    `;

    this._renderMaterials();

    document.querySelectorAll('[data-tier]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.activeTier = btn.dataset.tier;
        document.querySelectorAll('[data-tier]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this._renderMaterials();
      });
    });
  }

  _renderMaterials() {
    const grid = document.getElementById('materials-grid');
    if (!grid) return;
    const items = (MATERIALS_DB[this.activeComponent] && MATERIALS_DB[this.activeComponent][this.activeTier]) || [];
    const sel = this.selected[this.activeComponent];
    const recommended = this._getRecommendedMaterialSet()[this.activeComponent];

    grid.innerHTML = items.map(mat => {
      const isSelected = sel?.id === mat.id;
      const isRecommended = recommended?.id === mat.id;
      const compareText = isSelected
        ? (isRecommended ? 'Selected matches recommendation' : 'Selected differs from climate recommendation')
        : (isRecommended ? 'Recommended for this climate' : 'Alternative option');

      return `
        <div class="mat-card ${isSelected ? 'selected' : ''}" data-mat-id="${mat.id}" data-component="${this.activeComponent}">
          <div class="mat-card-check">✓</div>
          ${isRecommended ? '<div style="position:absolute;top:10px;left:10px;background:rgba(76,175,80,0.25);border:1px solid rgba(76,175,80,0.45);padding:2px 6px;border-radius:10px;font-size:0.6rem;font-weight:700;color:#9CF4A9;">Recommended</div>' : ''}
          <div class="mat-icon">${mat.icon}</div>
          <div class="mat-name">${mat.name}</div>
          <div style="font-size:0.72rem;color:var(--tan);margin-bottom:8px">${mat.description}</div>
          <div class="mat-props">
            <div class="mat-prop"><span>U-Value</span><span>${mat.uValue} W/m²K</span></div>
            <div class="mat-prop"><span>k-Value</span><span>${mat.thermalConductivity} W/m·K</span></div>
            <div class="mat-prop"><span>Density</span><span>${mat.density} kg/m³</span></div>
            <div class="mat-prop"><span>Specific Heat</span><span>${mat.specificHeat} J/kg·K</span></div>
          </div>
          <div class="mat-price">₹ ${mat.price.toLocaleString('en-IN')} ${mat.priceUnit}</div>
          <div style="margin-top:8px;font-size:0.64rem;color:${isRecommended ? '#9CF4A9' : 'var(--tan)'};font-weight:600">${compareText}</div>
        </div>
      `;
    }).join('');

    grid.querySelectorAll('.mat-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.matId;
        const component = card.dataset.component;
        const tier = this.activeTier;
        const mat = (MATERIALS_DB[component] && MATERIALS_DB[component][tier] || []).find(m => m.id === id);
        if (!mat) return;
        this.selected[component] = mat;
        this._renderMaterials();
        this._updateSummary();
        if (window.AppState) {
          window.AppState.materials[component] = mat;
        }
        if (window.shelterViewer) window.shelterViewer.updateMaterials();
        if (window.showToast) window.showToast(`${mat.icon} ${mat.name} selected for ${component}`, 'success');
      });
    });
  }

  _updateSummary() {
    const s = this.selected;
    const sumWall = document.getElementById('sum-wall');
    const sumRoof = document.getElementById('sum-roof');
    const sumDoor = document.getElementById('sum-door');
    const sumFloor = document.getElementById('sum-floor');
    const sumWindow = document.getElementById('sum-window');
    if (sumWall) sumWall.textContent = s.wall ? s.wall.name : 'Not selected';
    if (sumRoof) sumRoof.textContent = s.roof ? s.roof.name : 'Not selected';
    if (sumDoor) sumDoor.textContent = s.door ? s.door.name : 'Not selected';
    if (sumFloor) sumFloor.textContent = s.floor ? s.floor.name : 'Not selected';
    if (sumWindow) sumWindow.textContent = s.window ? s.window.name : 'Not selected';

    const totalCost = ['wall', 'roof', 'door', 'floor', 'window'].reduce((acc, c) => {
      if (!s[c]) return acc;
      const area = window.AppState?.dimensions?.area || 30;
      return acc + s[c].price * area;
    }, 0);
    const el = document.getElementById('sum-cost');
    if (el) el.textContent = `~₹${totalCost.toLocaleString('en-IN')}`;

    if (window.AppState) {
      window.AppState.materials = { ...window.AppState.materials, ...this.selected };
    }
  }

  _bindEvents() {
    const tabsEl = document.getElementById('mat-component-tabs');
    if (!tabsEl) return;
    tabsEl.addEventListener('click', e => {
      const btn = e.target.closest('[data-component]');
      if (!btn) return;
      this.activeComponent = btn.dataset.component;
      document.querySelectorAll('.mat-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      this._renderSection();
    });
  }

  init() {
    if (this.initialized) return;
    this.initialized = true;
    this._applyClimateRecommendation();
    this._buildUI();
    this._bindEvents();
    this._updateSummary();
    this.refreshGeminiRecommendation();
  }

  isComplete() {
    return this.selected.wall && this.selected.roof && this.selected.door && this.selected.floor && this.selected.window;
  }
}

window.MATERIALS_DB = MATERIALS_DB;
window.materialsCtrl = new MaterialsController();
