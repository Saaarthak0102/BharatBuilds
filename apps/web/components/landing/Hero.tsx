"use client";

import * as React from "react";
import Link from "next/link";
import { PillButton } from "@/components/ui/PillButton";
import { HeroPhone } from "./hero/HeroPhone";
import { HeroArc } from "./hero/HeroArc";
import { TLCard, TLPill, BLCard, TRCard, BRCard } from "./hero/HeroCards";
import { HeroCarouselMobile } from "./hero/HeroCarouselMobile";
import { useGSAP, gsap } from "@/lib/motion/gsap";

import { useRouter } from "next/navigation";
import { startDemoSession } from "@/lib/demo";

export function Hero() {
  const router = useRouter();
  const containerRef = React.useRef<HTMLDivElement>(null);

  const handleDemoFarmer = async (e: React.MouseEvent) => {
    e.preventDefault();
    await startDemoSession('farmer');
    router.push('/farmer');
  };

  const handleDemoCitizen = async (e: React.MouseEvent) => {
    e.preventDefault();
    await startDemoSession('citizen');
    router.push('/citizen');
  };

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
      className="relative w-full overflow-hidden h-[calc(100svh-64px)] max-h-[1000px] min-h-[700px] flex flex-col pt-8 lg:pt-12"
    >
      <div className="max-w-[1200px] w-full mx-auto px-4 flex flex-col items-center relative z-10 h-full">
        
        {/* ================================================== */}
        {/* ZONE A — TEXT / CTA */}
        {/* ================================================== */}
        <div className="text-center flex flex-col items-center z-30 shrink-0">
          <h1 className="font-serif text-4xl md:text-5xl lg:text-[56px] xl:text-[64px] tracking-tight leading-[1] mb-4 flex flex-col items-center">
            <span className="hero-headline-line text-[var(--text-hi)] not-italic">From fields to Delhi,</span>
            <span className="hero-headline-line italic bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent pb-1">
              one good decision at a time.
            </span>
          </h1>
          
          <p className="hero-subtitle text-[16px] md:text-[18px] text-[var(--text-mid)] max-w-2xl mb-6 text-balance leading-snug">
            Farmers find the best day to clear their fields without burning. Delhi sees the air, and reports the smoke.
          </p>

          <div className="hero-ctas flex flex-col sm:flex-row items-center justify-center gap-4">
            <PillButton onClick={handleDemoFarmer} href="/farmer" size="lg" variant="primary-silver">I&apos;m a farmer</PillButton>
            <PillButton onClick={handleDemoCitizen} href="/citizen" size="lg" variant="glass">I&apos;m a citizen</PillButton>
          </div>
        </div>

        {/* ================================================== */}
        {/* ZONE B — PHONE + FLOATING CARDS */}
        {/* ================================================== */}
        <div className="relative w-full max-w-[1100px] mx-auto flex justify-center flex-1 min-h-0 mt-8 lg:mt-[36px]">
          
          {/* Halo Background */}
          <HeroArc className="hero-halo hero-anim-fade absolute bottom-0 z-0" />

          {/* Desktop Floating Cards */}
          <div className="absolute inset-0 pointer-events-none hidden md:block z-20">
            {/* Top Left */}
            <div className="hero-float-wrapper hero-parallax-fast absolute top-[30px] right-[calc(50%+140px)] xl:right-[calc(50%+160px)] origin-center pointer-events-auto transform scale-[0.85] lg:scale-[0.9]">
              <TLCard />
            </div>
            {/* Mid Left (Pill) */}
            <div className="hero-float-wrapper hero-parallax-fast absolute top-[140px] right-[calc(50%+130px)] xl:right-[calc(50%+150px)] pointer-events-auto transform scale-[0.85] lg:scale-[0.9]">
              <TLPill />
            </div>
            {/* Bottom Left */}
            <div className="hero-float-wrapper hero-parallax-slow absolute top-[220px] right-[calc(50%+180px)] xl:right-[calc(50%+200px)] pointer-events-auto transform scale-[0.85] lg:scale-[0.9]">
              <BLCard />
            </div>

            {/* Top Right */}
            <div className="hero-float-wrapper hero-parallax-fast absolute top-[50px] left-[calc(50%+140px)] xl:left-[calc(50%+160px)] pointer-events-auto transform scale-[0.85] lg:scale-[0.9]">
              <TRCard />
            </div>
            {/* Bottom Right */}
            <div className="hero-float-wrapper hero-parallax-slow absolute top-[200px] left-[calc(50%+130px)] xl:left-[calc(50%+150px)] pointer-events-auto transform scale-[0.85] lg:scale-[0.9]">
              <BRCard />
            </div>
          </div>

          {/* Mobile Tucked Cards */}
          <div className="absolute inset-0 pointer-events-none md:hidden z-20">
            <div className="hero-anim-fade absolute top-[20px] left-[5%] scale-[0.60] origin-top-left">
              <TLCard />
            </div>
            <div className="hero-anim-fade absolute top-[120px] right-[5%] scale-[0.60] origin-bottom-right">
              <BRCard />
            </div>
          </div>

          {/* Center Phone */}
          <div className="hero-phone hero-anim-fade absolute top-0 left-1/2 -translate-x-1/2 z-10 transform scale-[0.75] md:scale-[0.80] lg:scale-[0.85] origin-top">
            <HeroPhone />
          </div>
        </div>
        
        {/* Mobile Carousel */}
        <HeroCarouselMobile className="hero-anim-fade relative z-30" />

      </div>

      {/* Gradient Fade to next section */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[var(--bg-1)] to-transparent z-40 pointer-events-none" />
    </section>
  );
}
