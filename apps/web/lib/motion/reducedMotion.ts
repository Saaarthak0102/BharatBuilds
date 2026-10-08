'use client';

import { useEffect, useState } from 'react';

/**
 * Hook to check if user prefers reduced motion
 */
export function useReducedMotion() {
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReduced(mediaQuery.matches);

    const listener = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  return prefersReduced;
}
