/**
 * Role-based redirect utility.
 * Used by middleware and client-side route guards.
 */

import type { Role } from '@/lib/types';

export function getDashboardPath(role: Role): string {
  return role === 'farmer' ? '/farmer' : '/citizen';
}

export function isRoleAllowed(path: string, role: Role | undefined): boolean {
  if (path.startsWith('/farmer')) return role === 'farmer';
  if (path.startsWith('/citizen')) return role === 'citizen';
  if (path === '/map' || path === '/profile') return role !== undefined;
  return true; // Public routes
}

export function getRedirectForUnauthorized(path: string, role: Role | undefined): string | null {
  if (!role) return '/login';

  if (path.startsWith('/farmer') && role !== 'farmer') {
    return '/citizen';
  }
  if (path.startsWith('/citizen') && role !== 'citizen') {
    return '/farmer';
  }

  return null;
}

/** Routes that require authentication */
export const PROTECTED_ROUTES = ['/farmer', '/citizen', '/map', '/profile'];

/** Routes that should redirect authenticated users */
export const AUTH_ROUTES = ['/login', '/signup'];
