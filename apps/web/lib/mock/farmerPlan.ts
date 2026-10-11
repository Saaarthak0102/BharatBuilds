import { PlanResult } from '../types';
import { todayIST, addDaysIST } from '../utils/date';

const bestDay = addDaysIST(2);

export const mockFarmerPlan: PlanResult = {
  best_day: bestDay,
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
    date: bestDay,
    is_sample: true,
  },
  straw_outlet_option: null,
  reason_text:
    "Optimal conditions for clearing your field in the upcoming window. Low wind speeds reduce drift, and a Happy Seeder is available at Kisan Seva Kendra. No rain expected, so machinery can operate freely.",
  tool_trace: [
    { tool: 'get_forecast', status: 'ok', latency_ms: 120 },
    { tool: 'get_wind', status: 'ok', latency_ms: 95 },
    { tool: 'get_fire_hotspots', status: 'ok', latency_ms: 150 },
    { tool: 'get_sowing_window', status: 'ok', latency_ms: 10 },
    { tool: 'find_machine_slots', status: 'ok', latency_ms: 80 },
  ],
  seven_day_scores: [
    { date: todayIST(), score: 45 },
    { date: addDaysIST(1), score: 68 },
    { date: addDaysIST(2), score: 82 },
    { date: addDaysIST(3), score: 74 },
    { date: addDaysIST(4), score: 60 },
    { date: addDaysIST(5), score: 55 },
    { date: addDaysIST(6), score: 71 },
  ],
  is_sample: true,
};
