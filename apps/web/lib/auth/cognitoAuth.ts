/**
 * AWS Cognito Auth Client Implementation using amazon-cognito-identity-js (SRP).
 * Selected when NEXT_PUBLIC_AUTH_MODE=cognito.
 */

import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute,
  CognitoUserSession,
  ISignUpResult,
} from 'amazon-cognito-identity-js';
import type { AuthClient, SignupData, LoginData, SignupResult, CodeDeliveryDetails } from './authClient';
import type { Session, Role, Language } from '../types';
import { API_ENDPOINTS } from '../api/endpoints';

const COGNITO_SESSION_STORAGE_KEY = 'saans_cognito_session';

function getUserPool(): CognitoUserPool {
  const userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || '';
  const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '';
  return new CognitoUserPool({
    UserPoolId: userPoolId,
    ClientId: clientId,
  });
}

/**
 * Normalizes Indian phone number to E.164 format (+91...)
 */
export function formatE164Phone(phone: string): string {
  const digits = phone.trim().replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) {
    return digits;
  }
  if (digits.startsWith('91') && digits.length === 12) {
    return `+${digits}`;
  }
  if (digits.length === 10) {
    return `+91${digits}`;
  }
  return `+${digits}`;
}

function parseJwt(token: string): Record<string, unknown> | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

function extractSessionFromCognito(
  userSession: CognitoUserSession,
  fallbackName?: string,
  fallbackLanguage?: Language
): Session {
  const idToken = userSession.getIdToken();
  const jwt = idToken.getJwtToken();
  const payload = idToken.decodePayload() || {};

  const role = (payload['custom:role'] || 'citizen') as Role;
  const userId = (payload.sub as string) || '';
  const name = (payload.name as string) || fallbackName || '';
  const email = payload.email as string | undefined;
  const phone = (payload.phone_number as string) || undefined;
  const language = (payload['custom:language'] as Language) || fallbackLanguage || 'en';

  return {
    user_id: userId,
    role,
    name,
    email,
    phone,
    language,
    is_authenticated: true,
    idToken: jwt,
  };
}

function saveStoredSession(session: Session): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(COGNITO_SESSION_STORAGE_KEY, JSON.stringify(session));
  }
}

function clearStoredSession(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(COGNITO_SESSION_STORAGE_KEY);
  }
}

