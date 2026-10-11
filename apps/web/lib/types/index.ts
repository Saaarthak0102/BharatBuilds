/**
 * Shared TypeScript types mirroring backend Pydantic models.
 * Keep in sync with services/api/models/__init__.py
 */

// ─── Enums ──────────────────────────────────────────────

export type Role = 'farmer' | 'citizen';

export type CropStage = 'harvested' | 'partially_cleared' | 'standing';

export type ReportCategory = 'crop_burning' | 'garbage_burning' | 'cracker_burning' | 'construction_dust';

export type ReportStatus = 'received' | 'routed' | 'resolved';

export type FacilityType =
  | 'biomass_power_plant'
  | 'cbg_plant'
  | 'pellet_maker'
  | 'brick_kiln'
  | 'thermal_cofiring'
  | 'depot'
  | 'aggregator';

export type AQICategory = 'Good' | 'Satisfactory' | 'Moderate' | 'Poor' | 'Very Poor' | 'Severe';

export type Language = 'en' | 'hi' | 'pa';

// ─── User Models ────────────────────────────────────────

export interface User {
  user_id: string;
  role: Role;
  name: string;
  phone?: string;
  email?: string;
  language: Language;
  created_at: string;
}

export interface FarmerProfile extends User {
  role: 'farmer';
  phone: string;
  village_id: string;
  village_name?: string;
  district: string;
  land_size_acres: number;
  main_crop: string;
  crop_stage: CropStage;
  has_own_machine: boolean;
  is_sample: boolean;
}

export interface CitizenProfile extends User {
  role: 'citizen';
  area_id: string;
  area_name?: string;
  alert_threshold?: number;
  alert_opt_in?: boolean;
  has_kids: boolean;
  has_elderly: boolean;
  is_sample: boolean;
}

// ─── Location ───────────────────────────────────────────

export interface Location {
  lat: number;
  lng: number;
}

// ─── Report Models ──────────────────────────────────────

export interface Report {
  report_id: string;
  user_id?: string;
  category: ReportCategory;
  confidence?: number;
  location: Location;
  photo_key?: string;
  status: ReportStatus;
  created_at: string;
  distance_km?: number;
  is_sample: boolean;
}

// ─── Machine Slot Models ────────────────────────────────

export interface MachineSlot {
  slot_id: string;
  village_id: string;
  date: string;
  machine_type: string;
  owner_label: string;
  slots_free: number;
  is_sample: boolean;
}

// ─── Straw Outlet Models ────────────────────────────────

export interface CommunityReport {
  report_id: string;
  category: string;
  status: string;
  area_name?: string;
  public_lat?: number;
  public_lng?: number;
  created_at: string;
  confidence_label?: string;
  needs_review?: boolean;
  merged_count?: number;
  photo_url?: string | null;
  is_sample: boolean;
  is_mine?: boolean;
  location?: Location;
}

// ─── Straw Outlet Models ────────────────────────────────

export interface StrawOutlet {
  outlet_id: string;
  district_id: string;
  district?: string;
  facility_type: FacilityType;
  name: string;
  lat?: number | null;
  lng?: number | null;
  accepts?: string[];
  pickup_support?: string;
  distance_km?: number;
  ranking_reason?: string;
  reason?: string;
  rank?: number;
  contact_hint: string;
  is_sample: boolean;
}

// ─── Plan Result Models ─────────────────────────────────

export interface ScoreBreakdown {
  sowing_window: number;
  rain_and_soil: number;
  wind: number;
  fire_activity: number;
  machine_availability: number;
}

export interface ToolTraceEntry {
  tool: string;
  status: string;
  latency_ms: number;
}

export interface DayScore {
  date: string;
  score: number;
}

export interface MachineOption {
  slot_id: string;
  machine_type: string;
  owner_label: string;
  date: string;
  is_sample: boolean;
}

export interface StrawOutletOption {
  outlet_id: string;
  facility_type: FacilityType;
  name: string;
  contact_hint: string;
  is_sample: boolean;
}

export interface PlanResult {
  best_day: string;
  score: number;
  score_breakdown: ScoreBreakdown;
  machine_option: MachineOption | null;
  straw_outlet_option: StrawOutletOption | null;
  straw_outlets?: StrawOutlet[];
  reason_text: string;
  tool_trace: ToolTraceEntry[];
  seven_day_scores: DayScore[];
  is_sample: boolean;
  window_start?: string;
  window_end?: string;
  generated_at?: string;
  sowing_window_status?: 'inside' | 'before' | 'after';
  no_ideal_day?: boolean;
  message_key?: string | null;
}

// ─── Today Response Models ──────────────────────────────

