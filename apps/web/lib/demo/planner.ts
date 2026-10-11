import { PlanResult, ScoreBreakdown, DayScore, MachineOption, StrawOutletOption } from '../types';
import { todayIST, addDaysIST } from '../utils/date';
import { getDemoMachineSlots } from './machines';
import { getRankedDemoStrawOutlets } from './strawOutlets';
import { getVillage } from '../data/reference';

/**
 * Deterministic pseudo-random number generator for seeded reproducibility
 */
function pseudoHash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/**
 * Port of services/agents/planner/scoring.py sowing window resolver
 */
export function getDemoSowingWindow(cropStage: string, asOfStr: string = todayIST()) {
  const asOf = new Date(asOfStr);
  const curYear = asOf.getFullYear();

  const stages: Record<string, { start: string; end: string }> = {
    harvested: { start: '10-01', end: '11-15' },
    partially_cleared: { start: '10-10', end: '11-20' },
    standing: { start: '10-20', end: '11-30' },
  };

  const stage = stages[cropStage] || stages.harvested;
  const [sm, sd] = stage.start.split('-').map(Number);
  const [em, ed] = stage.end.split('-').map(Number);

  let startDt = new Date(curYear, sm - 1, sd);
  let endDt = new Date(curYear, em - 1, ed);

  let status: 'inside' | 'before' | 'after' = 'inside';

  if (asOf > endDt) {
    const diffDays = Math.floor((asOf.getTime() - endDt.getTime()) / 86400000);
    if (diffDays <= 45) {
      status = 'after';
    } else {
      startDt = new Date(curYear + 1, sm - 1, sd);
      endDt = new Date(curYear + 1, em - 1, ed);
      status = 'before';
    }
  } else if (asOf < startDt) {
    status = 'before';
  } else {
    status = 'inside';
  }

  const formatIso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  return {
    window_start: formatIso(startDt),
    window_end: formatIso(endDt),
    sowing_window_status: status,
  };
}

export interface DemoPlannerParams {
  village_id: string;
  crop_stage: string;
  language?: string;
  start_date?: string;
  end_date?: string;
}

