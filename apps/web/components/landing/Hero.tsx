'use client';

import { useRef } from 'react';
import { useReveal } from '@/lib/motion/useReveal';
import { Button } from '../ui/Button';
import Link from 'next/link';
import { useT } from '@/lib/i18n/useT';

export function Hero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { t } = useT();
  useReveal(containerRef, { stagger: 0.1 });

  return (
    <section className="relative min-h-[90vh] flex items-center pt-20 overflow-hidden bg-[var(--color-sand-200)]">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-hero opacity-10 animate-pulse pointer-events-none"></div>
      
      <div className="container mx-auto px-4 md:px-6 relative z-10" ref={containerRef}>
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-extrabold text-text-primary tracking-tight mb-6 leading-tight">
            {t('landing.heroTitle')}
          </h1>
          <p className="text-xl md:text-2xl text-text-secondary mb-10 max-w-2xl mx-auto">
            {t('landing.heroSubtitle')}
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup?role=farmer" className="w-full sm:w-auto">
              <Button variant="primary" className="w-full text-lg py-4 px-8">
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                </svg>
                {t('landing.imAFarmer')}
              </Button>
            </Link>
            <Link href="/signup?role=citizen" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full text-lg py-4 px-8 bg-white/50 backdrop-blur-sm">
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                {t('landing.imACitizen')}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
