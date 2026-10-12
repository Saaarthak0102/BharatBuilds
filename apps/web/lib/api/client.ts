import { API_ENDPOINTS } from './endpoints';
import * as mockData from '../mock/farmerPlan';
import { mockToday } from '../mock/today';
import { mockReports } from '../mock/reports';
import { mockStrawOutlets } from '../mock/strawOutlets';
import { mockMapLayers } from '../mock/mapLayers';
import { authClient } from '../auth/authClient';
import { cognitoClient } from '../auth/cognitoAuth';
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
import {
  withDemoFallback,
  isDemoMode,
  getDemoRole,
  generateDemoPlan,
  getDemoMachineSlots,
  bookDemoMachine,
  getDemoFarmerBookings,
  getRankedDemoStrawOutlets,
  getDemoWeather,
  getDemoToday,
  getDemoCommunityReports,
  classifyDemoPhoto,
  submitDemoReport,
  getDemoReport,
  getDemoMapLayers,
  demoStatusTracker,
  getStoredUserReports,
  getDemoReportStatus,
} from '../demo';
import { isWithinWeekIST } from '../utils/date';

const API_MODE = process.env.NEXT_PUBLIC_API_MODE || 'mock';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
const isNonProd = process.env.NODE_ENV !== 'production';

// Mock values may only appear when NEXT_PUBLIC_USE_MOCKS=true
export const isMockMode = process.env.NEXT_PUBLIC_USE_MOCKS === 'true';

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
  if (isDemoMode()) {
    try {
      const realCognitoToken = await cognitoClient.getIdToken();
      if (realCognitoToken && !realCognitoToken.startsWith('demo-local-')) {
        token = realCognitoToken;
      }
    } catch {
      // ignore
    }
    if (!token) {
      const cognitoStored = cognitoClient.getSession()?.idToken;
      if (cognitoStored && !cognitoStored.startsWith('demo-local-')) {
        token = cognitoStored;
      }
    }
  }

  if (!token) {
    try {
      token = await authClient.getIdToken();
    } catch {
      token = authClient.getSession()?.idToken || null;
    }
  }

  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const fullUrl = `${API_BASE_URL}${url}`;
  let response: Response;
  try {
    response = await fetch(fullUrl, {
      ...options,
      headers,
    });
  } catch (fetchErr: any) {
    if (isNonProd) {
      console.warn(`[API] Network error requesting ${url}:`, fetchErr?.message || fetchErr);
    }
    throw fetchErr;
  }

  let responseData: any = null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    responseData = await response.json().catch(() => null);
  } else {
    const text = await response.text().catch(() => '');
    responseData = text ? { message: text } : null;
  }

  if (isNonProd) {
    if (response.status === 200) {
      console.warn(`[API] ${url} HTTP 200`);
    } else {
      const errMsg =
        responseData?.error?.message ||
        responseData?.message ||
        responseData?.error ||
        JSON.stringify(responseData) ||
        response.statusText;
      console.warn(`[API] ${url} HTTP ${response.status}: ${errMsg}`);
    }
  }

  if (response.status === 401) {
    if (!isDemoMode()) {
      try {
        await authClient.logout();
      } catch {
        // ignore
      }
      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname;
        const isPublicRoute =
          currentPath === '/' || currentPath === '/login' || currentPath === '/signup';
        if (!isPublicRoute) {
          window.location.replace('/login');
        }
      }
    }
    const err = new Error(responseData?.error?.message || responseData?.message || 'Unauthorized');
    (err as any).status = 401;
    (err as any).data = responseData;
    throw err;
  }

  if (!response.ok) {
    const err = new Error(responseData?.error?.message || responseData?.message || 'API request failed');
    (err as any).status = response.status;
    (err as any).data = responseData;
    throw err;
  }

  return responseData;
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
  try {
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
  } catch (err: any) {
    if (isDemoMode()) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[DemoPhoto] Real S3 upload failed in demo mode; keeping photo locally:', err);
      }
      return;
    }
    throw err;
  }
}

