'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { GlassCard } from '@/components/ui/GlassCard';
import { PillButton } from '@/components/ui/PillButton';
import { AmbientBackground } from '@/components/ui/AmbientBackground';
import { CitizenBackHeader } from '@/components/citizen/CitizenBackHeader';
import {
  getUploadUrl,
  uploadPhoto,
  classifyPhoto,
  submitReport,
  getReport,
} from '@/lib/api/client';
import { mockWards } from '@/lib/mock/wards';
import { useT } from '@/lib/i18n/useT';
import {
  LuCamera,
  LuMapPin,
  LuCheck,
  LuClock,
  LuShieldAlert,
  LuRefreshCw,
  LuMap,
  LuArrowRight,
} from 'react-icons/lu';

type Step = 1 | 2 | 3;
type CategoryKey =
  | 'crop_burning'
  | 'garbage_burning'
  | 'cracker_burning'
  | 'construction_dust';

interface LocationCoords {
  lat: number;
  lng: number;
  wardName: string;
}

const CATEGORIES = [
  { id: 'crop_burning' as const, labelKey: 'citizen.catCropBurning' as const },
  { id: 'garbage_burning' as const, labelKey: 'citizen.catGarbageBurning' as const },
  { id: 'cracker_burning' as const, labelKey: 'citizen.catCrackerBurning' as const },
  { id: 'construction_dust' as const, labelKey: 'citizen.catConstructionDust' as const },
];

