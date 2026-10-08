/**
 * Cognito auth client stub.
 * TODO: Implement with AWS Amplify Auth or amazon-cognito-identity-js.
 */

import type { AuthClient, SignupData, LoginData } from './authClient';
import type { Session } from '@/lib/types';

export const cognitoClient: AuthClient = {
  async signup(data: SignupData): Promise<Session> {
    // TODO: Call Cognito signUp with custom:role attribute
    // 1. cognito.signUp({ username, password, attributes: { 'custom:role': data.role } })
    // 2. Store role-specific profile via POST /v1/auth/profile
    // 3. Return session from JWT claims
    throw new Error('Cognito signup not implemented. Set NEXT_PUBLIC_AUTH_MODE=mock for development.');
  },

  async login(data: LoginData): Promise<Session> {
    // TODO: Call Cognito signIn
    // 1. cognito.signIn({ username: data.email, password: data.password })
    // 2. Parse JWT, extract custom:role
    // 3. Return session
    throw new Error('Cognito login not implemented. Set NEXT_PUBLIC_AUTH_MODE=mock for development.');
  },

  async logout(): Promise<void> {
    // TODO: Call Cognito signOut
    throw new Error('Cognito logout not implemented.');
  },

  getSession(): Session | null {
    // TODO: Check Cognito session, parse JWT
    return null;
  },

  isAuthenticated(): boolean {
    // TODO: Check if valid Cognito session exists
    return false;
  },
};
