"use client";

import * as React from "react";
import Link from "next/link";
import { TopBar } from "@/components/ui/TopBar";
import { AmbientBackground } from "@/components/ui/AmbientBackground";
import { PillButton } from "@/components/ui/PillButton";
import { GlassCard } from "@/components/ui/GlassCard";
import { Chip, SampleDataBadge } from "@/components/ui/Chip";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { LuArrowRight, LuCircleCheck } from "react-icons/lu";
import { Hero } from "@/components/landing/Hero";
import { useGSAP, gsap } from "@/lib/motion/gsap";

export default function LandingPage() {
  const containerRef = React.useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const sections = gsap.utils.toArray<HTMLElement>(".reveal-section");
    
    sections.forEach((section) => {
      gsap.from(section, {
        y: 40,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out",
        scrollTrigger: {
          trigger: section,
          start: "top 85%",
        }
      });
    });
  }, { scope: containerRef });

  return (
    <div className="relative min-h-screen" ref={containerRef}>
      <AmbientBackground accent="blue" />
      <TopBar />

      <main className="flex-1 pb-20">
        <Hero />

        {/* WHAT WE SOLVE */}
        <section id="how-it-works" className="reveal-section max-w-5xl mx-auto px-4 py-24 text-center">
          <SectionHeading 
            title="The Smog Season" 
            subtitle="Every winter, stubble burning in Punjab and Haryana meets Diwali pollution in Delhi. Farmers need a cheaper alternative to burning, and citizens need clear information." 
          />
        </section>

        {/* TWO AUDIENCES */}
        <section id="farmers" className="reveal-section max-w-6xl mx-auto px-4 py-16">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="p-8 md:p-12 rounded-[32px] bg-gradient-to-br from-[var(--bg-1)] to-[var(--bg-2)] border border-[var(--border)] relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--emerald)]/10 blur-[80px] rounded-full group-hover:bg-[var(--emerald)]/20 transition-colors duration-500" />
              <div className="relative z-10">
                <Chip variant="accent" className="mb-6 bg-[var(--emerald)]/10 text-[var(--emerald)] border-[var(--emerald)]/20">For Farmers</Chip>
                <h3 className="text-3xl font-serif italic text-[var(--text-hi)] mb-4">Clear the field without burning</h3>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-start gap-3">
                    <LuCircleCheck className="w-5 h-5 text-[var(--emerald)] shrink-0 mt-0.5" />
                    <span className="text-[var(--text-mid)]">Find the best day to clear based on wind and weather.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <LuCircleCheck className="w-5 h-5 text-[var(--emerald)] shrink-0 mt-0.5" />
                    <span className="text-[var(--text-mid)]">Book a machine slot or find nearby straw outlets. <SampleDataBadge className="ml-2 scale-75 origin-left" /></span>
                  </li>
                  <li className="flex items-start gap-3">
                    <LuCircleCheck className="w-5 h-5 text-[var(--emerald)] shrink-0 mt-0.5" />
                    <span className="text-[var(--text-mid)]">Punjabi voice-friendly big buttons and simple UI.</span>
                  </li>
                </ul>
                <PillButton href="/signup?role=farmer" variant="glass" icon={<LuArrowRight />} iconPosition="right">Get Started</PillButton>
              </div>
            </div>

            <div id="citizens" className="p-8 md:p-12 rounded-[32px] bg-gradient-to-br from-[var(--bg-1)] to-[var(--bg-2)] border border-[var(--border)] relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--cyan)]/10 blur-[80px] rounded-full group-hover:bg-[var(--cyan)]/20 transition-colors duration-500" />
              <div className="relative z-10">
                <Chip variant="accent" className="mb-6 bg-[var(--cyan)]/10 text-[var(--cyan)] border-[var(--cyan)]/20">For Citizens</Chip>
                <h3 className="text-3xl font-serif italic text-[var(--text-hi)] mb-4">Know your air, report sources</h3>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-start gap-3">
                    <LuCircleCheck className="w-5 h-5 text-[var(--cyan)] shrink-0 mt-0.5" />
                    <span className="text-[var(--text-mid)]">Daily AQI advice in plain words, no confusing jargon.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <LuCircleCheck className="w-5 h-5 text-[var(--cyan)] shrink-0 mt-0.5" />
                    <span className="text-[var(--text-mid)]">Report burning incidents with a quick photo.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <LuCircleCheck className="w-5 h-5 text-[var(--cyan)] shrink-0 mt-0.5" />
                    <span className="text-[var(--text-mid)]">Opt into minimalistic alerts only when it matters.</span>
                  </li>
                </ul>
                <PillButton href="/signup?role=citizen" variant="glass" icon={<LuArrowRight />} iconPosition="right">Get Started</PillButton>
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT CONNECTS TIMELINE */}
        <section className="reveal-section max-w-5xl mx-auto px-4 py-24">
          <SectionHeading title="How it connects" className="mb-16" />
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center relative gap-8 md:gap-0">
            {/* Timeline line */}
            <div className="hidden md:block absolute top-6 left-[10%] right-[10%] h-[2px] bg-gradient-to-r from-[var(--bg-3)] via-[var(--accent)] to-[var(--bg-3)]" />
            
            <div className="flex flex-col items-center text-center w-full md:w-1/4 relative z-10">
              <div className="w-12 h-12 rounded-full bg-[var(--bg-2)] border-2 border-[var(--border-strong)] flex items-center justify-center mb-4 text-[var(--text-hi)]">1</div>
              <div className="font-medium text-[var(--text-hi)] mb-1">Field</div>
              <div className="text-sm text-[var(--text-mid)]">Farmer checks planner</div>
            </div>
            
            <div className="flex flex-col items-center text-center w-full md:w-1/4 relative z-10">
              <div className="w-12 h-12 rounded-full bg-[var(--bg-2)] border-2 border-[var(--border-strong)] flex items-center justify-center mb-4 text-[var(--emerald)] shadow-[0_0_15px_rgba(16,185,129,0.2)]">2</div>
              <div className="font-medium text-[var(--text-hi)] mb-1">Machine</div>
              <div className="text-sm text-[var(--text-mid)]">Books a slot for Thursday</div>
            </div>
            
            <div className="flex flex-col items-center text-center w-full md:w-1/4 relative z-10">
              <div className="w-12 h-12 rounded-full bg-[var(--bg-2)] border-2 border-[var(--border-strong)] flex items-center justify-center mb-4 text-[var(--text-hi)]">3</div>
              <div className="font-medium text-[var(--text-hi)] mb-1">No Burning</div>
              <div className="text-sm text-[var(--text-mid)]">Straw is cleared safely</div>
            </div>
            
            <div className="flex flex-col items-center text-center w-full md:w-1/4 relative z-10">
              <div className="w-12 h-12 rounded-full bg-[var(--bg-2)] border-2 border-[var(--border-strong)] flex items-center justify-center mb-4 text-[var(--cyan)] shadow-[0_0_15px_rgba(34,211,238,0.2)]">4</div>
              <div className="font-medium text-[var(--text-hi)] mb-1">Delhi NCR</div>
              <div className="text-sm text-[var(--text-mid)]">Citizens breathe better</div>
            </div>
          </div>
        </section>

        {/* MAP PREVIEW & TRANSPARENCY */}
        <section className="reveal-section max-w-6xl mx-auto px-4 py-16 grid md:grid-cols-2 gap-8 items-center">
          <GlassCard data-accent="violet" className="aspect-video p-0 overflow-hidden relative group">
            {/* Mock map image using CSS pattern for now */}
            <div className="absolute inset-0 bg-[#0A1017]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-[#0A1017]/50 to-[#0A1017]" />
            <div className="absolute top-[30%] left-[40%] w-64 h-64 bg-red-500/10 blur-[50px] rounded-full" />
            <div className="absolute top-[60%] right-[30%] w-48 h-48 bg-cyan-500/10 blur-[40px] rounded-full" />
            <div className="absolute inset-4 pointer-events-none flex flex-col justify-between">
              <div className="flex gap-2">
                <Chip className="bg-black/50 backdrop-blur border border-white/10">AQI Layer</Chip>
                <Chip className="bg-black/50 backdrop-blur border border-white/10">Fires</Chip>
              </div>
              <div className="flex justify-end">
                <PillButton href="/map" variant="glass" size="md" className="pointer-events-auto">Open full map</PillButton>
              </div>
            </div>
          </GlassCard>

          <div className="space-y-6">
            <h3 className="text-3xl font-serif italic text-[var(--text-hi)]">You can always see why we suggest a day.</h3>
            <p className="text-[var(--text-mid)]">Our planner uses agents that explain their reasoning step-by-step.</p>
            
            <div className="p-4 rounded-xl bg-[var(--bg-1)] border border-[var(--border)] font-mono text-xs text-[var(--text-mid)] leading-relaxed relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[var(--bg-1)] z-10 top-1/2 pointer-events-none" />
              <div className="text-[var(--emerald)]">&gt; Checked forecast</div>
              <div className="text-[var(--emerald)]">&gt; Checked wind speed</div>
              <div className="text-[var(--text-hi)]">No machine free Tuesday</div>
              <div className="text-[var(--emerald)] opacity-50">&gt; Rechecking Wednesday...</div>
              <div className="opacity-20">&gt; Found slot at 2 PM</div>
            </div>
          </div>
        </section>

      </main>

      <footer className="border-t border-[var(--border)] bg-[var(--bg-0)] pt-16 pb-24 md:pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-8 text-[var(--text-mid)]">
          <div className="flex items-center gap-4">
            <span className="font-serif italic text-2xl text-[var(--text-hi)]">Saans</span>
            <span className="text-sm">&copy; 2026</span>
          </div>
          <div className="text-xs text-center md:text-left max-w-sm p-3 rounded-lg bg-[var(--bg-1)] border border-[var(--border)]">
            <span className="font-bold text-[var(--text-hi)] mb-1 block">Disclaimer</span>
            Machine slots, straw outlets and department routing are simulated for demo purposes.
          </div>
        </div>
      </footer>
    </div>
  );
}
