'use client';

import { Suspense } from 'react';
import { AuthShell } from '@/components/auth/AuthShell';
import { RoleSelector } from '@/components/auth/RoleSelector';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { GlassCard } from '@/components/ui/GlassCard';
import { PillButton } from '@/components/ui/PillButton';

function SignupFlow() {
  const searchParams = useSearchParams();
  const roleParam = searchParams.get('role');
  
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

  return (
    <GlassCard className="w-full">
      <h2 className="text-xl font-bold text-center text-[var(--text-hi)] mb-6">
        Sign up as {roleParam === 'farmer' ? 'Farmer' : 'Citizen'}
      </h2>
      <p className="text-sm text-[var(--text-mid)] text-center mb-6">
        (Signup form implementation goes here)
      </p>
      
      {/* Mock fast-forward for demo */}
      <button 
        onClick={() => window.location.href = roleParam === 'farmer' ? '/farmer' : '/citizen'}
        className="w-full bg-[var(--bg-2)] border border-[var(--border)] text-[var(--text-hi)] py-3 rounded-full interactive-tactile font-medium mb-4"
      >
        Quick Demo Login
      </button>
      
      <div className="mt-4 text-center">
        <Link href="/signup" className="text-sm text-[var(--text-mid)] hover:text-[var(--text-hi)] transition-colors">
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
