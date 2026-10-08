import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { ReactNode } from 'react';

export default function CitizenLayout({ children }: { children: ReactNode }) {
  return <DashboardShell role="citizen">{children}</DashboardShell>;
}
