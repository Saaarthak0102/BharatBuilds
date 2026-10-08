import { TodayResponse } from '../types';

export const mockToday: TodayResponse = {
  area_id: 'ward-east-delhi-001',
  area_name: 'Anand Vihar, East Delhi',
  aqi: 185,
  aqi_category: 'Poor',
  aqi_color: '#FF6B35',
  advice:
    'Sensitive groups should reduce prolonged outdoor exertion. Everyone else should limit heavy outdoor activity.',
  trend_24h: [
    { hour: '00:00', aqi: 160 },
    { hour: '03:00', aqi: 155 },
    { hour: '06:00', aqi: 170 },
    { hour: '09:00', aqi: 190 },
    { hour: '12:00', aqi: 195 },
    { hour: '15:00', aqi: 185 },
    { hour: '18:00', aqi: 200 },
    { hour: '21:00', aqi: 185 },
  ],
  wind: {
    speed_kmh: 12,
    direction: 'NW',
    description: 'Light north-westerly winds',
  },
  smoke_drift_note:
    'Wind patterns may carry particulates from agricultural areas in Haryana toward East Delhi today.',
  nearby_reports: [
    {
      report_id: 'rpt-001',
      category: 'crop_burning',
      status: 'routed',
      distance_km: 2.3,
      created_at: '2024-11-05T08:30:00Z',
    },
    {
      report_id: 'rpt-002',
      category: 'garbage_burning',
      status: 'received',
      distance_km: 0.8,
      created_at: '2024-11-05T10:15:00Z',
    },
  ],
  freshness: {
    data_updated_at: new Date().toISOString(),
    label: 'Updated just now',
  },
  is_sample: true,
};
