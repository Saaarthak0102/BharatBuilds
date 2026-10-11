'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { GlassCard } from '@/components/ui/GlassCard';
import { Chip, SampleDataBadge } from '@/components/ui/Chip';
import { apiClient } from '@/lib/api/client';
import { StrawOutlet, FacilityType, FarmerProfile } from '@/lib/types';
import { LuArrowLeft, LuMapPin, LuPhone, LuTruck, LuSparkles } from 'react-icons/lu';
import { useT } from '@/lib/i18n/useT';
import { referenceDistricts, districtKey, getVillage, haversineDistanceKm } from '@/lib/data/reference';

const DISTRICTS = referenceDistricts;

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

function StrawOutletsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useT();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<FarmerProfile | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<string>(DISTRICTS[0]?.id || 'patiala');
  const [selectedType, setSelectedType] = useState<FacilityType | 'all'>('all');

  const [outlets, setOutlets] = useState<StrawOutlet[]>([]);
  const [isSample, setIsSample] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recommendedIds, setRecommendedIds] = useState<string[]>([]);

  // Load recommended outlet IDs from URL param or recent planner result
  useEffect(() => {
    const fromQuery = searchParams.get('recommended')?.split(',').map((s) => s.trim()).filter(Boolean);
    if (fromQuery && fromQuery.length > 0) {
      setRecommendedIds(fromQuery);
      return;
    }
    try {
      const cached = localStorage.getItem('lastPlanResult');
      if (cached) {
        const plan = JSON.parse(cached);
        if (plan?.straw_outlets && Array.isArray(plan.straw_outlets)) {
          setRecommendedIds(plan.straw_outlets.map((o: any) => o.outlet_id).filter(Boolean));
        }
      }
    } catch (e) {
      // ignore
    }
  }, [searchParams]);

  // Load farmer profile
  useEffect(() => {
    apiClient.farmer
      .getProfile()
      .then((res) => {
        setProfile(res.data);
        if (res.data?.district) {
          const d = districtKey(res.data.district);
          if (DISTRICTS.some((x) => x.id === d)) {
            setSelectedDistrict(d);
          }
        }
      })
      .catch((err) => {
        console.error(err);
      });
  }, []);

  // Fetch outlets for selected district
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    apiClient.farmer
      .strawOutlets(districtKey(selectedDistrict))
      .then((res) => {
        if (!isMounted) return;
        const data = res.data as any;
        setOutlets(data.outlets || []);
        setIsSample(Boolean(data.is_sample));
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error(err);
        setError('Failed to load straw outlets. Please try again.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedDistrict]);

  const farmerVillage = profile?.village_id ? getVillage(profile.village_id) : undefined;

  const filteredOutlets =
    selectedType === 'all'
      ? outlets
      : outlets.filter((o) => o.facility_type === selectedType);

  return (
    <div className="w-full pb-12">
      <div className="sticky top-0 lg:top-16 z-[40] border-b border-[var(--border)] bg-[var(--bg-1)]/80 backdrop-blur-md px-4 py-3 flex items-center">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-[var(--text-mid)] hover:text-[var(--text-hi)] transition-colors cursor-pointer"
        >
          <LuArrowLeft className="w-5 h-5" />
          <span className="font-semibold text-sm">Back</span>
        </button>
      </div>

      <div className="w-full max-w-5xl mx-auto px-4 lg:px-6 mt-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-serif italic text-[var(--text-hi)]">
              {t('farmer.strawOutlets') || 'Straw Outlets'}
            </h1>
            <p className="text-xs text-[var(--text-mid)] mt-0.5">
              Fictional biomass plants, pellet units, depots, and aggregators across Punjab & Haryana.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-[var(--text-mid)] uppercase tracking-wider">
              District:
            </span>
            <select
              aria-label="Filter by district"
              className="bg-[var(--bg-2)] border border-[var(--border)] rounded-lg p-2 text-sm text-[var(--text-hi)] outline-none focus:border-[var(--emerald)] transition-colors cursor-pointer"
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
            >
              {DISTRICTS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {FACILITY_TYPES.map((type) => (
            <button
              key={type.id}
              onClick={() => setSelectedType(type.id as any)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
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
            {[1, 2, 3, 4].map((i) => (
              <GlassCard key={i} className="animate-pulse h-40"></GlassCard>
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
            {filteredOutlets.map((outlet) => {
              const isRecommended = recommendedIds.includes(outlet.outlet_id);

              // Calculate approximate haversine distance if farmer's village and outlet coords exist
              let distText: string | null = null;
              if (
                farmerVillage &&
                typeof outlet.lat === 'number' &&
                typeof outlet.lng === 'number'
              ) {
                const dist = haversineDistanceKm(
                  farmerVillage.lat,
                  farmerVillage.lng,
                  outlet.lat,
                  outlet.lng
                );
                distText = `~${dist} km (approx.)`;
              }

              // Accepted residues list
              const acceptedList = Array.isArray(outlet.accepts)
                ? outlet.accepts
                : typeof outlet.accepts === 'string'
                ? [outlet.accepts]
                : ['paddy_straw'];

              return (
                <GlassCard
                  key={outlet.outlet_id}
                  className={`group transition-all flex flex-col justify-between ${
                    isRecommended
                      ? 'border-amber-400/40 bg-amber-500/5 hover:border-amber-400'
                      : 'hover:border-[var(--emerald)]/50'
                  }`}
                >
                  <div>
                    {/* Top Chips Row */}
                    <div className="flex items-start justify-between mb-3 gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Facility Type Chip */}
                        <Chip
                          variant="outline"
                          className="bg-[var(--bg-2)] border-[var(--border-strong)] text-[var(--text-hi)] text-xs font-semibold capitalize"
                        >
                          {FACILITY_TYPES.find((f) => f.id === outlet.facility_type)?.label ||
                            outlet.facility_type.replace(/_/g, ' ')}
                        </Chip>

                        {/* Recommended Badge */}
                        {isRecommended && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                            <LuSparkles className="w-3 h-3 text-amber-400" />
                            <span>Recommended</span>
                          </span>
                        )}
                      </div>

                      {/* SAMPLE Badge */}
                      {(outlet.is_sample || isSample) && <SampleDataBadge />}
                    </div>

                    {/* Outlet Name */}
                    <h3 className="text-lg font-bold text-[var(--text-hi)] mb-1.5 group-hover:text-[var(--emerald)] transition-colors">
                      {outlet.name}
                    </h3>

                    {/* Distance from village */}
                    {distText && (
                      <div className="flex items-center gap-1.5 text-xs text-[var(--emerald)] font-medium mb-3">
                        <LuMapPin className="w-3.5 h-3.5 shrink-0" />
                        <span>{distText} from {farmerVillage?.name || 'your village'}</span>
                      </div>
                    )}

                    {/* Accepted Residue & Pickup Support Chips */}
                    <div className="flex items-center gap-1.5 flex-wrap mb-4">
                      {acceptedList.map((resItem) => (
                        <span
                          key={resItem}
                          className="text-[11px] px-2 py-0.5 rounded-md bg-[var(--bg-1)] border border-[var(--border)] text-[var(--text-mid)] capitalize"
                        >
                          🌾 {resItem.replace(/_/g, ' ')}
                        </span>
                      ))}

                      {/* Pickup Support Chip */}
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                          outlet.pickup_support === 'yes'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-medium'
                            : outlet.pickup_support === 'no'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 font-medium'
                            : 'bg-[var(--bg-2)] text-[var(--text-low)] border-[var(--border)]'
                        }`}
                      >
                        <LuTruck className="w-3 h-3" />
                        <span>
                          {outlet.pickup_support === 'yes'
                            ? 'Pickup Available'
                            : outlet.pickup_support === 'no'
                            ? 'Drop-off Only'
                            : 'Pickup on Request'}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Contact Hint Card */}
                  <div className="bg-[var(--bg-0)] p-3 rounded-xl border border-[var(--border)] flex items-center gap-3 mt-2">
                    <div className="w-8 h-8 rounded-full bg-[var(--emerald)]/10 text-[var(--emerald)] flex items-center justify-center shrink-0">
                      <LuPhone className="w-4 h-4" />
                    </div>
                    <p className="text-xs font-medium text-[var(--text-hi)]">
                      {outlet.contact_hint || 'Contact your nearest depot or aggregator'}
                    </p>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function StrawOutletsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-sm text-[var(--text-mid)] animate-pulse">
          Loading straw outlets...
        </div>
      }
    >
      <StrawOutletsContent />
    </Suspense>
  );
}
