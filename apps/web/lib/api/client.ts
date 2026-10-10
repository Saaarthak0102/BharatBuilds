import { API_ENDPOINTS } from './endpoints';
import * as mockData from '../mock/farmerPlan';
import { mockToday } from '../mock/today';
import { mockReports } from '../mock/reports';
import { mockStrawOutlets } from '../mock/strawOutlets';
import { mockMapLayers } from '../mock/mapLayers';
import { authClient } from '../auth/authClient';
import type { PlanResult, TodayResponse, MapLayers, Report, ApiResponse, MachineOption, FarmerProfile } from '../types';

const API_MODE = process.env.NEXT_PUBLIC_API_MODE || 'mock';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

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
    throw new Error(errorData?.error?.message || 'Unauthorized');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || 'API request failed');
  }

  return response.json();
}

export const apiClient = {
  farmer: {
    plan: async (data: { village_id: string; crop_stage: string; language: string }): Promise<ApiResponse<PlanResult>> => {
      if (API_MODE === 'mock') {
        return new Promise((resolve) => 
          setTimeout(() => resolve({ data: mockData.mockFarmerPlan }), 1500)
        );
      }
      return fetchWithAuth(API_ENDPOINTS.FARMER.PLAN, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    book: async (data: { slot_id: string; village_id: string; date: string; idempotency_key?: string }): Promise<ApiResponse<{ booking_id: string; status: string; slot: MachineOption; is_sample: boolean }>> => {
      if (API_MODE === 'mock') {
         return new Promise((resolve) => 
          setTimeout(() => resolve({
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
              is_sample: true
            }
          }), 1000)
        );
      }
      return fetchWithAuth(API_ENDPOINTS.FARMER.BOOK, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    strawOutlets: async (districtId: string) => {
       if (API_MODE === 'mock') {
        return new Promise((resolve) => resolve({ data: { outlets: mockStrawOutlets, is_sample: true } }));
      }
      return fetchWithAuth(`${API_ENDPOINTS.FARMER.STRAW_OUTLETS}?district=${districtId}`);
    },
    getProfile: async (): Promise<ApiResponse<FarmerProfile>> => {
      if (API_MODE === 'mock') {
        return new Promise((resolve) => 
          setTimeout(() => resolve({
            data: {
              user_id: 'mock-user-123',
              role: 'farmer',
              name: 'Gurpreet Singh',
              phone: '+919876543210',
              village_id: 'village-patiala-001',
              village_name: 'Rajpura',
              district: 'Patiala',
              land_size_acres: 10,
              main_crop: 'wheat',
              crop_stage: 'harvested',
              has_own_machine: false,
              language: 'en',
              created_at: new Date().toISOString(),
              is_sample: true,
            } as FarmerProfile
          }), 1000)
        );
      }
      return fetchWithAuth(API_ENDPOINTS.AUTH.GET_PROFILE);
    }
  },
  citizen: {
    today: async (areaId: string): Promise<ApiResponse<TodayResponse>> => {
      if (API_MODE === 'mock') {
         return new Promise((resolve) => resolve({ data: mockToday }));
      }
      return fetchWithAuth(`${API_ENDPOINTS.CITIZEN.TODAY}?area=${areaId}`);
    },
    ask: async (data: { question: string; area_id: string }): Promise<ApiResponse<{ question: string; answer: string; sources: string[]; is_sample: boolean }>> => {
      if (API_MODE === 'mock') {
         return new Promise((resolve) => 
          setTimeout(() => resolve({
            data: {
              question: data.question,
              answer: "Based on current wind patterns and forecast data, air quality may improve slightly by tomorrow evening as north-westerly winds are expected to pick up.",
              sources: ["AQI data (CPCB)", "Weather forecast (Open-Meteo)"],
              is_sample: true
            }
          }), 1000)
        );
      }
       return fetchWithAuth(API_ENDPOINTS.CITIZEN.ASK, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    }
  },
  map: {
    layers: async (bbox?: string): Promise<ApiResponse<MapLayers>> => {
       if (API_MODE === 'mock') {
         return new Promise((resolve) => resolve({ data: mockMapLayers }));
      }
      const url = bbox ? `${API_ENDPOINTS.MAP.LAYERS}?bbox=${bbox}` : API_ENDPOINTS.MAP.LAYERS;
      return fetchWithAuth(url);
    }
  },
  reports: {
    get: async (bbox?: string): Promise<ApiResponse<{ reports: Report[]; is_sample: boolean }>> => {
      if (API_MODE === 'mock') {
         return new Promise((resolve) => resolve({ data: { reports: mockReports, is_sample: true } }));
      }
      const url = bbox ? `${API_ENDPOINTS.REPORTS.GET}?bbox=${bbox}` : API_ENDPOINTS.REPORTS.GET;
      return fetchWithAuth(url);
    },
    uploadUrl: async (data: { content_type: string; file_size: number }): Promise<ApiResponse<{ upload_url: string; photo_key: string; expires_in: number }>> => {
       if (API_MODE === 'mock') {
         return new Promise((resolve) => resolve({
            data: {
              upload_url: 'mock_url',
              photo_key: `reports/mock-${Math.random().toString(36).substring(2, 10)}`,
              expires_in: 300
            }
         }));
      }
      return fetchWithAuth(API_ENDPOINTS.REPORTS.UPLOAD_URL, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    submit: async (data: { photo_key: string; location: { lat: number; lng: number }; category: string; category_confirmed: boolean; notes?: string }): Promise<ApiResponse<{ report_id: string; status: string; is_sample: boolean }>> => {
       if (API_MODE === 'mock') {
         return new Promise((resolve) => 
          setTimeout(() => resolve({
            data: {
              report_id: `rpt-${Math.random().toString(36).substring(2, 10)}`,
              status: 'received',
              is_sample: true
            }
          }), 1500)
        );
      }
      return fetchWithAuth(API_ENDPOINTS.REPORTS.SUBMIT, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    }
  }
};
