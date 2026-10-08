'use client';

import { Suspense, useState } from 'react';
import { AuthShell } from '@/components/auth/AuthShell';
import { RoleSelector } from '@/components/auth/RoleSelector';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { GlassCard } from '@/components/ui/GlassCard';
import { PillButton } from '@/components/ui/PillButton';
import { useT } from '@/lib/i18n/useT';
import {
  saveStoredHealthProfile,
  CitizenHealthProfile,
  DEFAULT_HEALTH_PROFILE,
} from '@/lib/mock/healthProfile';
import { LuShieldAlert, LuHeartPulse } from 'react-icons/lu';

function SignupFlow() {
  const { t } = useT();
  const searchParams = useSearchParams();
  const roleParam = searchParams.get('role');

  const [asthmaChoice, setAsthmaChoice] = useState<'yes' | 'no' | 'prefer_not_to_say'>('yes');
  const [contactName, setContactName] = useState(DEFAULT_HEALTH_PROFILE.emergencyContact?.name || '');
  const [contactPhone, setContactPhone] = useState(DEFAULT_HEALTH_PROFILE.emergencyContact?.phone || '');
  const [chemistName, setChemistName] = useState(DEFAULT_HEALTH_PROFILE.preferredChemist?.name || '');
  const [chemistPhone, setChemistPhone] = useState(DEFAULT_HEALTH_PROFILE.preferredChemist?.phone || '');
  
  if (!roleParam || (roleParam !== 'farmer' && roleParam !== 'citizen')) {
    return (
      <>
        <RoleSelector onSelect={(r) => window.location.href = `/signup?role=${r}`} />
        <p className="mt-6 text-center text-sm text-[var(--text-mid)]">
          Already have an account?{' '}
          <Link href="/login" className="text-[var(--accent)] hover:text-white font-medium transition-colors">
            Log in
          </Link>
        </p>
      </>
    );
  }

  const handleProceed = () => {
    if (roleParam === 'citizen') {
      const healthData: CitizenHealthProfile = {
        hasAsthmaOrBreathingCondition: asthmaChoice,
        emergencyContact: contactName && contactPhone ? { name: contactName, phone: contactPhone } : undefined,
        preferredChemist: chemistName && chemistPhone ? { name: chemistName, phone: chemistPhone } : undefined,
      };
      saveStoredHealthProfile(healthData);
    }
    window.location.href = roleParam === 'farmer' ? '/farmer' : '/citizen';
  };

  return (
    <GlassCard className="w-full">
      <h2 className="text-xl font-bold text-center text-[var(--text-hi)] mb-2">
        Sign up as {roleParam === 'farmer' ? 'Farmer' : 'Citizen'}
      </h2>
      <p className="text-xs text-[var(--text-mid)] text-center mb-6">
        {roleParam === 'farmer'
          ? 'Manage harvest timings and connect with equipment aggregators.'
          : 'Monitor local air quality and get rapid assistance during high smog.'}
      </p>

      {/* Citizen Optional Health Step */}
      {roleParam === 'citizen' && (
        <div className="mb-6 p-4 rounded-2xl bg-[var(--bg-1)] border border-[var(--border)] space-y-4 text-left">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-hi)]">
            <LuHeartPulse className="w-4 h-4 text-red-400" />
            <span>{t('auth.healthStepTitle')}</span>
          </div>
          <p className="text-xs text-[var(--text-mid)]">
            {t('auth.healthStepSubtitle')}
          </p>

          <div>
            <label className="block text-xs font-medium text-[var(--text-hi)] mb-2">
              {t('auth.asthmaQuestion')}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['yes', 'no', 'prefer_not_to_say'] as const).map((choice) => (
                <button
                  key={choice}
                  type="button"
                  onClick={() => setAsthmaChoice(choice)}
                  className={`py-2 px-2 text-xs rounded-xl border text-center transition-all cursor-pointer ${
                    asthmaChoice === choice
                      ? 'bg-[var(--accent)] text-white border-transparent font-medium shadow-md'
                      : 'bg-[var(--bg-2)] border-[var(--border)] text-[var(--text-mid)] hover:text-white'
                  }`}
                >
                  {choice === 'yes' ? t('common.yes') : choice === 'no' ? t('common.no') : t('common.preferNotToSay')}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-[11px] text-[var(--text-low)] mb-1">
                {t('auth.emergencyContactName')}
              </label>
              <input
                type="text"
                placeholder="e.g. Rohit Sharma"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--bg-0)] border border-[var(--border)] text-xs text-[var(--text-hi)] placeholder:text-[var(--text-low)]"
              />
            </div>
            <div>
              <label className="block text-[11px] text-[var(--text-low)] mb-1">
                {t('auth.emergencyContactPhone')}
              </label>
              <input
                type="tel"
                placeholder="e.g. +91 98765 43210"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--bg-0)] border border-[var(--border)] text-xs text-[var(--text-hi)] placeholder:text-[var(--text-low)]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-[var(--text-low)] mb-1">
                {t('auth.preferredChemistName')}
              </label>
              <input
                type="text"
                placeholder="e.g. Apollo Pharmacy"
                value={chemistName}
                onChange={(e) => setChemistName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--bg-0)] border border-[var(--border)] text-xs text-[var(--text-hi)] placeholder:text-[var(--text-low)]"
              />
            </div>
            <div>
              <label className="block text-[11px] text-[var(--text-low)] mb-1">
                {t('auth.preferredChemistPhone')}
              </label>
              <input
                type="tel"
                placeholder="e.g. +91 98110 23456"
                value={chemistPhone}
                onChange={(e) => setChemistPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--bg-0)] border border-[var(--border)] text-xs text-[var(--text-hi)] placeholder:text-[var(--text-low)]"
              />
            </div>
          </div>

          <div className="flex items-start gap-2 pt-1 text-[11px] text-[var(--text-low)] bg-[var(--bg-0)]/50 p-2.5 rounded-xl border border-[var(--border)]">
            <LuShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            <span>{t('auth.healthConsentNote')}</span>
          </div>
        </div>
      )}

      {/* Complete sign-up / quick demo entry */}
      <button 
        type="button"
        onClick={handleProceed}
        className="w-full bg-[var(--accent)] hover:bg-blue-600 text-white py-3 rounded-full interactive-tactile font-semibold text-sm mb-4 shadow-lg shadow-blue-900/30 cursor-pointer"
      >
        Complete Sign Up
      </button>
      
      <div className="text-center">
        <Link href="/signup" className="text-xs text-[var(--text-mid)] hover:text-[var(--text-hi)] transition-colors">
          ← Back to roles
        </Link>
      </div>
    </GlassCard>
  );
}

export default function SignupPage() {
  return (
    <AuthShell>
      <Suspense fallback={<div className="text-center p-8 text-[var(--text-mid)]">Loading...</div>}>
        <SignupFlow />
      </Suspense>
    </AuthShell>
  );
}
