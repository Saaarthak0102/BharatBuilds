'use client';

import { useState, useEffect } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { PillButton } from '@/components/ui/PillButton';
import {
  LuPhone,
  LuShare2,
  LuNavigation,
  LuTriangle,
  LuX,
  LuCheck,
  LuTerminal,
  LuUserPlus,
} from 'react-icons/lu';
import {
  getStoredHealthProfile,
  saveStoredHealthProfile,
  findNearestChemist,
  CitizenHealthProfile,
  ChemistPlaceResult,
} from '@/lib/mock/healthProfile';
import { useT } from '@/lib/i18n/useT';
import { cn } from '@/lib/utils';
import { ToolTraceItem } from './AgentLogAccordion';

interface EmergencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onToolTracesUpdated?: (traces: ToolTraceItem[]) => void;
}

type Step = 'confirm' | 'running_agent' | 'result';

export function EmergencyFeelingHeavyModal({
  isOpen,
  onClose,
  onToolTracesUpdated,
}: EmergencyModalProps) {
  const { t } = useT();
  const [step, setStep] = useState<Step>('confirm');
  const [profile, setProfile] = useState<CitizenHealthProfile>(getStoredHealthProfile());
  const [chemist, setChemist] = useState<ChemistPlaceResult | null>(null);
  const [agentStepsCompleted, setAgentStepsCompleted] = useState<number>(0);
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [contactNameInput, setContactNameInput] = useState('');
  const [contactPhoneInput, setContactPhoneInput] = useState('');

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('confirm');
      setAgentStepsCompleted(0);
      setIsEditingContact(false);
      const loadedProfile = getStoredHealthProfile();
      setProfile(loadedProfile);
      setContactNameInput(loadedProfile.emergencyContact?.name || '');
      setContactPhoneInput(loadedProfile.emergencyContact?.phone || '');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const mockAgentTools: ToolTraceItem[] = [
    { tool: 'get_current_aqi', status: 'ok', latency_ms: 85 },
    { tool: 'get_user_location', status: 'ok', latency_ms: 110 },
    { tool: 'get_user_health_profile', status: 'ok', latency_ms: 45 },
    { tool: 'find_nearest_chemist', status: 'ok', latency_ms: 140 },
    { tool: 'get_emergency_contact', status: 'ok', latency_ms: 30 },
  ];

  const handleStartEmergencyAgent = async () => {
    setStep('running_agent');
    setAgentStepsCompleted(0);

    const nearest = await findNearestChemist(28.65, 77.25);
    setChemist(nearest);

    // Simulate real agent step-by-step resolution with visual cadence
    for (let i = 1; i <= mockAgentTools.length; i++) {
      await new Promise((r) => setTimeout(r, 220));
      setAgentStepsCompleted(i);
    }

    if (onToolTracesUpdated) {
      onToolTracesUpdated(mockAgentTools);
    }

    setStep('result');
  };

  const handleSaveContact = () => {
    const updated: CitizenHealthProfile = {
      ...profile,
      emergencyContact: {
        name: contactNameInput,
        phone: contactPhoneInput,
      },
    };
    saveStoredHealthProfile(updated);
    setProfile(updated);
    setIsEditingContact(false);
  };

  const shareText = encodeURIComponent(
    `EMERGENCY: I am experiencing difficulty breathing due to high smog (AQI 185) near Anand Vihar, Delhi. Please check on me or coordinate assistance. Location: https://maps.google.com/?q=28.6508,77.3052`
  );
  const whatsappUrl = `https://wa.me/${profile.emergencyContact?.phone?.replace(/[^0-9]/g, '') || ''}?text=${shareText}`;
  const smsUrl = `sms:${profile.emergencyContact?.phone || ''}?body=${shareText}`;
  const chemistNavUrl = chemist
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${chemist.name} ${chemist.vicinity}`)}`
    : 'https://maps.google.com/?q=28.6508,77.3052';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="emergency-dialog-title"
    >
      <div className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl bg-[var(--bg-1)] border border-[var(--red)]/40 p-4 sm:p-6 shadow-2xl shadow-red-950/40 text-[var(--text-hi)]">
        {/* Close Button */}
        <button
          onClick={onClose}
          type="button"
          aria-label="Close emergency modal"
          className="absolute top-4 right-4 p-2 rounded-full text-[var(--text-low)] hover:text-[var(--text-hi)] hover:bg-[var(--bg-2)] transition-colors cursor-pointer"
        >
          <LuX className="w-5 h-5" />
        </button>

        {/* STEP 1: CONFIRMATION SHEET */}
        {step === 'confirm' && (
          <div className="space-y-4 pt-1">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[var(--red)]/20 border border-[var(--red)]/40 flex items-center justify-center text-[var(--red)] shrink-0">
                <LuTriangle className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h2 id="emergency-dialog-title" className="text-xl sm:text-2xl font-bold text-[var(--text-hi)] leading-tight">
                  {t('citizen.emergencyConfirmTitle')}
                </h2>
                <p className="text-xs sm:text-sm text-[var(--text-mid)] mt-0.5">
                  Immediate smog breathing support & rapid dispatch
                </p>
              </div>
            </div>

            <p className="text-sm text-[var(--text-mid)] leading-relaxed">
              {t('citizen.emergencyConfirmSub')}
            </p>

            {/* Severe symptom alert box */}
            <div className="p-3.5 rounded-xl bg-red-950/40 border border-[var(--red)]/40 flex items-start gap-3">
              <LuTriangle className="w-5 h-5 text-[var(--red)] shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm text-red-200">
                <strong className="font-semibold block text-white mb-0.5">Severe Symptoms?</strong>
                {t('citizen.emergencySevereWarning')}
              </div>
            </div>

            {/* Direct 112 Call Button */}
            <a
              href="tel:112"
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[var(--red)] hover:bg-red-600 text-white font-bold text-sm tracking-wide uppercase transition-all shadow-lg shadow-red-900/50 interactive-tactile"
            >
              <LuPhone className="w-4 h-4" />
              {t('citizen.call112')}
            </a>

            <div className="pt-2 flex items-center gap-3">
              <PillButton
                variant="accent"
                onClick={handleStartEmergencyAgent}
                className="flex-1 py-3 bg-[var(--amber)] hover:bg-amber-500 text-black font-bold text-sm justify-center border-none"
              >
                {t('citizen.yesHelpMe')}
              </PillButton>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-3 rounded-full text-sm text-[var(--text-mid)] hover:text-white transition-colors cursor-pointer"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: RUNNING AGENT WITH VISIBLE TRACE */}
        {step === 'running_agent' && (
          <div className="space-y-4 py-4 text-center">
            <div className="w-14 h-14 mx-auto rounded-full bg-[var(--amber)]/20 border border-[var(--amber)]/40 flex items-center justify-center text-[var(--amber)]">
              <LuTerminal className="w-7 h-7 animate-spin" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[var(--text-hi)]">
                {t('citizen.runningEmergencyAgent')}
              </h3>
              <p className="text-xs text-[var(--text-mid)] mt-1">
                Executing medical triage agent tools in real time...
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[var(--bg-0)] border border-[var(--border)] text-left space-y-2 font-mono text-xs max-h-56 overflow-y-auto">
              {mockAgentTools.map((trace, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'flex items-center justify-between p-2 rounded border transition-opacity duration-300',
                    idx < agentStepsCompleted
                      ? 'bg-[var(--bg-2)] border-[var(--emerald)]/30 text-[var(--text-hi)] opacity-100'
                      : 'bg-transparent border-transparent text-[var(--text-low)] opacity-40'
                  )}
                >
                  <div className="flex items-center gap-2">
                    {idx < agentStepsCompleted ? (
                      <LuCheck className="w-3.5 h-3.5 text-[var(--emerald)]" />
                    ) : (
                      <span className="w-3.5 h-3.5 rounded-full border border-dashed border-gray-500 inline-block" />
                    )}
                    <span>{trace.tool}</span>
                  </div>
                  {idx < agentStepsCompleted && (
                    <span className="text-[var(--text-low)] text-[11px]">{trace.latency_ms}ms</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 3: RESULT PANEL & IMMEDIATE GUIDANCE */}
        {step === 'result' && (
          <div className="space-y-4 pt-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[var(--emerald)]/20 border border-[var(--emerald)]/40 flex items-center justify-center text-[var(--emerald)] shrink-0">
                <LuCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[var(--text-hi)] leading-tight">
                  {t('citizen.immediateGuidance')}
                </h3>
                <p className="text-xs text-[var(--text-mid)]">
                  Tailored for AQI 185 (Poor) • East Delhi
                </p>
              </div>
            </div>

            {/* Immediate Action Steps Box */}
            <div className="p-3.5 rounded-xl bg-[var(--bg-2)] border border-[var(--border)] text-xs text-[var(--text-hi)] space-y-2 leading-relaxed">
              <div className="flex items-start gap-2">
                <span className="text-amber-400 font-bold shrink-0">1.</span>
                <span><strong>Stay indoors:</strong> Keep all windows and doors closed. Avoid exertion.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-amber-400 font-bold shrink-0">2.</span>
                <span><strong>Wear N95 mask:</strong> If particulate smoke enters the room, wear a well-fitted respirator.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-amber-400 font-bold shrink-0">3.</span>
                <span><strong>Inhaler usage:</strong> If prescribed a rescue inhaler (Salbutamol), take 2 puffs immediately while sitting upright.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-amber-400 font-bold shrink-0">4.</span>
                <span><strong>Posture:</strong> Sit upright with shoulders loose. Do not lie flat on your back.</span>
              </div>
            </div>

            {/* Resources List: Chemist & Contact */}
            <div className="space-y-2">
              {/* Chemist Card */}
              <div className="p-3 rounded-xl bg-[var(--bg-0)] border border-[var(--border)] flex items-center justify-between text-xs">
                <div className="min-w-0 pr-2">
                  <div className="font-semibold text-[var(--text-hi)] truncate">
                    {chemist?.name || 'Apollo Pharmacy (24x7)'}
                  </div>
                  <div className="text-[11px] text-[var(--text-mid)] truncate mt-0.5">
                    {chemist?.vicinity || 'Anand Vihar'} • {chemist?.distanceKm || 0.35} km away (Open Now)
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <a
                    href={`tel:${chemist?.phone || '+919811023456'}`}
                    className="p-2 rounded-lg bg-[var(--bg-2)] hover:bg-[var(--emerald)]/20 text-[var(--emerald)] border border-[var(--border)] transition-colors"
                    title="Call Chemist"
                    aria-label="Call nearest chemist"
                  >
                    <LuPhone className="w-4 h-4" />
                  </a>
                  <a
                    href={chemistNavUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-[var(--bg-2)] hover:bg-[var(--cyan)]/20 text-[var(--cyan)] border border-[var(--border)] transition-colors"
                    title="Navigate to Chemist"
                    aria-label="Navigate to chemist on maps"
                  >
                    <LuNavigation className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {/* Emergency Contact Card */}
              {profile.emergencyContact?.name ? (
                <div className="p-3 rounded-xl bg-[var(--bg-0)] border border-[var(--border)] flex items-center justify-between text-xs">
                  <div className="min-w-0 pr-2">
                    <div className="font-semibold text-[var(--text-hi)] truncate">
                      {profile.emergencyContact.name}
                    </div>
                    <div className="text-[11px] text-[var(--text-mid)] truncate mt-0.5">
                      {profile.emergencyContact.phone}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <a
                      href={`tel:${profile.emergencyContact.phone}`}
                      className="p-2 rounded-lg bg-[var(--bg-2)] hover:bg-[var(--accent)]/20 text-[var(--accent)] border border-[var(--border)] transition-colors"
                      title="Call Contact"
                      aria-label="Call emergency contact"
                    >
                      <LuPhone className="w-4 h-4" />
                    </a>
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg bg-[var(--bg-2)] hover:bg-green-500/20 text-green-400 border border-[var(--border)] transition-colors"
                      title="Share via WhatsApp"
                      aria-label="Share location via WhatsApp"
                    >
                      <LuShare2 className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-[var(--bg-0)] border border-dashed border-[var(--border)] flex items-center justify-between text-xs">
                  <span className="text-[var(--text-low)]">No emergency contact saved</span>
                  <button
                    type="button"
                    onClick={() => setIsEditingContact(true)}
                    className="text-xs text-[var(--accent)] font-medium flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <LuUserPlus className="w-3.5 h-3.5" />
                    {t('citizen.addEmergencyContact')}
                  </button>
                </div>
              )}
            </div>

            {/* Quick Contact Form if Editing */}
            {isEditingContact && (
              <div className="p-3 rounded-xl bg-[var(--bg-2)] border border-[var(--border)] space-y-2 text-xs">
                <input
                  type="text"
                  placeholder="Contact Name (e.g. Brother)"
                  value={contactNameInput}
                  onChange={(e) => setContactNameInput(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-[var(--bg-0)] border border-[var(--border)] text-[var(--text-hi)]"
                />
                <input
                  type="tel"
                  placeholder="Phone (e.g. +91 98765 43210)"
                  value={contactPhoneInput}
                  onChange={(e) => setContactPhoneInput(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-[var(--bg-0)] border border-[var(--border)] text-[var(--text-hi)]"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSaveContact}
                    className="px-3 py-1 rounded bg-[var(--accent)] text-white font-medium"
                  >
                    {t('common.save')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingContact(false)}
                    className="px-3 py-1 rounded text-[var(--text-low)]"
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              </div>
            )}

            {/* Action Buttons Grid */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <a
                href={`tel:${chemist?.phone || '+919811023456'}`}
                className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-[var(--bg-2)] hover:bg-[var(--bg-3)] border border-[var(--border)] text-xs font-semibold text-[var(--emerald)] interactive-tactile"
              >
                <LuPhone className="w-3.5 h-3.5" />
                <span className="truncate">{t('citizen.callNearestChemist')}</span>
              </a>

              {profile.emergencyContact?.phone ? (
                <a
                  href={`tel:${profile.emergencyContact.phone}`}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-[var(--bg-2)] hover:bg-[var(--bg-3)] border border-[var(--border)] text-xs font-semibold text-[var(--accent)] interactive-tactile"
                >
                  <LuPhone className="w-3.5 h-3.5" />
                  <span className="truncate">{t('citizen.callMyContact')}</span>
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditingContact(true)}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-[var(--bg-2)] hover:bg-[var(--bg-3)] border border-[var(--border)] text-xs font-semibold text-[var(--text-mid)] interactive-tactile cursor-pointer"
                >
                  <LuUserPlus className="w-3.5 h-3.5" />
                  <span className="truncate">{t('citizen.addEmergencyContact')}</span>
                </button>
              )}

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-[var(--bg-2)] hover:bg-[var(--bg-3)] border border-[var(--border)] text-xs font-semibold text-green-400 interactive-tactile"
              >
                <LuShare2 className="w-3.5 h-3.5" />
                <span className="truncate">{t('citizen.shareMyLocation')}</span>
              </a>

              <a
                href={chemistNavUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-[var(--bg-2)] hover:bg-[var(--bg-3)] border border-[var(--border)] text-xs font-semibold text-[var(--cyan)] interactive-tactile"
              >
                <LuNavigation className="w-3.5 h-3.5" />
                <span className="truncate">{t('citizen.navigateChemist')}</span>
              </a>
            </div>

            {/* Disclaimer */}
            <p className="text-[11px] text-[var(--text-low)] text-center leading-tight pt-1">
              {t('citizen.emergencyDisclaimer')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
