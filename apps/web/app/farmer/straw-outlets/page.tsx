'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GlassCard } from '@/components/ui/GlassCard';
import { Chip, SampleDataBadge } from '@/components/ui/Chip';
import { apiClient } from '@/lib/api/client';
import { StrawOutlet, FacilityType, FarmerProfile } from '@/lib/types';
import { LuArrowLeft, LuMapPin, LuPhone } from 'react-icons/lu';
import { useT } from '@/lib/i18n/useT';

const DISTRICTS = [
  { id: 'patiala', name: 'Patiala' },
  { id: 'ludhiana', name: 'Ludhiana' },
  { id: 'sangrur', name: 'Sangrur' },
  { id: 'moga', name: 'Moga' },
];

const FACILITY_TYPES: { id: FacilityType | 'all'; label: string }[] = [
  { id: 'all', label: 'All Types' },
  { id: 'biomass_power_plant', label: 'Biomass Plant' },
  { id: 'cbg_plant', label: 'CBG Plant' },
  { id: 'pellet_maker', label: 'Pellet Maker' },
  { id: 'brick_kiln', label: 'Brick Kiln' },
  { id: 'thermal_cofiring', label: 'Thermal Co-firing' },
  { id: 'depot', label: 'Depot' },
  { id: 'aggregator', label: 'Aggregator' },
];

export default function StrawOutletsPage() {
  const router = useRouter();
  const { t } = useT();
  
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<FarmerProfile | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<string>('patiala');
  const [selectedType, setSelectedType] = useState<FacilityType | 'all'>('all');
  
  const [outlets, setOutlets] = useState<StrawOutlet[]>([]);
  const [isSample, setIsSample] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient.farmer.getProfile().then(res => {
      setProfile(res.data);
      if (res.data.district) {
        const d = res.data.district.toLowerCase();
        if (DISTRICTS.some(x => x.id === d)) {
          setSelectedDistrict(d);
        }
      }
    }).catch(err => {
      console.error(err);
    });
  }, []);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);
    
    apiClient.farmer.strawOutlets(selectedDistrict)
      .then(res => {
        if (!isMounted) return;
        const data = res.data as any; // any because the type might be { outlets: StrawOutlet[], is_sample: boolean }
        setOutlets(data.outlets || []);
        setIsSample(data.is_sample || false);
      })
      .catch(err => {
        if (!isMounted) return;
        console.error(err);
        setError("Failed to load straw outlets. Please try again.");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
      
    return () => { isMounted = false; };
  }, [selectedDistrict]);

  const filteredOutlets = selectedType === 'all' 
    ? outlets 
    : outlets.filter(o => o.facility_type === selectedType);

  return (
    <div className="w-full pb-12">
      <div className="sticky top-0 lg:top-16 z-[40] border-b border-[var(--border)] bg-[var(--bg-1)]/80 backdrop-blur-md px-4 py-3 flex items-center">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-[var(--text-mid)] hover:text-[var(--text-hi)] transition-colors">
          <LuArrowLeft className="w-5 h-5" />
          <span className="font-semibold text-sm">Back</span>
        </button>
      </div>

      <div className="w-full max-w-5xl mx-auto px-4 lg:px-6 mt-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h1 className="text-2xl font-serif italic text-[var(--text-hi)]">{t('farmer.strawOutlets') || "Straw Outlets"}</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-[var(--text-mid)] uppercase tracking-wider">District:</span>
            <select 
              className="bg-[var(--bg-2)] border border-[var(--border)] rounded-lg p-2 text-sm text-[var(--text-hi)] outline-none focus:border-[var(--emerald)] transition-colors"
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
            >
              {DISTRICTS.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {FACILITY_TYPES.map(type => (
            <button
              key={type.id}
              onClick={() => setSelectedType(type.id as any)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                selectedType === type.id 
                  ? 'bg-[var(--emerald)] text-white shadow-md' 
                  : 'bg-[var(--bg-2)] border border-[var(--border)] text-[var(--text-mid)] hover:text-[var(--text-hi)] hover:border-[var(--emerald)]/50'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>

        {error ? (
          <GlassCard data-accent="red" className="border-red-500/20 text-red-400">
            {error}
          </GlassCard>
        ) : loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <GlassCard key={i} className="animate-pulse h-32"></GlassCard>
            ))}
          </div>
        ) : filteredOutlets.length === 0 ? (
          <GlassCard className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-[var(--bg-2)] flex items-center justify-center mx-auto mb-4 text-[var(--text-mid)]">
              <LuMapPin className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-[var(--text-hi)] mb-2">No Outlets Found</h3>
            <p className="text-[var(--text-mid)]">Try changing the district or facility type filter.</p>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredOutlets.map(outlet => (
              <GlassCard key={outlet.outlet_id} className="group hover:border-[var(--emerald)]/50 transition-colors flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between mb-3 gap-2">
                    <Chip variant="outline" className="bg-[var(--bg-2)] border-[var(--border-strong)] text-[var(--text-mid)]">
                      {FACILITY_TYPES.find(f => f.id === outlet.facility_type)?.label || outlet.facility_type.replace(/_/g, ' ')}
                    </Chip>
                    {(outlet.is_sample || isSample) && <SampleDataBadge />}
                  </div>
                  <h3 className="text-lg font-bold text-[var(--text-hi)] mb-1 group-hover:text-[var(--emerald)] transition-colors">{outlet.name}</h3>
                  <p className="text-sm text-[var(--text-mid)] mb-4 italic">
                    Contact your nearest depot or aggregator
                  </p>
                </div>
                
                <div className="bg-[var(--bg-0)] p-3 rounded-lg border border-[var(--border)] flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[var(--emerald)]/10 text-[var(--emerald)] flex items-center justify-center shrink-0">
                    <LuPhone className="w-4 h-4" />
                  </div>
                  <p className="text-sm font-medium text-[var(--text-hi)]">{outlet.contact_hint}</p>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