export const cognitoClient: AuthClient = {
  async signup(data: SignupData): Promise<SignupResult> {
    const userPool = getUserPool();

    const normalizedEmail = data.email ? data.email.trim() : undefined;
    const normalizedPhone = data.phone ? formatE164Phone(data.phone) : undefined;

    if (!normalizedEmail && !normalizedPhone) {
      throw new Error('Please provide either an email or a valid phone number for registration.');
    }

    // Username in Cognito pool can be email or phone
    const username = normalizedEmail || normalizedPhone!;

    // 1. Build Cognito User Attributes
    const attributeList: CognitoUserAttribute[] = [
      new CognitoUserAttribute({ Name: 'custom:role', Value: data.role }),
      new CognitoUserAttribute({ Name: 'name', Value: data.name }),
    ];

    if (normalizedEmail) {
      attributeList.push(new CognitoUserAttribute({ Name: 'email', Value: normalizedEmail }));
    }
    if (normalizedPhone) {
      attributeList.push(new CognitoUserAttribute({ Name: 'phone_number', Value: normalizedPhone }));
    }

    // 2. Perform Cognito SignUp
    const signUpResult = await new Promise<ISignUpResult>((resolve, reject) => {
      userPool.signUp(username, data.password, attributeList, [], (err, result) => {
        if (err) {
          reject(new Error(err.message || 'Cognito signup failed'));
        } else if (!result) {
          reject(new Error('Signup failed: No result returned from Cognito.'));
        } else {
          resolve(result);
        }
      });
    });

    const codeDeliveryDetails: CodeDeliveryDetails | undefined = signUpResult.codeDeliveryDetails
      ? {
          attributeName: signUpResult.codeDeliveryDetails.AttributeName,
          deliveryMedium: signUpResult.codeDeliveryDetails.DeliveryMedium,
          destination: signUpResult.codeDeliveryDetails.Destination,
        }
      : undefined;

    // 3. Inspect actual confirmation status
    if (signUpResult.userConfirmed) {
      // Auto-confirmed (e.g. by pre-signup Lambda trigger)
      const session = await this.login({
        email: username,
        password: data.password,
      });

      if (!session.idToken) {
        throw new Error('Authentication succeeded but ID token is missing for profile initialization.');
      }

      await this.createProfile(session.idToken, data);

      return {
        isConfirmed: true,
        session,
        username,
        codeDeliveryDetails,
      };
    }

    // Confirmation is required (e.g. email OTP verification sent)
    return {
      isConfirmed: false,
      username,
      codeDeliveryDetails,
    };
  },

  async confirmRegistration(username: string, code: string): Promise<boolean> {
    const userPool = getUserPool();
    const cognitoUser = new CognitoUser({
      Username: username,
      Pool: userPool,
    });

    return new Promise((resolve, reject) => {
      cognitoUser.confirmRegistration(code.trim(), true, (err) => {
        if (err) {
          const errMsg = err.message || '';
          const errName = err.name || '';
          // Gracefully handle account already confirmed
          if (
            (errName === 'NotAuthorizedException' && errMsg.includes('CONFIRMED')) ||
            errMsg.toLowerCase().includes('already confirmed')
          ) {
            resolve(true);
            return;
          }
          reject(new Error(errMsg || 'Verification failed. Please check the code.'));
        } else {
          resolve(true);
        }
      });
    });
  },

  async resendConfirmationCode(username: string): Promise<CodeDeliveryDetails> {
    const userPool = getUserPool();
    const cognitoUser = new CognitoUser({
      Username: username,
      Pool: userPool,
    });

    return new Promise((resolve, reject) => {
      cognitoUser.resendConfirmationCode((err, result) => {
        if (err) {
          reject(new Error(err.message || 'Failed to resend confirmation code.'));
        } else {
          const details = result?.CodeDeliveryDetails || {};
          resolve({
            attributeName: details.AttributeName,
            deliveryMedium: details.DeliveryMedium,
            destination: details.Destination,
          });
        }
      });
    });
  },

  async createProfile(idToken: string, data: SignupData): Promise<void> {
    const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api').replace(/\/+$/, '');
    const profileUrl = `${apiBaseUrl}${API_ENDPOINTS.AUTH.PROFILE}`;

    const normalizedEmail = data.email ? data.email.trim() : undefined;
    const normalizedPhone = data.phone ? formatE164Phone(data.phone) : undefined;

    // Explicitly omit role and user_id from profile payload as required by API
    let profilePayload: Record<string, unknown>;

    if (data.role === 'farmer') {
      profilePayload = {
        village_id: data.village_id || 'village-patiala-001',
        ...(data.village_name ? { village_name: data.village_name } : {}),
        district: data.district || 'Patiala',
        land_size_acres: data.land_size_acres !== undefined ? Number(data.land_size_acres) : 5,
        main_crop: data.main_crop || 'Paddy (Basmati)',
        crop_stage: data.crop_stage || 'harvested',
        has_own_machine: Boolean(data.has_own_machine),
        language: data.language || 'pa',
        name: data.name,
        ...(normalizedPhone ? { phone: normalizedPhone } : {}),
      };
    } else {
      profilePayload = {
        area_id: data.area_id || 'delhi-anand-vihar',
        ...(data.area_name ? { area_name: data.area_name } : {}),
        language: data.language || 'en',
        ...(data.alert_threshold !== undefined ? { alert_threshold: Number(data.alert_threshold) } : {}),
        ...(data.alert_opt_in !== undefined ? { alert_opt_in: Boolean(data.alert_opt_in) } : {}),
        ...(data.household_note ? { household_note: data.household_note } : {}),
        has_kids: Boolean(data.has_kids),
        has_elderly: Boolean(data.has_elderly),
        name: data.name,
        ...(normalizedEmail ? { email: normalizedEmail } : {}),
        ...(normalizedPhone ? { phone: normalizedPhone } : {}),
      };
    }

    try {
      const response = await fetch(profileUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(profilePayload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errDetail = errorData?.error?.message || `Status ${response.status}`;
        throw new Error(`Profile initialization failed: ${errDetail}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save profile';
      throw new Error(`Account verified but profile setup failed: ${msg}`);
    }
  },

  async completeSignup(username: string, code: string, signupData: SignupData): Promise<Session> {
    // 1. Confirm account with OTP (or handle already confirmed)
    await this.confirmRegistration(username, code);

    // 2. Sign in via SRP
    // Use the alias (email or phone) from signupData if available to ensure LastAuthUser matches manual login
    const loginUsername = signupData.email || signupData.phone || username;
    const session = await this.login({
      email: loginUsername,
      password: signupData.password,
    });

    if (!session.idToken) {
      throw new Error('Authentication succeeded but ID token is missing for profile initialization.');
    }

    // 3. Create role-specific profile via POST /v1/auth/profile
    await this.createProfile(session.idToken, signupData);

    return session;
  },

  async login(data: LoginData): Promise<Session> {
    const userPool = getUserPool();
    const rawInput = data.email.trim();

    // Check if input is a phone number or email
    const isPhone = !rawInput.includes('@') && /^[+\d\s-]+$/.test(rawInput);
    const username = isPhone ? formatE164Phone(rawInput) : rawInput;

    const authDetails = new AuthenticationDetails({
      Username: username,
      Password: data.password,
    });
    const cognitoUser = new CognitoUser({
      Username: username,
      Pool: userPool,
    });

    const userSession = await new Promise<CognitoUserSession>((resolve, reject) => {
      cognitoUser.authenticateUser(authDetails, {
        onSuccess: (session) => resolve(session),
        onFailure: (err) => {
          if (err && (err.code === 'UserNotConfirmedException' || err.name === 'UserNotConfirmedException')) {
            reject(new Error('User is not confirmed. Please verify your account with the code sent to your email.'));
          } else {
            reject(new Error(err.message || 'Login failed. Please check your credentials.'));
          }
        },
      });
    });

    const session = extractSessionFromCognito(userSession);
    saveStoredSession(session);
    return session;
  },

  async logout(): Promise<void> {
    const userPool = getUserPool();
    const currentUser = userPool.getCurrentUser();
    if (currentUser) {
      currentUser.signOut();
    }
    clearStoredSession();
  },

  getSession(): Session | null {
    if (typeof window === 'undefined') return null;

    try {
      const raw = localStorage.getItem(COGNITO_SESSION_STORAGE_KEY);
      if (!raw) return null;
      const session = JSON.parse(raw) as Session;

      if (session.idToken) {
        const payload = parseJwt(session.idToken);
        if (payload && typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now()) {
          // Token expired, clear cached session
          clearStoredSession();
          return null;
        }
      }

      return session;
    } catch {
      return null;
    }
  },

  isAuthenticated(): boolean {
    const session = this.getSession();
    return Boolean(session?.is_authenticated);
  },

  async getIdToken(): Promise<string | null> {
    const userPool = getUserPool();
    const currentUser = userPool.getCurrentUser();

    if (!currentUser) {
      const stored = this.getSession();
      return stored?.idToken || null;
    }

    return new Promise((resolve) => {
      currentUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
        if (err || !session || !session.isValid()) {
          resolve(null);
        } else {
          const token = session.getIdToken().getJwtToken();
          const currentStored = this.getSession();
          if (currentStored) {
            currentStored.idToken = token;
            saveStoredSession(currentStored);
          }
          resolve(token);
        }
      });
    });
  },

  async refreshSession(): Promise<Session | null> {
    const userPool = getUserPool();
    const currentUser = userPool.getCurrentUser();

    if (!currentUser) {
      return this.getSession();
    }

    return new Promise((resolve) => {
      currentUser.getSession((err: Error | null, userSession: CognitoUserSession | null) => {
        if (err || !userSession || !userSession.isValid()) {
          this.logout();
          resolve(null);
        } else {
          const session = extractSessionFromCognito(userSession);
          saveStoredSession(session);
          resolve(session);
        }
      });
    });
  },
};
