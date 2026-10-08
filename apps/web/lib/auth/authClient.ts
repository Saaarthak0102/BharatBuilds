/**
 * Auth client interface and factory.
 * Switches between mock (localStorage) and Cognito based on env var.
 */

import type { Session, Role, Language } from '@/lib/types';
import { mockSignup, mockLogin, mockLogout, getSession, isAuthenticated } from './mockAuth';
import type { SignupData, LoginData } from './mockAuth';

export type { SignupData, LoginData };

export interface AuthClient {
  signup(data: SignupData): Promise<Session>;
  login(data: LoginData): Promise<Session>;
  logout(): Promise<void>;
  getSession(): Session | null;
  isAuthenticated(): boolean;
}

const mockClient: AuthClient = {
  signup: async (data) => mockSignup(data),
  login: async (data) => mockLogin(data),
  logout: async () => mockLogout(),
  getSession: () => getSession(),
  isAuthenticated: () => isAuthenticated(),
};

// TODO: Implement cognitoClient when switching to real auth
// const cognitoClient: AuthClient = { ... };

export function getAuthClient(): AuthClient {
  const mode = process.env.NEXT_PUBLIC_AUTH_MODE || 'mock';

  if (mode === 'cognito') {
    // TODO: Return cognitoClient
    console.warn('Cognito auth not implemented yet, falling back to mock');
    return mockClient;
  }

  return mockClient;
}

export const authClient = getAuthClient();
