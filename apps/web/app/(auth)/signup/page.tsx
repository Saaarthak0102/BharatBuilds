'use client';

import { Suspense } from 'react';
import { AuthShell } from '@/components/auth/AuthShell';
import { RoleSelector } from '@/components/auth/RoleSelector';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

function SignupFlow() {
  const searchParams = useSearchParams();
  const roleParam = searchParams.get('role');
  
  if (!roleParam || (roleParam !== 'farmer' && roleParam !== 'citizen')) {
    return (
      <>
        <RoleSelector onSelect={(r) => window.location.href = `/signup?role=${r}`} />
        <p className="mt-6 text-center text-sm text-text-secondary">
          Already have an account?{' '}
          <Link href="/login" className="text-brand-600 hover:text-brand-700 font-medium">
            Log in
          </Link>
        </p>
      </>
    );
  }

  return (
    <div className="glass-card p-6 w-full">
      <h2 className="text-xl font-bold text-center mb-6">
        Sign up as {roleParam === 'farmer' ? 'Farmer' : 'Citizen'}
      </h2>
      <p className="text-sm text-text-secondary text-center mb-6">
        (Signup form implementation goes here)
      </p>
      
      {/* Mock fast-forward for demo */}
      <button 
        onClick={() => window.location.href = roleParam === 'farmer' ? '/farmer' : '/citizen'}
        className="w-full bg-brand-500 text-white py-3 rounded-full hover:bg-brand-600 transition-colors font-medium"
      >
        Quick Demo Login
      </button>
      
      <div className="mt-4 text-center">
        <Link href="/signup" className="text-sm text-text-secondary hover:text-text-primary">
          ← Back to roles
        </Link>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <AuthShell>
      <Suspense fallback={<div className="text-center p-8">Loading...</div>}>
        <SignupFlow />
      </Suspense>
    </AuthShell>
  );
}
