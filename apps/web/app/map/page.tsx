'use client';

import { useEffect, useState } from 'react';
import { MapView } from '@/components/map/MapView';
import { apiClient } from '@/lib/api/client';
import { MapLayers } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/auth/useSession';
import { LuArrowLeft } from 'react-icons/lu';
import AccentGlow from '@/components/ui/AccentGlow';

export default function MapPage() {
  const router = useRouter();
  const { session } = useSession();
  const [layers, setLayers] = useState<MapLayers | null>(null);

  useEffect(() => {
    // Set global data-accent to violet for map
    document.documentElement.setAttribute('data-accent', 'violet');
    
    async function load() {
      const res = await apiClient.map.layers();
      setLayers(res.data);
    }
    load();
  }, []);

  const handleBack = () => {
    if (session?.role === 'farmer') {
      router.push('/farmer');
      return;
    }
    if (session?.role === 'citizen') {
      router.push('/citizen');
      return;
    }
    const demo = typeof window !== 'undefined' ? localStorage.getItem('saans_demo') : null;
    if (demo === 'farmer') {
      router.push('/farmer');
      return;
    }
    if (demo === 'citizen') {
      router.push('/citizen');
      return;
    }
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }
    router.push('/');
  };

  const isAuthedOrDemo = Boolean(session?.role || (typeof window !== 'undefined' && localStorage.getItem('saans_demo')));

  if (!layers) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[var(--bg-0)] relative">
        <AccentGlow />
        <div className="w-10 h-10 border-4 border-[var(--violet)]/20 border-t-[var(--violet)] rounded-full animate-spin mb-4" />
        <p className="text-[var(--text-mid)] animate-pulse">Loading Map Data...</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen relative overflow-hidden flex flex-col bg-[var(--bg-0)]">
       <AccentGlow />
       <header className="h-16 bg-[var(--bg-1)]/80 backdrop-blur-md border-b border-[var(--border)] flex items-center px-4 shrink-0 relative z-20">
         <button
           type="button"
           onClick={handleBack}
           className="flex items-center gap-2 text-[var(--text-mid)] hover:text-[var(--text-hi)] transition-colors cursor-pointer"
         >
           <LuArrowLeft className="w-5 h-5" />
           <span className="font-medium text-sm">
             {isAuthedOrDemo ? 'Back to Dashboard' : 'Back'}
           </span>
         </button>
         
         <div className="ml-auto flex items-center gap-2">
           <div className="text-xs font-bold uppercase tracking-widest text-[var(--violet)] bg-[var(--violet)]/10 px-3 py-1 rounded-full border border-[var(--violet)]/20">
             Live Map
           </div>
         </div>
       </header>
       <div className="flex-1 w-full h-full relative z-10 bg-[#0A1017]">
         {/* Assuming MapView natively supports dark mode configuration.
             We wrap it in a dark container for now. */}
         <MapView layers={layers} />
       </div>
    </div>
  );
}
