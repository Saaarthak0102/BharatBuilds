'use client';

import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { LuUser, LuLogOut } from 'react-icons/lu';
import { useSession, setSigningOut } from '@/lib/auth/useSession';
import { getProfile } from '@/lib/api/client';
import { ProfileCard } from './ProfileCard';
import type { Role } from '@/lib/types';

interface ProfileMenuProps {
  role: Role;
}

export function ProfileMenu({ role }: ProfileMenuProps) {
  const { session, logout } = useSession();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [fetchedName, setFetchedName] = useState<string>('');

  const menuRef = useRef<HTMLDivElement>(null);
  const avatarButtonRef = useRef<HTMLButtonElement>(null);
  const wasProfileOpenRef = useRef(false);

  // Restore focus to avatar button when profile card closes
  useEffect(() => {
    if (!isProfileOpen && wasProfileOpenRef.current) {
      avatarButtonRef.current?.focus();
    }
    wasProfileOpenRef.current = isProfileOpen;
  }, [isProfileOpen]);

  // If session name is empty or matches the role string, fetch real name from profile
  useEffect(() => {
    const isGenericName =
      !session?.name ||
      session.name.toLowerCase() === role.toLowerCase() ||
      session.name === 'User';

    if (isGenericName) {
      getProfile()
        .then((res) => {
          if (res?.data?.name) {
            setFetchedName(res.data.name);
          }
        })
        .catch(() => {});
    }
  }, [session?.name, role]);

  // Close dropdown on click outside
  useEffect(() => {
    if (!isDropdownOpen) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Close dropdown on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isDropdownOpen) setIsDropdownOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDropdownOpen]);

  const handleSignOut = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    setLogoutError(null);

    // 3-second safety timeout that guarantees cleanup & hard navigation anyway
    const safetyTimer = setTimeout(() => {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('saans_signed_out');
        window.location.replace('/');
      }
    }, 3000);

    try {
      setSigningOut(true);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('saans_signed_out', 'true');
      }
      await logout();
      clearTimeout(safetyTimer);
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('saans_signed_out');
        window.location.replace('/');
      }
    } catch (err) {
      clearTimeout(safetyTimer);
      console.warn('Sign out operation encountered an error, forcing navigation:', err);
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('saans_signed_out');
        window.location.replace('/');
      }
    } finally {
      setIsLoggingOut(false);
      setIsDropdownOpen(false);
      setIsProfileOpen(false);
    }
  };

  const effectiveRole = session?.role || role;
  const roleTitle = effectiveRole === 'farmer' ? 'Farmer' : effectiveRole === 'citizen' ? 'Citizen' : effectiveRole;

  // Real display name: prioritize specific session name, then fetched profile name, then email/phone prefix
  const rawSessionName = session?.name;
  const isGeneric = !rawSessionName || rawSessionName.toLowerCase() === roleTitle.toLowerCase() || rawSessionName === 'User';
  const displayName = (!isGeneric ? rawSessionName : null) || fetchedName || (session?.email ? session.email.split('@')[0] : '') || (session?.phone || 'Account User');
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="relative" ref={menuRef}>
      {/* Profile Avatar Trigger Button */}
      <button
        ref={avatarButtonRef}
        type="button"
        onClick={() => setIsDropdownOpen((prev) => !prev)}
        aria-haspopup="true"
        aria-expanded={isDropdownOpen}
        aria-label="User profile and account menu"
        className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-medium hover:opacity-80 transition-opacity cursor-pointer text-xs focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
      >
        {initial}
      </button>

      {/* Anchored Dropdown Menu */}
      {isDropdownOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 top-full mt-2 w-56 max-w-[calc(100vw-2rem)] rounded-xl bg-[var(--bg-1)] border border-[var(--border)] shadow-2xl py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150"
        >
          {/* User Mini Identity Header */}
          <div className="px-3.5 py-2 border-b border-[var(--border)]">
            <div className="text-sm font-semibold text-[var(--text-hi)] truncate">{displayName}</div>
            <div className="text-xs text-[var(--text-low)] capitalize mt-0.5">{roleTitle} Account</div>
          </div>

          {/* Action 1: Profile */}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setIsDropdownOpen(false);
              setIsProfileOpen(true);
            }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-[var(--text-hi)] hover:bg-[var(--bg-2)] transition-colors text-left cursor-pointer interactive-quiet"
          >
            <LuUser className="w-4 h-4 text-[var(--text-mid)] shrink-0" />
            <span>Profile</span>
          </button>

          {/* Action 2: Sign Out */}
          <button
            type="button"
            role="menuitem"
            disabled={isLoggingOut}
            onClick={handleSignOut}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-950/30 transition-colors text-left cursor-pointer disabled:opacity-50 interactive-quiet"
          >
            {isLoggingOut ? (
              <>
                <span className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin shrink-0" />
                <span>Signing out...</span>
              </>
            ) : (
              <>
                <LuLogOut className="w-4 h-4 text-red-400 shrink-0" />
                <span>Sign Out</span>
              </>
            )}
          </button>

          {/* Sign-out Error Feedback */}
          {logoutError && (
            <div className="mx-2 mt-1 px-2.5 py-1.5 rounded bg-red-950/60 border border-red-900/50 text-[11px] text-red-300">
              {logoutError}
            </div>
          )}
        </div>
      )}

      {/* Compact Read-Only Profile Details Card Modal */}
      <ProfileCard
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        role={role}
      />
    </div>
  );
}
