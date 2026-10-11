import { API_ENDPOINTS } from './endpoints';
import * as mockData from '../mock/farmerPlan';
import { mockToday } from '../mock/today';
import { mockReports } from '../mock/reports';
import { mockStrawOutlets } from '../mock/strawOutlets';
import { mockMapLayers } from '../mock/mapLayers';
import { authClient } from '../auth/authClient';
import type { PlanResult, TodayResponse, MapLayers, Report, ApiResponse, MachineOption, FarmerProfile, CitizenProfile, Role, Language } from '../types';

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
  },
  citizen: {
    today: getToday,
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
  reports: {
    get: async (
      bbox?: string
    ): Promise<ApiResponse<{ reports: Report[]; is_sample: boolean }>> => {
      if (isMockMode) {
        return new Promise((resolve) => resolve({ data: { reports: mockReports, is_sample: true } }));
      }
      const url = bbox ? `${API_ENDPOINTS.REPORTS.GET}?bbox=${bbox}` : API_ENDPOINTS.REPORTS.GET;
      return fetchWithAuth(url);
    },
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
