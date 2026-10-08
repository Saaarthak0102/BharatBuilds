/**
 * Centralized typed mock data and impact calculation engine for Saans dashboards.
 * Powers both /farmer and /citizen dashboards to maintain numeric consistency.
 */

// ============================================================================
// 1. IMPACT & EMISSION CONSTANTS (Estimates based on CPCB / NEERI research)
// ============================================================================

/**
 * ESTIMATE CONSTANTS: Stubble burning emission factors
 * Research source: CPCB & NEERI emission inventories for Indian agricultural residue burning.
 * - ~2.2 tonnes of paddy residue generated per acre.
 * - ~6.5 kg of PM2.5 emitted per tonne of open-burned straw.
 * - ~1,460 kg of CO₂ equivalent emitted per tonne of open-burned straw.
 */
export const IMPACT_CONSTANTS = {
  TONNES_STRAW_PER_ACRE: 2.2, // est. tonnes residue per acre
  PM25_KG_PER_TONNE: 6.5,     // est. kg PM2.5 released per tonne straw burned
  CO2_KG_PER_TONNE: 1460,     // est. kg CO₂ released per tonne straw burned
} as const;

// ============================================================================
// 2. ACTION-TO-₹ EARNING RULES
// ============================================================================

export interface EarningRule {
  type: 'machine_booking_completed' | 'straw_sold_outlet' | 'subsidy_eligible_action';
  label: string;
  rateDescription: string;
  calculateAmount: (params: { acres?: number; tonnes?: number; flatRate?: number }) => number;
}

export const ACTION_EARNING_RULES: Record<string, EarningRule> = {
  machine_booking_completed: {
    type: 'machine_booking_completed',
    label: 'CRM Machine Seeding Incentive',
    rateDescription: '₹1,000 per acre cleared without burning',
    calculateAmount: ({ acres = 0 }) => acres * 1000,
  },
  straw_sold_outlet: {
    type: 'straw_sold_outlet',
    label: 'Straw Sold to Biomass Depot',
    rateDescription: '₹1,600 per tonne of baled residue',
    calculateAmount: ({ tonnes = 0 }) => tonnes * 1600,
  },
  subsidy_eligible_action: {
    type: 'subsidy_eligible_action',
    label: 'State In-Situ Management Grant',
    rateDescription: '₹5,000 per verified field',
    calculateAmount: ({ flatRate = 5000 }) => flatRate,
  },
};

// ============================================================================
// 3. FARMER ACTIONS (Mock completed farmer activities)
// ============================================================================

export interface FarmerCompletedAction {
  id: string;
  type: 'machine_booking_completed' | 'straw_sold_outlet' | 'subsidy_eligible_action';
  date: string;
  description: string;
  acres?: number;
  tonnes?: number;
  flatAmount?: number;
  earnedAmount: number;
}

export const MOCK_FARMER_ACTIONS: FarmerCompletedAction[] = [
  {
    id: 'act-001',
    type: 'machine_booking_completed',
    date: '2024-11-02',
    description: 'Happy Seeder deployed on North Plot',
    acres: 5,
    earnedAmount: 5000,
  },
  {
    id: 'act-002',
    type: 'straw_sold_outlet',
    date: '2024-11-03',
    description: '11 tonnes baled straw to Patiala Biomass Plant',
    tonnes: 11,
    earnedAmount: 17600,
  },
  {
    id: 'act-003',
    type: 'subsidy_eligible_action',
    date: '2024-11-04',
    description: 'Verified In-Situ Crop Residue Management registration',
    flatAmount: 7000,
    earnedAmount: 7000,
  },
];

/**
 * Calculates farmer's total earnings and earnings breakdown from their actions.
 */
export function calculateEarnings(actions: FarmerCompletedAction[] = MOCK_FARMER_ACTIONS) {
  const total = actions.reduce((sum, act) => sum + act.earnedAmount, 0);
  const actionCount = actions.length;
  return {
    total,
    formattedTotal: `₹${total.toLocaleString('en-IN')}`,
    actionCount,
    actions,
  };
}

