import { Report } from '../types';

export const mockReports: Report[] = [
  {
    report_id: 'rpt-001',
    category: 'crop_burning',
    confidence: 0.92,
    status: 'routed',
    location: { lat: 28.65, lng: 77.25 },
    created_at: '2024-11-05T08:30:00Z',
    is_sample: true,
  },
  {
    report_id: 'rpt-002',
    category: 'garbage_burning',
    confidence: 0.85,
    status: 'received',
    location: { lat: 28.63, lng: 77.22 },
    created_at: '2024-11-05T10:15:00Z',
    is_sample: true,
  },
  {
    report_id: 'rpt-003',
    category: 'construction_dust',
    confidence: 0.78,
    status: 'resolved',
    location: { lat: 28.68, lng: 77.3 },
    created_at: '2024-11-04T14:00:00Z',
    is_sample: true,
  },
];
