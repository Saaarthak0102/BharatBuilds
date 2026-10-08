import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { ReactNode } from 'react';

export default function FarmerLayout({ children }: { children: ReactNode }) {
  return <DashboardShell role="farmer">{children}</DashboardShell>;
}
