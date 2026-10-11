'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { createPortal } from 'react-dom';
import {
  LuFlame,
  LuTrash2,
  LuSparkles,
  LuWind,
  LuCheck,
  LuSend,
  LuShieldCheck,
  LuTriangleAlert,
  LuUser,
  LuLayers,
  LuX,
  LuCamera,
  LuMapPin,
  LuClock,
} from 'react-icons/lu';
import { SampleDataBadge } from '@/components/ui/Chip';
import { relativeAgo } from '@/lib/utils/date';
import { CommunityReport } from '@/lib/types';
import { useT } from '@/lib/i18n/useT';

export interface ReportCardProps {
  report: CommunityReport;
  className?: string;
  onClick?: () => void;
  compact?: boolean;
}

export function getCategoryMeta(category: string) {
  switch (category) {
    case 'crop_burning':
      return {
        label: 'Crop burning',
        icon: LuFlame,
        color: 'text-[var(--red)]',
        bg: 'bg-red-500/10 border-red-500/20 text-red-400',
      };
    case 'garbage_burning':
      return {
        label: 'Garbage burning',
        icon: LuTrash2,
        color: 'text-[var(--amber)]',
        bg: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
      };
    case 'cracker_burning':
      return {
        label: 'Firecrackers',
        icon: LuSparkles,
        color: 'text-[var(--violet)]',
        bg: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
      };
    case 'construction_dust':
      return {
        label: 'Construction dust',
        icon: LuWind,
        color: 'text-[var(--cyan)]',
        bg: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400',
      };
    default:
      return {
        label: category ? category.replace(/_/g, ' ') : 'Incident',
        icon: LuFlame,
        color: 'text-[var(--text-mid)]',
        bg: 'bg-[var(--bg-2)] border-[var(--border)] text-[var(--text-mid)]',
      };
  }
}

