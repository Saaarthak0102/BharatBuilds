/**
 * Auth client interface and factory.
 * Switches between mock (localStorage) and Cognito based on env var.
 */

import type { Session } from '../types';
import { mockSignup, mockLogin, mockLogout, getSession, isAuthenticated } from './mockAuth';
import type { SignupData, LoginData } from './mockAuth';
import { cognitoClient } from './cognitoAuth';

export type { SignupData, LoginData };

export interface CodeDeliveryDetails {
  attributeName?: string;
  deliveryMedium?: string;
  destination?: string;
}

export interface SignupResult {
  isConfirmed: boolean;
  session?: Session;
  username: string;
  codeDeliveryDetails?: CodeDeliveryDetails;
}

export interface AuthClient {
  signup(data: SignupData): Promise<SignupResult>;
  confirmRegistration(username: string, code: string): Promise<boolean>;
  resendConfirmationCode(username: string): Promise<CodeDeliveryDetails>;
  createProfile(idToken: string, data: SignupData): Promise<void>;
  completeSignup(username: string, code: string, signupData: SignupData): Promise<Session>;
  login(data: LoginData): Promise<Session>;
  logout(): Promise<void>;
  getSession(): Session | null;
  isAuthenticated(): boolean;
  getIdToken(): Promise<string | null>;
  refreshSession?(): Promise<Session | null>;
}

const mockClient: AuthClient = {
  signup: async (data) => {
    const session = mockSignup(data);
    return {
      isConfirmed: true,
      session,
      username: data.email || data.phone || 'mock-user',
    };
  },
  confirmRegistration: async () => true,
  resendConfirmationCode: async () => ({
    attributeName: 'email',
    deliveryMedium: 'EMAIL',
    destination: 'demo@example.com',
  }),
  createProfile: async () => {},
  completeSignup: async (_username, _code, data) => mockSignup(data),
  login: async (data) => mockLogin(data),
  logout: async () => mockLogout(),
  getSession: () => getSession(),
  isAuthenticated: () => isAuthenticated(),
  getIdToken: async () => 'mock-id-token',
};

export function getAuthClient(): AuthClient {
  const mode = process.env.NEXT_PUBLIC_AUTH_MODE || 'mock';

  if (mode === 'cognito') {
    return cognitoClient;
  }

  return mockClient;
}

export const authClient = getAuthClient();
