"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { PhoneSlideFarmer } from "./PhoneSlideFarmer";
import { PhoneSlideMap } from "./PhoneSlideMap";
import { PhoneSlideCitizen } from "./PhoneSlideCitizen";

export function HeroPhone({ className }: { className?: string }) {
  const [activeSlide, setActiveSlide] = React.useState(0);
  const [isHovered, setIsHovered] = React.useState(false);
  const slides = [PhoneSlideFarmer, PhoneSlideCitizen, PhoneSlideMap];

  // Auto-cycle
  React.useEffect(() => {
    if (isHovered) return;
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slides.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [isHovered, slides.length]);

  return (
    <div className={cn("flex flex-col items-center", className)}>
      {/* Phone Frame */}
      <div 
        className="relative w-[300px] h-[620px] rounded-[44px] bg-[#0A0D14] border-[8px] border-[#161C24] shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onFocus={() => setIsHovered(true)}
        onBlur={() => setIsHovered(false)}
      >
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-[#161C24] rounded-b-3xl z-50 flex justify-center items-end pb-1">
           <div className="w-12 h-1.5 rounded-full bg-black/50" />
        </div>

        {/* Side buttons (mock) */}
        <div className="absolute top-24 -left-[10px] w-1 h-12 bg-[#161C24] rounded-l-md" />
        <div className="absolute top-40 -left-[10px] w-1 h-12 bg-[#161C24] rounded-l-md" />
        <div className="absolute top-32 -right-[10px] w-1 h-16 bg-[#161C24] rounded-r-md" />

        {/* Screen Content */}
        <div className="relative w-full h-full bg-[var(--bg-0)]">
          {slides.map((SlideComponent, index) => (
            <div
              key={index}
              className={cn(
                "absolute inset-0 transition-opacity duration-700",
                activeSlide === index ? "opacity-100 z-10 pointer-events-auto" : "opacity-0 z-0 pointer-events-none"
              )}
            >
              <SlideComponent />
            </div>
          ))}
        </div>
      </div>

      {/* Dots Indicator */}
      <div className="flex items-center gap-3 mt-6">
        {slides.map((_, index) => (
          <button
            key={index}
            className={cn(
              "w-2 h-2 rounded-full interactive-quiet",
              activeSlide === index ? "bg-[var(--text-hi)] w-4" : "bg-[var(--text-mid)]/40 hover:bg-[var(--text-mid)]"
            )}
            onClick={() => setActiveSlide(index)}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
