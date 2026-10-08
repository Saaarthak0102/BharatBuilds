import { MapLayers } from '../types';

export const mockMapLayers: MapLayers = {
  aqi_heatmap: {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [77.3055, 28.6692] },
        properties: { aqi: 185, station: 'Anand Vihar', is_sample: true },
      },
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [77.209, 28.6139] },
        properties: { aqi: 165, station: 'India Gate', is_sample: true },
      },
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [76.7794, 30.7333] },
        properties: { aqi: 120, station: 'Chandigarh', is_sample: true },
      },
    ],
  },
  fire_hotspots: {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [75.8573, 30.9] },
        properties: {
          confidence: 'high',
          detected_at: '2024-11-05T06:00:00Z',
          source: 'FIRMS',
          is_sample: true,
        },
      },
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [76.3869, 30.3398] },
        properties: {
          confidence: 'medium',
          detected_at: '2024-11-05T07:30:00Z',
          source: 'FIRMS',
          is_sample: true,
        },
      },
    ],
  },
  wind_arrows: {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [76.5, 30.2] },
        properties: {
          speed_kmh: 15,
          direction_deg: 135,
          is_sample: true,
        },
      },
    ],
  },
  report_markers: {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [77.25, 28.65] },
        properties: {
          report_id: 'rpt-001',
          category: 'crop_burning',
          status: 'routed',
          created_at: '2024-11-05T08:30:00Z',
          is_sample: true,
        },
      },
    ],
  },
  machine_points: {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [75.7873, 30.91] },
        properties: {
          machine_type: 'Happy Seeder',
          owner_label: 'Kisan Seva Kendra',
          slots_free: 3,
          is_sample: true,
        },
      },
    ],
  },
  freshness: {
    label: 'Updated 20 min ago',
    is_sample: true,
  },
};
