'use client';

import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

if (typeof window !== 'undefined') {
  maplibregl.setWorkerUrl(new URL('maplibre-gl/dist/maplibre-gl-worker.mjs', import.meta.url).href);
}
import { MapLayers } from '@/lib/types';
import { SampleDataBadge } from '../common/SampleDataBadge';
import { createRoot, Root } from 'react-dom/client';
import { LuFlame, LuTrash2, LuWind, LuTriangleAlert, LuX, LuLayers } from 'react-icons/lu';

export function MapView({ layers }: { layers: MapLayers }) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  
  const [showAQI, setShowAQI] = useState(true);
  const [showReports, setShowReports] = useState(true);
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  const markersRef = useRef<{ marker: maplibregl.Marker, root: Root }[]>([]);

  useEffect(() => {
    if (!mapContainer.current) return;

    // Initialize map
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'osm': {
            type: 'raster',
            tiles: [
              'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
            ],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors'
          }
        },
        layers: [
          {
            id: 'osm',
            type: 'raster',
            source: 'osm'
          }
        ]
      },
      center: [77.2090, 28.6139], // Centered explicitly on Delhi/NCR
      zoom: 7,
      attributionControl: false,
    });

    map.current.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'bottom-right');
    map.current.addControl(new maplibregl.AttributionControl({
      customAttribution: 'Basemap: OSM (Debug)'
    }), 'bottom-right');

    map.current.on('error', (e) => {
      console.error('MapLibre error object:', e);
      if (e && e.error) {
        console.error('MapLibre explicit error:', e.error);
        setMapError(e.error.message || String(e.error));
      }
    });

    map.current.on('style.load', () => {
      console.log('--- MAPLIBRE STYLE LOADED ---');
      console.log('Style Sources:', map.current?.getStyle()?.sources);
      console.log('Style Layers:', map.current?.getStyle()?.layers);
      
      const layer = map.current?.getLayer('osm');
      console.log('Layer "osm" exists:', !!layer);
      if (layer) {
        console.log('Layer "osm" visibility:', map.current?.getLayoutProperty('osm', 'visibility'));
      }
    });

    map.current.on('load', () => {
      if (!map.current) return;
      console.log('--- MAPLIBRE LOADED ---');
      setMapLoaded(true);
      
      // Diagnostics
      const canvas = document.querySelector('.maplibregl-canvas') as HTMLCanvasElement;
      const gl = canvas?.getContext('webgl2') || canvas?.getContext('webgl');
      
      console.log('Canvas:', canvas);
      console.log('Canvas Width:', canvas?.width, 'Height:', canvas?.height);
      console.log('Canvas ClientWidth:', canvas?.clientWidth, 'ClientHeight:', canvas?.clientHeight);
      console.log('Device Pixel Ratio:', window.devicePixelRatio);
      console.log('WebGL Context:', !!gl);
      console.log('WebGL2 Context:', !!canvas?.getContext('webgl2'));
      console.log('Container Bounds:', mapContainer.current?.getBoundingClientRect());
      
      console.log('Map Center:', map.current.getCenter());
      console.log('Map Zoom:', map.current.getZoom());

      // Temporarily completely disabled AQI and Report layers for debugging base map
    });
    
    map.current.on('sourcedata', (e) => {
      if (e.isSourceLoaded) {
        console.log(`Source data loaded for source: ${e.sourceId}`);
      }
    });

    map.current.on('idle', () => {
      console.log('Map idle (rendering finished)');
    });
    const resizeObserver = new ResizeObserver(() => {
      map.current?.resize();
    });
    resizeObserver.observe(mapContainer.current);

    return () => {
      resizeObserver.disconnect();
      markersRef.current.forEach(m => {
        setTimeout(() => m.root.unmount(), 0);
        m.marker.remove();
      });
      map.current?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="w-full h-full relative">
      {/* Map container with a very obvious debug border/background to ensure it exists */}
      <div 
        ref={mapContainer} 
        className="absolute inset-0 border-4 border-red-500 bg-gray-900" 
        style={{ zIndex: 0 }}
      />
      
      {/* Loading & Error States */}
      {!mapLoaded && !mapError && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-[var(--bg-0)]/80 backdrop-blur-sm pointer-events-none">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-[var(--border)] border-t-[var(--accent)] rounded-full animate-spin"></div>
            <p className="text-sm font-medium text-[var(--text-mid)] animate-pulse">Loading Map...</p>
          </div>
        </div>
      )}

      {mapError && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-[var(--bg-0)]/90 backdrop-blur-md">
          <div className="flex flex-col items-center gap-3 p-6 glass-card border border-[var(--red)]/20">
            <LuTriangleAlert className="w-8 h-8 text-[var(--red)]" />
            <p className="text-sm font-medium text-[var(--text-hi)]">Map Error</p>
            <p className="text-xs text-[var(--text-low)] text-center max-w-[250px] font-mono break-words">
              {mapError}
            </p>
          </div>
        </div>
      )}
      
      {/* UI Overlays completely hidden during debugging */}
      {false && (
        <>
          {/* Map UI Overlays */}
          <div className="absolute top-4 left-4 z-10 glass-card p-3 shadow-lg flex flex-col gap-1 rounded-xl">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-[var(--text-hi)] text-sm tracking-wide">North India</h2>
              {layers.freshness.is_sample && <SampleDataBadge />}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