export function ReportCard({ report, className = '', onClick, compact = false }: ReportCardProps) {
  const { t } = useT();
  const [imgError, setImgError] = useState(false);

  const catMeta = getCategoryMeta(report.category);
  const CatIcon = catMeta.icon;

  const statusKey = (report.status || 'received').toLowerCase();
  const isResolved = statusKey === 'resolved';
  const isRouted = statusKey === 'routed' || isResolved;
  const isReceived = true; // All reached reports are at least received

  const photoSrc = report.photo_url || (report as any).sample_photo || null;

  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border border-[var(--border)] bg-[var(--bg-1)] p-4 sm:p-5 transition-all text-[var(--text-hi)] ${
        onClick ? 'cursor-pointer hover:border-[var(--accent)]/50 hover:bg-[var(--bg-2)]/60' : ''
      } ${className}`}
    >
      {/* Top Header: Category Chip + Badges */}
      <div className="flex items-center justify-between gap-2 flex-wrap mb-3.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${catMeta.bg}`}
          >
            <CatIcon className="w-3.5 h-3.5" />
            <span>{catMeta.label}</span>
          </span>

          {report.needs_review && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
              <LuTriangleAlert className="w-3 h-3" />
              <span>{t('citizen.awaitingReviewNotice') || 'Needs review'}</span>
            </span>
          )}

          {report.is_mine && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-[var(--cyan)]/15 text-[var(--cyan)] border border-[var(--cyan)]/30">
              <LuUser className="w-3 h-3" />
              <span>You</span>
            </span>
          )}

          {Boolean(report.merged_count && report.merged_count > 1) && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--bg-2)] border border-[var(--border)] text-[var(--text-mid)]">
              <LuLayers className="w-3 h-3" />
              <span>{report.merged_count} similar reports merged</span>
            </span>
          )}
        </div>

        {report.is_sample && <SampleDataBadge />}
      </div>

      {/* Main Content: Photo + Details */}
      <div className={`grid gap-4 ${compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-12'} items-center`}>
        {/* Photo Container: strict 4:3 Aspect Ratio */}
        <div className={`relative aspect-[4/3] rounded-xl overflow-hidden bg-[var(--bg-2)] border border-[var(--border)] shrink-0 ${compact ? 'w-full' : 'sm:col-span-5'}`}>
          {photoSrc && !imgError ? (
            <Image
              src={photoSrc}
              alt={`${catMeta.label} report in ${report.area_name || 'area'}`}
              fill
              sizes="(max-width: 640px) 100vw, 320px"
              className="object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-4 text-[var(--text-low)] bg-gradient-to-br from-[var(--bg-2)] to-[var(--bg-1)]">
              <LuCamera className="w-8 h-8 opacity-40 text-[var(--text-mid)]" />
              <span className="text-[11px] font-medium text-[var(--text-mid)] opacity-70">Photo on record</span>
            </div>
          )}
        </div>

        {/* Text Details & Timeline */}
        <div className={`flex flex-col justify-between h-full space-y-3 ${compact ? 'w-full' : 'sm:col-span-7'}`}>
          <div>
            <div className="flex items-center gap-1.5 text-xs text-[var(--text-mid)] mb-1">
              <LuMapPin className="w-3.5 h-3.5 shrink-0 text-[var(--accent)]" />
              <span className="font-semibold text-[var(--text-hi)] truncate">{report.area_name || 'Local Area'}</span>
            </div>

            <div className="flex items-center gap-3 text-xs text-[var(--text-low)]">
              <span className="flex items-center gap-1">
                <LuClock className="w-3 h-3" />
                <span>{relativeAgo(report.created_at)}</span>
              </span>
              <span>•</span>
              <span className="text-[var(--text-mid)] font-medium">
                {report.confidence_label || 'High confidence'}
              </span>
            </div>
          </div>

          {/* Status Timeline */}
          <div className="pt-2 border-t border-[var(--border)]">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-low)] mb-2">
              {t('citizen.statusTimelineTitle') || 'Report Timeline'}
            </div>
            <div className="grid grid-cols-3 gap-1.5 text-center">
              {/* Step 1: Received */}
              <div
                className={`flex flex-col items-center p-2 rounded-lg border text-xs transition-colors ${
                  statusKey === 'received'
                    ? 'bg-[var(--cyan)]/15 border-[var(--cyan)]/40 text-[var(--cyan)] font-bold'
                    : isReceived
                    ? 'bg-[var(--bg-2)] border-[var(--border)] text-[var(--text-hi)] font-medium'
                    : 'bg-[var(--bg-2)]/30 border-transparent text-[var(--text-low)]'
                }`}
              >
                <LuCheck className={`w-3.5 h-3.5 mb-1 ${statusKey === 'received' ? 'text-[var(--cyan)]' : 'text-emerald-400'}`} />
                <span className="text-[10px] leading-tight">{t('citizen.statusReceived') || 'Received'}</span>
              </div>

              {/* Step 2: Routed */}
              <div
                className={`flex flex-col items-center p-2 rounded-lg border text-xs transition-colors ${
                  statusKey === 'routed'
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 font-bold'
                    : isRouted
                    ? 'bg-[var(--bg-2)] border-[var(--border)] text-[var(--text-hi)] font-medium'
                    : 'bg-[var(--bg-2)]/30 border-transparent text-[var(--text-low)]'
                }`}
              >
                <LuSend className={`w-3.5 h-3.5 mb-1 ${statusKey === 'routed' ? 'text-amber-400' : isRouted ? 'text-emerald-400' : ''}`} />
                <span className="text-[10px] leading-tight">{t('citizen.statusRouted') || 'Routed'}</span>
              </div>

              {/* Step 3: Resolved */}
              <div
                className={`flex flex-col items-center p-2 rounded-lg border text-xs transition-colors ${
                  statusKey === 'resolved'
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-bold'
                    : 'bg-[var(--bg-2)]/30 border-transparent text-[var(--text-low)]'
                }`}
              >
                <LuShieldCheck className={`w-3.5 h-3.5 mb-1 ${statusKey === 'resolved' ? 'text-emerald-400' : ''}`} />
                <span className="text-[10px] leading-tight">{t('citizen.statusResolved') || 'Resolved'}</span>
              </div>
            </div>

            <p className="text-[10px] text-[var(--text-low)] italic text-right mt-1.5">
              {t('citizen.routingSimulatedNotice') || 'Routing is simulated'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export interface ReportCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: CommunityReport | null;
}

export function ReportCardModal({ isOpen, onClose, report }: ReportCardModalProps) {
  const [mounted, setMounted] = useState(false);
  const lastActiveElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Focus restore and body scroll lock (ProfileCard pattern)
  useEffect(() => {
    if (isOpen) {
      lastActiveElementRef.current = document.activeElement as HTMLElement;
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      window.addEventListener('keydown', handleKeyDown);

      return () => {
        document.body.style.overflow = originalOverflow;
        window.removeEventListener('keydown', handleKeyDown);
        if (lastActiveElementRef.current && typeof lastActiveElementRef.current.focus === 'function') {
          lastActiveElementRef.current.focus();
        }
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen || !mounted || !report) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-[var(--bg-1)] border border-[var(--border)] p-5 sm:p-6 shadow-2xl text-[var(--text-hi)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Close Button */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <h2 id="report-modal-title" className="text-base font-bold text-[var(--text-hi)]">
              Report Details
            </h2>
            <span className="text-xs text-[var(--text-low)] font-mono">#{report.report_id}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close report details"
            className="p-1.5 rounded-lg text-[var(--text-mid)] hover:text-[var(--text-hi)] hover:bg-[var(--bg-2)] transition-colors"
          >
            <LuX className="w-5 h-5" />
          </button>
        </div>

        {/* Embedded Report Card */}
        <ReportCard report={report} />
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
