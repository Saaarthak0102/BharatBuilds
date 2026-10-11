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
