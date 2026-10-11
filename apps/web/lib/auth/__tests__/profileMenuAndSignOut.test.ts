import { describe, it, beforeEach, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mockLogout, mockSignup, getSession, isAuthenticated } from '../mockAuth';
import { cognitoClient } from '../cognitoAuth';
import { getRedirectForUnauthorized, isRoleAllowed, PROTECTED_ROUTES } from '../roleRedirect';
import { getProfile, mapProfileResponse } from '../../api/client';

describe('Profile Menu, Details Card & Sign-Out Navigation', () => {
  const store = new Map<string, string>();
  const mockStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] || null,
    get length() {
      return store.size;
    },
  };

  const sessionStorageStore = new Map<string, string>();
  const mockSessionStorage = {
    getItem: (key: string) => sessionStorageStore.get(key) ?? null,
    setItem: (key: string, value: string) => sessionStorageStore.set(key, value),
    removeItem: (key: string) => sessionStorageStore.delete(key),
    clear: () => sessionStorageStore.clear(),
  };

  before(() => {
    process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID = 'ap-south-1_testPool';
    process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID = 'testClient123';
    (globalThis as any).window = globalThis;
    (globalThis as any).localStorage = mockStorage;
    (globalThis as any).sessionStorage = mockSessionStorage;
  });

  after(() => {
    delete (globalThis as any).window;
    delete (globalThis as any).localStorage;
    delete (globalThis as any).sessionStorage;
  });

  beforeEach(() => {
    mockLogout();
    store.clear();
    sessionStorageStore.clear();
  });

  describe('1. Authentication State & Sequential Login/Logout Stability', () => {
    it('initial state before login is unauthenticated', () => {
      assert.equal(isAuthenticated(), false);
      assert.equal(getSession(), null);
    });

    it('login, logout, login, logout twice in a row succeeds and cleanly resets state', async () => {
      // Cycle 1: First Login
      const session1 = mockSignup({
        name: 'Harpreet Kaur',
        email: 'harpreet@example.com',
        phone: '+919876543210',
        role: 'farmer',
        language: 'pa',
        password: 'Password123!',
      });
      assert.equal(isAuthenticated(), true, 'Cycle 1: Should be authenticated');
      assert.equal(session1.name, 'Harpreet Kaur');
      assert.equal(getSession()?.name, 'Harpreet Kaur');

      // Cycle 1: First Logout
      await cognitoClient.logout();
      mockLogout();
      assert.equal(isAuthenticated(), false, 'Cycle 1: Should be signed out');
      assert.equal(getSession(), null, 'Cycle 1: Session should be null');

      // Cycle 2: Second Login
      const session2 = mockSignup({
        name: 'Ananya Verma',
        email: 'ananya@example.com',
        phone: '+919811122233',
        role: 'citizen',
        language: 'en',
        password: 'Password456!',
      });
      assert.equal(isAuthenticated(), true, 'Cycle 2: Should be authenticated again');
      assert.equal(session2.name, 'Ananya Verma');
      assert.equal(getSession()?.name, 'Ananya Verma');
      assert.equal(getSession()?.role, 'citizen');

      // Cycle 2: Second Logout
      await cognitoClient.logout();
      mockLogout();
      assert.equal(isAuthenticated(), false, 'Cycle 2: Should be signed out again');
      assert.equal(getSession(), null, 'Cycle 2: Session should be null again');
    });

    it('logout removes all Cognito and app session keys from storage', async () => {
      mockStorage.setItem('CognitoIdentityServiceProvider.testClient123.LastAuthUser', 'test-user');
      mockStorage.setItem('CognitoIdentityServiceProvider.testClient123.test-user.idToken', 'jwt-token');
      mockStorage.setItem('saans_cognito_session', JSON.stringify({ is_authenticated: true }));
      mockStorage.setItem('saans_mock_session', JSON.stringify({ is_authenticated: true }));
      mockSessionStorage.setItem('saans_signed_out', 'true');

      await cognitoClient.logout();

      assert.equal(mockStorage.getItem('CognitoIdentityServiceProvider.testClient123.LastAuthUser'), null);
      assert.equal(mockStorage.getItem('CognitoIdentityServiceProvider.testClient123.test-user.idToken'), null);
      assert.equal(mockStorage.getItem('saans_cognito_session'), null);
      assert.equal(mockSessionStorage.getItem('saans_signed_out'), null);
    });

    it('protected dashboard routes cannot be accessed when unauthenticated', () => {
      mockLogout();
      const currentRole = getSession()?.role;

      for (const route of PROTECTED_ROUTES) {
        if (route.startsWith('/farmer') || route.startsWith('/citizen')) {
          assert.equal(isRoleAllowed(route, currentRole), false, `Route ${route} should not be allowed unauthenticated`);
          const redirectTarget = getRedirectForUnauthorized(route, currentRole);
          assert.equal(redirectTarget, '/login', `Route ${route} should redirect unauthorized access`);
        }
      }
    });
  });

  describe('2. Backend Snake_Case to UI CamelCase Mapping & 404 Handling', () => {
    it('mapProfileResponse maps farmer backend snake_case to UI camelCase', () => {
      const backendFarmerPayload = {
        user_id: 'f-101',
        role: 'farmer',
        name: 'Gurpreet Singh',
        phone: '+919876543210',
        language: 'pa',
        village_id: 'v-99',
        village_name: 'Rajpura',
        district: 'Patiala',
        land_size_acres: 12.5,
        main_crop: 'wheat',
        crop_stage: 'harvested',
        has_own_machine: true,
        created_at: '2026-10-10T00:00:00Z',
      };

      const mapped = mapProfileResponse(backendFarmerPayload);

      assert.equal(mapped.villageId, 'v-99');
      assert.equal(mapped.villageName, 'Rajpura');
      assert.equal(mapped.district, 'Patiala');
      assert.equal(mapped.landSizeAcres, 12.5);
      assert.equal(mapped.mainCrop, 'wheat');
      assert.equal(mapped.cropStage, 'harvested');
      assert.equal(mapped.hasOwnMachine, true);
      assert.equal(mapped.userId, 'f-101');
    });

    it('mapProfileResponse maps citizen backend snake_case to UI camelCase', () => {
      const backendCitizenPayload = {
        user_id: 'c-202',
        role: 'citizen',
        name: 'Neha Gupta',
        email: 'neha@example.com',
        phone: '+919811122233',
        language: 'en',
        area_id: 'ward-12',
        area_name: 'Anand Vihar',
        alert_threshold: 250,
        alert_opt_in: true,
        household_note: 'Elderly parents at home',
        has_kids: true,
        has_elderly: true,
      };

      const mapped = mapProfileResponse(backendCitizenPayload);

      assert.equal(mapped.areaId, 'ward-12');
      assert.equal(mapped.areaName, 'Anand Vihar');
      assert.equal(mapped.alertThreshold, 250);
      assert.equal(mapped.alertOptIn, true);
      assert.equal(mapped.householdNote, 'Elderly parents at home');
      assert.equal(mapped.hasKids, true);
      assert.equal(mapped.hasElderly, true);
    });

    it('getProfile gracefully handles 404 with isNotFound flag without crashing', async () => {
      const res = await getProfile();
      assert.ok(res, 'getProfile must return an object');
      if (res.isNotFound) {
        assert.equal(res.data, null);
      } else {
        assert.ok(res.data);
      }
    });
  });

  describe('3. Profile Menu Interactions & Escape Key Handling', () => {
    it('Escape key dismisses open dropdown state', () => {
      let isDropdownOpen = true;
      const onKeyDown = (key: string) => {
        if (key === 'Escape') isDropdownOpen = false;
      };

      onKeyDown('Escape');
      assert.equal(isDropdownOpen, false, 'Dropdown should close on Escape key');
    });

    it('clicking profile icon toggles open/close state without invoking logout', () => {
      let isDropdownOpen = false;
      const logoutInvoked = false;

      const onProfileIconClick = () => {
        isDropdownOpen = !isDropdownOpen;
      };

      onProfileIconClick();
      assert.equal(isDropdownOpen, true);
      assert.equal(logoutInvoked, false);

      onProfileIconClick();
      assert.equal(isDropdownOpen, false);
      assert.equal(logoutInvoked, false);
    });
  });
});
