import seedMachines from '../data/machines.json';
import { MachineSlot, FarmerBooking, FarmerBookingsResponse, MachineOption } from '../types';
import { todayIST, addDaysIST } from '../utils/date';

const STORAGE_SLOTS_KEY = 'saans_demo_machine_slots';
const STORAGE_BOOKINGS_KEY = 'saans_demo_farmer_bookings';

export function getDemoMachineSlots(villageId?: string): MachineSlot[] {
  if (typeof window === 'undefined') {
    return [];
  }

  const baseToday = todayIST();
  let slots: MachineSlot[] = [];

  try {
    const raw = localStorage.getItem(STORAGE_SLOTS_KEY);
    if (raw) {
      slots = JSON.parse(raw);
    }
  } catch {
    slots = [];
  }

  // Check if existing slots are up to date and start from todayIST()
  const isFresh = slots.length > 0 && slots.some((s) => s.date === baseToday);

  if (!isFresh) {
    // Generate fresh rolling 14-day slots from seed
    const rawSeed = (seedMachines as any[]) || [];
    const generated: MachineSlot[] = [];

    for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
      const curDate = addDaysIST(dayOffset, baseToday);
      rawSeed.forEach((template, idx) => {
        generated.push({
          slot_id: `slot-${dayOffset}-${idx + 1}`,
          village_id: template.village_id,
          date: curDate,
          machine_type: template.machine_type,
          owner_label: template.owner_label,
          slots_free: template.slots_free,
          is_sample: true,
        });
      });
    }

    slots = generated;
    localStorage.setItem(STORAGE_SLOTS_KEY, JSON.stringify(slots));
  }

  if (villageId) {
    return slots.filter((s) => s.village_id === villageId);
  }
  return slots;
}

export function bookDemoMachine(data: {
  slot_id: string;
  village_id: string;
  date: string;
  idempotency_key?: string;
}): {
  booking_id: string;
  status: string;
  slot: MachineOption;
  is_sample: boolean;
} {
  if (typeof window === 'undefined') {
    throw new Error('bookDemoMachine must run in browser');
  }

  const allSlots = getDemoMachineSlots();
  const targetSlot = allSlots.find(
    (s) => s.slot_id === data.slot_id || (s.village_id === data.village_id && s.date === data.date)
  );

  if (!targetSlot || targetSlot.slots_free <= 0) {
    const err = new Error('Conflict: That slot was just taken (HTTP 409)');
    (err as any).status = 409;
    (err as any).message = 'Conflict: That slot was just taken';
    throw err;
  }

  // Decrement slots_free
  targetSlot.slots_free = Math.max(0, targetSlot.slots_free - 1);
  localStorage.setItem(STORAGE_SLOTS_KEY, JSON.stringify(allSlots));

  // Create PENDING booking
  const bookingId = data.idempotency_key ? `bk-${data.idempotency_key}` : `bk-${Date.now()}`;
  const newBooking: FarmerBooking = {
    booking_id: bookingId,
    machine_type: targetSlot.machine_type,
    owner_label: targetSlot.owner_label,
    village_id: data.village_id,
    date: data.date,
    status: 'PENDING',
    acres: 5,
    is_sample: true,
  };

  let localBookings: FarmerBooking[] = [];
  try {
    const rawB = localStorage.getItem(STORAGE_BOOKINGS_KEY);
    if (rawB) localBookings = JSON.parse(rawB);
  } catch {
    localBookings = [];
  }

  localBookings.unshift(newBooking);
  localStorage.setItem(STORAGE_BOOKINGS_KEY, JSON.stringify(localBookings));

  return {
    booking_id: bookingId,
    status: 'PENDING',
    slot: {
      slot_id: targetSlot.slot_id,
      machine_type: targetSlot.machine_type,
      owner_label: targetSlot.owner_label,
      date: targetSlot.date,
      is_sample: true,
    },
    is_sample: true,
  };
}

export function getDemoFarmerBookings(): FarmerBookingsResponse {
  const baseToday = todayIST();

  // 1. Local real/demo bookings
  let userBookings: FarmerBooking[] = [];
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_BOOKINGS_KEY);
      if (raw) userBookings = JSON.parse(raw);
    } catch {
      userBookings = [];
    }
  }

  // 2. Two synthetic COMPLETED sample bookings (today-9 and today-23)
  const syntheticCompleted: FarmerBooking[] = [
    {
      booking_id: 'bk-comp-1',
      machine_type: 'Happy Seeder 7-Row',
      owner_label: 'Kisan Seva Kendra, Patiala',
      village_id: 'village-patiala-001',
      date: addDaysIST(-9, baseToday),
      status: 'COMPLETED',
      acres: 5,
      is_sample: true,
    },
    {
      booking_id: 'bk-comp-2',
      machine_type: 'Super SMS Harvester',
      owner_label: 'Punjab Agro Hub, Rajpura',
      village_id: 'village-patiala-001',
      date: addDaysIST(-23, baseToday),
      status: 'COMPLETED',
      acres: 5,
      is_sample: true,
    },
  ];

  const mergedBookings = [...userBookings, ...syntheticCompleted];

  const counts_by_status = {
    CONFIRMED: mergedBookings.filter((b) => b.status === 'CONFIRMED').length,
    PENDING: mergedBookings.filter((b) => b.status === 'PENDING').length,
    COMPLETED: mergedBookings.filter((b) => b.status === 'COMPLETED').length,
    CANCELLED: mergedBookings.filter((b) => b.status === 'CANCELLED').length,
  };

  const totalAcres = mergedBookings.reduce((acc, b) => acc + (b.acres || 5), 0);

  // Concrete impact values so the 4 left farmer tiles always show values
  const impact = {
    acres_avoided_est: totalAcres,
    tonnes_straw_diverted_est: Math.round(totalAcres * 2.2),
    pm25_kg_saved_est: Math.round(totalAcres * 14.3),
    co2_tonnes_saved_est: Number((totalAcres * 3.21).toFixed(1)),
    financial_savings_inr_est: totalAcres * 1000,
  };

  return {
    bookings: mergedBookings,
    counts_by_status,
    status_counts: counts_by_status,
    acres: totalAcres,
    impact,
    is_sample: true,
  };
}
