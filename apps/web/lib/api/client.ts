import { API_ENDPOINTS } from './endpoints';
import * as mockData from '../mock/farmerPlan';
import { mockToday } from '../mock/today';
import { mockReports } from '../mock/reports';
import { mockStrawOutlets } from '../mock/strawOutlets';
import { mockMapLayers } from '../mock/mapLayers';
import { authClient } from '../auth/authClient';
import type {
  PlanResult,
  TodayResponse,
  MapLayers,
  Report,
  ApiResponse,
  MachineOption,
  FarmerProfile,
  CitizenProfile,
  Role,
  Language,
  WeatherResponse,
  FarmerBookingsResponse,
  FarmerImpact,
  FarmerBooking,
  CommunityReport,
} from '../types';

const API_MODE = process.env.NEXT_PUBLIC_API_MODE || 'mock';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

// Precise mock mode determination
export const isMockMode =
  process.env.NEXT_PUBLIC_USE_MOCKS === 'true'
    ? true
    : process.env.NEXT_PUBLIC_USE_MOCKS === 'false'
    ? false
    : process.env.NEXT_PUBLIC_AUTH_MODE === 'cognito'
    ? false
    : API_MODE === 'mock';

// In-memory mock store for simulated report lifecycle in mock mode
interface MockReportEntry {
  report_id: string;
  category: string;
  confidence: number;
  createdAt: number;
  location: { lat: number; lng: number };
}
const mockReportStore = new Map<string, MockReportEntry>();

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  let token: string | null = null;
  try {
    token = await authClient.getIdToken();
  } catch {
    token = authClient.getSession()?.idToken || null;
  }

  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    try {
      await authClient.logout();
    } catch {
      // ignore
    }
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    const errorData = await response.json().catch(() => ({}));
    const err = new Error(errorData?.error?.message || 'Unauthorized');
    (err as any).status = 401;
    throw err;
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const err = new Error(errorData?.error?.message || 'API request failed');
    (err as any).status = response.status;
    throw err;
  }

  return response.json();
}

// ─── Standalone Client Functions (Required by Plumbing Spec) ───────────────

export async function getUploadUrl(data: {
  content_type: string;
  file_size: number;
}): Promise<ApiResponse<{ upload_url: string; photo_key: string; expires_in: number }>> {
  if (isMockMode) {
    return {
      data: {
        upload_url: 'mock_url',
        photo_key: `reports/mock-user-${Date.now()}/${Math.random().toString(36).substring(2, 10)}.jpg`,
        expires_in: 300,
      },
    };
  }
  return fetchWithAuth(API_ENDPOINTS.REPORTS.UPLOAD_URL, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function uploadPhoto(
  uploadUrl: string,
  file: Blob | File,
  contentType: string
): Promise<void> {
  if (isMockMode || uploadUrl === 'mock_url' || uploadUrl.startsWith('mock')) {
    await new Promise((resolve) => setTimeout(resolve, 350));
    return;
  }
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
    },
    body: file,
  });
  if (!res.ok) {
    throw new Error(`Photo upload failed with status ${res.status}`);
  }
}

