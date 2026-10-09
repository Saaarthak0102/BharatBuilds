import { AuthShell } from '@/components/auth/AuthShell';
import { LoginForm } from '@/components/auth/LoginForm';
import Link from 'next/link';

export default function LoginPage() {
  return (
    <AuthShell>
      <LoginForm />
      <p className="mt-6 text-center text-sm text-text-secondary">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="text-brand-600 hover:text-brand-700 font-medium">
          Sign up
        </Link>
      </p>
    </AuthShell>
  );
}
