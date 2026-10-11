import { SampleDataBadge } from '../common/SampleDataBadge';
import { Logo } from '../common/Logo';

export function Footer() {
  return (
    <footer className="bg-text-primary text-white py-12 mt-20">
      <div className="container mx-auto px-4 md:px-6 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex flex-col items-center md:items-start gap-2">
          <Logo size={24} withWordmark />
          <p className="text-text-muted text-sm max-w-md text-center md:text-left">
            Built for WeMakeDevs x AWS Environmental Hacks, Air track.
          </p>
        </div>
        
        <div className="flex flex-col items-center md:items-end gap-3">
          <SampleDataBadge />
          <p className="text-text-muted text-xs text-center md:text-right max-w-sm mt-2">
            This is a hackathon prototype. Weather, fire, and machine availability data may be simulated in mock mode.
          </p>
        </div>
      </div>
    </footer>
  );
}
