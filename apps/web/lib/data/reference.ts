import villagesData from './villages.json';
import wardsData from './wards.json';
import type { Village, Ward } from '../types';

export const villages: Village[] = villagesData as Village[];
export const wards: Ward[] = wardsData as Ward[];

export function getVillage(id: string): Village | undefined {
  if (!id) return undefined;
  return villages.find((v) => v.village_id === id);
}

export function getWard(id: string): Ward | undefined {
  if (!id) return undefined;
  return wards.find((w) => w.ward_id === id);
}

export function districtKey(name: string): string {
  if (!name) return '';
  return name.toLowerCase().trim();
}

/**
 * Unique list of districts extracted from reference villages.
 */
export const referenceDistricts = Array.from(
  new Set(villages.map((v) => v.district).filter(Boolean))
).map((d) => ({
  id: districtKey(d),
  name: d,
}));

/**
 * Calculates approximate haversine distance in kilometers between two lat/lng coordinates.
 */
export function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

