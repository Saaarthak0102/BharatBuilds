'use client';

import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { LuX, LuMail, LuPhone, LuGlobe, LuRefreshCw, LuInbox } from 'react-icons/lu';
import { useSession } from '@/lib/auth/useSession';
import { getProfile, type MappedProfile } from '@/lib/api/client';
import type { Role } from '@/lib/types';

interface ProfileCardProps {
  isOpen: boolean;
  onClose: () => void;
  role?: Role;
}

export function ProfileCard({ isOpen, onClose, role }: ProfileCardProps) {
  const { session } = useSession();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extendedProfile, setExtendedProfile] = useState<MappedProfile | null>(null);
  const [isProfileMissing, setIsProfileMissing] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIsProfileMissing(false);
    try {
      const res = await getProfile();
      if (res.isNotFound) {
        setIsProfileMissing(true);
        setExtendedProfile(null);
      } else if (res && res.data) {
        setExtendedProfile(res.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to profile service.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchProfile();
    }
  }, [isOpen, fetchProfile]);

  // Lock body scroll while open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  const effectiveRole = session?.role || role || 'citizen';
  const isFarmer = effectiveRole === 'farmer';

  // Real display name resolution: never use generic "Farmer" or "User"
  const candidateName =
    (session?.name && session.name.toLowerCase() !== effectiveRole.toLowerCase() && session.name !== 'User')
      ? session.name
      : extendedProfile?.name;

  const displayName = candidateName || (session?.email ? session.email.split('@')[0] : '') || (session?.phone || 'Account User');
  const displayEmail = session?.email || extendedProfile?.email;
  const displayPhone = session?.phone || extendedProfile?.phone;
  const displayLanguage = session?.language || extendedProfile?.language || 'en';

  const roleLabel =
    effectiveRole === 'farmer'
      ? 'Farmer'
      : effectiveRole === 'citizen'
      ? 'Citizen'
      : effectiveRole === 'official'
      ? 'Official'
      : 'Admin';

  const languageLabel =
    displayLanguage === 'pa'
      ? 'ਪੰਜਾਬੀ (Punjabi)'
      : displayLanguage === 'hi'
      ? 'हिंदी (Hindi)'
      : 'English';

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-card-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-[var(--bg-1)] border border-[var(--border)] p-5 sm:p-6 shadow-2xl text-[var(--text-hi)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-[var(--accent)]/15 border border-[var(--accent)]/30 flex items-center justify-center text-[var(--accent)] font-bold text-lg select-none shrink-0">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h2 id="profile-card-title" className="text-lg font-bold text-[var(--text-hi)] leading-tight truncate">
                {displayName}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20">
                  {roleLabel}
                </span>
                <span className="text-xs text-[var(--text-low)] flex items-center gap-1 truncate">
                  <LuGlobe className="w-3 h-3 shrink-0" />
                  {languageLabel}
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close profile card"
            className="p-1.5 rounded-lg text-[var(--text-low)] hover:text-[var(--text-hi)] hover:bg-[var(--bg-2)] transition-colors cursor-pointer shrink-0"
          >
            <LuX className="w-5 h-5" />
          </button>
        </div>

        {/* Core Account Details */}
        <div className="py-4 space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-mid)]">
            Account Information
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="p-3 rounded-xl bg-[var(--bg-0)] border border-[var(--border)]">
              <div className="flex items-center gap-1.5 text-xs text-[var(--text-low)] mb-1">
                <LuMail className="w-3.5 h-3.5 shrink-0" />
                <span>Email</span>
              </div>
              <div className="text-sm font-medium text-[var(--text-hi)] truncate">
                {displayEmail || <span className="text-[var(--text-low)] italic text-xs">Not provided</span>}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[var(--bg-0)] border border-[var(--border)]">
              <div className="flex items-center gap-1.5 text-xs text-[var(--text-low)] mb-1">
                <LuPhone className="w-3.5 h-3.5 shrink-0" />
                <span>Phone</span>
              </div>
              <div className="text-sm font-medium text-[var(--text-hi)] truncate">
                {displayPhone || <span className="text-[var(--text-low)] italic text-xs">Not provided</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Extended Role-Specific Details */}
        <div className="pt-2 border-t border-[var(--border)] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-mid)]">
              {isFarmer ? 'Farm & Regional Profile' : 'Citizen Air Watch Profile'}
            </span>
            {loading && (
              <span className="flex items-center gap-1.5 text-xs text-[var(--text-low)] animate-pulse">
                <span className="w-2.5 h-2.5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                Syncing...
              </span>
            )}
          </div>

          {/* Loading Skeleton */}
          {loading && !extendedProfile && !error && !isProfileMissing && (
            <div className="p-4 rounded-xl bg-[var(--bg-0)] border border-[var(--border)] animate-pulse space-y-2">
              <div className="h-4 bg-[var(--bg-2)] rounded w-3/4" />
              <div className="h-3 bg-[var(--bg-2)] rounded w-1/2" />
            </div>
          )}

          {/* 404 Not Found Calm State */}
          {isProfileMissing && !loading && (
            <div className="p-4 rounded-xl bg-[var(--bg-0)] border border-[var(--border)] text-center py-5 space-y-1.5">
              <LuInbox className="w-6 h-6 text-[var(--text-low)] mx-auto opacity-70" />
              <div className="text-sm font-medium text-[var(--text-hi)]">
                Profile details not saved yet
              </div>
              <p className="text-xs text-[var(--text-low)] max-w-xs mx-auto">
                Additional {isFarmer ? 'farm and equipment' : 'household and air monitoring'} details will appear here once saved.
              </p>
            </div>
          )}

          {/* Error Banner with Retry */}
          {error && !isProfileMissing && (
            <div className="p-3 rounded-xl bg-red-950/30 border border-red-900/40 text-xs text-red-200 flex items-center justify-between gap-2">
              <span className="truncate">{error}</span>
              <button
                type="button"
                onClick={fetchProfile}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-red-900/60 hover:bg-red-800 text-xs font-semibold text-white shrink-0 transition-colors cursor-pointer"
              >
                <LuRefreshCw className="w-3 h-3" />
                Retry
              </button>
            </div>
          )}

          {/* Farmer Fields (Rendered when profile exists) */}
          {isFarmer && extendedProfile && !isProfileMissing && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-[var(--bg-0)] border border-[var(--border)]">
                <div className="text-[var(--text-low)] text-[11px] mb-0.5">Village / Area</div>
                <div className="font-medium text-[var(--text-hi)] truncate">
                  {extendedProfile.villageName || extendedProfile.villageId || <span className="text-[var(--text-low)] italic">Not provided</span>}
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-[var(--bg-0)] border border-[var(--border)]">
                <div className="text-[var(--text-low)] text-[11px] mb-0.5">District</div>
                <div className="font-medium text-[var(--text-hi)] truncate">
                  {extendedProfile.district || <span className="text-[var(--text-low)] italic">Not provided</span>}
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-[var(--bg-0)] border border-[var(--border)]">
                <div className="text-[var(--text-low)] text-[11px] mb-0.5">Land Size</div>
                <div className="font-medium text-[var(--text-hi)]">
                  {extendedProfile.landSizeAcres !== undefined
                    ? String(extendedProfile.landSizeAcres) + ' Acres'
                    : <span className="text-[var(--text-low)] italic">Not provided</span>}
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-[var(--bg-0)] border border-[var(--border)]">
                <div className="text-[var(--text-low)] text-[11px] mb-0.5">Main Crop</div>
                <div className="font-medium text-[var(--text-hi)] capitalize truncate">
                  {extendedProfile.mainCrop || <span className="text-[var(--text-low)] italic">Not provided</span>}
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-[var(--bg-0)] border border-[var(--border)] col-span-2">
                <div className="text-[var(--text-low)] text-[11px] mb-0.5">Equipment Status</div>
                <div className="font-medium text-[var(--text-hi)]">
                  {extendedProfile.hasOwnMachine !== undefined
                    ? extendedProfile.hasOwnMachine
                      ? 'Owns clearing machinery'
                      : 'Requires machine booking'
                    : <span className="text-[var(--text-low)] italic">Not provided</span>}
                </div>
              </div>
            </div>
          )}

          {/* Citizen Fields (Rendered when profile exists) */}
          {!isFarmer && extendedProfile && !isProfileMissing && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-[var(--bg-0)] border border-[var(--border)] col-span-2">
                <div className="text-[var(--text-low)] text-[11px] mb-0.5">Monitored Ward / Area</div>
                <div className="font-medium text-[var(--text-hi)] truncate">
                  {extendedProfile.areaName || extendedProfile.areaId || <span className="text-[var(--text-low)] italic">Not provided</span>}
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-[var(--bg-0)] border border-[var(--border)]">
                <div className="text-[var(--text-low)] text-[11px] mb-0.5">Household Kids</div>
                <div className="font-medium text-[var(--text-hi)]">
                  {extendedProfile.hasKids !== undefined
                    ? (extendedProfile.hasKids ? 'Yes' : 'No')
                    : <span className="text-[var(--text-low)] italic">Not provided</span>}
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-[var(--bg-0)] border border-[var(--border)]">
                <div className="text-[var(--text-low)] text-[11px] mb-0.5">Household Elderly</div>
                <div className="font-medium text-[var(--text-hi)]">
                  {extendedProfile.hasElderly !== undefined
                    ? (extendedProfile.hasElderly ? 'Yes' : 'No')
                    : <span className="text-[var(--text-low)] italic">Not provided</span>}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-5 pt-4 border-t border-[var(--border)] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[var(--bg-2)] hover:bg-[var(--border)] text-sm font-medium text-[var(--text-hi)] transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