export default function CitizenReportPage() {
  const router = useRouter();
  const { t } = useT();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Flow State
  const [currentStep, setCurrentStep] = useState<Step>(1);

  // Step 1: Photo & Location State
  const [selectedFile, setSelectedFile] = useState<Blob | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);

  const [coords, setCoords] = useState<LocationCoords>({
    lat: mockWards[0].lat,
    lng: mockWards[0].lng,
    wardName: mockWards[0].name,
  });
  const [selectedWardId, setSelectedWardId] = useState<string>(mockWards[0].ward_id);
  const [gpsStatus, setGpsStatus] = useState<'detecting' | 'detected' | 'failed'>('detecting');

  // Step 2: Upload & Classification State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedPhotoKey, setUploadedPhotoKey] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<CategoryKey>('crop_burning');
  const [classifiedCategory, setClassifiedCategory] = useState<string | null>(null);
  const [confidenceText, setConfidenceText] = useState<string>('');

  // Step 3: Submission & Status Polling State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [idempotencyKey] = useState<string>(() => Math.random().toString(36).substring(2, 15));
  const [reportId, setReportId] = useState<string | null>(null);
  const [reportStatus, setReportStatus] = useState<'received' | 'routed' | 'resolved'>('received');
  const [needsReview, setNeedsReview] = useState(false);

  // 1. Geolocation detection on mount
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsStatus('failed');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          lat: Number(pos.coords.latitude.toFixed(5)),
          lng: Number(pos.coords.longitude.toFixed(5)),
          wardName: 'Current GPS Location',
        });
        setGpsStatus('detected');
      },
      () => {
        setGpsStatus('failed');
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  }, []);

  // 2. Client-side downscale and validate image
  const processImageFile = async (file: File) => {
    setIsProcessingPhoto(true);
    setPhotoError(null);

    // Validate type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setPhotoError('Please select a JPEG, PNG, or WebP image.');
      setIsProcessingPhoto(false);
      return;
    }

    try {
      const { blob, previewUrl } = await downscaleImageToJpeg(file);

      // Check max size 5 MB (5 * 1024 * 1024 bytes)
      if (blob.size > 5 * 1024 * 1024) {
        setPhotoError(
          t('citizen.fileSizeExceeded') ||
            'Compressed file size exceeds 5 MB. Please choose a smaller photo.'
        );
        setIsProcessingPhoto(false);
        return;
      }

      setSelectedFile(blob);
      setPhotoPreview(previewUrl);
    } catch (err: any) {
      setPhotoError(err.message || 'Failed to process image. Please try another file.');
    } finally {
      setIsProcessingPhoto(false);
    }
  };

  const downscaleImageToJpeg = (file: File): Promise<{ blob: Blob; previewUrl: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          const maxLongEdge = 1280;

          if (width > maxLongEdge || height > maxLongEdge) {
            if (width > height) {
              height = Math.round((height * maxLongEdge) / width);
              width = maxLongEdge;
            } else {
              width = Math.round((width * maxLongEdge) / height);
              height = maxLongEdge;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas context not available'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Image conversion failed'));
                return;
              }
              const previewUrl = URL.createObjectURL(blob);
              resolve({ blob, previewUrl });
            },
            'image/jpeg',
            0.85
          );
        };
        img.onerror = () => reject(new Error('Failed to load image for downscaling'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read image file'));
      reader.readAsDataURL(file);
    });
  };

  const handleManualWardSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const wardId = e.target.value;
    setSelectedWardId(wardId);
    const ward = mockWards.find((w) => w.ward_id === wardId);
    if (ward) {
      setCoords({
        lat: ward.lat,
        lng: ward.lng,
        wardName: ward.name,
      });
    }
  };

  // 3. Step 1 -> Step 2: Upload, Put to S3, Classify
  const handleProceedToStep2 = async () => {
    if (!selectedFile) return;
    setCurrentStep(2);
    await uploadAndClassify(selectedFile);
  };

  const uploadAndClassify = async (blob: Blob) => {
    setIsUploading(true);
    setUploadError(null);

    try {
      // Step 2A: Get presigned URL
      const urlRes = await getUploadUrl({
        content_type: 'image/jpeg',
        file_size: blob.size,
      });

      const { upload_url, photo_key } = urlRes.data;
      setUploadedPhotoKey(photo_key);

      // Step 2B: PUT to presigned URL
      await uploadPhoto(upload_url, blob, 'image/jpeg');

      // Step 2C: Classify via Vision AI
      try {
        const classifyRes = await classifyPhoto({ photo_key });
        const { category, confidence: conf } = classifyRes.data;
        setClassifiedCategory(category);

        if (
          category &&
          ['crop_burning', 'garbage_burning', 'cracker_burning', 'construction_dust'].includes(
            category
          )
        ) {
          setSelectedCategory(category as CategoryKey);
        }

        if (category === 'none' || !conf || conf < 0.5) {
          setConfidenceText(t('citizen.confidenceLow') || 'Not sure, please choose');
        } else if (conf >= 0.8) {
          setConfidenceText(
            `${t('citizen.confidenceHigh') || 'High confidence'} (${Math.round(conf * 100)}%)`
          );
        } else {
          setConfidenceText(
            `${t('citizen.confidenceModerate') || 'Moderate confidence'} (${Math.round(conf * 100)}%)`
          );
        }
      } catch (classifyErr) {
        // Classify failure: allow manual selection and proceed gracefully
        console.warn('Classify failed, falling back to manual selection', classifyErr);
        setConfidenceText(t('citizen.confidenceLow') || 'Not sure, please choose');
      }
    } catch (err: any) {
      if (err.message?.includes('401')) {
        router.push('/login');
        return;
      }
      if (err.message?.includes('403')) {
        setUploadError('Access denied: incorrect user role or permission.');
      } else if (err.message?.includes('413')) {
        setUploadError('File size too large (maximum 5 MB).');
      } else if (err.message?.includes('429')) {
        setUploadError('Daily report rate limit reached. Please try again tomorrow.');
      } else {
        setUploadError(
          err.message || (t('citizen.uploadFailedRetry') || 'Upload failed. Please try again.')
        );
      }
    } finally {
      setIsUploading(false);
    }
  };

  // 4. Step 2 -> Step 3: Submit Report
  const handleSubmitReport = async () => {
    if (!uploadedPhotoKey) return;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const res = await submitReport({
        photo_key: uploadedPhotoKey,
        location: { lat: coords.lat, lng: coords.lng },
        category: selectedCategory,
        idempotency_key: idempotencyKey,
      });

      const newReportId = res.data.report_id;
      setReportId(newReportId);
      setReportStatus((res.data.status as any) || 'received');
      setCurrentStep(3);
    } catch (err: any) {
      if (err.message?.includes('401')) {
        router.push('/login');
        return;
      }
      if (err.message?.includes('403')) {
        setSubmitError('Forbidden: your account does not have permission to submit reports.');
      } else if (err.message?.includes('429')) {
        setSubmitError('Daily rate limit reached. Please try again tomorrow.');
      } else if (err.message?.includes('400')) {
        setSubmitError('Invalid report data submitted. Please check the inputs.');
      } else {
        setSubmitError(err.message || 'Failed to submit report. Please retry.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // 5. Step 3: Polling for Report Status
  useEffect(() => {
    if (currentStep !== 3 || !reportId) return;

    const startTime = Date.now();
    let pollInterval = 3000;
    let timerId: NodeJS.Timeout | null = null;
    let isCancelled = false;

    async function poll() {
      if (isCancelled || !reportId) return;

      try {
        const res = await getReport(reportId);
        if (res?.data) {
          const st = res.data.status.toLowerCase();
          if (st === 'resolved' || st === 'routed' || st === 'received') {
            setReportStatus(st as any);
          }
          if (res.data.needs_review !== undefined) {
            setNeedsReview(res.data.needs_review);
          }

          if (st === 'resolved') {
            return; // Finished
          }
        }
      } catch (err) {
        console.warn('Error polling report status', err);
      }

      const elapsed = Date.now() - startTime;
      pollInterval = elapsed < 60000 ? 3000 : 15000;

      if (!isCancelled) {
        timerId = setTimeout(poll, pollInterval);
      }
    }

    timerId = setTimeout(poll, pollInterval);

    return () => {
      isCancelled = true;
      if (timerId) clearTimeout(timerId);
    };
  }, [currentStep, reportId]);

  return (
    <div className="w-full pb-20">
      <AmbientBackground accent="amber" />

      <CitizenBackHeader
        title={t('citizen.reportBurning') || 'Report Burning Incident'}
      />

      <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 mt-6 space-y-6">
        {/* Step Indicator Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span
              className={`text-xs sm:text-sm font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border transition-colors ${
                currentStep === 1
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                  : currentStep > 1
                  ? 'bg-[var(--emerald)]/20 text-[var(--emerald)] border-[var(--emerald)]/40'
                  : 'text-[var(--text-low)] border-transparent'
              }`}
            >
              {t('citizen.stepPhoto') || '1. Photo'}
            </span>
            <LuArrowRight className="w-3.5 h-3.5 text-[var(--text-low)]" />
            <span
              className={`text-xs sm:text-sm font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border transition-colors ${
                currentStep === 2
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                  : currentStep > 2
                  ? 'bg-[var(--emerald)]/20 text-[var(--emerald)] border-[var(--emerald)]/40'
                  : 'text-[var(--text-low)] border-transparent'
              }`}
            >
              {t('citizen.stepConfirm') || '2. Confirm'}
            </span>
            <LuArrowRight className="w-3.5 h-3.5 text-[var(--text-low)]" />
            <span
              className={`text-xs sm:text-sm font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border transition-colors ${
                currentStep === 3
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                  : 'text-[var(--text-low)] border-transparent'
              }`}
            >
              {t('citizen.stepStatus') || '3. Status'}
            </span>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* STEP 1: PHOTO & LOCATION                                             */}
        {/* ==================================================================== */}
        {currentStep === 1 && (
          <GlassCard className="p-6 space-y-6 border border-amber-500/20">
            <div>
              <h2 className="text-xl font-serif italic text-[var(--text-hi)] mb-1">
                {t('citizen.takeOrUploadPhoto') || 'Take or upload incident photo'}
              </h2>
              <p className="text-xs text-[var(--text-mid)]">
                {t('citizen.cameraHint') || 'JPEG, PNG, WebP (maximum 5 MB after compression)'}
              </p>
            </div>

            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              aria-label="Upload incident photo"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) processImageFile(file);
              }}
            />

            {/* Upload Area / Preview */}
            {!photoPreview ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessingPhoto}
                className="w-full h-52 sm:h-60 rounded-2xl border-2 border-dashed border-[var(--border-strong)] hover:border-amber-400/60 bg-[var(--bg-2)]/60 hover:bg-[var(--bg-2)] flex flex-col items-center justify-center gap-3 text-[var(--text-mid)] hover:text-[var(--text-hi)] transition-colors group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              >
                <div className="w-14 h-14 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <LuCamera className="w-7 h-7" />
                </div>
                <div className="text-center px-4">
                  <p className="text-sm font-semibold text-[var(--text-hi)]">
                    {isProcessingPhoto
                      ? 'Processing photo...'
                      : t('citizen.takeOrUploadPhoto') || 'Tap to take photo or choose file'}
                  </p>
                  <p className="text-xs text-[var(--text-low)] mt-1">
                    Auto-downscaled to max 1280px
                  </p>
                </div>
              </button>
            ) : (
              <div className="space-y-3">
                <div className="relative rounded-2xl overflow-hidden border border-[var(--border)] max-h-72 bg-black flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photoPreview}
                    alt="Incident preview"
                    className="max-h-72 w-auto object-contain"
                  />
                  <div className="absolute top-3 right-3">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-full bg-black/70 hover:bg-black text-xs font-semibold text-white backdrop-blur-md border border-white/20 transition-colors"
                    >
                      {t('citizen.changePhoto') || 'Change Photo'}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-[var(--text-low)]">
                  <span>JPEG encoded</span>
                  <span>{selectedFile ? `${(selectedFile.size / 1024).toFixed(0)} KB` : ''}</span>
                </div>
              </div>
            )}

            {photoError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-center gap-2">
                <LuShieldAlert className="w-4 h-4 shrink-0" />
                <span>{photoError}</span>
              </div>
            )}

            {/* Location Section: GPS detection + Always visible ward override */}
            <div className="pt-2 border-t border-[var(--border)] space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[var(--text-mid)] uppercase tracking-wider flex items-center gap-1.5">
                  <LuMapPin className="w-3.5 h-3.5 text-amber-400" />
                  <span>Location</span>
                </span>
                <span
                  className={`text-[11px] font-medium ${
                    gpsStatus === 'detected'
                      ? 'text-[var(--emerald)]'
                      : gpsStatus === 'detecting'
                      ? 'text-amber-400 animate-pulse'
                      : 'text-[var(--text-low)]'
                  }`}
                >
                  {gpsStatus === 'detected'
                    ? t('citizen.gpsDetected') || 'GPS location detected'
                    : gpsStatus === 'detecting'
                    ? t('citizen.detectingGps') || 'Detecting GPS...'
                    : t('citizen.gpsFailed') || 'GPS fallback to ward'}
                </span>
              </div>

              {/* Coordinates display */}
              <div className="p-3 rounded-xl bg-[var(--bg-1)] border border-[var(--border)] text-xs text-[var(--text-mid)] flex items-center justify-between">
                <span>Coordinates:</span>
                <span className="font-mono text-[var(--text-hi)]">
                  {coords.lat.toFixed(4)}° N, {coords.lng.toFixed(4)}° E
                </span>
              </div>

              {/* Always visible manual override ward picker */}
              <div>
                <label
                  htmlFor="ward-picker"
                  className="block text-[11px] font-semibold text-[var(--text-low)] uppercase tracking-wider mb-1"
                >
                  {t('citizen.wardSelect') || 'Ward Override (Always Visible)'}
                </label>
                <select
                  id="ward-picker"
                  value={selectedWardId}
                  onChange={handleManualWardSelect}
                  className="w-full py-2.5 px-3 bg-[var(--bg-1)] border border-[var(--border)] rounded-xl text-sm font-medium text-[var(--text-hi)] hover:border-amber-400/40 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-colors cursor-pointer"
                >
                  {mockWards.map((w) => (
                    <option key={w.ward_id} value={w.ward_id} className="bg-[var(--bg-0)]">
                      {w.name} ({w.zone}) - {w.lat.toFixed(2)}, {w.lng.toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Primary Action Button */}
            <div className="pt-2">
              <PillButton
                variant="accent"
                onClick={handleProceedToStep2}
                disabled={!selectedFile || isProcessingPhoto || !!photoError}
                className="w-full py-3.5 flex items-center justify-center gap-2 text-base font-semibold"
              >
                <span>{t('citizen.continueToConfirm') || 'Continue to Review'}</span>
                <LuArrowRight className="w-5 h-5" />
              </PillButton>
            </div>
          </GlassCard>
        )}

        {/* ==================================================================== */}
        {/* STEP 2: CONFIRM & CATEGORY SELECTION                                 */}
        {/* ==================================================================== */}
        {currentStep === 2 && (
          <GlassCard className="p-6 space-y-6 border border-amber-500/20">
            <div>
              <h2 className="text-xl font-serif italic text-[var(--text-hi)] mb-1">
                {t('citizen.chooseCategory') || 'Review & Confirm Incident Category'}
              </h2>
              <p className="text-xs text-[var(--text-mid)]">
                Our vision model analyzes your photo. Verify or update the category below.
              </p>
            </div>

            {/* Upload & Classify In Progress */}
            {isUploading && (
              <div className="p-6 rounded-2xl bg-[var(--bg-1)] border border-[var(--border)] flex flex-col items-center justify-center text-center space-y-3">
                <LuRefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
                <p className="text-sm font-medium text-[var(--text-hi)]">
                  {t('citizen.uploadingAndClassifying') || 'Uploading photo and analyzing image...'}
                </p>
                <p className="text-xs text-[var(--text-low)]">Stripping EXIF and running classification</p>
              </div>
            )}

            {/* Upload Error with Retry */}
            {uploadError && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 space-y-3">
                <div className="flex items-center gap-2">
                  <LuShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{uploadError}</span>
                </div>
                {selectedFile && (
                  <PillButton
                    variant="accent"
                    onClick={() => uploadAndClassify(selectedFile)}
                    className="text-xs py-1.5 px-3"
                  >
                    {t('common.retry') || 'Retry Upload'}
                  </PillButton>
                )}
              </div>
            )}

            {!isUploading && (
              <>
                {/* Confidence banner */}
                {confidenceText && (
                  <div className="p-3 rounded-xl bg-[var(--bg-1)] border border-[var(--border)] flex items-center justify-between text-xs">
                    <span className="text-[var(--text-mid)]">Model Assessment:</span>
                    <span className="font-semibold text-amber-400">{confidenceText}</span>
                  </div>
                )}

                {/* 4 Fixed Selectable Category Chips */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-[var(--text-mid)] uppercase tracking-wider">
                    {t('citizen.chooseCategory') || 'Select Incident Category'}
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {CATEGORIES.map((cat) => {
                      const isSelected = selectedCategory === cat.id;
                      const isSuggested = classifiedCategory === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setSelectedCategory(cat.id)}
                          className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
                            isSelected
                              ? 'bg-amber-500/15 border-amber-400 text-[var(--text-hi)] shadow-md shadow-amber-500/10'
                              : 'bg-[var(--bg-1)]/60 border-[var(--border)] hover:border-[var(--border-strong)] text-[var(--text-mid)]'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-sm font-semibold text-[var(--text-hi)]">
                              {t(cat.labelKey) || cat.id.replace('_', ' ')}
                            </span>
                            {isSelected && <LuCheck className="w-4 h-4 text-amber-400" />}
                          </div>
                          {isSuggested && (
                            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wide">
                              Suggested
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Location Confirmation Details */}
                <div className="p-3.5 rounded-xl bg-[var(--bg-1)] border border-[var(--border)] text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--text-low)]">Location:</span>
                    <span className="font-medium text-[var(--text-hi)]">{coords.wardName}</span>
                  </div>
                  <div className="flex items-center justify-between font-mono text-[11px] text-[var(--text-mid)]">
                    <span>GPS Coordinates:</span>
                    <span>
                      {coords.lat.toFixed(4)}° N, {coords.lng.toFixed(4)}° E
                    </span>
                  </div>
                </div>

                {/* Submit Error */}
                {submitError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-center gap-2">
                    <LuShieldAlert className="w-4 h-4 shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}

                {/* Primary Action Button */}
                <div className="pt-2 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    disabled={isSubmitting}
                    className="px-4 py-3 text-sm font-semibold text-[var(--text-mid)] hover:text-[var(--text-hi)] transition-colors"
                  >
                    {t('citizen.back') || 'Back'}
                  </button>
                  <PillButton
                    variant="accent"
                    onClick={handleSubmitReport}
                    disabled={isSubmitting || !uploadedPhotoKey}
                    className="flex-1 py-3.5 flex items-center justify-center gap-2 text-base font-semibold"
                  >
                    {isSubmitting ? (
                      <>
                        <LuRefreshCw className="w-4 h-4 animate-spin" />
                        <span>{t('citizen.submittingReport') || 'Submitting...'}</span>
                      </>
                    ) : (
                      <>
                        <span>{t('citizen.submitReportAction') || 'Submit Report'}</span>
                        <LuArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </PillButton>
                </div>
              </>
            )}
          </GlassCard>
        )}

        {/* ==================================================================== */}
        {/* STEP 3: STATUS TIMELINE & DETAILS                                    */}
        {/* ==================================================================== */}
        {currentStep === 3 && (
          <GlassCard className="p-6 space-y-6 border border-[var(--emerald)]/20">
            <div>
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-xl font-serif italic text-[var(--text-hi)]">
                  {t('citizen.statusTimelineTitle') || 'Report Status'}
                </h2>
                {reportId && (
                  <span className="text-xs font-mono text-[var(--text-low)] bg-[var(--bg-2)] px-2 py-0.5 rounded">
                    {reportId}
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--text-mid)]">
                Incident reports are dispatched to local zonal field authorities.
              </p>
            </div>

            {/* Needs Review Badge */}
            {needsReview && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-400 flex items-center gap-2">
                <LuClock className="w-4 h-4 shrink-0" />
                <span>{t('citizen.awaitingReviewNotice') || 'Awaiting manual zonal review'}</span>
              </div>
            )}

            {/* Status Timeline */}
            <div className="py-4 px-2">
              <div className="grid grid-cols-3 gap-2 relative">
                {/* Connecting Line */}
                <div className="absolute top-5 left-1/6 right-1/6 h-0.5 bg-[var(--border)] -z-0" />

                {/* 1. Received */}
                <div className="flex flex-col items-center text-center relative z-10 space-y-2">
                  <div
                    className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${
                      reportStatus === 'received' ||
                      reportStatus === 'routed' ||
                      reportStatus === 'resolved'
                        ? 'bg-[var(--emerald)]/20 border-[var(--emerald)] text-[var(--emerald)]'
                        : 'bg-[var(--bg-1)] border-[var(--border)] text-[var(--text-low)]'
                    }`}
                  >
                    <LuCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[var(--text-hi)] block">
                      {t('citizen.statusReceived') || 'Received'}
                    </span>
                    <span className="text-[10px] text-[var(--text-low)]">Logged</span>
                  </div>
                </div>

                {/* 2. Routed */}
                <div className="flex flex-col items-center text-center relative z-10 space-y-2">
                  <div
                    className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${
                      reportStatus === 'routed' || reportStatus === 'resolved'
                        ? 'bg-[var(--emerald)]/20 border-[var(--emerald)] text-[var(--emerald)]'
                        : reportStatus === 'received'
                        ? 'bg-amber-500/20 border-amber-400 text-amber-400 animate-pulse'
                        : 'bg-[var(--bg-1)] border-[var(--border)] text-[var(--text-low)]'
                    }`}
                  >
                    {reportStatus === 'routed' || reportStatus === 'resolved' ? (
                      <LuCheck className="w-5 h-5" />
                    ) : (
                      <LuClock className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[var(--text-hi)] block">
                      {t('citizen.statusRouted') || 'Routed'}
                    </span>
                    <span className="text-[10px] text-[var(--text-low)]">Assigned to team</span>
                  </div>
                </div>

                {/* 3. Resolved */}
                <div className="flex flex-col items-center text-center relative z-10 space-y-2">
                  <div
                    className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${
                      reportStatus === 'resolved'
                        ? 'bg-[var(--emerald)]/20 border-[var(--emerald)] text-[var(--emerald)]'
                        : 'bg-[var(--bg-1)] border-[var(--border)] text-[var(--text-low)]'
                    }`}
                  >
                    <LuCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[var(--text-hi)] block">
                      {t('citizen.statusResolved') || 'Resolved'}
                    </span>
                    <span className="text-[10px] text-[var(--text-low)]">Action completed</span>
                  </div>
                </div>
              </div>

              {/* Routing is simulated caption */}
              <div className="mt-6 text-center">
                <span className="text-[11px] text-[var(--text-low)] uppercase tracking-wider bg-[var(--bg-2)] px-3 py-1 rounded-full border border-[var(--border)]">
                  {t('citizen.routingSimulatedNotice') || 'Routing is simulated'}
                </span>
              </div>
            </div>

            {/* Report Summary Details */}
            <div className="p-4 rounded-xl bg-[var(--bg-1)]/80 border border-[var(--border)] space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-low)]">Category:</span>
                <span className="font-semibold text-amber-400 capitalize">
                  {selectedCategory.replace('_', ' ')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-low)]">Location:</span>
                <span className="font-medium text-[var(--text-hi)]">{coords.wardName}</span>
              </div>
              <div className="flex items-center justify-between font-mono text-[11px]">
                <span className="text-[var(--text-low)]">Coordinates:</span>
                <span className="text-[var(--text-mid)]">
                  {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
                </span>
              </div>
            </div>

            {/* Actions: View on map & Back to Dashboard */}
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
              <Link
                href="/map"
                className="w-full sm:flex-1 py-3 px-4 rounded-full bg-[var(--bg-2)] hover:bg-[var(--bg-3)] border border-[var(--border)] text-sm font-semibold text-[var(--text-hi)] flex items-center justify-center gap-2 transition-colors"
              >
                <LuMap className="w-4 h-4 text-[var(--accent)]" />
                <span>{t('citizen.viewOnMap') || 'View on Map'}</span>
              </Link>
              <Link
                href="/citizen"
                className="w-full sm:flex-1 py-3 px-4 rounded-full bg-[var(--accent)] hover:opacity-90 text-sm font-semibold text-[var(--bg-0)] flex items-center justify-center gap-2 transition-opacity"
              >
                <span>{t('citizen.backToDashboard') || 'Back to Dashboard'}</span>
              </Link>
            </div>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
