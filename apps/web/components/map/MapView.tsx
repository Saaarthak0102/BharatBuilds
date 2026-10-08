'use client';

import { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MapLayers } from '@/lib/types';
import { SampleDataBadge } from '../common/SampleDataBadge';

export function MapView({ layers }: { layers: MapLayers }) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    // Initialize map
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json', // Light basemap suitable for data overlays
      center: [76.7794, 30.7333], // Centered between Punjab and Delhi
      zoom: 6,
      attributionControl: false,
    });

    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.current.addControl(new maplibregl.AttributionControl({
      customAttribution: 'Basemap: CartoDB. Data: Saans (Mock)'
    }), 'bottom-right');

    map.current.on('load', () => {
      if (!map.current) return;

      // Add Sources
      map.current.addSource('aqi', {
        type: 'geojson',
        data: layers.aqi_heatmap
      });

      map.current.addSource('fires', {
        type: 'geojson',
        data: layers.fire_hotspots
      });

      // Add Layers
      map.current.addLayer({
        id: 'aqi-heat',
        type: 'heatmap',
        source: 'aqi',
        maxzoom: 9,
        paint: {
          'heatmap-weight': ['interpolate', ['linear'], ['get', 'aqi'], 0, 0, 500, 1],
          'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 9, 3],
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0, 'rgba(0, 255, 0, 0)',
            0.2, 'rgb(146, 208, 80)',
            0.4, 'rgb(255, 215, 0)',
            0.6, 'rgb(255, 107, 53)',
            0.8, 'rgb(255, 0, 0)',
            1, 'rgb(139, 0, 0)'
          ],
          'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 10, 9, 30],
          'heatmap-opacity': 0.7
        }
      });

      map.current.addLayer({
        id: 'fire-points',
        type: 'circle',
        source: 'fires',
        paint: {
          'circle-radius': 6,
          'circle-color': '#ff3b30',
          'circle-stroke-width': 1,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 0.8
        }
      });
    });

    return () => {
      map.current?.remove();
    };
  }, [layers]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="absolute inset-0" />
      
      {/* Map UI Overlays */}
      <div className="absolute top-4 left-4 z-10 glass-card p-3 shadow-lg">
        <h2 className="font-bold text-text-primary text-sm mb-1">Live Map</h2>
        {layers.freshness.is_sample && <SampleDataBadge />}
      </div>
      
      <div className="absolute bottom-6 left-4 z-10 glass-card p-3 shadow-lg max-w-xs">
        <h3 className="font-semibold text-xs text-text-secondary uppercase mb-2">Legend</h3>
        <div className="flex items-center gap-2 text-xs mb-1">
          <span className="w-3 h-3 rounded-full bg-[#ff3b30] border border-white inline-block"></span>
          <span>Fire Hotspot (FIRMS)</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
           <div className="h-3 w-16 bg-gradient-to-r from-green-400 via-yellow-400 to-red-600 rounded"></div>
           <span>AQI Density</span>
        </div>
      </div>
    </div>
  );
}
