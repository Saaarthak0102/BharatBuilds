'use client';

/**
 * React hook for auth session management.
 */

import { useState, useEffect, useCallback } from 'react';
import type { Session } from '@/lib/types';
import { authClient, type SignupData, type LoginData } from './authClient';

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const s = authClient.getSession();
    setSession(s);
    setLoading(false);
  }, []);

  const signup = useCallback(async (data: SignupData) => {
    setLoading(true);
    try {
      const s = await authClient.signup(data);
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
    login,
    logout,
  };
}