export function generateDemoPlan(params: DemoPlannerParams): PlanResult {
  const villageId = params.village_id || 'village-patiala-001';
  const cropStage = params.crop_stage || 'harvested';
  const language = params.language || 'en';

  const baseToday = todayIST();
  const sowingInfo = getDemoSowingWindow(cropStage, baseToday);

  // 1. Generate 7-day forecast seeded by village_id + date
  const seed = pseudoHash(villageId + baseToday);
  const slots = getDemoMachineSlots(villageId);
  const slotsByDate = new Map<string, any>();
  slots.forEach((s) => {
    // Only map if free slots exist
    if (s.slots_free > 0 && !slotsByDate.has(s.date)) {
      slotsByDate.set(s.date, s);
    }
  });

  const scoredDays: Array<{
    date: string;
    score: number;
    breakdown: ScoreBreakdown;
    machine_available: boolean;
    machine_slot?: any;
  }> = [];

  for (let i = 0; i < 7; i++) {
    const curDate = addDaysIST(i, baseToday);
    const daySeed = (seed * 37 + i * 17) % 1000;

    // Sowing window score
    const inWindow = curDate >= sowingInfo.window_start && curDate <= sowingInfo.window_end;
    const swScore = inWindow ? 25 : 0;

    // Rain score (mostly clear/dry for optimal clearing)
    const rainMm = (daySeed % 100 < 15) ? (daySeed % 12) : 0.0;
    let rScore = 20;
    if (rainMm >= 25.0) rScore = 0;
    else if (rainMm >= 10.0) rScore = 5;
    else if (rainMm >= 2.0) rScore = 12;

    // Wind score (gentle breeze, safe directions)
    const windKmh = 6 + (daySeed % 14);
    const carriesTowardCity = (daySeed % 10) === 0;
    let wScore = 20;
    if (windKmh > 35) wScore = 0;
    else if (windKmh > 20) wScore = 5;
    else if (windKmh > 10) wScore = 12;
    if (carriesTowardCity) {
      wScore = Math.max(0, wScore - 10);
    }

    // Fire activity (hotspots)
    const fireHotspots = (daySeed % 30) + 3;
    let fScore = 15;
    if (fireHotspots > 50) fScore = 0;
    else if (fireHotspots > 20) fScore = 5;
    else if (fireHotspots >= 5) fScore = 10;

    // Machine availability
    const machineSlot = slotsByDate.get(curDate);
    const freeCount = machineSlot ? machineSlot.slots_free : 0;
    let mScore = 0;
    if (freeCount > 2) mScore = 20;
    else if (freeCount > 0) mScore = 10;

    let totalScore = swScore + rScore + wScore + fScore + mScore;
    if (!inWindow) {
      totalScore = Math.min(totalScore, 50);
    }

    scoredDays.push({
      date: curDate,
      score: totalScore,
      breakdown: {
        sowing_window: swScore,
        rain_and_soil: rScore,
        wind: wScore,
        fire_activity: fScore,
        machine_availability: mScore,
      },
      machine_available: freeCount > 0,
      machine_slot: machineSlot,
    });
  }

  // 2. Pick best day (tiebreak: highest score, then earliest date)
  scoredDays.sort((a, b) => b.score - a.score || a.date.localeCompare(b.date));
  let bestDayItem = scoredDays[0];

  // 3. Re-plan logic if best day doesn't have a machine
  if (!bestDayItem.machine_available) {
    const withMachine = scoredDays.filter((d) => d.machine_available);
    if (withMachine.length > 0) {
      bestDayItem = withMachine[0];
    }
  }

  // 4. Machine option & Straw outlet option
  let machineOption: MachineOption | null = null;
  if (bestDayItem.machine_available && bestDayItem.machine_slot) {
    const ms = bestDayItem.machine_slot;
    machineOption = {
      slot_id: ms.slot_id,
      machine_type: ms.machine_type,
      owner_label: ms.owner_label,
      date: bestDayItem.date,
      is_sample: true,
    };
  }

  const vInfo = getVillage(villageId);
  const district = vInfo?.district || 'Patiala';
  const topOutlets = getRankedDemoStrawOutlets(district, villageId);

  let strawOutletOption: StrawOutletOption | null = null;
  if (!machineOption && topOutlets.length > 0) {
    const top = topOutlets[0];
    strawOutletOption = {
      outlet_id: top.outlet_id,
      facility_type: top.facility_type,
      name: top.name,
      contact_hint: top.contact_hint || 'Contact your nearest depot or aggregator',
      is_sample: true,
    };
  }

  const noIdealDay = bestDayItem.score < 60;
  let messageKey = 'ideal_day_found';
  if (sowingInfo.sowing_window_status === 'before') {
    messageKey = 'sowing_window_before';
  } else if (sowingInfo.sowing_window_status === 'after') {
    messageKey = 'sowing_window_after';
  } else if (noIdealDay) {
    messageKey = 'no_ideal_day';
  }

  // Explanation templates in en / hi / pa labelled "Template explanation"
  let reasonText = '';
  if (language === 'pa') {
    reasonText = `Template explanation: ਮੌਸਮ ਅਨੁਸਾਰ ${bestDayItem.date} ਖੇਤ ਸੰਭਾਲ ਲਈ ਸਭ ਤੋਂ ਵਧੀਆ ਦਿਨ ਹੈ (ਸਕੋਰ: ${bestDayItem.score}/100)। ਘੱਟ ਹਵਾ ਦੀ ਰਫ਼ਤਾਰ ਕਾਰਨ ਧੂੰਏਂ ਦਾ ਪ੍ਰਭਾਵ ਘੱਟ ਰਹੇਗਾ। ${
      machineOption
        ? `${machineOption.owner_label} ਵਿਖੇ ${machineOption.machine_type} ਉਪਲਬਧ ਹੈ।`
        : 'ਨੇੜਲੇ ਪਰਾਲੀ ਡਿਪੂ ਜਾਂ ਐਗਰੀਗੇਟਰ ਨਾਲ ਸੰਪਰਕ ਕਰੋ।'
    }`;
  } else if (language === 'hi') {
    reasonText = `Template explanation: वर्तमान मौसम के अनुसार ${bestDayItem.date} पराली प्रबंधन के लिए सर्वोत्तम दिन है (स्कोर: ${bestDayItem.score}/100)। कम हवा की गति से धुआं आबादी की ओर नहीं फैलेगा। ${
      machineOption
        ? `${machineOption.owner_label} पर ${machineOption.machine_type} उपलब्ध है।`
        : 'नजदीकी भूसा डिपो या एग्रीगेटर से संपर्क करें।'
    }`;
  } else {
    reasonText = `Template explanation: Optimal conditions identified for clearing on ${bestDayItem.date} (Score: ${bestDayItem.score}/100). Low wind speed and clear skies reduce drift risks. ${
      machineOption
        ? `${machineOption.machine_type} is available at ${machineOption.owner_label}.`
        : 'Contact your nearest straw depot or aggregator for alternate disposal.'
    }`;
  }

  // Agent execution trace
  const toolTrace = [
    { tool: 'get_forecast', status: 'ok', latency_ms: 115, source: 'demo', is_sample: true },
    { tool: 'get_wind', status: 'ok', latency_ms: 92, source: 'demo', is_sample: true },
    { tool: 'get_fire_hotspots', status: 'ok', latency_ms: 142, source: 'demo', is_sample: true },
    { tool: 'get_sowing_window', status: 'ok', latency_ms: 22, source: 'demo', is_sample: true },
    { tool: 'find_machine_slots', status: 'ok', latency_ms: 88, source: 'demo', is_sample: true },
    { tool: 'find_straw_outlets', status: 'ok', latency_ms: 74, source: 'demo', is_sample: true },
    { tool: 'score_days', status: 'ok', latency_ms: 38, source: 'demo', is_sample: true },
  ];

  // Re-sort scored days chronologically for seven_day_scores
  const chronologicalScores: DayScore[] = [...scoredDays]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d) => ({ date: d.date, score: d.score }));

  return {
    best_day: bestDayItem.date,
    score: bestDayItem.score,
    score_breakdown: bestDayItem.breakdown,
    machine_option: machineOption,
    straw_outlet_option: strawOutletOption,
    straw_outlets: topOutlets.slice(0, 3),
    reason_text: reasonText,
    tool_trace: toolTrace,
    seven_day_scores: chronologicalScores,
    is_sample: true,
    window_start: sowingInfo.window_start,
    window_end: sowingInfo.window_end,
    sowing_window_status: sowingInfo.sowing_window_status,
    no_ideal_day: noIdealDay,
    message_key: messageKey,
    generated_at: new Date().toISOString(),
  };
}
