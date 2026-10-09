'use client';

/**
 * React hook for auth session management.
 */

import { useState, useEffect, useCallback } from 'react';
import type { Session } from '@/lib/types';
import { authClient, type SignupData, type LoginData } from './authClient';

export function useSession() {
  const [session, setSession] = useState<Session | null>(() => authClient.getSession());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    if (authClient.refreshSession) {
      authClient
        .refreshSession()
        .then((refreshed) => {
          if (active) {
            setSession(refreshed);
            setLoading(false);
          }
        })
        .catch(() => {
          if (active) {
            setLoading(false);
          }
        });
    } else {
      setLoading(false);
    }

    return () => {
      active = false;
    };
  }, []);

  const signup = useCallback(async (data: SignupData) => {
    setLoading(true);
    try {
      const res = await authClient.signup(data);
      if (res.isConfirmed && res.session) {
        setSession(res.session);
      }
      return res;
    } finally {
      setLoading(false);
    }
  }, []);

  const confirmRegistration = useCallback(async (username: string, code: string) => {
    setLoading(true);
    try {
      return await authClient.confirmRegistration(username, code);
    } finally {
      setLoading(false);
    }
  }, []);

  const resendConfirmationCode = useCallback(async (username: string) => {
    return await authClient.resendConfirmationCode(username);
  }, []);

  const completeSignup = useCallback(async (username: string, code: string, signupData: SignupData) => {
    setLoading(true);
    try {
      const s = await authClient.completeSignup(username, code, signupData);
      setSession(s);
      return s;
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (data: LoginData) => {
    setLoading(true);
    try {
      const s = await authClient.login(data);
      setSession(s);
      return s;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await authClient.logout();
    setSession(null);
  }, []);

  return {
    session,
    loading,
    isAuthenticated: session?.is_authenticated ?? false,
    signup,
    confirmRegistration,
    resendConfirmationCode,
    completeSignup,
    login,
    logout,
  };
}
