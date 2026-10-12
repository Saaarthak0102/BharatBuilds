import Link from 'next/link';
import { LanguageSwitcher } from '../common/LanguageSwitcher';
import { Button } from '../ui/Button';
import { Logo } from '../common/Logo';

export function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-sticky glass-navbar h-20 flex items-center">
      <div className="container mx-auto px-4 md:px-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Logo size={32} withWordmark priority href="/" />
        </div>
        
        <div className="flex items-center gap-3 md:gap-6">
          <LanguageSwitcher />
          <Link href="/login" className="text-sm font-medium text-brand-700 hover:text-brand-900 hidden sm:block">
            Login
          </Link>
          <Link href="/signup">
            <Button variant="primary" className="py-2 px-5 text-sm">Sign Up</Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}
