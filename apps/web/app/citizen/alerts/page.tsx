'use client';

import React, { useState, useEffect } from 'react';
import { CitizenBackHeader } from '@/components/citizen/CitizenBackHeader';
import { GlassCard } from '@/components/ui/GlassCard';
import { PillButton } from '@/components/ui/PillButton';
import { Chip } from '@/components/ui/Chip';
import { AmbientBackground } from '@/components/ui/AmbientBackground';
import { apiClient } from '@/lib/api/client';
import { isDemoMode } from '@/lib/demo';
import { LuBell, LuCheck, LuShieldAlert, LuSend, LuInfo } from 'react-icons/lu';

const PRESET_THRESHOLDS = [100, 150, 200, 300];

export default function CitizenAlertsPage() {
  const [enabled, setEnabled] = useState(true);
  const [threshold, setThreshold] = useState<number>(200);
  const [savedToast, setSavedToast] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<string>('default');
  const [testAlertSent, setTestAlertSent] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedEn = localStorage.getItem('saans_alert_enabled');
      if (savedEn !== null) setEnabled(savedEn === 'true');

      const savedThresh = localStorage.getItem('saans_alert_threshold');
      if (savedThresh) setThreshold(Number(savedThresh));

      if ('Notification' in window) {
        setNotificationPermission(Notification.permission);
      }
    }
  }, []);

  const handleSave = async () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('saans_alert_enabled', String(enabled));
      localStorage.setItem('saans_alert_threshold', String(threshold));
      try {
        const demoEmail = process.env.NEXT_PUBLIC_DEMO_CITIZEN_EMAIL || 'citizen.demo@saans.internal';
        await apiClient.subscriptions.create({
          area_id: 'ward-east-delhi-001',
          threshold,
          email: demoEmail,
        });
      } catch (err) {
        if (!isDemoMode()) {
          console.error('Failed to create subscription on server:', err);
        }
      }
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 3000);
    }
  };

  const handleEnableBrowserNotifications = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        setNotificationPermission(perm);
      } catch (err) {
        console.warn('Could not request notification permission', err);
      }
    }
  };

  const handleSendTestAlert = () => {
    setTestAlertSent(true);
    setTimeout(() => setTestAlertSent(false), 4000);

    // Browser Notification if granted
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('Saans Air Quality Alert (Test)', {
          body: `Test Alert: Smoke concentration in Anand Vihar has reached AQI 312 (Threshold: ${threshold}). Wear an N95 mask.`,
          icon: '/icon.png',
        });
      } catch {
        // ignore
      }
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-0)] text-white relative pb-12">
      <AmbientBackground />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-6 relative z-10 space-y-6">
        <CitizenBackHeader title="Air Quality Alerts" />

        {/* Saved confirmation toast */}
        {savedToast && (
          <div className="p-3 rounded-xl bg-[var(--emerald)]/15 border border-[var(--emerald)]/30 text-[var(--emerald)] text-xs flex items-center gap-2 animate-in fade-in duration-200">
            <LuCheck className="w-4 h-4 shrink-0" />
            <span>Settings saved successfully to device storage.</span>
          </div>
        )}

        {/* Test alert banner feedback */}
        {testAlertSent && (
          <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs flex items-center justify-between gap-2 animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <LuShieldAlert className="w-4 h-4 shrink-0 text-amber-400" />
              <span>
                <strong>Test Alert Fired:</strong> AQI is 312, surpassing your threshold of {threshold}.
              </span>
            </div>
            <Chip variant="accent" className="bg-amber-500/20 text-amber-300 text-xs">
              In-app toast
            </Chip>
          </div>
        )}

        {/* Alert Threshold Card */}
        <GlassCard data-accent="cyan" className="p-6 rounded-2xl border border-[var(--border)] space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--cyan)]/10 border border-[var(--cyan)]/30 flex items-center justify-center text-[var(--cyan)]">
                <LuBell className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[var(--text-hi)]">Alert Notifications</h2>
                <p className="text-xs text-[var(--text-mid)]">
                  Receive alerts when pollution crosses your chosen threshold.
                </p>
              </div>
            </div>

            {/* On / Off switch */}
            <button
              type="button"
              onClick={() => setEnabled(!enabled)}
              className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                enabled ? 'bg-[var(--cyan)] justify-end' : 'bg-[var(--bg-3)] justify-start'
              }`}
              aria-label="Toggle alerts"
            >
              <div className="bg-white w-4 h-4 rounded-full shadow-md" />
            </button>
          </div>

          {/* Threshold Selection */}
          <div className={`space-y-4 transition-opacity ${enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-low)] block mb-2">
                Trigger Threshold (AQI)
              </label>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {PRESET_THRESHOLDS.map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setThreshold(val)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                      threshold === val
                        ? 'bg-[var(--cyan)]/20 border-[var(--cyan)] text-[var(--cyan)] shadow-md'
                        : 'bg-[var(--bg-1)] border-[var(--border)] text-[var(--text-mid)] hover:border-[var(--border-strong)]'
                    }`}
                  >
                    AQI {val}
                  </button>
                ))}
              </div>

              {/* Number Input */}
              <div className="flex items-center gap-3">
                <label htmlFor="custom-aqi-input" className="text-xs text-[var(--text-mid)]">Custom:</label>
                <input
                  id="custom-aqi-input"
                  type="number"
                  min="50"
                  max="500"
                  step="10"
                  value={threshold}
                  onChange={(e) => setThreshold(Math.max(0, Number(e.target.value)))}
                  className="w-28 px-3 py-1.5 rounded-lg bg-[var(--bg-1)] border border-[var(--border)] text-sm font-mono text-[var(--text-hi)] focus:outline-none focus:border-[var(--cyan)]"
                />
                <span className="text-xs text-[var(--text-low)]">PM2.5 / National AQI</span>
              </div>
            </div>

            {/* Spec note copy */}
            <div className="p-3 rounded-xl bg-[var(--bg-1)]/60 border border-[var(--border)] text-xs text-[var(--text-mid)] flex items-start gap-2">
              <LuInfo className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
              <span>In-app alerts in the demo; email alerts need confirmation.</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <PillButton variant="accent" onClick={handleSave} className="text-xs px-5">
              Save to Storage
            </PillButton>

            {notificationPermission !== 'granted' && (
              <PillButton variant="glass" onClick={handleEnableBrowserNotifications} className="text-xs px-4">
                Enable Notifications
              </PillButton>
            )}

            <button
              type="button"
              onClick={handleSendTestAlert}
              className="inline-flex items-center gap-1.5 text-xs text-amber-300 hover:text-amber-200 bg-amber-500/10 border border-amber-500/30 px-3.5 py-2 rounded-full transition-colors cursor-pointer"
            >
              <LuSend className="w-3.5 h-3.5" />
              <span>Send test alert</span>
            </button>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
