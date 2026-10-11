'use client';

import { useState } from 'react';
import { LuChevronDown, LuTerminal, LuCheck } from 'react-icons/lu';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n/useT';

export interface ToolTraceItem {
  tool: string;
  status?: string;
  latency_ms: number;
  timeAgo?: string;
  isSample?: boolean;
  source?: 'live' | 'demo' | string;
}

interface AgentLogAccordionProps {
  accent?: 'emerald' | 'cyan' | 'blue' | 'red';
  toolTraces?: ToolTraceItem[];
  title?: string;
  className?: string;
  defaultOpen?: boolean;
}

export function AgentLogAccordion({
  accent = 'emerald',
  toolTraces = [],
  title,
  className,
  defaultOpen = false,
}: AgentLogAccordionProps) {
  const { t } = useT();
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const totalLatency = toolTraces.reduce((sum, item) => sum + (item.latency_ms || 0), 0);
  const displayTitle = title || t('farmer.agentTrace');

  const accentColorClass = {
    emerald: 'text-[var(--emerald)] border-[var(--emerald)]/20',
    cyan: 'text-[var(--cyan)] border-[var(--cyan)]/20',
    blue: 'text-[var(--accent)] border-[var(--accent)]/20',
    red: 'text-[var(--red)] border-[var(--red)]/20',
  }[accent] || 'text-[var(--accent)] border-[var(--accent)]/20';

  const dotColorClass = {
    emerald: 'bg-[var(--emerald)]',
    cyan: 'bg-[var(--cyan)]',
    blue: 'bg-[var(--accent)]',
    red: 'bg-[var(--red)]',
  }[accent] || 'bg-[var(--accent)]';

  return (
    <div
      data-accent={accent}
      className={cn(
        'glass-card rounded-[var(--radius-lg)] border border-[var(--border)] overflow-hidden transition-all duration-300 w-full',
        className
      )}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label={`${displayTitle}, ${toolTraces.length} tool calls, ${totalLatency}ms`}
        className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-[var(--bg-1)]/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--bg-2)] border shrink-0', accentColorClass)}>
            <LuTerminal className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-sm md:text-base text-[var(--text-hi)] truncate">
              {displayTitle}
            </h3>
            <p className="text-xs text-[var(--text-mid)] hidden sm:block truncate">
              Agent execution trace & verified data sources
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-3">
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-[var(--bg-2)] border border-[var(--border)] text-[var(--text-mid)]">
            {toolTraces.length} {t('farmer.toolCalls')}
          </span>
          <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-[var(--bg-2)] border border-[var(--border)] text-[var(--text-low)] hidden xs:inline-block">
            {totalLatency}ms
          </span>
          <div
            className={cn(
              'w-7 h-7 rounded-full flex items-center justify-center text-[var(--text-mid)] transition-transform duration-300',
              isOpen ? 'rotate-180 text-[var(--text-hi)]' : ''
            )}
          >
            <LuChevronDown className="w-4 h-4" />
          </div>
        </div>
      </button>

      {/* Collapsible Content */}
      <div
        className={cn(
          'transition-all duration-300 ease-in-out overflow-hidden',
          isOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="p-4 sm:p-5 pt-1 border-t border-[var(--border)] space-y-2">
          {toolTraces.length === 0 ? (
            <p className="text-xs text-[var(--text-mid)] py-2">No active tool traces recorded.</p>
          ) : (
            toolTraces.map((trace, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--bg-1)]/80 border border-[var(--border)] text-xs font-mono hover:border-[var(--border-strong)] transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={cn('w-2 h-2 rounded-full shrink-0 animate-pulse', dotColorClass)} />
                  <span className="text-[var(--text-hi)] truncate font-semibold">{trace.tool}</span>
                  {trace.source && (
                    <span
                      className={cn(
                        'text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider font-bold',
                        trace.source === 'live'
                          ? 'text-[var(--emerald)] bg-[var(--emerald)]/10 border border-[var(--emerald)]/20'
                          : 'text-amber-400 bg-amber-500/10 border border-amber-500/20'
                      )}
                    >
                      {trace.source}
                    </span>
                  )}
                  {trace.isSample && !trace.source && (
                    <span className="text-[10px] text-amber-400 px-1.5 py-0.5 rounded bg-amber-500/10 uppercase tracking-wider font-bold">
                      SAMPLE
                    </span>
                  )}
                  {trace.status && (
                    <span className="text-[10px] text-[var(--emerald)] px-1.5 py-0.5 rounded bg-[var(--emerald)]/10 uppercase tracking-wider flex items-center gap-1">
                      <LuCheck className="w-3 h-3" />
                      {trace.status}
                    </span>
                  )}
                </div>
                <span className="text-[var(--text-low)] ml-3 shrink-0">{trace.timeAgo || `${trace.latency_ms}ms`}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
