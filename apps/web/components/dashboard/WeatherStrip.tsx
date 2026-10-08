'use client';

import { WeatherStripData } from '@/lib/mock/dashboardData';
import { LuSun, LuCloudSun, LuWind, LuDroplets, LuCloudRain } from 'react-icons/lu';
import { cn } from '@/lib/utils';

interface WeatherStripProps {
  data: WeatherStripData;
  className?: string;
}

export function WeatherStrip({ data, className }: WeatherStripProps) {
  const getAqiColor = (cat: string) => {
    switch (cat) {
      case 'Good':
        return 'text-[var(--green)] bg-[var(--green)]/15 border-[var(--green)]/30';
      case 'Satisfactory':
        return 'text-[#84CC16] bg-[#84CC16]/15 border-[#84CC16]/30';
      case 'Moderate':
        return 'text-[var(--amber)] bg-[var(--amber)]/15 border-[var(--amber)]/30';
      case 'Poor':
        return 'text-[#F97316] bg-[#F97316]/15 border-[#F97316]/30';
      case 'Very Poor':
        return 'text-[var(--red)] bg-[var(--red)]/15 border-[var(--red)]/30';
      case 'Severe':
        return 'text-[#991B1B] bg-[#991B1B]/15 border-[#991B1B]/30';
      default:
        return 'text-[var(--cyan)] bg-[var(--cyan)]/15 border-[var(--cyan)]/30';
    }
  };

  const renderIcon = () => {
    switch (data.conditionIcon) {
      case 'cloud-sun':
        return <LuCloudSun className="w-3.5 h-3.5 text-amber-400" />;
      case 'wind':
        return <LuWind className="w-3.5 h-3.5 text-cyan-400" />;
      case 'haze':
        return <LuCloudSun className="w-3.5 h-3.5 text-orange-400" />;
      case 'sun':
      default:
        return <LuSun className="w-3.5 h-3.5 text-amber-300" />;
    }
  };

  return (
    <div
      className={cn(
        'w-full flex items-center justify-between flex-wrap gap-x-3 gap-y-1.5 px-3 py-2 rounded-xl bg-[var(--bg-1)]/60 border border-[var(--border)] text-xs text-[var(--text-mid)]',
        className
      )}
    >
      {/* Left items: Temp & Condition */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="flex items-center gap-1.5 font-semibold text-[var(--text-hi)]">
          {renderIcon()}
          <span>{data.temperature}</span>
        </span>
        <span className="text-[var(--text-low)]">•</span>
        <span className="text-[var(--text-mid)]">{data.condition}</span>
      </div>

      {/* Middle items: Wind, Humidity, Rain */}
      <div className="flex items-center gap-3 shrink-0">
        <span className="flex items-center gap-1" title="Wind speed and direction">
          <LuWind className="w-3 h-3 text-[var(--text-low)]" />
          <span>{data.windSpeed} {data.windDirection}</span>
        </span>
        <span className="flex items-center gap-1" title="Humidity">
          <LuDroplets className="w-3 h-3 text-[var(--text-low)]" />
          <span>{data.humidity}</span>
        </span>
        <span className="flex items-center gap-1" title="Chance of Rain">
          <LuCloudRain className="w-3 h-3 text-[var(--text-low)]" />
          <span>{data.rainChance}</span>
        </span>
      </div>

      {/* Right item: AQI Chip with Color */}
      <div className="shrink-0">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-bold tracking-wide uppercase',
            getAqiColor(data.aqiCategory)
          )}
        >
          <span>AQI {data.aqiValue}</span>
          <span className="opacity-80 font-medium">({data.aqiCategory})</span>
        </span>
      </div>
    </div>
  );
}
