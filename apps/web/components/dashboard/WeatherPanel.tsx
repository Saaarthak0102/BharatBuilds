'use client';

import { WeatherSnapshot } from '@/lib/mock/dashboardData';
import { SampleDataBadge } from '@/components/ui/Chip';
import { cn } from '@/lib/utils';
import {
  LuSun,
  LuCloudSun,
  LuWind,
  LuCloudFog,
  LuMoon,
  LuCloudMoon,
  LuDroplets,
  LuEye,
  LuSunset,
  LuThermometerSun,
  LuArrowUp,
  LuArrowDown
} from 'react-icons/lu';

interface WeatherPanelProps {
  weather: WeatherSnapshot;
  title: string;
  location: string;
  dateText: string;
  isSample?: boolean;
  accent?: 'emerald' | 'cyan';
  className?: string;
}

export function WeatherPanel({
  weather,
  title,
  location,
  dateText,
  isSample = true,
  accent = 'cyan',
  className,
}: WeatherPanelProps) {
  // Condition tint
  const bgTint = accent === 'emerald' ? 'bg-emerald-500/5' : 'bg-teal-900/10';
  const borderTint = accent === 'emerald' ? 'border-emerald-500/20' : 'border-teal-500/20';

  const getWeatherIcon = (icon: string, className = '') => {
    switch (icon) {
      case 'sun': return <LuSun className={className} />;
      case 'cloud-sun': return <LuCloudSun className={className} />;
      case 'wind': return <LuWind className={className} />;
      case 'haze': return <LuCloudFog className={className} />;
      case 'moon': return <LuMoon className={className} />;
      case 'cloud-moon': return <LuCloudMoon className={className} />;
      default: return <LuSun className={className} />;
    }
  };

  const getAqiColor = (cat: string) => {
    if (cat === 'Severe') return 'var(--red)';
    if (cat === 'Very Poor') return '#EF4444';
    if (cat === 'Poor') return '#F97316';
    if (cat === 'Moderate') return 'var(--amber)';
    return 'var(--cyan)';
  };

  return (
    <div className={cn('w-full h-full rounded-2xl flex flex-col p-4 sm:p-5 relative overflow-hidden bg-[var(--bg-1)]/40 backdrop-blur-md border border-[var(--border)]', className)}>
      <div className={cn("absolute inset-0 z-0", bgTint)} />
      
      <div className="relative z-10 flex flex-col h-full">
        {/* ROW A: Header */}
        <div className="flex items-center justify-between h-9 shrink-0 mb-2">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-serif italic text-[var(--text-hi)] leading-none">{title}</h2>
            {isSample && <SampleDataBadge className="text-[10px] py-0 px-2.5" />}
          </div>
          <div className="flex items-center gap-2 text-xs text-[var(--text-mid)] font-medium">
            <span>{location}</span>
            <span className="text-[var(--text-low)]">•</span>
            <span className="text-[var(--text-low)]">{dateText}</span>
          </div>
        </div>

        {/* ROW B: Main Content */}
        <div className="flex-1 flex gap-8 items-center min-h-0">
          {/* Left: Big Temp & Condition */}
          <div className="flex-1 flex items-center gap-6">
            {getWeatherIcon(weather.icon, 'w-16 h-16 sm:w-20 sm:h-20 text-[var(--text-hi)]')}
            <div>
              <div className="flex items-baseline gap-4">
                <span className="text-[clamp(48px,6vh,72px)] font-serif italic text-[var(--text-hi)] leading-none">
                  {weather.temp}&deg;
                </span>
                <div className="flex flex-col gap-1">
                  <span className="text-lg font-bold text-[var(--text-hi)] leading-none">{weather.condition}</span>
                  <span className="text-sm text-[var(--text-mid)]">Feels like {weather.feelsLike}&deg;</span>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1.5 text-xs text-[var(--text-mid)]">
                  <span className="flex items-center"><LuArrowUp className="w-3 h-3 text-[var(--text-low)]" /> {weather.high}&deg;</span>
                  <span className="flex items-center"><LuArrowDown className="w-3 h-3 text-[var(--text-low)]" /> {weather.low}&deg;</span>
                </div>
                <div 
                  className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border bg-[var(--bg-1)]"
                  style={{ color: getAqiColor(weather.aqiLabel), borderColor: `${getAqiColor(weather.aqiLabel)}40` }}
                >
                  AQI {weather.aqi} ({weather.aqiLabel})
                </div>
              </div>
            </div>
          </div>

          {/* Right: 3x2 Grid */}
          <div className="flex-1 grid grid-cols-3 gap-y-3 gap-x-4 border-l border-[var(--border)] pl-8">
            <div className="flex items-center gap-2">
              <LuWind className="w-4 h-4 text-[var(--text-low)] shrink-0" />
              <div className="flex flex-col"><span className="text-[10px] text-[var(--text-low)] uppercase">Wind</span><span className="text-xs font-semibold text-[var(--text-hi)] truncate">{weather.windSpeed} {weather.windDir}</span></div>
            </div>
            <div className="flex items-center gap-2">
              <LuDroplets className="w-4 h-4 text-[var(--text-low)] shrink-0" />
              <div className="flex flex-col"><span className="text-[10px] text-[var(--text-low)] uppercase">Humidity</span><span className="text-xs font-semibold text-[var(--text-hi)] truncate">{weather.humidity}</span></div>
            </div>
            <div className="flex items-center gap-2">
              <LuCloudFog className="w-4 h-4 text-[var(--text-low)] shrink-0" />
              <div className="flex flex-col"><span className="text-[10px] text-[var(--text-low)] uppercase">Rain</span><span className="text-xs font-semibold text-[var(--text-hi)] truncate">{weather.rainChance}</span></div>
            </div>
            <div className="flex items-center gap-2">
              <LuEye className="w-4 h-4 text-[var(--text-low)] shrink-0" />
              <div className="flex flex-col"><span className="text-[10px] text-[var(--text-low)] uppercase">Visibility</span><span className="text-xs font-semibold text-[var(--text-hi)] truncate">{weather.visibility}</span></div>
            </div>
            <div className="flex items-center gap-2">
              <LuThermometerSun className="w-4 h-4 text-[var(--text-low)] shrink-0" />
              <div className="flex flex-col"><span className="text-[10px] text-[var(--text-low)] uppercase">UV Index</span><span className="text-xs font-semibold text-[var(--text-hi)] truncate">{weather.uvIndex}</span></div>
            </div>
            <div className="flex items-center gap-2">
              <LuSunset className="w-4 h-4 text-[var(--text-low)] shrink-0" />
              <div className="flex flex-col"><span className="text-[10px] text-[var(--text-low)] uppercase">Sunset</span><span className="text-xs font-semibold text-[var(--text-hi)] truncate">{weather.sunset}</span></div>
            </div>
          </div>
        </div>

        {/* ROW C: Hourly Strip */}
        <div className="mt-3 pt-3 border-t border-[var(--border)] flex items-center justify-between h-[76px] shrink-0 [@media(max-height:800px)]:hidden">
          {weather.hourly.map((h, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5 border-r last:border-0 border-[var(--border)]">
              <span className="text-[11px] text-[var(--text-mid)] font-medium">{h.time}</span>
              {getWeatherIcon(h.icon, 'w-5 h-5 text-[var(--text-hi)]')}
              <div className="flex items-center gap-1">
                <span className="text-sm font-bold text-[var(--text-hi)]">{h.temp}&deg;</span>
                {h.rainChance && h.rainChance !== '0%' && <span className="text-[9px] text-blue-400">{h.rainChance}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
