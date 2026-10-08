'use client';

import { useState } from 'react';
import { useSession } from '@/lib/auth/useSession';
import { PillButton } from '../ui/PillButton';
import { GlassCard } from '../ui/GlassCard';
import { useRouter } from 'next/navigation';
import { getDashboardPath } from '@/lib/auth/roleRedirect';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, loading } = useSession();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const session = await login({ email, password });
      router.push(getDashboardPath(session.role));
    } catch (err: any) {
      setError(err.message || 'Login failed');
    }
  };

  return (
    <GlassCard className="w-full">
      <h2 className="text-xl font-bold text-[var(--text-hi)] text-center mb-6">Log In</h2>
      {error && <div className="p-3 mb-4 text-sm text-[var(--red)] bg-[var(--red)]/10 border border-[var(--red)]/20 rounded-lg">{error}</div>}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[var(--text-mid)] mb-1">Email or Phone</label>
          <input
            type="text"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 border border-[var(--border)] rounded-md focus:ring-1 focus:ring-[var(--accent)] focus:border-[var(--accent)] bg-[var(--bg-1)] text-[var(--text-hi)] outline-none transition-all placeholder-[var(--text-low)]"
            placeholder="demo@example.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text-mid)] mb-1">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 border border-[var(--border)] rounded-md focus:ring-1 focus:ring-[var(--accent)] focus:border-[var(--accent)] bg-[var(--bg-1)] text-[var(--text-hi)] outline-none transition-all placeholder-[var(--text-low)]"
            placeholder="••••••••"
          />
        </div>
        
        <PillButton variant="primary-silver" type="submit" className="w-full mt-6 flex justify-center" disabled={loading}>
          {loading ? 'Logging in...' : 'Log In'}
        </PillButton>
      </form>
    </GlassCard>
  );
}
