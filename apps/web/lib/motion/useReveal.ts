'use client';

import { useEffect, RefObject } from 'react';
import { gsap } from './gsap';
import { useReducedMotion } from './reducedMotion';

export function useReveal(ref: RefObject<HTMLElement | null>, options: { 
  y?: number; 
  duration?: number;
  delay?: number;
  stagger?: number;
} = {}) {
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    if (!ref.current || prefersReduced) return;
    
    const { y = 50, duration = 0.8, delay = 0, stagger = 0 } = options;
    const elements = ref.current.children.length > 0 && stagger > 0 
      ? Array.from(ref.current.children) 
      : ref.current;

    const ctx = gsap.context(() => {
      gsap.from(elements, {
        y,
        opacity: 0,
        duration,
        delay,
        stagger,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: ref.current,
          start: 'top 85%',
        }
      });
    }, ref);

    return () => ctx.revert();
  }, [ref, options, prefersReduced]);
}
