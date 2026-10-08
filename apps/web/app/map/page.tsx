'use client';

import { useEffect, useState } from 'react';
import { MapView } from '@/components/map/MapView';
import { apiClient } from '@/lib/api/client';
import { MapLayers } from '@/lib/types';
import Link from 'next/link';

export default function MapPage() {
  const [layers, setLayers] = useState<MapLayers | null>(null);

  useEffect(() => {
    async function load() {
      const res = await apiClient.map.layers();
      setLayers(res.data);
    }
    load();
  }, []);

  if (!layers) {
    return <div className="h-screen w-screen flex items-center justify-center bg-[var(--color-sand-200)]">Loading Map...</div>;
  }

  return (
    <div className="h-screen w-screen relative overflow-hidden flex flex-col">
       <header className="h-14 glass-navbar flex items-center px-4 shrink-0 relative z-20">
         <Link href="/" className="flex items-center gap-2 text-brand-700 hover:text-brand-900">
           <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
           </svg>
           <span className="font-medium">Back</span>
         </Link>
       </header>
       <div className="flex-1 relative">
         <MapView layers={layers} />
       </div>
    </div>
  );
}
