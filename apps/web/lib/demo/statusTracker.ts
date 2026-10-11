/**
 * Tracks the live vs demo source of each feature for DemoStatus.
 */

export type FeatureSource = 'live' | 'demo';

export interface FeatureStatus {
  key: string;
  label: string;
  source: FeatureSource;
  details?: string;
  updatedAt: number;
}

type Listener = (statuses: Record<string, FeatureStatus>) => void;

class StatusTracker {
  private statuses: Record<string, FeatureStatus> = {
    weather: { key: 'weather', label: 'Weather', source: 'demo', updatedAt: Date.now() },
    plan: { key: 'plan', label: 'Burn Planner', source: 'demo', details: 'Template explanation', updatedAt: Date.now() },
    machines: { key: 'machines', label: 'Machine Slots', source: 'demo', updatedAt: Date.now() },
    straw_outlets: { key: 'straw_outlets', label: 'Straw Outlets', source: 'demo', updatedAt: Date.now() },
    today: { key: 'today', label: 'Today AQI', source: 'demo', updatedAt: Date.now() },
    community_reports: { key: 'community_reports', label: 'Community Feed', source: 'demo', updatedAt: Date.now() },
    classifier: { key: 'classifier', label: 'Vision Classifier', source: 'demo', details: 'Demo classifier', updatedAt: Date.now() },
    map_layers: { key: 'map_layers', label: 'Map Layers', source: 'demo', updatedAt: Date.now() },
  };

  private listeners: Set<Listener> = new Set();

  setSource(key: string, source: FeatureSource, details?: string) {
    const existing = this.statuses[key];
    const label = existing?.label || key.replace(/_/g, ' ');
    this.statuses[key] = {
      key,
      label,
      source,
      details: details ?? existing?.details,
      updatedAt: Date.now(),
    };
    this.notify();
  }

  getAll(): Record<string, FeatureStatus> {
    return { ...this.statuses };
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.getAll());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const snapshot = this.getAll();
    this.listeners.forEach((l) => l(snapshot));
  }
}

export const demoStatusTracker = new StatusTracker();
