import { PlanResult } from '../types';

export const mockFarmerPlan: PlanResult = {
  best_day: '2024-11-05',
  score: 82,
  score_breakdown: {
    sowing_window: 20,
    rain_and_soil: 18,
    wind: 15,
    fire_activity: 14,
    machine_availability: 15,
  },
  machine_option: {
    slot_id: 'slot-001',
    machine_type: 'Happy Seeder',
    owner_label: 'Kisan Seva Kendra, Patiala',
    date: '2024-11-05',
    is_sample: true,
  },
  straw_outlet_option: null,
  reason_text:
    "November 5th is the best day to clear your field. Low wind speeds mean smoke won't drift toward populated areas, and a Happy Seeder is available at Kisan Seva Kendra. No rain expected, so machinery can operate freely.",
  tool_trace: [
    { tool: 'get_forecast', status: 'ok', latency_ms: 120 },
    { tool: 'get_wind', status: 'ok', latency_ms: 95 },
    { tool: 'get_fire_hotspots', status: 'ok', latency_ms: 150 },
    { tool: 'get_sowing_window', status: 'ok', latency_ms: 10 },
    { tool: 'find_machine_slots', status: 'ok', latency_ms: 80 },
  ],
  seven_day_scores: [
    { date: '2024-11-03', score: 45 },
    { date: '2024-11-04', score: 68 },
    { date: '2024-11-05', score: 82 },
    { date: '2024-11-06', score: 74 },
    { date: '2024-11-07', score: 60 },
    { date: '2024-11-08', score: 55 },
    { date: '2024-11-09', score: 71 },
  ],
  is_sample: true,
};
