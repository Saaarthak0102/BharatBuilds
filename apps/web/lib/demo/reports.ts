import seedReports from '../data/sample_reports.json';
import { CommunityReport } from '../types';
import { haversineDistanceKm } from '../data/reference';

const DEMO_REPORTS_STORAGE_KEY = 'saans_demo_reports';

export interface DemoSubmittedReport extends CommunityReport {
  timestampMs: number;
}

export function getStoredUserReports(): DemoSubmittedReport[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(DEMO_REPORTS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveStoredUserReports(reports: DemoSubmittedReport[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DEMO_REPORTS_STORAGE_KEY, JSON.stringify(reports));
}

/**
 * Calculates real-time status of a demo report:
 * Received (<5s) -> Routed (5s-20s) -> Resolved (>=20s)
 */
export function getDemoReportStatus(createdAtMs: number): 'received' | 'routed' | 'resolved' {
  const elapsed = Date.now() - createdAtMs;
  if (elapsed >= 20000) return 'resolved';
  if (elapsed >= 5000) return 'routed';
  return 'received';
}

export function getDemoCommunityReports(options?: {
  category?: string;
  limit?: number;
}): { reports: CommunityReport[]; is_sample: boolean } {
  // 1. Process seeded sample reports with current-relative timestamps
  const rawSeed = (seedReports as any[]) || [];
  const seedItems: CommunityReport[] = rawSeed.map((r) => {
    const ageMs = (r.sample_age_hours || 12) * 3600 * 1000;
    return {
      report_id: r.report_id,
      category: r.category,
      status: r.status,
      area_name: r.area_name,
      public_lat: r.public_lat,
      public_lng: r.public_lng,
      created_at: new Date(Date.now() - ageMs).toISOString(),
      confidence_label: r.confidence_label,
      needs_review: Boolean(r.needs_review),
      merged_count: r.merged_count || 1,
      photo_url: r.sample_photo || '/sample-reports/r01.jpg',
      is_sample: true,
      is_mine: false,
      location: { lat: r.public_lat, lng: r.public_lng },
    };
  });

  // 2. Process user submitted reports from localStorage
  const userItems = getStoredUserReports().map((ur) => {
    const currentStatus = getDemoReportStatus(ur.timestampMs);
    return {
      ...ur,
      status: currentStatus,
      is_mine: true,
      is_sample: true,
    };
  });

  let merged: CommunityReport[] = [...userItems, ...seedItems];

  if (options?.category) {
    merged = merged.filter((r) => r.category === options.category);
  }

  const limit = options?.limit || 50;
  return {
    reports: merged.slice(0, limit),
    is_sample: true,
  };
}

export function classifyDemoPhoto(_photo_key?: string): {
  category: string;
  confidence: number;
  label: string;
  is_sample: boolean;
} {
  // Deterministic classification
  const conf = 0.88;
  return {
    category: 'crop_burning',
    confidence: conf,
    label: 'Demo classifier',
    is_sample: true,
  };
}

export function submitDemoReport(data: {
  photo_key: string;
  location: { lat: number; lng: number };
  category: string;
  idempotency_key?: string;
}): { report_id: string; status: string; is_sample: boolean } {
  const existingReports = getStoredUserReports();

  // Duplicate check vs nearby same-category reports (within 1.5 km)
  let mergedCount = 1;
  const allReports = getDemoCommunityReports().reports;
  const nearbyMatch = allReports.find((r) => {
    if (r.category !== data.category) return false;
    const rLat = r.public_lat || r.location?.lat;
    const rLng = r.public_lng || r.location?.lng;
    if (rLat == null || rLng == null) return false;
    const dist = haversineDistanceKm(data.location.lat, data.location.lng, rLat, rLng);
    return dist < 1.5;
  });

  if (nearbyMatch) {
    mergedCount = (nearbyMatch.merged_count || 1) + 1;
  }

  const reportId = data.idempotency_key
    ? `rpt-${data.idempotency_key}`
    : `rpt-${Math.random().toString(36).substring(2, 10)}`;

  const nowMs = Date.now();
  const newReport: DemoSubmittedReport = {
    report_id: reportId,
    category: data.category,
    status: 'received',
    area_name: 'Anand Vihar',
    public_lat: data.location.lat,
    public_lng: data.location.lng,
    created_at: new Date(nowMs).toISOString(),
    confidence_label: 'High confidence',
    needs_review: false,
    merged_count: mergedCount,
    photo_url: data.photo_key.startsWith('data:') ? data.photo_key : '/sample-reports/r01.jpg',
    is_sample: true,
    is_mine: true,
    location: data.location,
    timestampMs: nowMs,
  };

  existingReports.unshift(newReport);
  saveStoredUserReports(existingReports);

  return {
    report_id: reportId,
    status: 'received',
    is_sample: true,
  };
}

export function getDemoReport(reportId: string): {
  report_id: string;
  category: string;
  confidence: number | null;
  status: string;
  needs_review: boolean;
  created_at: string;
  location: { lat: number; lng: number };
} {
  const { reports } = getDemoCommunityReports();
  const found = reports.find((r) => r.report_id === reportId);
  const now = new Date().toISOString();

  if (found) {
    return {
      report_id: found.report_id,
      category: found.category,
      confidence: 0.88,
      status: found.status,
      needs_review: Boolean(found.needs_review),
      created_at: found.created_at,
      location: found.location || { lat: found.public_lat || 28.6692, lng: found.public_lng || 77.3055 },
    };
  }

  return {
    report_id: reportId,
    category: 'crop_burning',
    confidence: 0.88,
    status: 'received',
    needs_review: false,
    created_at: now,
    location: { lat: 28.6692, lng: 77.3055 },
  };
}
