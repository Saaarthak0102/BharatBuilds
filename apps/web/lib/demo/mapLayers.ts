import sampleMap from '../data/sample_map.json';
import { MapLayers } from '../types';
import { getDemoCommunityReports } from './reports';
import { getDemoMachineSlots } from './machines';

export function getDemoMapLayers(): MapLayers {
  const mapData = sampleMap as any;
  const aqiStations = mapData.aqi_stations || [];
  const firePoints = mapData.fire_points || [];

  // 1. AQI Heatmap GeoJSON
  const aqiFeatures = aqiStations.map((s: any) => ({
    type: 'Feature' as const,
    geometry: {
      type: 'Point' as const,
      coordinates: [s.lng, s.lat] as [number, number],
    },
    properties: {
      aqi: s.aqi,
      station: s.station,
      ward_id: s.ward_id,
      category: s.category,
      is_sample: true,
    },
  }));

  // 2. Fire Hotspots GeoJSON
  const fireFeatures = firePoints.map((f: any) => ({
    type: 'Feature' as const,
    geometry: {
      type: 'Point' as const,
      coordinates: [f.lng, f.lat] as [number, number],
    },
    properties: {
      fire_id: f.fire_id,
      confidence: f.confidence,
      detected_at: f.detected_at,
      frp: f.frp,
      source: 'NASA FIRMS',
      is_sample: true,
    },
  }));

  // 3. Report Markers GeoJSON from Demo Community Reports
  const { reports } = getDemoCommunityReports({ limit: 30 });
  const reportFeatures = reports.map((r) => ({
    type: 'Feature' as const,
    geometry: {
      type: 'Point' as const,
      coordinates: [r.public_lng || r.location?.lng || 77.3055, r.public_lat || r.location?.lat || 28.6692] as [
        number,
        number,
      ],
    },
    properties: {
      report_id: r.report_id,
      category: r.category,
      status: r.status,
      title: r.category.replace(/_/g, ' '),
      created_at: r.created_at,
      is_mine: Boolean(r.is_mine),
      is_sample: true,
    },
  }));

  // 4. Machine Points GeoJSON
  const machineSlots = getDemoMachineSlots();
  const machineFeatures = machineSlots.slice(0, 10).map((m) => ({
    type: 'Feature' as const,
    geometry: {
      type: 'Point' as const,
      coordinates: [76.39 + Math.sin(Number(m.slot_id.slice(-2) || '1')) * 0.15, 30.34 + Math.cos(Number(m.slot_id.slice(-2) || '1')) * 0.15] as [
        number,
        number,
      ],
    },
    properties: {
      machine_type: m.machine_type,
      owner_label: m.owner_label,
      slots_free: m.slots_free,
      is_sample: true,
    },
  }));

  // 5. Wind arrows GeoJSON
  const windFeatures = [
    {
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [76.5, 30.2] as [number, number] },
      properties: { speed_kmh: 12, direction_deg: 290, is_sample: true },
    },
    {
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [77.1, 28.8] as [number, number] },
      properties: { speed_kmh: 14, direction_deg: 300, is_sample: true },
    },
  ];

  return {
    aqi_heatmap: {
      type: 'FeatureCollection',
      features: aqiFeatures,
    },
    fire_hotspots: {
      type: 'FeatureCollection',
      features: fireFeatures,
    },
    report_markers: {
      type: 'FeatureCollection',
      features: reportFeatures,
    },
    machine_points: {
      type: 'FeatureCollection',
      features: machineFeatures,
    },
    wind_arrows: {
      type: 'FeatureCollection',
      features: windFeatures,
    },
    freshness: {
      label: 'Updated just now',
      is_sample: true,
    },
  };
}
