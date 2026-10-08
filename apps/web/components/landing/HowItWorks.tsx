'use client';

import { useRef } from 'react';
import { useReveal } from '@/lib/motion/useReveal';
import { Card } from '../ui/Card';

export function HowItWorks() {
  const ref = useRef<HTMLDivElement>(null);
  useReveal(ref, { stagger: 0.2 });

  const steps = [
    { title: 'Farmer uses planner', desc: 'Agent finds best day based on weather & wind', icon: '📅' },
    { title: 'Machine is booked', desc: 'No burning needed, residue is managed', icon: '🚜' },
    { title: 'Delhi breathes easier', desc: 'Citizens check AQI and report issues', icon: '🌬️' }
  ];

  return (
    <section className="py-24 bg-white/40">
      <div className="container mx-auto px-4 md:px-6">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-16 text-text-primary">How it connects</h2>
        
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto" ref={ref}>
          {steps.map((step, i) => (
            <Card key={i} className="text-center relative">
              <div className="text-4xl mb-4">{step.icon}</div>
              <h3 className="text-xl font-bold mb-2 text-text-primary">{step.title}</h3>
              <p className="text-text-secondary">{step.desc}</p>
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-6 text-brand-300 transform -translate-y-1/2">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
