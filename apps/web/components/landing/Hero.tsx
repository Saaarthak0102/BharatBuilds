"use client";

import * as React from "react";
import Link from "next/link";
import { PillButton } from "@/components/ui/PillButton";
import { HeroPhone } from "./hero/HeroPhone";
import { HeroArc } from "./hero/HeroArc";
import { TLCard, TLPill, BLCard, TRCard, BRCard } from "./hero/HeroCards";
import { HeroCarouselMobile } from "./hero/HeroCarouselMobile";
import { AwsMarquee } from "./AwsMarquee";
import { useGSAP, gsap } from "@/lib/motion/gsap";

export function Hero() {
  const containerRef = React.useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const isReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    
    // Entrance Timeline
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

    if (isReduced) {
      tl.from(".hero-anim-fade", { opacity: 0, duration: 1, stagger: 0.1 });
    } else {
      // 1. Headline & Text
      tl.from(".hero-headline-line", {
        y: 20,
        opacity: 0,
        filter: "blur(10px)",
        duration: 0.8,
        stagger: 0.15
      })
      .from(".hero-subtitle, .hero-ctas", {
        y: 15,
        opacity: 0,
        duration: 0.6,
        stagger: 0.1
      }, "-=0.4");

      // 2. Halo
      tl.from(".hero-halo", {
        scale: 0.92,
        opacity: 0,
        duration: 1.2,
      }, "-=0.4");

      // 3. Phone
      tl.from(".hero-phone", {
        y: 80,
        opacity: 0,
        duration: 0.8,
      }, "-=1.0");

      // 4. Floating Cards
      tl.from(".hero-float-wrapper", {
        scale: 0.9,
        opacity: 0,
        duration: 0.6,
        ease: "back.out(1.4)",
        stagger: 0.12,
      }, "-=0.6");

      // 5. Endless Float after entrance
      tl.add(() => {
        gsap.to(".hero-float-wrapper", {
          y: -10,
          duration: "random(5, 7)",
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
          stagger: {
            each: 0.2,
            from: "random"
          }
        });
      });
      
      // Parallax on scroll
      gsap.to(".hero-parallax-fast", {
        y: -100,
        ease: "none",
        scrollTrigger: { trigger: containerRef.current, start: "top top", end: "bottom top", scrub: true }
      });
      gsap.to(".hero-parallax-slow", {
        y: -50,
        ease: "none",
        scrollTrigger: { trigger: containerRef.current, start: "top top", end: "bottom top", scrub: true }
      });
    }
  }, { scope: containerRef });

  return (
    <section 
      ref={containerRef} 
      className="relative w-full overflow-hidden min-h-[100svh] flex flex-col pt-32 lg:pt-40"
    >
      <div className="max-w-[1200px] w-full mx-auto px-4 flex flex-col items-center relative z-10">
        
        {/* TEXT CONTENT */}
        <div className="text-center flex flex-col items-center z-30">
          <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl xl:text-[80px] tracking-tight leading-[1.1] mb-6 flex flex-col items-center">
            <span className="hero-headline-line text-[var(--text-hi)] not-italic">From field to Delhi,</span>
            <span className="hero-headline-line italic bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent pb-2">
              one good decision at a time.
            </span>
          </h1>
          
          <p className="hero-subtitle text-base md:text-lg text-[var(--text-mid)] max-w-2xl mb-10 text-balance">
            Farmers find the best day to clear their field without burning. Delhi sees the air, and reports the smoke.
          </p>

          <div className="hero-ctas flex flex-col sm:flex-row items-center gap-4 mb-4">
            <Link href="/signup?role=farmer">
              <PillButton size="lg" variant="primary-silver">I'm a farmer</PillButton>
            </Link>
            <Link href="/signup?role=citizen">
              <PillButton size="lg" variant="glass">I'm a citizen</PillButton>
            </Link>
          </div>
          
          <Link href="/login" className="hero-ctas text-sm text-[var(--text-mid)] hover:text-[var(--text-hi)] underline underline-offset-4 mb-16 lg:mb-24">
            Already have an account? Log in
          </Link>
        </div>

        {/* HERO COMPOSITION STAGE */}
        <div className="relative w-full max-w-[1100px] mx-auto flex justify-center mt-[-40px] md:mt-0">
          
          {/* Halo Background */}
          <HeroArc className="hero-halo hero-anim-fade absolute bottom-20 md:bottom-32 z-0" />

          {/* Desktop Floating Cards (Hidden on very small screens or placed differently) */}
          <div className="absolute inset-0 pointer-events-none hidden md:block z-20">
            {/* Top Left */}
            <div className="hero-float-wrapper hero-parallax-fast absolute top-0 left-[calc(50%-520px)] xl:left-[calc(50%-580px)] origin-center pointer-events-auto">
              <TLCard />
            </div>
            <div className="hero-float-wrapper hero-parallax-fast absolute top-[180px] left-[calc(50%-480px)] xl:left-[calc(50%-530px)] pointer-events-auto">
              <TLPill />
            </div>
            
            {/* Bottom Left */}
            <div className="hero-float-wrapper hero-parallax-slow absolute bottom-[180px] left-[calc(50%-600px)] xl:left-[calc(50%-660px)] pointer-events-auto">
              <BLCard />
            </div>

            {/* Top Right */}
            <div className="hero-float-wrapper hero-parallax-fast absolute top-[30px] right-[calc(50%-550px)] xl:right-[calc(50%-610px)] pointer-events-auto">
              <TRCard />
            </div>

            {/* Bottom Right */}
            <div className="hero-float-wrapper hero-parallax-slow absolute bottom-[120px] right-[calc(50%-520px)] xl:right-[calc(50%-580px)] pointer-events-auto">
              <BRCard />
            </div>
          </div>

          {/* Mobile Tucked Cards (Visible < md) */}
          <div className="absolute inset-0 pointer-events-none md:hidden z-20">
            <div className="hero-anim-fade absolute top-10 left-[-10px] scale-[0.65] origin-top-left">
              <TLCard />
            </div>
            <div className="hero-anim-fade absolute bottom-20 right-[-10px] scale-[0.65] origin-bottom-right">
              <BRCard />
            </div>
          </div>

          {/* Center Phone */}
          <div className="hero-phone hero-anim-fade relative z-10 transform md:scale-100 scale-90 origin-bottom">
            <HeroPhone />
          </div>
        </div>
        
        {/* Mobile Carousel (Visible < md) */}
        <HeroCarouselMobile className="hero-anim-fade relative z-30" />

      </div>

      {/* Gradient Fade to next section */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[var(--bg-1)] to-transparent z-40 pointer-events-none" />

      <div className="mt-auto relative z-50">
        <AwsMarquee />
      </div>
    </section>
  );
}
