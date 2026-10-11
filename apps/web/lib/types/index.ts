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

export interface StrawOutlet {
  outlet_id: string;
  district_id: string;
  facility_type: FacilityType;
  name: string;
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
  reason_text: string;
  tool_trace: ToolTraceEntry[];
  seven_day_scores: DayScore[];
  is_sample: boolean;
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
  freshness: Freshness;
  is_sample: boolean;
}

// ─── Map Layer Models ───────────────────────────────────

export interface MapLayers {
  aqi_heatmap: GeoJSON.FeatureCollection;
  fire_hotspots: GeoJSON.FeatureCollection;
  wind_arrows: GeoJSON.FeatureCollection;
  report_markers: GeoJSON.FeatureCollection;
  machine_points: GeoJSON.FeatureCollection;
  freshness: {
    label: string;
    is_sample: boolean;
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
