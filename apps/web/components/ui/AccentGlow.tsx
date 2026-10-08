"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export default function AccentGlow() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Set global data-accent based on route
    let accent = "blue";
    if (pathname.startsWith("/farmer")) accent = "emerald";
    else if (pathname.startsWith("/citizen/report")) accent = "red";
    else if (pathname.startsWith("/citizen")) accent = "cyan";
    else if (pathname.startsWith("/map")) accent = "violet";
    
    document.documentElement.setAttribute("data-accent", accent);
  }, [pathname]);

  if (!mounted) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-[-1] overflow-hidden">
      {/* Radial Glow */}
      <div 
        className={cn(
          "absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2",
          "w-[800px] h-[500px] md:w-[1200px] md:h-[600px]",
          "bg-[var(--accent-glow)] rounded-full blur-[100px]",
          "transition-colors duration-400 ease-in-out"
        )}
      />
      
      {/* Grid Texture */}
      <div 
        className={cn(
          "absolute inset-0 opacity-[0.03]",
          "transition-opacity duration-400 ease-in-out"
        )}
        style={{
          backgroundImage: `
            linear-gradient(to right, var(--text-hi) 1px, transparent 1px),
            linear-gradient(to bottom, var(--text-hi) 1px, transparent 1px)
          `,
          backgroundSize: '32px 32px',
          maskImage: 'linear-gradient(to bottom, black 0%, transparent 60%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 0%, transparent 60%)'
        }}
      />
    </div>
  );
}
