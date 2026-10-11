import { WeatherResponse, TodayResponse, AQICategory } from '../types';
import { getWard } from '../data/reference';
import { demoStatusTracker } from './statusTracker';

export function getDemoWeather(locationId: string = 'village-patiala-001'): WeatherResponse {
  const currentHour = new Date().getHours();
  const hourly = Array.from({ length: 6 }, (_, i) => {
    const h = (currentHour + i) % 24;
    const hourStr = `${h.toString().padStart(2, '0')}:00`;
    return {
      hour: hourStr,
      temperature: 24 - Math.floor(i * 0.8),
      condition: 'Clear',
      rain_chance: 0,
    };
  });

  return {
    location_id: locationId,
    current: 24,
    today_high: 29,
    today_low: 18,
    rain_chance: 5,
    uv: 6,
    sunset: '18:12',
    wind: {
      speed: 12,
      direction: 290,
    },
    humidity: 48,
    condition: 'Clear',
    fetched_at: new Date().toISOString(),
    hourly_summary_24h: hourly,
    is_sample: true,
  };
}

export function getDemoToday(areaId: string = 'ward-east-delhi-001'): TodayResponse {
  const ward = getWard(areaId);
  const wardName = ward?.name || 'Anand Vihar';

  const currentHour = new Date().getHours();
  const trend24h = Array.from({ length: 8 }, (_, i) => {
    const h = (currentHour - (7 - i) * 2 + 24) % 24;
    const baseAqi = 310 + Math.floor(Math.sin(i) * 35);
    return {
      hour: `${h.toString().padStart(2, '0')}:00`,
      aqi: Math.max(120, baseAqi),
    };
  });

  // Data sources checked with live/demo per source
  const currentTracker = demoStatusTracker.getAll();
  const sourcesChecked = [
    { name: 'CPCB AQI Station', source: currentTracker.today?.source || 'demo' },
    { name: 'Open-Meteo Wind/Atmosphere', source: currentTracker.weather?.source || 'demo' },
    { name: 'NASA FIRMS Satellite', source: currentTracker.plan?.source || 'demo' },
  ];

  return {
    area_id: areaId,
    area_name: wardName,
    aqi: 312,
    aqi_category: 'Very Poor' as AQICategory,
    aqi_color: 'var(--red)',
    advice:
      'Air quality is in the Very Poor range. Sensitive groups should avoid outdoor exertion. Keep windows closed and use N95 masks if outdoors.',
    smoke_drift_note:
      'North-westerly winds at 12 km/h carrying farm stubble smoke from upper Punjab into Delhi NCR.',
    fires_24h: 18,
    trend_24h: trend24h,
    wind: {
      speed_kmh: 12,
      direction: 'NW',
      description: 'North-westerly winds at 12 km/h',
    },
    nearby_reports: [],
    freshness: {
      data_updated_at: new Date().toISOString(),
      label: 'Just now',
    },
    sources: [
      { name: 'CPCB AQI Station', fetched_at: new Date().toISOString(), is_sample: true },
      { name: 'Open-Meteo Wind/Atmosphere', fetched_at: new Date().toISOString(), is_sample: true },
      { name: 'NASA FIRMS Satellite', fetched_at: new Date().toISOString(), is_sample: true },
    ],
    sources_checked: sourcesChecked,
    is_sample: true,
  };
}
