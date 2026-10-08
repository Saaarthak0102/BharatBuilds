"use client";

import * as React from "react";
import { TLCard, BLCard, TRCard, BRCard } from "./HeroCards";
import { cn } from "@/lib/utils";

export function HeroCarouselMobile({ className }: { className?: string }) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const totalSlides = 4;

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const scrollLeft = scrollRef.current.scrollLeft;
    const width = scrollRef.current.clientWidth;
    const index = Math.round(scrollLeft / width);
    setActiveIndex(index);
  };

  const scrollTo = (index: number) => {
    if (!scrollRef.current) return;
    const width = scrollRef.current.clientWidth;
    scrollRef.current.scrollTo({ left: width * index, behavior: "smooth" });
  };

  return (
    <div className={cn("w-full md:hidden flex flex-col items-center mt-8", className)}>
      <div 
        ref={scrollRef}
        className="w-full flex overflow-x-auto snap-x snap-mandatory hide-scrollbar pb-6 px-4 gap-4"
        onScroll={handleScroll}
      >
        <div className="snap-center shrink-0 w-[85%] sm:w-[60%] flex justify-center"><TLCard /></div>
        <div className="snap-center shrink-0 w-[85%] sm:w-[60%] flex justify-center"><BLCard /></div>
        <div className="snap-center shrink-0 w-[85%] sm:w-[60%] flex justify-center"><TRCard /></div>
        <div className="snap-center shrink-0 w-[85%] sm:w-[60%] flex justify-center"><BRCard /></div>
      </div>
      
      {/* Dots */}
      <div className="flex gap-2">
        {Array.from({ length: totalSlides }).map((_, i) => (
          <button
            key={i}
            onClick={() => scrollTo(i)}
            className={cn(
              "w-2 h-2 rounded-full transition-all duration-300",
              activeIndex === i ? "bg-[var(--text-hi)] w-4" : "bg-[var(--border-strong)]"
            )}
          />
        ))}
      </div>
      
      <style jsx>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
