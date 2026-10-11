'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

if (typeof window !== 'undefined') {
  maplibregl.setWorkerUrl(new URL('maplibre-gl/dist/maplibre-gl-worker.mjs', import.meta.url).href);
}

import { MapLayers, CommunityReport } from '@/lib/types';
import { SampleDataBadge, Chip } from '@/components/ui/Chip';
import { GlassCard } from '@/components/ui/GlassCard';
import { ReportCardModal } from '@/components/citizen/ReportCardModal';
import { authClient } from '@/lib/auth/authClient';
import { relativeAgo } from '@/lib/utils/date';
import {
  LuFlame,
  LuTractor,
  LuWind,
  LuTriangleAlert,
  LuX,
  LuLayers,
  LuCamera,
  LuClock,
  LuInfo,
} from 'react-icons/lu';

interface MarkerDetail {
  type: string;
  title: string;
  value: string;
  time?: string;
  source: string;
  is_sample?: boolean;
}

export function MapView({ layers }: { layers: MapLayers }) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);

  // Role defaults: Farmer -> fires + machines; Citizen -> AQI + reports
  const isFarmer = useMemo(() => {
    const session = authClient.getSession();
    return session?.role === 'farmer';
  }, []);

  const [showAQI, setShowAQI] = useState(!isFarmer);
  const [showFires, setShowFires] = useState(isFarmer);
  const [showReports, setShowReports] = useState(!isFarmer);
  const [showMachines, setShowMachines] = useState(isFarmer);

  const [selectedReport, setSelectedReport] = useState<CommunityReport | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<MarkerDetail | null>(null);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  const markersRef = useRef<maplibregl.Marker[]>([]);

  // Calculate latest update timestamp across layers
  const latestFetchedAt = useMemo(() => {
    const times = [
      layers.freshness?.aqi_fetched_at,
      layers.freshness?.fires_fetched_at,
      layers.freshness?.reports_fetched_at,
      layers.freshness?.machines_fetched_at,
      layers.aqi?.fetched_at,
      layers.fires?.fetched_at,
      layers.reports?.fetched_at,
      layers.machines?.fetched_at,
    ].filter(Boolean) as string[];

    if (times.length === 0) return new Date().toISOString();
    return times.sort().reverse()[0];
  }, [layers]);

  const isAnySample = Boolean(
    layers.freshness?.is_sample ||
      layers.aqi?.is_sample ||
      layers.fires?.is_sample ||
      layers.reports?.is_sample ||
      layers.machines?.is_sample
  );

  // Initialize MapLibre
  useEffect(() => {
    if (!mapContainer.current) return;

    try {
      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: {
          version: 8,
          sources: {
            osm: {
              type: 'raster',
              tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
              tileSize: 256,
              attribution: '© OpenStreetMap contributors',
            },
          },
          layers: [
            {
              id: 'osm',
              type: 'raster',
              source: 'osm',
            },
          ],
        },
        center: [76.0, 29.8],
        zoom: 7,
        attributionControl: false,
      });

      map.current.addControl(
        new maplibregl.NavigationControl({ showCompass: true }),
        'bottom-right'
      );
      map.current.addControl(
        new maplibregl.AttributionControl({
          customAttribution: 'Basemap: OSM • CPCB • NASA FIRMS • CRM',
        }),
        'bottom-right'
      );

      map.current.on('error', (e) => {
        console.error('MapLibre error:', e);
        if (e && e.error) {
          setMapError(e.error.message || String(e.error));
        }
      });

      map.current.on('load', () => {
        if (!map.current) return;
        setMapLoaded(true);

        // Fit bounds from Punjab (Northwest) to Delhi (Southeast)
        // [SW, NE]: [[74.0, 28.2], [77.6, 31.8]]
        try {
          map.current.fitBounds(
            [
              [74.0, 28.2],
              [77.6, 31.8],
            ],
            { padding: 30, maxZoom: 9 }
          );
        } catch (fitErr) {
          console.warn('fitBounds error', fitErr);
        }
      });

      const resizeObserver = new ResizeObserver(() => {
        map.current?.resize();
      });
      resizeObserver.observe(mapContainer.current);

      return () => {
        resizeObserver.disconnect();
        markersRef.current.forEach((m) => m.remove());
        markersRef.current = [];
        map.current?.remove();
        map.current = null;
      };
    } catch (err: any) {
      setMapError(err?.message || 'Failed to initialize map');
    }
  }, []);

  // Update Markers when layers or visibility toggles change
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Remove existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const currentMap = map.current;

    // Helper: AQI color
    const getAqiBg = (aqi: number) => {
      if (aqi > 400) return '#7C3AED'; // Severe
      if (aqi > 300) return '#EF4444'; // Very Poor
      if (aqi > 200) return '#F97316'; // Poor
      if (aqi > 100) return '#F59E0B'; // Moderate
      return '#10B981'; // Good
    };

    // 1. AQI Markers (Capped at 15)
    if (showAQI) {
      const aqiFeatures = (layers.aqi?.features || (layers as any).aqi_heatmap?.features || []).slice(0, 15);
      aqiFeatures.forEach((f: any) => {
        const coords = f.geometry?.coordinates;
        if (!coords || coords.length < 2) return;
        const val = f.properties?.aqi ?? 250;
        const cat = f.properties?.category ?? 'Moderate';
        const name = f.properties?.name || 'Monitoring Ward';
        const bg = getAqiBg(val);

        const el = document.createElement('div');
        el.className = 'cursor-pointer transform hover:scale-110 transition-transform';
        el.innerHTML = `
          <div style="background-color: ${bg}; border: 2.5px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.4);"
               class="w-10 h-10 rounded-full flex flex-col items-center justify-center text-white font-bold leading-none select-none">
            <span style="font-size: 11px; letter-spacing: -0.5px;">${val}</span>
            <span style="font-size: 7px; text-transform: uppercase; opacity: 0.9;">AQI</span>
          </div>
        `;

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          setSelectedDetail({
            type: 'AQI Station',
            title: name,
            value: `AQI ${val} • ${cat}`,
            time: layers.aqi?.fetched_at || layers.freshness?.aqi_fetched_at,
            source: 'CPCB Air Monitoring Grid',
            is_sample: f.properties?.is_sample ?? layers.aqi?.is_sample,
          });
        });

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([coords[0], coords[1]])
          .addTo(currentMap);
        markersRef.current.push(marker);
      });
    }

    // 2. Fire Hotspots (Capped at 150)
    if (showFires) {
      const fireFeatures = (layers.fires?.features || (layers as any).fire_hotspots?.features || []).slice(0, 150);
      fireFeatures.forEach((f: any) => {
        const coords = f.geometry?.coordinates;
        if (!coords || coords.length < 2) return;
        const frp = f.properties?.frp;
        const sat = f.properties?.satellite || 'VIIRS';

        const el = document.createElement('div');
        el.className = 'cursor-pointer transform hover:scale-125 transition-transform';
        el.innerHTML = `
          <div style="background: radial-gradient(circle, #EF4444 30%, #DC2626 70%, #991B1B 100%); border: 1.5px solid #FDE047; box-shadow: 0 0 10px rgba(239,68,68,0.8);"
               class="w-5 h-5 rounded-full flex items-center justify-center text-amber-200 select-none animate-pulse">
            <span style="font-size: 10px;">🔥</span>
          </div>
        `;

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          setSelectedDetail({
            type: 'Active Fire Hotspot',
            title: `Thermal Anomaly (${sat})`,
            value: frp ? `Radiative Power: ${frp} MW` : 'Farm / Stubble Thermal Point',
            time: f.properties?.acq_date ? `${f.properties.acq_date} ${f.properties.acq_time || ''}` : layers.fires?.fetched_at,
            source: 'NASA FIRMS Satellite Stream',
            is_sample: f.properties?.is_sample ?? layers.fires?.is_sample,
          });
        });

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([coords[0], coords[1]])
          .addTo(currentMap);
        markersRef.current.push(marker);
      });
    }

    // 3. Machine Points (Capped at 25)
    if (showMachines) {
      const machineFeatures = (layers.machines?.features || (layers as any).machine_points?.features || []).slice(0, 25);
      machineFeatures.forEach((f: any) => {
        const coords = f.geometry?.coordinates;
        if (!coords || coords.length < 2) return;
        const slotsFree = f.properties?.slots_free ?? 0;
        const villageName = f.properties?.village_name || 'Village Machine Hub';
        const machines = (f.properties?.machine_types || []).join(', ') || 'CRM Machines';

        const el = document.createElement('div');
        el.className = 'cursor-pointer transform hover:scale-105 transition-transform';
        el.innerHTML = `
          <div style="background-color: #059669; border: 2px solid #A7F3D0; box-shadow: 0 4px 10px rgba(5,150,105,0.4);"
               class="px-2.5 py-1 rounded-full flex items-center gap-1.5 text-white font-bold select-none text-xs">
            <span>🚜</span>
            <span>${slotsFree} free</span>
          </div>
        `;

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          setSelectedDetail({
            type: 'Machine Clearing Hub',
            title: villageName,
            value: `${slotsFree} slots available today (${machines})`,
            time: layers.machines?.fetched_at || layers.freshness?.machines_fetched_at,
            source: 'CRM Machinery Registry',
            is_sample: f.properties?.is_sample ?? layers.machines?.is_sample,
          });
        });

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([coords[0], coords[1]])
          .addTo(currentMap);
        markersRef.current.push(marker);
      });
    }

    // 4. Report Markers (Capped at 50)
    if (showReports) {
      const reportFeatures = (layers.reports?.features || (layers as any).report_markers?.features || []).slice(0, 50);
      reportFeatures.forEach((f: any) => {
        const coords = f.geometry?.coordinates;
        if (!coords || coords.length < 2) return;
        const props = f.properties || {};
        const status = (props.status || 'received').toLowerCase();
        const category = (props.category || 'crop_burning').toLowerCase();

        // Ring color by status
        const ringColor =
          status === 'resolved'
            ? '#10B981' // Emerald
            : status === 'routed'
            ? '#F59E0B' // Amber
            : '#06B6D4'; // Cyan

        // Icon by category
        let iconEmoji = '📸';
        if (category === 'crop_burning') iconEmoji = '🌾';
        else if (category === 'garbage_burning') iconEmoji = '🗑️';
        else if (category === 'cracker_burning') iconEmoji = '🎆';
        else if (category === 'construction_dust') iconEmoji = '🏗️';

        const el = document.createElement('div');
        el.className = 'cursor-pointer transform hover:scale-115 transition-transform';
        el.innerHTML = `
          <div style="background-color: #0F172A; border: 3px solid ${ringColor}; box-shadow: 0 4px 12px rgba(0,0,0,0.5);"
               class="w-9 h-9 rounded-full flex items-center justify-center select-none text-base">
            <span>${iconEmoji}</span>
          </div>
        `;

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          const reportObj: CommunityReport = {
            report_id: props.report_id || `rpt-${Math.random().toString(36).substring(2, 7)}`,
            category: props.category || 'crop_burning',
            status: props.status || 'received',
            area_name: props.area_name || 'Delhi NCR',
            public_lat: coords[1],
            public_lng: coords[0],
            created_at: props.created_at || new Date().toISOString(),
            confidence_label: props.confidence_label || 'High confidence',
            needs_review: Boolean(props.needs_review),
            merged_count: props.merged_count || 1,
            photo_url: props.photo_url || undefined,
            is_sample: Boolean(props.is_sample),
            is_mine: Boolean(props.is_mine),
          };
          setSelectedReport(reportObj);
          setIsReportModalOpen(true);
        });

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([coords[0], coords[1]])
          .addTo(currentMap);
        markersRef.current.push(marker);
      });
    }
  }, [mapLoaded, showAQI, showFires, showMachines, showReports, layers]);

  return (
    <div className="w-full h-full relative overflow-hidden select-none">
      {/* Map canvas container */}
      <div ref={mapContainer} className="absolute inset-0 w-full h-full" style={{ zIndex: 0 }} />

      {/* Loading overlay */}
      {!mapLoaded && !mapError && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-[var(--bg-0)]/80 backdrop-blur-sm pointer-events-none">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-[var(--violet)]/20 border-t-[var(--violet)] rounded-full animate-spin"></div>
            <p className="text-sm font-medium text-[var(--text-mid)] animate-pulse">
              Loading North India Map...
            </p>
          </div>
        </div>
      )}

      {/* Error banner */}
      {mapError && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-[var(--bg-0)]/90 backdrop-blur-md">
          <div className="flex flex-col items-center gap-3 p-6 glass-card border border-[var(--red)]/20 max-w-sm text-center">
            <LuTriangleAlert className="w-8 h-8 text-[var(--red)]" />
            <p className="text-sm font-medium text-[var(--text-hi)]">Map Render Error</p>
            <p className="text-xs text-[var(--text-low)] font-mono break-words">{mapError}</p>
          </div>
        </div>
      )}

      {/* Top Controls Overlay */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        {/* Left: Title + Freshness + SAMPLE */}
        <div className="glass-card px-4 py-2.5 rounded-2xl border border-[var(--border)] shadow-xl flex items-center gap-3 backdrop-blur-md pointer-events-auto">
          <div className="flex items-center gap-2">
            <LuLayers className="w-4 h-4 text-[var(--violet)]" />
            <span className="text-xs sm:text-sm font-bold text-[var(--text-hi)]">
              North India Grid
            </span>
          </div>
          <span className="text-[11px] text-[var(--text-low)] hidden sm:inline">
            Updated {relativeAgo(latestFetchedAt)}
          </span>
          {isAnySample && <SampleDataBadge />}
        </div>

        {/* Right: Layer Toggle Chips */}
        <div className="glass-card p-1.5 rounded-2xl border border-[var(--border)] shadow-xl flex items-center gap-1.5 backdrop-blur-md pointer-events-auto overflow-x-auto">
          {/* AQI Toggle */}
          <button
            type="button"
            onClick={() => setShowAQI((prev) => !prev)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              showAQI
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-[var(--text-mid)] hover:text-[var(--text-hi)] hover:bg-[var(--bg-2)]'
            }`}
          >
            <LuWind className="w-3.5 h-3.5" />
            <span>AQI</span>
          </button>

          {/* Fires Toggle */}
          <button
            type="button"
            onClick={() => setShowFires((prev) => !prev)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              showFires
                ? 'bg-red-500/20 text-red-300 border border-red-500/40 shadow-sm'
                : 'text-[var(--text-mid)] hover:text-[var(--text-hi)] hover:bg-[var(--bg-2)]'
            }`}
          >
            <LuFlame className="w-3.5 h-3.5" />
            <span>Fires</span>
          </button>

          {/* Reports Toggle */}
          <button
            type="button"
            onClick={() => setShowReports((prev) => !prev)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              showReports
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-[var(--text-mid)] hover:text-[var(--text-hi)] hover:bg-[var(--bg-2)]'
            }`}
          >
            <LuCamera className="w-3.5 h-3.5" />
            <span>Reports</span>
          </button>

          {/* Machines Toggle */}
          <button
            type="button"
            onClick={() => setShowMachines((prev) => !prev)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              showMachines
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-[var(--text-mid)] hover:text-[var(--text-hi)] hover:bg-[var(--bg-2)]'
            }`}
          >
            <LuTractor className="w-3.5 h-3.5" />
            <span>Machines</span>
          </button>
        </div>
      </div>

      {/* Non-Report Marker Info Card (bottom-left) */}
      {selectedDetail && (
        <div className="absolute bottom-6 left-4 z-20 max-w-sm w-full animate-in fade-in slide-in-from-bottom-2 duration-200">
          <GlassCard className="p-4 rounded-2xl border border-[var(--border)] shadow-2xl relative bg-[var(--bg-1)]/95 backdrop-blur-md">
            <button
              type="button"
              onClick={() => setSelectedDetail(null)}
              className="absolute top-3 right-3 p-1 rounded-lg text-[var(--text-low)] hover:text-[var(--text-hi)] transition-colors"
            >
              <LuX className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--violet)] bg-[var(--violet)]/10 px-2 py-0.5 rounded-md border border-[var(--violet)]/20">
                {selectedDetail.type}
              </span>
              {selectedDetail.is_sample && <SampleDataBadge />}
            </div>
            <h3 className="text-sm font-bold text-[var(--text-hi)] leading-snug">
              {selectedDetail.title}
            </h3>
            <p className="text-xs font-semibold text-[var(--text-mid)] mt-1">
              {selectedDetail.value}
            </p>
            <div className="flex items-center justify-between text-[10px] text-[var(--text-low)] mt-3 pt-2 border-t border-[var(--border)]">
              <span>Source: {selectedDetail.source}</span>
              {selectedDetail.time && <span>{relativeAgo(selectedDetail.time)}</span>}
            </div>
          </GlassCard>
        </div>
      )}

      {/* ReportCardModal for Report Markers */}
      <ReportCardModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        report={selectedReport}
      />
    </div>
  );
}