export async function classifyPhoto(data: {
  photo_key: string;
}): Promise<ApiResponse<{ category: string; confidence: number; label?: string }>> {
  if (isMockMode) {
    await new Promise((resolve) => setTimeout(resolve, 600));
    return {
      data: {
        category: 'crop_burning',
        confidence: 0.88,
      },
    };
  }
  return withDemoFallback({
    featureKey: 'classifier',
    realCall: () =>
      fetchWithAuth(API_ENDPOINTS.REPORTS.CLASSIFY, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    demoCall: () => ({
      data: classifyDemoPhoto(data.photo_key),
    }),
    validator: (d: any) => {
      const c = d?.category || d?.data?.category;
      return typeof c === 'string' && c.length > 0;
    },
    timeoutMs: 6000,
    details: {
      live: 'Vision AI',
      demo: 'Demo classifier',
    },
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
  if (!isDemoMode()) {
    return fetchWithAuth(API_ENDPOINTS.REPORTS.SUBMIT, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
  try {
    const res = await fetchWithAuth(API_ENDPOINTS.REPORTS.SUBMIT, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    demoStatusTracker.setSource('community_reports', 'live');
    return res;
  } catch (err) {
    demoStatusTracker.setSource('community_reports', 'demo');
    const demoSub = submitDemoReport(data);
    return { data: demoSub };
  }
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
  return withDemoFallback({
    featureKey: 'community_reports',
    realCall: () => fetchWithAuth(API_ENDPOINTS.REPORTS.GET_BY_ID(reportId)),
    demoCall: () => ({
      data: getDemoReport(reportId),
    }),
    validator: (d: any) => {
      const r = d?.report_id ? d : d?.data;
      return Boolean(r?.report_id);
    },
    timeoutMs: 6000,
  });
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
  return withDemoFallback({
    featureKey: 'today',
    realCall: () =>
      fetchWithAuth(
        `${API_ENDPOINTS.CITIZEN.TODAY}?area=${encodeURIComponent(id)}&area_id=${encodeURIComponent(id)}`
      ),
    demoCall: () => ({
      data: getDemoToday(id),
    }),
    validator: (d: any) => {
      const t = d?.aqi !== undefined ? d : d?.data;
      return typeof t?.aqi === 'number';
    },
    timeoutMs: 6000,
  });
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
  return withDemoFallback({
    featureKey: 'weather',
    realCall: () => fetchWithAuth(`${API_ENDPOINTS.WEATHER}?location_id=${encodeURIComponent(id)}`),
    demoCall: () => ({
      data: getDemoWeather(id),
    }),
    validator: (d: any) => {
      const w = d?.current !== undefined ? d : d?.data;
      return typeof (w?.current ?? w?.temperature) === 'number';
    },
    timeoutMs: 6000,
  });
}

export async function getFarmerBookings(): Promise<ApiResponse<FarmerBookingsResponse>> {
  if (isMockMode) {
    return new Promise((resolve) =>
      resolve({
        data: getDemoFarmerBookings(),
      })
    );
  }
  return withDemoFallback({
    featureKey: 'machines',
    realCall: async () => {
      const real = await fetchWithAuth(API_ENDPOINTS.FARMER.BOOKINGS);
      if (isDemoMode() && real?.data?.bookings) {
        const demoData = getDemoFarmerBookings();
        const existingIds = new Set(real.data.bookings.map((b: any) => b.booking_id));
        const merged = [...real.data.bookings];
        demoData.bookings.forEach((db) => {
          if (!existingIds.has(db.booking_id)) {
            merged.push(db);
          }
        });
        return {
          ...real,
          data: {
            ...real.data,
            bookings: merged,
            status_counts: {
              ...real.data.status_counts,
              COMPLETED: (real.data.status_counts?.COMPLETED || 0) + 2,
            },
            impact: real.data.impact || demoData.impact,
          },
        };
      }
      return real;
    },
    demoCall: () => ({
      data: getDemoFarmerBookings(),
    }),
    validator: (d: any) => {
      const b = d?.bookings || d?.data?.bookings;
      return Array.isArray(b);
    },
    timeoutMs: 6000,
  });
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
    const list = isMine ? mockReports.slice(0, 3) : mockReports;
    return new Promise((resolve) =>
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
      })
    );
  }

  return withDemoFallback({
    featureKey: 'community_reports',
    realCall: () => fetchWithAuth(url),
    demoCall: () => {
      const comm = getDemoCommunityReports();
      const list: Report[] = comm.reports
        .filter((r) => !isMine || r.is_mine)
        .map((r) => ({
          report_id: r.report_id,
          category: r.category as any,
          location: r.location || { lat: r.public_lat || 28.6692, lng: r.public_lng || 77.3055 },
          status: r.status as any,
          created_at: r.created_at,
          is_sample: true,
        }));
      return {
        data: {
          reports: list,
          status_counts: {
            received: list.filter((r) => r.status === 'received').length,
            routed: list.filter((r) => r.status === 'routed').length,
            resolved: list.filter((r) => r.status === 'resolved').length,
          },
          is_sample: true,
        },
      };
    },
    validator: (d: any) => {
      const r = d?.reports || d?.data?.reports;
      return Array.isArray(r);
    },
    timeoutMs: 6000,
  });
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
    return new Promise((resolve) =>
      resolve({
        data: getDemoCommunityReports(options),
      })
    );
  }

  return withDemoFallback({
    featureKey: 'community_reports',
    realCall: async () => {
      const real = await fetchWithAuth(url);
      if (isDemoMode() && real?.data?.reports) {
        const userReports = getStoredUserReports().map((ur) => ({
          ...ur,
          status: getDemoReportStatus(ur.timestampMs),
          is_mine: true,
          is_sample: true,
        }));
        const existingIds = new Set(real.data.reports.map((r: any) => r.report_id));
        const merged = [
          ...userReports.filter((ur) => !existingIds.has(ur.report_id)),
          ...real.data.reports,
        ];
        return {
          ...real,
          data: {
            ...real.data,
            reports: merged,
          },
        };
      }
      return real;
    },
    demoCall: () => ({
      data: getDemoCommunityReports(options),
    }),
    validator: (d: any) => {
      const r = d?.reports || d?.data?.reports;
      return Array.isArray(r);
    },
    timeoutMs: 6000,
  });
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
          land_size_acres: 12,
          main_crop: 'Paddy (Basmati)',
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

  if (isDemoMode()) {
    try {
      const res = await fetchWithAuth(API_ENDPOINTS.AUTH.GET_PROFILE);
      if (res && res.data && res.data.name) {
        demoStatusTracker.setSource('profile', 'live');
        return { data: mapProfileResponse(res.data) };
      }
    } catch {
      // Fall through to demo profile
    }
    demoStatusTracker.setSource('profile', 'demo');
    const role = getDemoRole() || 'farmer';
    if (role === 'farmer') {
      return {
        data: mapProfileResponse({
          user_id: 'demo-farmer-sub-rajpura',
          role: 'farmer',
          name: 'Gurpreet Singh',
          phone: '+919876543210',
          village_id: 'village-patiala-001',
          village_name: 'Rajpura',
          district: 'Patiala',
          land_size_acres: 12,
          main_crop: 'Paddy (Basmati)',
          crop_stage: 'harvested',
          has_own_machine: false,
          language: 'pa',
          created_at: new Date().toISOString(),
          is_sample: true,
        }),
      };
    } else {
      return {
        data: mapProfileResponse({
          user_id: 'demo-citizen-sub-anand-vihar',
          role: 'citizen',
          name: 'Ananya Sharma',
          email: 'ananya.sharma@example.com',
          phone: '+919876543211',
          language: 'en',
          area_id: 'ward-east-delhi-001',
          area_name: 'Anand Vihar',
          has_kids: false,
          has_elderly: false,
          alert_threshold: 200,
          alert_opt_in: true,
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
      if (isNonProd) {
        console.warn(`[API] Profile 404: User profile not found, defaulting to fallback village`);
      }
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
      return withDemoFallback({
        featureKey: 'plan',
        realCall: () =>
          fetchWithAuth(API_ENDPOINTS.FARMER.PLAN, {
            method: 'POST',
            body: JSON.stringify(data),
          }),
        demoCall: () => ({
          data: generateDemoPlan(data),
        }),
        validator: (resData: any) => {
          const p = resData?.best_day ? resData : resData?.data;
          if (!p) return false;
          const bestValid = isWithinWeekIST(p.best_day);
          const machineValid = !p.machine_option?.date || isWithinWeekIST(p.machine_option.date);
          return Boolean(bestValid && machineValid && typeof p.score === 'number');
        },
        timeoutMs: 10000,
        details: {
          live: 'Live scorer',
          demo: 'Live scorer + template explanation',
        },
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
      if (!isDemoMode()) {
        return fetchWithAuth(API_ENDPOINTS.FARMER.BOOK, {
          method: 'POST',
          body: JSON.stringify(data),
        });
      }
      try {
        const realRes = await fetchWithAuth(API_ENDPOINTS.FARMER.BOOK, {
          method: 'POST',
          body: JSON.stringify(data),
        });
        demoStatusTracker.setSource('machines', 'live');
        return realRes;
      } catch (err: any) {
        demoStatusTracker.setSource('machines', 'demo');
        const demoBooked = bookDemoMachine(data);
        return { data: demoBooked };
      }
    },
    getBookings: getFarmerBookings,
    strawOutlets: async (districtId: string) => {
      if (isMockMode) {
        return new Promise((resolve) =>
          resolve({ data: { outlets: mockStrawOutlets, is_sample: true } })
        );
      }
      return withDemoFallback({
        featureKey: 'straw_outlets',
        realCall: () => fetchWithAuth(`${API_ENDPOINTS.FARMER.STRAW_OUTLETS}?district=${districtId}`),
        demoCall: () => ({
          data: {
            outlets: getRankedDemoStrawOutlets(districtId),
            is_sample: true,
          },
        }),
        validator: (d: any) => {
          const list = d?.outlets || d?.data?.outlets;
          return Array.isArray(list) && list.length > 0;
        },
        timeoutMs: 6000,
      });
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
    layers: async (bbox?: string, options?: { signal?: AbortSignal }): Promise<ApiResponse<MapLayers>> => {
      if (isMockMode) {
        return new Promise((resolve) => resolve({ data: mockMapLayers }));
      }
      if (!authClient.isAuthenticated() && !isDemoMode()) {
        return { data: getDemoMapLayers() };
      }
      const url = bbox ? `${API_ENDPOINTS.MAP.LAYERS}?bbox=${bbox}` : API_ENDPOINTS.MAP.LAYERS;
      return withDemoFallback({
        featureKey: 'map_layers',
        realCall: () => fetchWithAuth(url, { signal: options?.signal }),
        demoCall: () => ({
          data: getDemoMapLayers(),
        }),
        validator: (d: any) => {
          const m = d?.aqi_heatmap ? d : d?.data;
          return Boolean(m?.aqi_heatmap?.features && m.aqi_heatmap.features.length > 0);
        },
        timeoutMs: 6000,
      });
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
  subscriptions: {
    create: async (data: {
      area_id: string;
      threshold: number;
      email: string;
    }): Promise<ApiResponse<{ status: string; subscription_id?: string; is_sample?: boolean }>> => {
      if (isMockMode) {
        return {
          data: {
            status: 'subscribed',
            subscription_id: `sub-${Math.random().toString(36).substring(2, 9)}`,
            is_sample: true,
          },
        };
      }
      if (!isDemoMode()) {
        return fetchWithAuth(API_ENDPOINTS.SUBSCRIPTIONS.CREATE, {
          method: 'POST',
          body: JSON.stringify(data),
        });
      }
      try {
        const res = await fetchWithAuth(API_ENDPOINTS.SUBSCRIPTIONS.CREATE, {
          method: 'POST',
          body: JSON.stringify(data),
        });
        demoStatusTracker.setSource('today', 'live');
        return res;
      } catch (err) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('saans_alert_enabled', 'true');
          localStorage.setItem('saans_alert_threshold', String(data.threshold));
        }
        return {
          data: {
            status: 'subscribed_local',
            subscription_id: 'sub-demo-local',
            is_sample: true,
          },
        };
      }
    },
  },
  auth: {
    getProfile,
  },
};
