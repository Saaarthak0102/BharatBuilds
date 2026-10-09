'use client';

import { Suspense, useState } from 'react';
import { AuthShell } from '@/components/auth/AuthShell';
import { RoleSelector } from '@/components/auth/RoleSelector';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { GlassCard } from '@/components/ui/GlassCard';
import { PillButton } from '@/components/ui/PillButton';
import { useSession } from '@/lib/auth/useSession';
import { getDashboardPath } from '@/lib/auth/roleRedirect';
import { mockVillages } from '@/lib/mock/villages';
import { mockWards } from '@/lib/mock/wards';
import {
  saveStoredHealthProfile,
  CitizenHealthProfile,
  DEFAULT_HEALTH_PROFILE,
} from '@/lib/mock/healthProfile';
import { LuHeartPulse, LuShieldAlert } from 'react-icons/lu';
import type { Language, Role, CropStage } from '@/lib/types';
import type { SignupData } from '@/lib/auth/authClient';

function SignupFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleParam = searchParams.get('role') as Role | null;
  const { signup, completeSignup, resendConfirmationCode, loading } = useSession();

  // Multi-step flow: 'form' -> 'confirm'
  const [step, setStep] = useState<'form' | 'confirm'>('form');
  const [confirmationUsername, setConfirmationUsername] = useState('');
  const [codeDestination, setCodeDestination] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [pendingSignupData, setPendingSignupData] = useState<SignupData | null>(null);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const [verifying, setVerifying] = useState(false);

  // Common fields
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [language, setLanguage] = useState<Language>(roleParam === 'farmer' ? 'pa' : 'en');
  const [error, setError] = useState('');

  // Farmer specific fields
  const [phone, setPhone] = useState('+91');
  const [selectedVillageId, setSelectedVillageId] = useState(mockVillages[0].village_id);
  const [district, setDistrict] = useState(mockVillages[0].district);
  const [landSize, setLandSize] = useState('5');
  const [mainCrop, setMainCrop] = useState('Paddy (Basmati)');
  const [cropStage, setCropStage] = useState<CropStage>('harvested');
  const [hasOwnMachine, setHasOwnMachine] = useState(false);

  // Citizen specific fields
  const [citizenContact, setCitizenContact] = useState('');
  const [selectedWardId, setSelectedWardId] = useState(mockWards[0].ward_id);
  const [alertThreshold, setAlertThreshold] = useState('300');
  const [hasKids, setHasKids] = useState(false);
  const [hasElderly, setHasElderly] = useState(false);

  // Citizen optional health step
  const [asthmaChoice, setAsthmaChoice] = useState<'yes' | 'no' | 'prefer_not_to_say'>('yes');
  const [emergencyContactName, setEmergencyContactName] = useState(DEFAULT_HEALTH_PROFILE.emergencyContact?.name || '');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(DEFAULT_HEALTH_PROFILE.emergencyContact?.phone || '');
  const [chemistName, setChemistName] = useState(DEFAULT_HEALTH_PROFILE.preferredChemist?.name || '');
  const [chemistPhone, setChemistPhone] = useState(DEFAULT_HEALTH_PROFILE.preferredChemist?.phone || '');

  if (!roleParam || (roleParam !== 'farmer' && roleParam !== 'citizen')) {
    return (
      <>
        <RoleSelector onSelect={(r) => router.push(`/signup?role=${r}`)} />
        <p className="mt-6 text-center text-sm text-[var(--text-mid)]">
          Already have an account?{' '}
          <Link href="/login" className="text-[var(--accent)] hover:text-white font-medium transition-colors">
            Log in
          </Link>
        </p>
      </>
    );
  }

  const handleVillageChange = (vid: string) => {
    setSelectedVillageId(vid);
    const found = mockVillages.find((v) => v.village_id === vid);
    if (found) {
      setDistrict(found.district);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResendMessage('');

    try {
      if (roleParam === 'farmer') {
        const selectedVillage = mockVillages.find((v) => v.village_id === selectedVillageId);
        const signupData: SignupData = {
          role: 'farmer',
          name,
          phone,
          password,
          language,
          village_id: selectedVillageId,
          village_name: selectedVillage?.name,
          district: district || selectedVillage?.district || 'Patiala',
          land_size_acres: parseFloat(landSize) || 5,
          main_crop: mainCrop,
          crop_stage: cropStage,
          has_own_machine: hasOwnMachine,
        };

        const result = await signup(signupData);

        if (result.isConfirmed && result.session) {
          router.push(getDashboardPath(result.session.role));
        } else {
          setPendingSignupData(signupData);
          setConfirmationUsername(result.username);
          setCodeDestination(result.codeDeliveryDetails?.destination || phone);
          setStep('confirm');
        }
      } else {
        const isEmail = citizenContact.includes('@');
        const email = isEmail ? citizenContact.trim() : undefined;
        const citizenPhone = !isEmail ? citizenContact.trim() : undefined;
        const selectedWard = mockWards.find((w) => w.ward_id === selectedWardId);

        // Save local health data
        const healthData: CitizenHealthProfile = {
          hasAsthmaOrBreathingCondition: asthmaChoice,
          emergencyContact:
            emergencyContactName && emergencyContactPhone
              ? { name: emergencyContactName, phone: emergencyContactPhone }
              : undefined,
          preferredChemist:
            chemistName && chemistPhone ? { name: chemistName, phone: chemistPhone } : undefined,
        };
        saveStoredHealthProfile(healthData);

        const signupData: SignupData = {
          role: 'citizen',
          name,
          email,
          phone: citizenPhone,
          password,
          language,
          area_id: selectedWardId,
          area_name: selectedWard?.name,
          alert_threshold: alertThreshold ? parseInt(alertThreshold, 10) : 300,
          alert_opt_in: Boolean(alertThreshold),
          has_kids: hasKids,
          has_elderly: hasElderly,
        };

        const result = await signup(signupData);

        if (result.isConfirmed && result.session) {
          router.push(getDashboardPath(result.session.role));
        } else {
          setPendingSignupData(signupData);
          setConfirmationUsername(result.username);
          setCodeDestination(result.codeDeliveryDetails?.destination || citizenContact);
          setStep('confirm');
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Signup failed. Please try again.';
      setError(msg);
    }
  };

  const handleConfirmSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResendMessage('');

    if (!pendingSignupData) {
      setError('Registration session expired. Please fill out the signup form again.');
      setStep('form');
      return;
    }

    setVerifying(true);
    try {
      const session = await completeSignup(confirmationUsername, otpCode.trim(), pendingSignupData);
      router.push(getDashboardPath(session.role));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Verification failed. Please check the code.';
      setError(msg);
    } finally {
      setVerifying(false);
    }
  };

  const handleResendCode = async () => {
    setError('');
    setResendMessage('');
    setResending(true);
    try {
      const details = await resendConfirmationCode(confirmationUsername);
      if (details?.destination) {
        setCodeDestination(details.destination);
      }
      setResendMessage(
        details?.destination
          ? `A new verification code has been sent to ${details.destination}.`
          : 'A new verification code has been sent.'
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to resend code. Please try again.';
      setError(msg);
    } finally {
      setResending(false);
    }
  };

  if (step === 'confirm') {
    return (
      <GlassCard className="w-full">
        <h2 className="text-xl font-bold text-center text-[var(--text-hi)] mb-2">
          Verify Your Account
        </h2>
        <p className="text-xs text-[var(--text-mid)] text-center mb-6">
          {codeDestination
            ? `We sent a verification code to ${codeDestination}. Enter it below to complete your ${roleParam === 'farmer' ? 'Farmer' : 'Citizen'} registration.`
            : `We sent a verification code to your email/phone. Enter it below to complete your registration.`}
        </p>

        {error && (
          <div className="p-3 mb-4 text-xs text-[var(--red)] bg-[var(--red)]/10 border border-[var(--red)]/20 rounded-xl leading-relaxed">
            {error}
          </div>
        )}

        {resendMessage && (
          <div className="p-3 mb-4 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl leading-relaxed">
            {resendMessage}
          </div>
        )}

        <form onSubmit={handleConfirmSubmit} className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-medium text-[var(--text-mid)] mb-1">
              Verification Code (OTP)
            </label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              placeholder="Enter 6-digit code"
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-1)] border border-[var(--border)] text-sm text-[var(--text-hi)] placeholder-[var(--text-low)] outline-none focus:border-[var(--accent)] transition-colors text-center tracking-widest font-mono font-bold"
            />
          </div>

          <PillButton
            variant="primary-silver"
            type="submit"
            disabled={verifying || !otpCode.trim()}
            className="w-full mt-6 flex justify-center py-2.5"
          >
            {verifying ? 'Verifying & Setting up Profile...' : 'Verify & Complete Registration'}
          </PillButton>
        </form>

        <div className="mt-4 flex flex-col gap-2 text-center">
          <button
            type="button"
            onClick={handleResendCode}
            disabled={resending}
            className="text-xs text-[var(--accent)] hover:underline transition-colors disabled:opacity-50 cursor-pointer"
          >
            {resending ? 'Resending code...' : "Didn't receive code? Resend Code"}
          </button>

          <button
            type="button"
            onClick={() => {
              setStep('form');
              setError('');
              setResendMessage('');
            }}
            className="text-xs text-[var(--text-mid)] hover:text-[var(--text-hi)] transition-colors cursor-pointer"
          >
            ← Edit registration details
          </button>
        </div>
      </GlassCard>
    );
  }

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

      {error && (
        <div className="p-3 mb-4 text-xs text-[var(--red)] bg-[var(--red)]/10 border border-[var(--red)]/20 rounded-xl leading-relaxed">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        <div>
          <label className="block text-xs font-medium text-[var(--text-mid)] mb-1">Full Name</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={roleParam === 'farmer' ? 'Gurpreet Singh' : 'Ananya Verma'}
            className="w-full px-3 py-2 rounded-xl bg-[var(--bg-1)] border border-[var(--border)] text-xs text-[var(--text-hi)] placeholder-[var(--text-low)] outline-none focus:border-[var(--accent)] transition-colors"
          />
        </div>

        {roleParam === 'farmer' ? (
          <>
            <div>
              <label className="block text-xs font-medium text-[var(--text-mid)] mb-1">
                Phone Number (E.164: +91...)
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+919876543210"
                className="w-full px-3 py-2 rounded-xl bg-[var(--bg-1)] border border-[var(--border)] text-xs text-[var(--text-hi)] placeholder-[var(--text-low)] outline-none focus:border-[var(--accent)] transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[var(--text-mid)] mb-1">Village</label>
                <select
                  value={selectedVillageId}
                  onChange={(e) => handleVillageChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-1)] border border-[var(--border)] text-xs text-[var(--text-hi)] outline-none focus:border-[var(--accent)] transition-colors"
                >
                  {mockVillages.map((v) => (
                    <option key={v.village_id} value={v.village_id}>
                      {v.name} ({v.district})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-mid)] mb-1">District</label>
                <input
                  type="text"
                  required
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-1)] border border-[var(--border)] text-xs text-[var(--text-hi)] outline-none focus:border-[var(--accent)] transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[var(--text-mid)] mb-1">Land Size (Acres)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  required
                  value={landSize}
                  onChange={(e) => setLandSize(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-1)] border border-[var(--border)] text-xs text-[var(--text-hi)] outline-none focus:border-[var(--accent)] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-mid)] mb-1">Crop Stage</label>
                <select
                  value={cropStage}
                  onChange={(e) => setCropStage(e.target.value as CropStage)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-1)] border border-[var(--border)] text-xs text-[var(--text-hi)] outline-none focus:border-[var(--accent)] transition-colors"
                >
                  <option value="harvested">Harvested</option>
                  <option value="partially_cleared">Partially Cleared</option>
                  <option value="standing">Standing Crop</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-mid)] mb-1">Main Crop</label>
              <input
                type="text"
                required
                value={mainCrop}
                onChange={(e) => setMainCrop(e.target.value)}
                placeholder="Paddy (Basmati)"
                className="w-full px-3 py-2 rounded-xl bg-[var(--bg-1)] border border-[var(--border)] text-xs text-[var(--text-hi)] outline-none focus:border-[var(--accent)] transition-colors"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="hasOwnMachine"
                checked={hasOwnMachine}
                onChange={(e) => setHasOwnMachine(e.target.checked)}
                className="w-4 h-4 rounded border-[var(--border)] bg-[var(--bg-1)] accent-[var(--accent)]"
              />
              <label htmlFor="hasOwnMachine" className="text-xs text-[var(--text-mid)] cursor-pointer">
                I have access to stubble management machinery
              </label>
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="block text-xs font-medium text-[var(--text-mid)] mb-1">
                Email or Phone Number
              </label>
              <input
                type="text"
                required
                value={citizenContact}
                onChange={(e) => setCitizenContact(e.target.value)}
                placeholder="citizen@example.com or +919876543210"
                className="w-full px-3 py-2 rounded-xl bg-[var(--bg-1)] border border-[var(--border)] text-xs text-[var(--text-hi)] placeholder-[var(--text-low)] outline-none focus:border-[var(--accent)] transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[var(--text-mid)] mb-1">Area / Ward</label>
                <select
                  value={selectedWardId}
                  onChange={(e) => setSelectedWardId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-1)] border border-[var(--border)] text-xs text-[var(--text-hi)] outline-none focus:border-[var(--accent)] transition-colors"
                >
                  {mockWards.map((w) => (
                    <option key={w.ward_id} value={w.ward_id}>
                      {w.name} ({w.zone})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-mid)] mb-1">Alert Threshold (AQI)</label>
                <input
                  type="number"
                  min="50"
                  max="500"
                  value={alertThreshold}
                  onChange={(e) => setAlertThreshold(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-1)] border border-[var(--border)] text-xs text-[var(--text-hi)] outline-none focus:border-[var(--accent)] transition-colors"
                />
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <label className="flex items-center gap-2 text-xs text-[var(--text-mid)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasKids}
                  onChange={(e) => setHasKids(e.target.checked)}
                  className="w-4 h-4 rounded border-[var(--border)] bg-[var(--bg-1)] accent-[var(--accent)]"
                />
                Children in household
              </label>
              <label className="flex items-center gap-2 text-xs text-[var(--text-mid)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasElderly}
                  onChange={(e) => setHasElderly(e.target.checked)}
                  className="w-4 h-4 rounded border-[var(--border)] bg-[var(--bg-1)] accent-[var(--accent)]"
                />
                Elderly or sensitive individuals in household
              </label>
            </div>

            {/* Citizen Optional Health Step */}
            <div className="mt-4 p-4 rounded-2xl bg-[var(--bg-1)] border border-[var(--border)] space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-hi)]">
                <LuHeartPulse className="w-4 h-4 text-red-400" />
                <span>Smog Season Health Assistance (Optional)</span>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[var(--text-hi)] mb-1.5">
                  Do any household members have asthma or respiratory conditions?
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['yes', 'no', 'prefer_not_to_say'] as const).map((choice) => (
                    <button
                      key={choice}
                      type="button"
                      onClick={() => setAsthmaChoice(choice)}
                      className={`py-1.5 px-2 text-[11px] rounded-xl border text-center transition-all cursor-pointer ${
                        asthmaChoice === choice
                          ? 'bg-[var(--accent)] text-white border-transparent font-medium shadow'
                          : 'bg-[var(--bg-2)] border-[var(--border)] text-[var(--text-mid)] hover:text-white'
                      }`}
                    >
                      {choice === 'yes' ? 'Yes' : choice === 'no' ? 'No' : 'Skip'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[10px] text-[var(--text-low)] mb-1">Emergency Contact Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Rohit Sharma"
                    value={emergencyContactName}
                    onChange={(e) => setEmergencyContactName(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-[var(--bg-0)] border border-[var(--border)] text-[11px] text-[var(--text-hi)] placeholder:text-[var(--text-low)]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[var(--text-low)] mb-1">Emergency Contact Phone</label>
                  <input
                    type="tel"
                    placeholder="e.g. +91 98765 43210"
                    value={emergencyContactPhone}
                    onChange={(e) => setEmergencyContactPhone(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-[var(--bg-0)] border border-[var(--border)] text-[11px] text-[var(--text-hi)] placeholder:text-[var(--text-low)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-[var(--text-low)] mb-1">Preferred Chemist</label>
                  <input
                    type="text"
                    placeholder="e.g. Apollo Pharmacy"
                    value={chemistName}
                    onChange={(e) => setChemistName(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-[var(--bg-0)] border border-[var(--border)] text-[11px] text-[var(--text-hi)] placeholder:text-[var(--text-low)]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[var(--text-low)] mb-1">Chemist Phone</label>
                  <input
                    type="tel"
                    placeholder="e.g. +91 98110 23456"
                    value={chemistPhone}
                    onChange={(e) => setChemistPhone(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-[var(--bg-0)] border border-[var(--border)] text-[11px] text-[var(--text-hi)] placeholder:text-[var(--text-low)]"
                  />
                </div>
              </div>

              <div className="flex items-start gap-2 pt-1 text-[10px] text-[var(--text-low)] bg-[var(--bg-0)]/50 p-2 rounded-xl border border-[var(--border)]">
                <LuShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <span>Emergency contacts and health data are stored securely for rapid SOS routing.</span>
              </div>
            </div>
          </>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-[var(--text-mid)] mb-1">Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="•••••••• (min 8 chars)"
              className="w-full px-3 py-2 rounded-xl bg-[var(--bg-1)] border border-[var(--border)] text-xs text-[var(--text-hi)] placeholder-[var(--text-low)] outline-none focus:border-[var(--accent)] transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-mid)] mb-1">Preferred Language</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              className="w-full px-3 py-2 rounded-xl bg-[var(--bg-1)] border border-[var(--border)] text-xs text-[var(--text-hi)] outline-none focus:border-[var(--accent)] transition-colors"
            >
              <option value="pa">ਪੰਜਾਬੀ (Punjabi)</option>
              <option value="hi">हिन्दी (Hindi)</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>

        <PillButton
          variant="primary-silver"
          type="submit"
          disabled={loading}
          className="w-full mt-6 flex justify-center py-2.5"
        >
          {loading ? 'Creating account...' : 'Complete Sign Up'}
        </PillButton>
      </form>

      <div className="mt-4 text-center">
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
