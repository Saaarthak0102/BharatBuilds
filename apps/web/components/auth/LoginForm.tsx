'use client';

import { useState } from 'react';
import { useSession } from '@/lib/auth/useSession';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
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
    <Card className="w-full">
      <h2 className="text-xl font-bold text-center mb-6">Log In</h2>
      {error && <div className="p-3 mb-4 text-sm text-red-600 bg-red-50 rounded-lg">{error}</div>}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Email or Phone</label>
          <input
            type="text"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 border border-border rounded-md focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-white/50"
            placeholder="demo@example.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 border border-border rounded-md focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-white/50"
            placeholder="••••••••"
          />
        </div>
        
        <Button variant="primary" type="submit" className="w-full mt-6" disabled={loading}>
          {loading ? 'Logging in...' : 'Log In'}
        </Button>
      </form>
    </Card>
  );
}