/**
 * Calculates environmental savings (acres, tonnes straw, PM2.5, CO₂)
 */
export function calculateFarmerImpact(actions: FarmerCompletedAction[] = MOCK_FARMER_ACTIONS) {
  // Acres diverted directly or via straw tonnage
  let totalAcres = 0;
  let totalTonnes = 0;

  for (const act of actions) {
    if (act.acres) {
      totalAcres += act.acres;
      totalTonnes += act.acres * IMPACT_CONSTANTS.TONNES_STRAW_PER_ACRE;
    } else if (act.tonnes) {
      totalTonnes += act.tonnes;
      totalAcres += act.tonnes / IMPACT_CONSTANTS.TONNES_STRAW_PER_ACRE;
    }
  }

  // Baseline addition for season to date:
  const seasonAcres = Math.round(totalAcres + 9); // Total 14 acres saved
  const seasonStrawTonnes = Math.round(seasonAcres * IMPACT_CONSTANTS.TONNES_STRAW_PER_ACRE); // ~31 tonnes

  const pm25Kg = Math.round(seasonStrawTonnes * IMPACT_CONSTANTS.PM25_KG_PER_TONNE); // ~201 kg PM2.5
  const co2Tonnes = Math.round((seasonStrawTonnes * IMPACT_CONSTANTS.CO2_KG_PER_TONNE) / 1000); // ~45 tonnes CO2

  return {
    acresAvoided: seasonAcres,
    tonnesStrawDiverted: seasonStrawTonnes,
    pm25KgSaved: pm25Kg,
    co2TonnesSaved: co2Tonnes,
    reinforcementText: `You kept ${pm25Kg} kg of smoke out of Delhi's air this season.`,
  };
}

// ============================================================================
// 4. REGIONAL / CITIZEN AGGREGATE IMPACT (Summed from collective farmer actions)
// ============================================================================

export interface RegionalImpactSummary {
  fieldsNotBurnedToday: number;
  strawDivertedTodayTonnes: number;
  pm25AvoidedKg: number;
  co2AvoidedTonnes: number;
  bestTimeOutside: string;
}

export function getCitizenRegionalImpact(): RegionalImpactSummary {
  // 142 fields chose mechanized clearing or baling instead of open burning today across NCR & Punjab border
  const fieldsToday = 142;
  const avgAcresPerField = 2.2;
  const totalStrawTonnesToday = Math.round(fieldsToday * avgAcresPerField * IMPACT_CONSTANTS.TONNES_STRAW_PER_ACRE); // ~687 tonnes straw

  const pm25KgAvoided = Math.round(totalStrawTonnesToday * IMPACT_CONSTANTS.PM25_KG_PER_TONNE); // ~4,465 kg PM2.5
  const co2TonnesAvoided = Math.round((totalStrawTonnesToday * IMPACT_CONSTANTS.CO2_KG_PER_TONNE) / 1000); // ~1,003 tonnes CO2

  return {
    fieldsNotBurnedToday: fieldsToday,
    strawDivertedTodayTonnes: totalStrawTonnesToday,
    pm25AvoidedKg: pm25KgAvoided,
    co2AvoidedTonnes: co2TonnesAvoided,
    bestTimeOutside: '1:30 PM – 4:00 PM (Cleanest AQI window ~140)',
  };
}

// ============================================================================
// 5. DID YOU KNOW FACTS (Rotating project facts)
// ============================================================================

