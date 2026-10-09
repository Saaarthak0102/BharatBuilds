/**
 * Mock auth provider — localStorage-backed session for local dev.
 * Used when NEXT_PUBLIC_AUTH_MODE=mock (default).
 * No real Cognito calls; simulates login/signup/session.
 */

import type { Session, Role, Language } from '@/lib/types';

const STORAGE_KEY = 'saans_mock_session';

export interface SignupData {
  role: Role;
  name: string;
  email?: string;
  phone?: string;
  password: string;
  language: Language;
  // Farmer-specific
  village_id?: string;
  village_name?: string;
  district?: string;
  land_size_acres?: number;
  main_crop?: string;
  crop_stage?: string;
  has_own_machine?: boolean;
  // Citizen-specific
  area_id?: string;
  area_name?: string;
  alert_threshold?: number;
  alert_opt_in?: boolean;
  household_note?: string;
  has_kids?: boolean;
  has_elderly?: boolean;
}

export interface LoginData {
  email: string;
  password: string;
}

function generateId(): string {
  return 'mock-' + Math.random().toString(36).substring(2, 10);
}

export function mockSignup(data: SignupData): Session {
  const session: Session = {
    user_id: generateId(),
    role: data.role,
    name: data.name,
    email: data.email,
    phone: data.phone,
    language: data.language,
    is_authenticated: true,
    idToken: 'mock-id-token-' + Math.random().toString(36).substring(2, 10),
  };

  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }

  return session;
}

export function mockLogin(data: LoginData): Session {
  // In mock mode, accept any credentials
  // Check if there's an existing session first
  const existing = getSession();
  if (existing) {
    return { ...existing, is_authenticated: true, idToken: existing.idToken || 'mock-id-token' };
  }

  // Create a default citizen session
  const session: Session = {
    user_id: generateId(),
    role: 'citizen',
    name: 'Demo User',
    email: data.email,
    language: 'en',
    is_authenticated: true,
    idToken: 'mock-id-token-' + Math.random().toString(36).substring(2, 10),
  };

  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }

  return session;
}

export function mockLogout(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function getSession(): Session | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as Session;
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  const session = getSession();
  return session?.is_authenticated ?? false;
}