export async function classifyPhoto(data: {
  photo_key: string;
}): Promise<ApiResponse<{ category: string; confidence: number }>> {
  if (isMockMode) {
    await new Promise((resolve) => setTimeout(resolve, 600));
    return {
      data: {
        category: 'crop_burning',
        confidence: 0.88,
      },
    };
  }
  return fetchWithAuth(API_ENDPOINTS.REPORTS.CLASSIFY, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function submitReport(data: {
  photo_key: string;
  location: { lat: number; lng: number };
  category: string;
  idempotency_key?: string;
}): Promise<ApiResponse<{ report_id: string; status: string; is_sample?: boolean }>> {
  if (isMockMode) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    const report_id = data.idempotency_key
      ? `rpt-${data.idempotency_key}`
      : `rpt-${Math.random().toString(36).substring(2, 10)}`;
    mockReportStore.set(report_id, {
      report_id,
      category: data.category,
      confidence: 0.88,
      createdAt: Date.now(),
      location: data.location,
    });
    return {
      data: {
        report_id,
        status: 'received',
        is_sample: true,
      },
    };
  }
  return fetchWithAuth(API_ENDPOINTS.REPORTS.SUBMIT, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getReport(reportId: string): Promise<ApiResponse<{
  report_id: string;
  category: string;
  confidence: number | null;
  status: string;
  needs_review: boolean;
  created_at: string;
  location: { lat: number; lng: number };
}>> {
  if (isMockMode) {
    const entry = mockReportStore.get(reportId);
    const elapsed = entry ? Date.now() - entry.createdAt : 10000;
    // Status advances from 'received' to 'routed' after 5 seconds in mock mode
    const status = elapsed > 5000 ? 'routed' : 'received';
    return {
      data: {
        report_id: reportId,
        category: entry?.category || 'crop_burning',
        confidence: entry?.confidence ?? 0.88,
        status,
        needs_review: false,
        created_at: new Date(entry?.createdAt || Date.now()).toISOString(),
        location: entry?.location || { lat: 28.6692, lng: 77.3055 },
      },
    };
  }
  return fetchWithAuth(API_ENDPOINTS.REPORTS.GET_BY_ID(reportId));
}

export async function getToday(areaId?: string): Promise<ApiResponse<TodayResponse>> {
  if (isMockMode) {
    return new Promise((resolve) =>
      resolve({
        data: {
          ...mockToday,
          area_id: areaId || mockToday.area_id,
        },
      })
    );
  }
  const id = areaId || 'ward-east-delhi-001';
  return fetchWithAuth(
    `${API_ENDPOINTS.CITIZEN.TODAY}?area=${encodeURIComponent(id)}&area_id=${encodeURIComponent(id)}`
  );
}

export async function getWeather(locationId?: string): Promise<ApiResponse<WeatherResponse>> {
  const id = locationId || 'village-patiala-001';
  if (isMockMode) {
    return new Promise((resolve) =>
      resolve({
        data: {
          location_id: id,
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
          is_sample: true,
        },
      })
    );
  }
  return fetchWithAuth(`${API_ENDPOINTS.WEATHER}?location_id=${encodeURIComponent(id)}`);
}

export async function getFarmerBookings(): Promise<ApiResponse<FarmerBookingsResponse>> {
  if (isMockMode) {
    return new Promise((resolve) =>
      resolve({
        data: {
          bookings: [
            {
              booking_id: 'bk-101',
              machine_type: 'Happy Seeder 7-Row',
              owner_label: 'Kisan Seva Kendra, Patiala',
              village_id: 'village-patiala-001',
              date: '2026-10-12',
              status: 'CONFIRMED',
              acres: 5,
              is_sample: true,
            },
            {
              booking_id: 'bk-102',
              machine_type: 'Super SMS Harvester',
              owner_label: 'Punjab Agro Hub, Rajpura',
              village_id: 'village-patiala-001',
              date: '2026-10-15',
              status: 'PENDING',
              acres: 5,
              is_sample: true,
            },
          ],
          counts_by_status: { CONFIRMED: 1, PENDING: 1, COMPLETED: 0, CANCELLED: 0 },
          status_counts: { CONFIRMED: 1, PENDING: 1, COMPLETED: 0, CANCELLED: 0 },
          acres: 10,
          impact: {
            acres_avoided_est: 10,
            tonnes_straw_diverted_est: 22,
            pm25_kg_saved_est: 143,
            co2_tonnes_saved_est: 32.1,
            financial_savings_inr_est: 10000,
          },
          is_sample: true,
        },
      })
    );
  }
  return fetchWithAuth(API_ENDPOINTS.FARMER.BOOKINGS);
}

export async function getReports(
  options?: { bbox?: string; mine?: boolean } | string
): Promise<ApiResponse<{ reports: Report[]; status_counts?: Record<string, number>; is_sample: boolean }>> {
  let url = API_ENDPOINTS.REPORTS.GET;
  const isMine = typeof options === 'object' && options?.mine;
  const bbox = typeof options === 'string' ? options : options?.bbox;

  const params = new URLSearchParams();
  if (bbox) params.set('bbox', bbox);
  if (isMine) params.set('mine', 'true');
  const qs = params.toString();
  if (qs) url += `?${qs}`;

  if (isMockMode) {
    return new Promise((resolve) => {
      const list = isMine ? mockReports.slice(0, 3) : mockReports;
      resolve({
        data: {
          reports: list,
          status_counts: {
            received: 1,
            routed: 1,
            investigating: 0,
            resolved: 1,
            rejected: 0,
          },
          is_sample: true,
        },
      });
    });
  }
  return fetchWithAuth(url);
}

export async function getCommunityReports(options?: {
  bbox?: string;
  category?: string;
  limit?: number;
}): Promise<ApiResponse<{ reports: CommunityReport[]; is_sample: boolean }>> {
  const params = new URLSearchParams();
  if (options?.bbox) params.set('bbox', options.bbox);
  if (options?.category) params.set('category', options.category);
  if (options?.limit) params.set('limit', String(options.limit));
  const qs = params.toString();
  const url = `${API_ENDPOINTS.REPORTS.GET}${qs ? `?${qs}` : ''}`;

  if (isMockMode) {
    const mockFeed: CommunityReport[] = [
      {
        report_id: 'sample-report-001',
        category: 'crop_burning',
        status: 'resolved',
        area_name: 'Rajpura Fields',
        public_lat: 30.482,
        public_lng: 76.594,
        created_at: new Date(Date.now() - 42 * 3600 * 1000).toISOString(),
        confidence_label: 'High confidence',
        needs_review: false,
        merged_count: 3,
        photo_url: '/sample-reports/r01.jpg',
        is_sample: true,
        is_mine: false,
      },
      {
        report_id: 'sample-report-002',
        category: 'crop_burning',
        status: 'routed',
        area_name: 'Khanna Outskirts',
        public_lat: 30.704,
        public_lng: 76.218,
        created_at: new Date(Date.now() - 14 * 3600 * 1000).toISOString(),
        confidence_label: 'High confidence',
        needs_review: false,
        merged_count: 1,
        photo_url: '/sample-reports/r02.jpg',
        is_sample: true,
        is_mine: false,
      },
      {
        report_id: 'sample-report-003',
        category: 'crop_burning',
        status: 'received',
        area_name: 'Karnal Farm Zone',
        public_lat: 29.692,
        public_lng: 76.985,
        created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
        confidence_label: 'Needs verification',
        needs_review: true,
        merged_count: 1,
        photo_url: '/sample-reports/r03.jpg',
        is_sample: true,
        is_mine: false,
      },
      {
        report_id: 'sample-report-004',
        category: 'garbage_burning',
        status: 'routed',
        area_name: 'Anand Vihar',
        public_lat: 28.6698,
        public_lng: 77.3061,
        created_at: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
        confidence_label: 'High confidence',
        needs_review: false,
        merged_count: 1,
        photo_url: '/sample-reports/r04.jpg',
        is_sample: true,
        is_mine: false,
      },
      {
        report_id: 'sample-report-005',
        category: 'garbage_burning',
        status: 'resolved',
        area_name: 'Laxmi Nagar',
        public_lat: 28.6310,
        public_lng: 77.2785,
        created_at: new Date(Date.now() - 26 * 3600 * 1000).toISOString(),
        confidence_label: 'High confidence',
        needs_review: false,
        merged_count: 1,
        photo_url: '/sample-reports/r05.jpg',
        is_sample: true,
        is_mine: false,
      },
      {
        report_id: 'sample-report-006',
        category: 'cracker_burning',
        status: 'received',
        area_name: 'Civil Lines',
        public_lat: 28.6820,
        public_lng: 77.2230,
        created_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
        confidence_label: 'Moderate confidence',
        needs_review: false,
        merged_count: 1,
        photo_url: '/sample-reports/r06.jpg',
        is_sample: true,
        is_mine: false,
      },
      {
        report_id: 'sample-report-007',
        category: 'construction_dust',
        status: 'routed',
        area_name: 'Sector 62, Noida',
        public_lat: 28.6258,
        public_lng: 77.3645,
        created_at: new Date(Date.now() - 18 * 3600 * 1000).toISOString(),
        confidence_label: 'High confidence',
        needs_review: false,
        merged_count: 1,
        photo_url: '/sample-reports/r07.jpg',
        is_sample: true,
        is_mine: false,
      },
      {
        report_id: 'sample-report-008',
        category: 'construction_dust',
        status: 'resolved',
        area_name: 'Hauz Khas',
        public_lat: 28.5498,
        public_lng: 77.2010,
        created_at: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
        confidence_label: 'High confidence',
        needs_review: false,
        merged_count: 1,
        photo_url: '/sample-reports/r08.jpg',
        is_sample: true,
        is_mine: false,
      },
    ];

    let filtered = mockFeed;
    if (options?.category) {
      filtered = filtered.filter((r) => r.category === options.category);
    }
    const limit = options?.limit || 20;
    return new Promise((resolve) =>
      resolve({
        data: {
          reports: filtered.slice(0, limit),
          is_sample: true,
        },
      })
    );
  }

  return fetchWithAuth(url);
}

// ─── Profile Mapping & Retrieval (Backend snake_case -> UI camelCase) ──────

export interface MappedProfile {
  userId: string;
  role: Role;
  name: string;
  email?: string;
  phone?: string;
  language: Language;
  createdAt?: string;
  // Farmer fields (camelCase)
  villageId?: string;
  villageName?: string;
  district?: string;
  landSizeAcres?: number;
  mainCrop?: string;
  cropStage?: string;
  hasOwnMachine?: boolean;
  // Citizen fields (camelCase)
  areaId?: string;
  areaName?: string;
  alertThreshold?: number;
  alertOptIn?: boolean;
  householdNote?: string;
  hasKids?: boolean;
  hasElderly?: boolean;
  // Raw passthrough
  [key: string]: any;
}

export function mapProfileResponse(raw: Record<string, any>): MappedProfile {
  if (!raw) return raw as any;
  return {
    ...raw,
    userId: raw.user_id || raw.userId || '',
    role: (raw.role || 'citizen') as Role,
    name: raw.name || '',
    email: raw.email || undefined,
    phone: raw.phone || undefined,
    language: (raw.language || 'en') as Language,
    createdAt: raw.created_at || raw.createdAt,
    // Farmer fields mapped to UI camelCase
    villageId: raw.village_id || raw.villageId,
    villageName: raw.village_name || raw.villageName,
    district: raw.district,
    landSizeAcres: raw.land_size_acres !== undefined ? Number(raw.land_size_acres) : raw.landSizeAcres,
    mainCrop: raw.main_crop || raw.mainCrop,
    cropStage: raw.crop_stage || raw.cropStage,
    hasOwnMachine: raw.has_own_machine !== undefined ? Boolean(raw.has_own_machine) : raw.hasOwnMachine,
    // Citizen fields mapped to UI camelCase
    areaId: raw.area_id || raw.areaId,
    areaName: raw.area_name || raw.areaName,
    alertThreshold: raw.alert_threshold !== undefined ? Number(raw.alert_threshold) : raw.alertThreshold,
    alertOptIn: raw.alert_opt_in !== undefined ? Boolean(raw.alert_opt_in) : raw.alertOptIn,
    householdNote: raw.household_note || raw.householdNote,
    hasKids: raw.has_kids !== undefined ? Boolean(raw.has_kids) : raw.hasKids,
    hasElderly: raw.has_elderly !== undefined ? Boolean(raw.has_elderly) : raw.hasElderly,
  };
}

export async function getProfile(): Promise<{
  data: MappedProfile | null;
  isNotFound?: boolean;
}> {
  if (isMockMode) {
    const session = authClient.getSession();
    const role = session?.role || 'farmer';
    if (role === 'farmer') {
      return {
        data: mapProfileResponse({
          user_id: session?.user_id || 'mock-farmer-1',
          role: 'farmer',
          name: session?.name || 'Gurpreet Singh',
          phone: session?.phone || '+919876543210',
          village_id: 'village-patiala-001',
          village_name: 'Rajpura',
          district: 'Patiala',
          land_size_acres: 10,
          main_crop: 'wheat',
          crop_stage: 'harvested',
          has_own_machine: false,
          language: session?.language || 'pa',
          created_at: new Date().toISOString(),
          is_sample: true,
        }),
      };
    } else {
      return {
        data: mapProfileResponse({
          user_id: session?.user_id || 'mock-citizen-1',
          role: 'citizen',
          name: session?.name || 'Ananya Sharma',
          email: session?.email || 'ananya@example.com',
          phone: session?.phone || '+919876543210',
          language: session?.language || 'en',
          area_id: 'ward-east-delhi-001',
          area_name: 'Anand Vihar',
          has_kids: false,
          has_elderly: false,
          alert_threshold: 200,
          created_at: new Date().toISOString(),
          is_sample: true,
        }),
      };
    }
  }

  try {
    const res = await fetchWithAuth(API_ENDPOINTS.AUTH.GET_PROFILE);
    if (res && res.data) {
      return { data: mapProfileResponse(res.data) };
    }
    return { data: null };
  } catch (err: any) {
    if (err?.status === 404 || /not found/i.test(err?.message || '')) {
      return { data: null, isNotFound: true };
    }
    throw err;
  }
}

// ─── API Client Object ──────────────────────────────────────────────────────

export const apiClient = {
  getProfile: getProfile,
  farmer: {
    plan: async (data: {
      village_id: string;
      crop_stage: string;
      language: string;
      start_date?: string;
      end_date?: string;
    }): Promise<ApiResponse<PlanResult>> => {
      if (isMockMode) {
        return new Promise((resolve) =>
          setTimeout(() => resolve({ data: mockData.mockFarmerPlan }), 1500)
        );
      }
      return fetchWithAuth(API_ENDPOINTS.FARMER.PLAN, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    book: async (data: {
      slot_id: string;
      village_id: string;
      date: string;
      idempotency_key?: string;
    }): Promise<
      ApiResponse<{
        booking_id: string;
        status: string;
        slot: MachineOption;
        is_sample: boolean;
      }>
    > => {
      if (isMockMode) {
        return new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                data: {
                  booking_id: `book-${Math.random().toString(36).substring(2, 10)}`,
                  status: 'confirmed',
                  slot: {
                    slot_id: data.slot_id,
                    machine_type: 'Happy Seeder',
                    owner_label: 'Kisan Seva Kendra, Patiala',
                    date: data.date,
                    is_sample: true,
                  },
                  is_sample: true,
                },
              }),
            1000
          )
        );
      }
      return fetchWithAuth(API_ENDPOINTS.FARMER.BOOK, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    getBookings: getFarmerBookings,
    strawOutlets: async (districtId: string) => {
      if (isMockMode) {
        return new Promise((resolve) =>
          resolve({ data: { outlets: mockStrawOutlets, is_sample: true } })
        );
      }
      return fetchWithAuth(`${API_ENDPOINTS.FARMER.STRAW_OUTLETS}?district=${districtId}`);
    },
    getProfile: async (): Promise<ApiResponse<FarmerProfile>> => {
      const res = await getProfile();
      return { data: res.data as unknown as FarmerProfile };
    },
    weather: getWeather,
  },
  citizen: {
    today: getToday,
    weather: getWeather,
    ask: async (data: {
      question: string;
      area_id: string;
    }): Promise<
      ApiResponse<{
        question: string;
        answer: string;
        sources: string[];
        is_sample: boolean;
      }>
    > => {
      if (isMockMode) {
        return new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                data: {
                  question: data.question,
                  answer:
                    'Based on current wind patterns and forecast data, air quality may improve slightly by tomorrow evening as north-westerly winds are expected to pick up.',
                  sources: ['AQI data (CPCB)', 'Weather forecast (Open-Meteo)'],
                  is_sample: true,
                },
              }),
            1000
          )
        );
      }
      return fetchWithAuth(API_ENDPOINTS.CITIZEN.ASK, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    getProfile: async (): Promise<ApiResponse<CitizenProfile>> => {
      const res = await getProfile();
      return { data: res.data as unknown as CitizenProfile };
    },
    communityReports: getCommunityReports,
  },
  map: {
    layers: async (bbox?: string): Promise<ApiResponse<MapLayers>> => {
      if (isMockMode) {
        return new Promise((resolve) => resolve({ data: mockMapLayers }));
      }
      const url = bbox ? `${API_ENDPOINTS.MAP.LAYERS}?bbox=${bbox}` : API_ENDPOINTS.MAP.LAYERS;
      return fetchWithAuth(url);
    },
  },
  weather: getWeather,
  reports: {
    get: getReports,
    mine: () => getReports({ mine: true }),
    community: getCommunityReports,
    getById: getReport,
    uploadUrl: getUploadUrl,
    uploadPhoto,
    classify: classifyPhoto,
    submit: submitReport,
  },
  auth: {
    getProfile,
  },
};