export const DID_YOU_KNOW_FACTS: string[] = [
  "Smoke from Punjab stubble fields takes 24–48 hours to travel down the Indo-Gangetic basin to Delhi NCR.",
  "A Happy Seeder sows wheat directly into standing stubble, eliminating the need to burn 2+ tonnes of straw per acre.",
  "Air quality in Delhi is typically cleanest between 1:00 PM and 4:30 PM when daytime solar heating disperses smog.",
  "Paddy straw can be converted into compressed bio-gas (CBG) and fuel pellets for thermal power plants.",
  "Burning one acre of residue strips the soil of ~5.5 kg nitrogen, 2.3 kg phosphorus, and beneficial microbes.",
  "Evening temperature inversions trap surface smoke close to the ground, causing AQI spikes between 8 PM and 4 AM.",
  "Delhi NCR receives up to 40% of its peak November particulate matter from regional agricultural residue fires.",
];

// ============================================================================
// 6. SHARED WEATHER STRIP DATA
// ============================================================================

export interface WeatherStripData {
  temperature: string;
  condition: string;
  conditionIcon: 'sun' | 'cloud-sun' | 'wind' | 'haze';
  windSpeed: string;
  windDirection: string;
  humidity: string;
  rainChance: string;
  aqiValue: number;
  aqiCategory: 'Good' | 'Satisfactory' | 'Moderate' | 'Poor' | 'Very Poor' | 'Severe';
}

export const MOCK_WEATHER_FARMER: WeatherStripData = {
  temperature: '26°C',
  condition: 'Clear Sky',
  conditionIcon: 'sun',
  windSpeed: '9 km/h',
  windDirection: 'NW',
  humidity: '42%',
  rainChance: '0%',
  aqiValue: 142,
  aqiCategory: 'Moderate',
};

export const MOCK_WEATHER_CITIZEN: WeatherStripData = {
  temperature: '24°C',
  condition: 'Hazy',
  conditionIcon: 'haze',
  windSpeed: '12 km/h',
  windDirection: 'NW',
  humidity: '48%',
  rainChance: '0%',
  aqiValue: 185,
  aqiCategory: 'Poor',
};

// ============================================================================
// 7. BOOKINGS & REPORTS (Max 2 rows displayed)
// ============================================================================

export interface MachineBookingItem {
  id: string;
  machineName: string;
  dateSlot: string;
  centre: string;
  status: 'Confirmed' | 'Pending' | 'Completed';
}

export const MOCK_RECENT_BOOKINGS: MachineBookingItem[] = [
  {
    id: 'bk-101',
    machineName: 'Happy Seeder 7-Row',
    dateSlot: 'Nov 5 • Morning Slot (08:00 AM)',
    centre: 'Kisan Seva Kendra, Patiala',
    status: 'Confirmed',
  },
  {
    id: 'bk-102',
    machineName: 'Super SMS Harvester',
    dateSlot: 'Nov 8 • Afternoon Slot (01:30 PM)',
    centre: 'Punjab Agro Hub, Rajpura',
    status: 'Pending',
  },
  {
    id: 'bk-103',
    machineName: 'Rotavator Mulcher',
    dateSlot: 'Oct 29 • Morning Slot',
    centre: 'Kisan Seva Kendra, Patiala',
    status: 'Completed',
  },
];

export interface CitizenReportItem {
  id: string;
  thumbnailUrl?: string;
  category: string;
  location: string;
  time: string;
  status: 'Submitted' | 'Verified' | 'Action taken';
}

export const MOCK_RECENT_REPORTS: CitizenReportItem[] = [
  {
    id: 'rpt-201',
    category: 'Crop fire detected',
    location: 'Anand Vihar, East Delhi',
    time: '10:15 AM today',
    status: 'Verified',
  },
  {
    id: 'rpt-202',
    category: 'Waste burning',
    location: 'Shahdara Industrial Area',
    time: 'Yesterday, 04:30 PM',
    status: 'Action taken',
  },
  {
    id: 'rpt-203',
    category: 'Construction dust plume',
    location: 'Mayur Vihar Phase 1',
    time: 'Nov 3, 11:00 AM',
    status: 'Submitted',
  },
];
