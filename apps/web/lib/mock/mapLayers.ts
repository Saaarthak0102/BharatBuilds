import { MapLayers } from '../types';

export const mockMapLayers: MapLayers = {
  aqi_heatmap: {
    type: 'FeatureCollection',
    features: [
      // Delhi/NCR
      { type: 'Feature', geometry: { type: 'Point', coordinates: [77.209, 28.6139] }, properties: { aqi: 285, station: 'New Delhi', is_sample: true } },
      { type: 'Feature', geometry: { type: 'Point', coordinates: [77.3055, 28.6692] }, properties: { aqi: 310, station: 'Anand Vihar', is_sample: true } },
      { type: 'Feature', geometry: { type: 'Point', coordinates: [77.0266, 28.4595] }, properties: { aqi: 245, station: 'Gurugram', is_sample: true } },
      { type: 'Feature', geometry: { type: 'Point', coordinates: [77.391, 28.5355] }, properties: { aqi: 270, station: 'Noida', is_sample: true } },
      
      // Punjab
      { type: 'Feature', geometry: { type: 'Point', coordinates: [74.8723, 31.634] }, properties: { aqi: 150, station: 'Amritsar', is_sample: true } },
      { type: 'Feature', geometry: { type: 'Point', coordinates: [75.8573, 30.901] }, properties: { aqi: 180, station: 'Ludhiana', is_sample: true } },
      { type: 'Feature', geometry: { type: 'Point', coordinates: [76.3924, 30.3398] }, properties: { aqi: 165, station: 'Patiala', is_sample: true } },
      
      // Haryana
      { type: 'Feature', geometry: { type: 'Point', coordinates: [76.7794, 30.7333] }, properties: { aqi: 140, station: 'Chandigarh', is_sample: true } },
      { type: 'Feature', geometry: { type: 'Point', coordinates: [76.8165, 30.6425] }, properties: { aqi: 145, station: 'Panchkula', is_sample: true } },
      { type: 'Feature', geometry: { type: 'Point', coordinates: [76.9833, 29.6833] }, properties: { aqi: 190, station: 'Karnal', is_sample: true } },
      { type: 'Feature', geometry: { type: 'Point', coordinates: [76.5333, 28.8833] }, properties: { aqi: 210, station: 'Rohtak', is_sample: true } },
      
      // UP
      { type: 'Feature', geometry: { type: 'Point', coordinates: [78.0081, 27.1767] }, properties: { aqi: 230, station: 'Agra', is_sample: true } },
      { type: 'Feature', geometry: { type: 'Point', coordinates: [80.9462, 26.8467] }, properties: { aqi: 195, station: 'Lucknow', is_sample: true } },
      { type: 'Feature', geometry: { type: 'Point', coordinates: [77.7064, 28.9845] }, properties: { aqi: 260, station: 'Meerut', is_sample: true } },
      
      // Rajasthan
      { type: 'Feature', geometry: { type: 'Point', coordinates: [75.7873, 26.9124] }, properties: { aqi: 130, station: 'Jaipur', is_sample: true } },
      { type: 'Feature', geometry: { type: 'Point', coordinates: [76.6000, 27.5500] }, properties: { aqi: 175, station: 'Alwar', is_sample: true } }
    ],
  },
  fire_hotspots: {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [75.8573, 30.9] },
        properties: { confidence: 'high', detected_at: '2024-11-05T06:00:00Z', source: 'FIRMS', is_sample: true },
      },
    ],
  },
  wind_arrows: {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [76.5, 30.2] },
        properties: { speed_kmh: 15, direction_deg: 135, is_sample: true },
      },
    ],
  },
  report_markers: {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [77.25, 28.65] },
        properties: { report_id: 'rpt-001', category: 'crop_burning', status: 'routed', title: 'Smoke from field', created_at: '2024-11-05T08:30:00Z', is_sample: true },
      },
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [77.01, 28.5] },
        properties: { report_id: 'rpt-002', category: 'garbage_burning', status: 'received', title: 'Garbage dump fire', created_at: '2024-11-05T09:15:00Z', is_sample: true },
      },
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [76.35, 30.3] },
        properties: { report_id: 'rpt-003', category: 'crop_burning', status: 'resolved', title: 'Stubble burning', created_at: '2024-11-05T07:10:00Z', is_sample: true },
      },
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [75.8, 30.95] },
        properties: { report_id: 'rpt-004', category: 'crop_burning', status: 'received', title: 'Field clearing', created_at: '2024-11-05T10:00:00Z', is_sample: true },
      },
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [77.4, 28.6] },
        properties: { report_id: 'rpt-005', category: 'construction_dust', status: 'routed', title: 'Dust from new site', created_at: '2024-11-05T11:20:00Z', is_sample: true },
      },
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [76.7, 29.8] },
        properties: { report_id: 'rpt-006', category: 'crop_burning', status: 'received', title: 'Farm fire', created_at: '2024-11-05T12:05:00Z', is_sample: true },
      },
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [76.5, 28.9] },
        properties: { report_id: 'rpt-007', category: 'cracker_burning', status: 'received', title: 'Firecrackers', created_at: '2024-11-05T19:30:00Z', is_sample: true },
      }
    ],
  },
  machine_points: {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [75.7873, 30.91] },
        properties: { machine_type: 'Happy Seeder', owner_label: 'Kisan Seva Kendra', slots_free: 3, is_sample: true },
      },
    ],
  },
  freshness: {
    label: 'Updated 5 min ago',
    is_sample: true,
  },
};
