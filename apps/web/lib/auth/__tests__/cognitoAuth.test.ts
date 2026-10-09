import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  CognitoUserPool,
  CognitoUser,
  CognitoUserSession,
  CognitoIdToken,
  CognitoAccessToken,
  ISignUpResult,
} from 'amazon-cognito-identity-js';
import { cognitoClient, formatE164Phone } from '../cognitoAuth';
import type { SignupData } from '../authClient';

describe('Cognito Auth Flow & OTP Verification', () => {
  const originalFetch = globalThis.fetch;
  let originalSignUp: typeof CognitoUserPool.prototype.signUp;
  let originalConfirmRegistration: typeof CognitoUser.prototype.confirmRegistration;
  let originalResendConfirmationCode: typeof CognitoUser.prototype.resendConfirmationCode;
  let originalAuthenticateUser: typeof CognitoUser.prototype.authenticateUser;

  // Sample JWT payload for mocked ID token
  const sampleClaims = {
    sub: 'cognito-sub-12345',
    'custom:role': 'citizen',
    name: 'Ananya Verma',
    email: 'ananya@example.com',
    'custom:language': 'en',
    exp: Math.floor(Date.now() / 1000) + 3600,
  };
  const sampleJwt = `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify(sampleClaims)).toString('base64url')}.mockSignature`;

  function createMockSession(): CognitoUserSession {
    const idToken = new CognitoIdToken({ IdToken: sampleJwt });
    const accessToken = new CognitoAccessToken({ AccessToken: sampleJwt });
    return new CognitoUserSession({
      IdToken: idToken,
      AccessToken: accessToken,
    });
  }

  beforeEach(() => {
    process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID = 'ap-south-1_mockPoolId';
    process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID = 'mockClientId123';
    process.env.NEXT_PUBLIC_API_URL = 'https://api.example.com';

    originalSignUp = CognitoUserPool.prototype.signUp;
    originalConfirmRegistration = CognitoUser.prototype.confirmRegistration;
    originalResendConfirmationCode = CognitoUser.prototype.resendConfirmationCode;
    originalAuthenticateUser = CognitoUser.prototype.authenticateUser;
  });

  afterEach(() => {
    CognitoUserPool.prototype.signUp = originalSignUp;
    CognitoUser.prototype.confirmRegistration = originalConfirmRegistration;
    CognitoUser.prototype.resendConfirmationCode = originalResendConfirmationCode;
    CognitoUser.prototype.authenticateUser = originalAuthenticateUser;
    globalThis.fetch = originalFetch;
  });

  it('normalizes Indian phone numbers to E.164 format', () => {
    assert.equal(formatE164Phone('9876543210'), '+919876543210');
    assert.equal(formatE164Phone('+919876543210'), '+919876543210');
    assert.equal(formatE164Phone('919876543210'), '+919876543210');
    assert.equal(formatE164Phone('+14155552671'), '+14155552671');
  });

  it('1. Signup requiring confirmation returns isConfirmed=false with code delivery details', async () => {
    let signUpCalled = false;
    let authenticateCalled = false;
    let profileFetchCalled = false;

    // Mock signUp returning userConfirmed = false
    CognitoUserPool.prototype.signUp = function (
      _username,
      _password,
      _attributes,
      _validationData,
      callback
    ) {
      signUpCalled = true;
      const mockResult: ISignUpResult = {
        user: new CognitoUser({ Username: 'citizen@example.com', Pool: this }),
        userConfirmed: false,
        userSub: 'sub-citizen-001',
        codeDeliveryDetails: {
          AttributeName: 'email',
          DeliveryMedium: 'EMAIL',
          Destination: 'c***@example.com',
        },
      };
      callback(undefined, mockResult);
    };

    CognitoUser.prototype.authenticateUser = function (_authDetails, callbacks) {
      authenticateCalled = true;
      callbacks.onSuccess(createMockSession());
    };

    globalThis.fetch = (async () => {
      profileFetchCalled = true;
      return new Response(JSON.stringify({ message: 'ok' }), { status: 201 });
    }) as typeof fetch;

    const signupData: SignupData = {
      role: 'citizen',
      name: 'Citizen Tester',
      email: 'citizen@example.com',
      password: 'Password123!',
      language: 'en',
      area_id: 'delhi-anand-vihar',
    };

    const result = await cognitoClient.signup(signupData);

    assert.equal(signUpCalled, true, 'Cognito signUp should have been invoked');
    assert.equal(result.isConfirmed, false, 'Account should require confirmation');
    assert.equal(result.username, 'citizen@example.com');
    assert.equal(result.codeDeliveryDetails?.deliveryMedium, 'EMAIL');
    assert.equal(result.codeDeliveryDetails?.destination, 'c***@example.com');
    assert.equal(authenticateCalled, false, 'Should NOT authenticate while unconfirmed');
    assert.equal(profileFetchCalled, false, 'Should NOT call profile API before verification');
  });

  it('2. Invalid OTP: confirmRegistration throws an error when code is incorrect', async () => {
    CognitoUser.prototype.confirmRegistration = function (_code, _force, callback) {
      const err = new Error('Invalid verification code provided, please try again.');
      err.name = 'CodeMismatchException';
      callback(err);
    };

    await assert.rejects(
      async () => {
        await cognitoClient.confirmRegistration('citizen@example.com', '000000');
      },
      (err: Error) => {
        assert.match(err.message, /Invalid verification code/i);
        return true;
      }
    );
  });

  it('3. Successful confirmation: confirmRegistration succeeds on valid OTP', async () => {
    let capturedCode = '';
    CognitoUser.prototype.confirmRegistration = function (code, _force, callback) {
      capturedCode = code;
      callback(undefined, 'SUCCESS');
    };

    const confirmed = await cognitoClient.confirmRegistration('citizen@example.com', '654321');
    assert.equal(confirmed, true);
    assert.equal(capturedCode, '654321');
  });

  it('4. Resend code: resendConfirmationCode returns delivery details', async () => {
    CognitoUser.prototype.resendConfirmationCode = function (callback) {
      callback(undefined, {
        CodeDeliveryDetails: {
          AttributeName: 'email',
          DeliveryMedium: 'EMAIL',
          Destination: 'c***@example.com',
        },
      });
    };

    const details = await cognitoClient.resendConfirmationCode('citizen@example.com');
    assert.equal(details.attributeName, 'email');
    assert.equal(details.deliveryMedium, 'EMAIL');
    assert.equal(details.destination, 'c***@example.com');
  });

  it('5. Profile creation failure: completeSignup throws and does not silently ignore backend errors', async () => {
    // 1. confirmRegistration succeeds
    CognitoUser.prototype.confirmRegistration = function (_code, _force, callback) {
      callback(undefined, 'SUCCESS');
    };

    // 2. authenticateUser succeeds
    CognitoUser.prototype.authenticateUser = function (_authDetails, callbacks) {
      callbacks.onSuccess(createMockSession());
    };

    // 3. fetch fails with 500
    globalThis.fetch = (async () => {
      return new Response(
        JSON.stringify({ error: { message: 'DynamoDB write failed: database unavailable' } }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }) as typeof fetch;

    const signupData: SignupData = {
      role: 'citizen',
      name: 'Ananya Verma',
      email: 'ananya@example.com',
      password: 'Password123!',
      language: 'en',
      area_id: 'delhi-anand-vihar',
    };

    await assert.rejects(
      async () => {
        await cognitoClient.completeSignup('ananya@example.com', '123456', signupData);
      },
      (err: Error) => {
        assert.match(err.message, /Account verified but profile setup failed/i);
        assert.match(err.message, /DynamoDB write failed/i);
        return true;
      }
    );
  });

  it('6. Already confirmed account: confirmRegistration handles NotAuthorizedException gracefully', async () => {
    CognitoUser.prototype.confirmRegistration = function (_code, _force, callback) {
      const err = new Error('User cannot be confirmed. Current status is CONFIRMED');
      err.name = 'NotAuthorizedException';
      callback(err);
    };

    const result = await cognitoClient.confirmRegistration('citizen@example.com', '123456');
    assert.equal(result, true, 'Should gracefully resolve true when account is already confirmed');
  });

  it('7. Full end-to-end completeSignup: confirm -> sign in -> create profile with valid payload', async () => {
    let confirmCalled = false;
    let authCalled = false;
    let postedPayload: Record<string, unknown> | null = null;
    let authHeader = '';

    CognitoUser.prototype.confirmRegistration = function (_code, _force, callback) {
      confirmCalled = true;
      callback(undefined, 'SUCCESS');
    };

    CognitoUser.prototype.authenticateUser = function (_authDetails, callbacks) {
      authCalled = true;
      callbacks.onSuccess(createMockSession());
    };

    globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
      if (init?.body) {
        postedPayload = JSON.parse(init.body as string);
      }
      authHeader = (init?.headers as Record<string, string>)?.['Authorization'] || '';
      return new Response(JSON.stringify({ success: true }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch;

    const signupData: SignupData = {
      role: 'citizen',
      name: 'Ananya Verma',
      email: 'ananya@example.com',
      password: 'Password123!',
      language: 'en',
      area_id: 'delhi-anand-vihar',
      area_name: 'Anand Vihar Ward 4',
      alert_threshold: 300,
      alert_opt_in: true,
      has_kids: true,
      has_elderly: false,
    };

    const session = await cognitoClient.completeSignup('ananya@example.com', '123456', signupData);

    assert.equal(confirmCalled, true);
    assert.equal(authCalled, true);
    assert.equal(session.is_authenticated, true);
    assert.equal(session.user_id, 'cognito-sub-12345');
    assert.equal(session.role, 'citizen');

    // Verify profile payload matches backend schema:
    // extra='forbid', role and user_id must NOT be in body
    assert.ok(postedPayload, 'Payload must be sent');
    assert.equal(postedPayload?.['role'], undefined, 'role must NOT be in request body');
    assert.equal(postedPayload?.['user_id'], undefined, 'user_id must NOT be in request body');
    assert.equal(postedPayload?.['area_id'], 'delhi-anand-vihar');
    assert.equal(postedPayload?.['area_name'], 'Anand Vihar Ward 4');
    assert.equal(postedPayload?.['name'], 'Ananya Verma');
    assert.equal(postedPayload?.['email'], 'ananya@example.com');
    assert.equal(postedPayload?.['has_kids'], true);
    assert.equal(postedPayload?.['has_elderly'], false);
    assert.equal(authHeader, `Bearer ${sampleJwt}`, 'Authorization header must include ID token');
  });

  it('8. Farmer completeSignup creates profile conforming to FarmerProfileInput schema', async () => {
    let postedPayload: Record<string, unknown> | null = null;

    CognitoUser.prototype.confirmRegistration = function (_code, _force, callback) {
      callback(undefined, 'SUCCESS');
    };

    CognitoUser.prototype.authenticateUser = function (_authDetails, callbacks) {
      callbacks.onSuccess(createMockSession());
    };

    globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
      if (init?.body) {
        postedPayload = JSON.parse(init.body as string);
      }
      return new Response(JSON.stringify({ success: true }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch;

    const farmerData: SignupData = {
      role: 'farmer',
      name: 'Gurpreet Singh',
      phone: '+919876543210',
      password: 'Password123!',
      village_id: 'village-patiala-001',
      village_name: 'Patiala Village 1',
      district: 'Patiala',
      land_size_acres: 10,
      main_crop: 'Paddy (Basmati)',
      crop_stage: 'harvested',
      has_own_machine: true,
      language: 'pa',
    };

    await cognitoClient.completeSignup('+919876543210', '987654', farmerData);

    assert.ok(postedPayload);
    assert.equal(postedPayload?.['role'], undefined);
    assert.equal(postedPayload?.['user_id'], undefined);
    assert.equal(postedPayload?.['village_id'], 'village-patiala-001');
    assert.equal(postedPayload?.['village_name'], 'Patiala Village 1');
    assert.equal(postedPayload?.['district'], 'Patiala');
    assert.equal(postedPayload?.['land_size_acres'], 10);
    assert.equal(postedPayload?.['main_crop'], 'Paddy (Basmati)');
    assert.equal(postedPayload?.['crop_stage'], 'harvested');
    assert.equal(postedPayload?.['has_own_machine'], true);
    assert.equal(postedPayload?.['language'], 'pa');
    assert.equal(postedPayload?.['phone'], '+919876543210');
  });
});
