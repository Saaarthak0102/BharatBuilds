"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
  
  // Respect prefers-reduced-motion
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion) {
    gsap.ticker.fps(1);
    // Overriding defaults so animations just complete immediately if not strictly configured
  }
}

export { gsap, ScrollTrigger, useGSAP };

export const fadeUpVariant = {
  y: 16,
  opacity: 0,
  duration: 0.6,
  ease: "power3.out"
};
