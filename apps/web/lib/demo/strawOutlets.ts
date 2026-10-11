import seedOutlets from '../data/straw_outlets.json';
import { StrawOutlet, FacilityType } from '../types';
import { haversineDistanceKm, getVillage } from '../data/reference';

const DISTRICT_CENTROIDS: Record<string, { lat: number; lng: number }> = {
  patiala: { lat: 30.3398, lng: 76.3869 },
  ludhiana: { lat: 30.901, lng: 75.8573 },
  sangrur: { lat: 30.2458, lng: 75.8421 },
  karnal: { lat: 29.6857, lng: 76.9905 },
};

export function getRankedDemoStrawOutlets(districtId: string = 'patiala', villageId?: string): StrawOutlet[] {
  const normDistrict = districtId.trim().toLowerCase();
  
  // Resolve reference coordinates
  let refCoords = { lat: 30.3398, lng: 76.3869 };
  if (villageId) {
    const v = getVillage(villageId);
    if (v) refCoords = { lat: v.lat, lng: v.lng };
  } else if (DISTRICT_CENTROIDS[normDistrict]) {
    refCoords = DISTRICT_CENTROIDS[normDistrict];
  }

  const raw = (seedOutlets as any[]) || [];

  const ranked = raw.map((o) => {
    const lat = typeof o.lat === 'number' ? o.lat : refCoords.lat;
    const lng = typeof o.lng === 'number' ? o.lng : refCoords.lng;
    const distKm = Math.round(haversineDistanceKm(refCoords.lat, refCoords.lng, lat, lng) * 10) / 10;

    const accepts = Array.isArray(o.accepts) ? o.accepts : [o.accepts || 'paddy_straw'];
    const residueMatch = accepts.includes('paddy_straw') || accepts.includes('all') ? 1 : 0;

    const pickup = String(o.pickup_support || 'unknown').toLowerCase();
    const pickupScore = pickup === 'yes' ? 2 : pickup === 'unknown' ? 1 : 0;

    const reasons: string[] = [`~${Math.round(distKm)} km away`];
    if (residueMatch) reasons.push('accepts paddy straw');
    if (pickup === 'yes') reasons.push('pickup support available');
    else if (pickup === 'no') reasons.push('self-drop only');

    return {
      outlet_id: o.outlet_id,
      district_id: String(o.district_id || normDistrict).toLowerCase(),
      facility_type: o.facility_type as FacilityType,
      name: o.name,
      lat,
      lng,
      distance_km: distKm,
      accepts,
      pickup_support: pickup,
      contact_hint: o.contact_hint || 'Contact your nearest depot or aggregator',
      ranking_reason: reasons.join(' • '),
      is_sample: true,
      _residueMatch: residueMatch,
      _pickupScore: pickupScore,
    };
  });

  // Sort deterministically: 1) residue match desc, 2) distance asc, 3) pickup support desc
  ranked.sort((a, b) => {
    if (b._residueMatch !== a._residueMatch) return b._residueMatch - a._residueMatch;
    if (a.distance_km !== b.distance_km) return a.distance_km - b.distance_km;
    return b._pickupScore - a._pickupScore;
  });

  return ranked.map((r, idx) => {
    const outlet: any = { ...r };
    delete outlet._residueMatch;
    delete outlet._pickupScore;
    return {
      ...outlet,
      rank: idx + 1,
    };
  });
}