export interface WindInfo {
  speed_kmh: number;
  direction: string;
  description: string;
}

export interface TrendPoint {
  hour: string;
  aqi: number;
}

export interface NearbyReport {
  report_id: string;
  category: ReportCategory;
  status: ReportStatus;
  distance_km: number;
  created_at: string;
}

export interface Freshness {
  data_updated_at: string;
  label: string;
}

export interface DataSourceInfo {
  name: string;
  fetched_at: string;
  is_sample: boolean;
}

export interface TodayResponse {
  area_id: string;
  area_name: string;
  aqi: number;
  aqi_category: AQICategory;
  aqi_color: string;
  advice: string;
  trend_24h: TrendPoint[];
  wind: WindInfo;
  smoke_drift_note: string;
  nearby_reports: NearbyReport[];
  freshness: Freshness | string;
  is_sample: boolean;
  fires_24h?: number;
  sources?: DataSourceInfo[];
  sources_checked?: Array<{ name: string; source: string }>;
}

export interface WeatherHourlySummary {
  hour: string;
  temperature: number;
  temperature_c?: number;
  rain_chance: number;
  condition: string;
}

export interface WeatherResponse {
  location_id: string;
  current: number;
  today_high: number;
  today_low: number;
  rain_chance: number;
  uv: number;
  UV?: number;
  sunset: string;
  wind: {
    speed: number;
    direction: number;
    speed_kmh?: number;
    direction_deg?: number;
  };
  humidity: number;
  condition: string;
  hourly_summary_24h?: WeatherHourlySummary[];
  hourly_summary?: WeatherHourlySummary[];
  fetched_at: string;
  is_sample: boolean;
  aqi?: number;
  feels_like?: number;
  apparent_temperature?: number;
  visibility?: string | number;
  high?: number;
  low?: number;
  temperature?: number;
  wind_speed?: number;
  wind_direction?: number;
}

export interface FarmerImpact {
  acres_avoided_est?: number;
  tonnes_straw_diverted_est?: number;
  pm25_kg_saved_est?: number;
  co2_tonnes_saved_est?: number;
  financial_savings_inr_est?: number;
  [key: string]: any;
}

export interface FarmerBooking {
  booking_id: string;
  user_id?: string;
  machine_type: string;
  owner_label: string;
  village_id: string;
  date: string;
  status: string;
  acres?: number;
  is_sample?: boolean;
  [key: string]: any;
}

export interface FarmerBookingsResponse {
  bookings: FarmerBooking[];
  counts_by_status?: Record<string, number>;
  status_counts?: Record<string, number>;
  acres?: number;
  impact?: FarmerImpact;
  is_sample?: boolean;
}

// ─── Map Layer Models ───────────────────────────────────

export interface LayerFeatureCollection extends GeoJSON.FeatureCollection {
  fetched_at?: string;
  is_sample?: boolean;
}

export interface MapLayers {
  aqi?: LayerFeatureCollection;
  fires?: LayerFeatureCollection;
  reports?: LayerFeatureCollection;
  machines?: LayerFeatureCollection;
  aqi_heatmap?: GeoJSON.FeatureCollection;
  fire_hotspots?: GeoJSON.FeatureCollection;
  wind_arrows?: GeoJSON.FeatureCollection;
  report_markers?: GeoJSON.FeatureCollection;
  machine_points?: GeoJSON.FeatureCollection;
  freshness: {
    label?: string;
    is_sample: boolean;
    aqi_fetched_at?: string;
    fires_fetched_at?: string;
    reports_fetched_at?: string;
    machines_fetched_at?: string;
    [key: string]: any;
  };
}

// ─── API Response Wrappers ──────────────────────────────

export interface ApiResponse<T> {
  data: T;
  correlation_id?: string;
}

export interface ApiError {
  error: {
    status: number;
    message: string;
  };
  correlation_id?: string;
}

// ─── Auth Session ───────────────────────────────────────

export interface Session {
  user_id: string;
  role: Role;
  name: string;
  email?: string;
  phone?: string;
  language: Language;
  is_authenticated: boolean;
  idToken?: string;
}

// ─── Village / Ward (for search dropdowns) ──────────────

export interface Village {
  village_id: string;
  name: string;
  district: string;
  state: string;
  lat: number;
  lng: number;
  is_sample: boolean;
}

export interface Ward {
  ward_id: string;
  name: string;
  zone: string;
  city: string;
  lat: number;
  lng: number;
  is_sample: boolean;
}

// ─── Subscription ───────────────────────────────────────

export interface Subscription {
  subscription_id: string;
  area_id: string;
  threshold: number;
  channel: 'email' | 'push';
  status: 'active' | 'paused';
  created_at: string;
  is_sample: boolean;
}
