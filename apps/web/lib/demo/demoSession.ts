import { cognitoClient } from '../auth/cognitoAuth';
import type { Session } from '../types';

export const DEMO_STORAGE_KEY = 'saans_demo';
export const DEMO_COGNITO_SESSION_KEY = 'saans_cognito_session';
export const DEMO_MOCK_SESSION_KEY = 'saans_mock_session';

export function isDemoMode(): boolean {
  if (typeof window === 'undefined') return false;
  const flag = localStorage.getItem(DEMO_STORAGE_KEY);
  return flag === 'farmer' || flag === 'citizen';
}

export function getDemoRole(): 'farmer' | 'citizen' | null {
  if (typeof window === 'undefined') return null;
  const flag = localStorage.getItem(DEMO_STORAGE_KEY);
  if (flag === 'farmer' || flag === 'citizen') return flag;
  return null;
}

export async function startDemoSession(role: 'farmer' | 'citizen'): Promise<Session> {
  if (typeof window === 'undefined') {
    throw new Error('startDemoSession must be run in browser');
  }

  // 1. Set demo flag
  localStorage.setItem(DEMO_STORAGE_KEY, role);

  // 2. Try real Cognito sign-in via env credentials if provided
  const email =
    role === 'farmer'
      ? process.env.NEXT_PUBLIC_DEMO_FARMER_EMAIL
      : process.env.NEXT_PUBLIC_DEMO_CITIZEN_EMAIL;
  const password =
    role === 'farmer'
      ? process.env.NEXT_PUBLIC_DEMO_FARMER_PASSWORD
      : process.env.NEXT_PUBLIC_DEMO_CITIZEN_PASSWORD;

  if (email && password) {
    try {
      const session = await cognitoClient.login({
        email: email.trim(),
        password: password.trim(),
      });
      if (session && session.is_authenticated) {
        localStorage.setItem(DEMO_MOCK_SESSION_KEY, JSON.stringify(session));
        return session;
      }
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[DemoSession] Cognito demo login failed; creating local session:', err);
      }
    }
  }

  // 3. Fallback: Create local-only session
  const fallbackSession: Session =
    role === 'farmer'
      ? {
          user_id: 'demo-farmer-sub-rajpura',
          role: 'farmer',
          name: 'Gurpreet Singh',
          phone: '+919876543210',
          language: 'pa',
          is_authenticated: true,
          idToken: 'demo-local-farmer-token',
        }
      : {
          user_id: 'demo-citizen-sub-anand-vihar',
          role: 'citizen',
          name: 'Ananya Sharma',
          email: 'ananya.sharma@example.com',
          phone: '+919876543211',
          language: 'en',
          is_authenticated: true,
          idToken: 'demo-local-citizen-token',
        };

  localStorage.setItem(DEMO_COGNITO_SESSION_KEY, JSON.stringify(fallbackSession));
  localStorage.setItem(DEMO_MOCK_SESSION_KEY, JSON.stringify(fallbackSession));

  return fallbackSession;
}

export function clearDemoSession(): void {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(DEMO_STORAGE_KEY);

  // Clear demo-specific local keys
  const demoPrefixes = ['saans_demo_'];
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && demoPrefixes.some((p) => key.startsWith(p))) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k));
}

export function ensureDemoSession(): void {
  if (typeof window === 'undefined') return;
  const role = getDemoRole();
  if (!role) return;

  const currentCognito = localStorage.getItem(DEMO_COGNITO_SESSION_KEY);
  const currentMock = localStorage.getItem(DEMO_MOCK_SESSION_KEY);
  if (!currentCognito && !currentMock) {
    startDemoSession(role).catch(() => {});
  }
}
