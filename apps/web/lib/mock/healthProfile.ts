/**
 * Citizen Health Profile & Emergency Assistance Engine
 * Secure, local-only storage for sensitive medical & emergency contact data.
 * Adheres to strict privacy: never sent to analytics or third-party loggers.
 */

export interface EmergencyContact {
  name: string;
  phone: string;
  relation?: string;
}

export interface PreferredChemist {
  name: string;
  phone: string;
  address?: string;
}

export interface CitizenHealthProfile {
  hasAsthmaOrBreathingCondition: 'yes' | 'no' | 'prefer_not_to_say';
  emergencyContact?: EmergencyContact;
  preferredChemist?: PreferredChemist;
}

// Default initial state for smooth demo experience
export const DEFAULT_HEALTH_PROFILE: CitizenHealthProfile = {
  hasAsthmaOrBreathingCondition: 'yes',
  emergencyContact: {
    name: 'Rohit Sharma (Brother)',
    phone: '+919876543210',
    relation: 'Brother',
  },
  preferredChemist: {
    name: 'Apollo Pharmacy, Anand Vihar',
    phone: '+919811023456',
    address: 'Plot 14, Main Road, Anand Vihar, Delhi',
  },
};

const HEALTH_PROFILE_STORAGE_KEY = 'saans_citizen_health_profile';

export function getStoredHealthProfile(): CitizenHealthProfile {
  if (typeof window === 'undefined') return DEFAULT_HEALTH_PROFILE;
  try {
    const raw = localStorage.getItem(HEALTH_PROFILE_STORAGE_KEY);
    if (!raw) return DEFAULT_HEALTH_PROFILE;
    return JSON.parse(raw);
  } catch {
    return DEFAULT_HEALTH_PROFILE;
  }
}

export function saveStoredHealthProfile(profile: CitizenHealthProfile): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(HEALTH_PROFILE_STORAGE_KEY, JSON.stringify(profile));
  } catch (e) {
    console.error('Failed to save health profile locally', e);
  }
}

// ============================================================================
// Google Places Style Interface for Nearby Chemist / Pharmacy
// ============================================================================

export interface ChemistPlaceResult {
  placeId: string;
  name: string;
  vicinity: string;
  phone: string;
  distanceKm: number;
  openNow: boolean;
  rating: number;
  location: {
    lat: number;
    lng: number;
  };
}

export const MOCK_NEARBY_CHEMISTS: ChemistPlaceResult[] = [
  {
    placeId: 'place-chem-01',
    name: 'Apollo Pharmacy (24x7)',
    vicinity: 'Opposite Metro Station, Anand Vihar, New Delhi',
    phone: '+919811023456',
    distanceKm: 0.35,
    openNow: true,
    rating: 4.6,
    location: { lat: 28.6508, lng: 77.3052 },
  },
  {
    placeId: 'place-chem-02',
    name: 'MedPlus Anand Vihar',
    vicinity: 'Road No 57, Surajmal Vihar, East Delhi',
    phone: '+919811198765',
    distanceKm: 0.72,
    openNow: true,
    rating: 4.4,
    location: { lat: 28.6534, lng: 77.3011 },
  },
];

export async function findNearestChemist(lat = 28.65, lng = 77.25): Promise<ChemistPlaceResult> {
  // In production, this calls Google Places Nearby Search API or a backend proxy
  return MOCK_NEARBY_CHEMISTS[0];
}
