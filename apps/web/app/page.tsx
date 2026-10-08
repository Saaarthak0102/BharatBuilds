"use client";

import * as React from "react";
import Link from "next/link";
import { TopBar } from "@/components/ui/TopBar";
import AccentGlow from "@/components/ui/AccentGlow";
import { PillButton } from "@/components/ui/PillButton";
import { GlassCard } from "@/components/ui/GlassCard";
import { Chip, SampleDataBadge } from "@/components/ui/Chip";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { IconTile } from "@/components/ui/IconTile";
import { StatTile } from "@/components/ui/StatTile";
import { LuLeaf, LuCloudSun, LuWind, LuCamera, LuMapPin, LuArrowRight, LuCalendar, LuTractor, LuCircleCheck, LuShieldCheck, LuLanguages, LuCloud } from "react-icons/lu";
import { useGSAP, gsap } from "@/lib/motion/gsap";

export default function LandingPage() {
  const containerRef = React.useRef<HTMLDivElement>(null);

  useGSAP(() => {
    // Fade up animations for sections
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

    // Floating animation for hero cards
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.to(".float-card", {
        y: -10,
        duration: 4,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
        stagger: {
          each: 0.2,
          from: "random"
        }
      });
    }
  }, { scope: containerRef });

  return (
    <div className="relative min-h-screen" ref={containerRef}>
      <AccentGlow />
      <TopBar />

      <main className="flex-1 pt-24 pb-20">
        {/* HERO SECTION */}
        <section className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 lg:pt-20 pb-16 flex flex-col items-center">
          <Chip variant="outline" className="mb-8 border-[var(--border-strong)]">
            Built for Punjab, Haryana and Delhi NCR
          </Chip>
          
          <h1 className="text-center font-serif italic text-5xl md:text-6xl lg:text-7xl xl:text-8xl tracking-tight text-[var(--text-hi)] max-w-5xl leading-[1.1] mb-6">
            From field to Delhi, <br className="hidden md:block"/>
            <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent not-italic font-medium font-sans">clear air starts with one good decision</span>
          </h1>
          
          <p className="text-center text-lg md:text-xl text-[var(--text-mid)] max-w-2xl mb-10 text-balance">
            Saans connects farmers who can clear their fields without burning to citizens who need to know the air is safe.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 mb-6 relative z-10">
            <Link href="/signup?role=farmer">
              <PillButton size="lg" variant="primary-silver">I'm a farmer</PillButton>
            </Link>
            <Link href="/signup?role=citizen">
              <PillButton size="lg" variant="glass">I'm a citizen</PillButton>
            </Link>
          </div>
          <Link href="/login" className="text-sm text-[var(--text-mid)] hover:text-[var(--text-hi)] underline underline-offset-4 mb-16 relative z-10">
            Already have an account? Log in
          </Link>

          {/* DASHED LINE CONNECTOR (Desktop) */}
          <svg className="hidden lg:block absolute top-[400px] left-0 right-0 w-full h-[1px] z-0 opacity-20 pointer-events-none" viewBox="0 0 1000 1" preserveAspectRatio="none">
            <line x1="0" y1="0.5" x2="1000" y2="0.5" stroke="var(--text-hi)" strokeWidth="1" strokeDasharray="8 8" className="animate-[dash_20s_linear_infinite]" />
          </svg>

          {/* HERO OBJECT & CARDS LAYOUT */}
          <div className="relative w-full flex flex-col lg:flex-row items-center justify-center gap-8 mt-4 z-10 perspective-[1000px]">
            
            {/* Left Cards (Farmers) */}
            <div className="flex flex-col gap-6 w-full lg:w-64 z-10">
              <div className="hidden lg:block text-xs font-bold text-[var(--accent)] tracking-widest uppercase mb-[-10px] pl-2 opacity-80">For Farmers</div>
              <GlassCard className="float-card group cursor-default" spotlight>
                <div className="flex items-center gap-3 mb-3 text-[var(--emerald)]">
                  <LuCalendar className="w-5 h-5" />
                  <span className="text-sm font-medium text-[var(--text-hi)]">Best day to clear</span>
                </div>
                <p className="text-xs text-[var(--text-mid)] mb-3">We check weather, wind and machines for you.</p>
                <div className="flex gap-1 h-2 w-full rounded-full bg-[var(--bg-1)] overflow-hidden">
                  <div className="w-1/4 bg-[var(--emerald)] opacity-40"></div>
                  <div className="w-1/4 bg-[var(--emerald)] opacity-100"></div>
                  <div className="w-1/4 bg-[var(--emerald)] opacity-20"></div>
                  <div className="w-1/4 bg-[var(--emerald)] opacity-10"></div>
                </div>
              </GlassCard>

              <GlassCard className="float-card group cursor-default" spotlight>
                <div className="flex items-center gap-3 mb-3 text-[var(--emerald)]">
                  <LuTractor className="w-5 h-5" />
                  <span className="text-sm font-medium text-[var(--text-hi)] line-clamp-1">Book a machine</span>
                </div>
                <p className="text-xs text-[var(--text-mid)] mb-3">No burning needed.</p>
                <div className="flex items-center justify-between">
                  <Chip variant="outline" className="text-[10px] py-0 px-2 bg-[var(--bg-1)]">Slot: 2 PM</Chip>
                  <SampleDataBadge className="text-[8px] py-0 px-1" />
                </div>
              </GlassCard>
            </div>

            {/* Center Main Screen (Hero Object) */}
            <div className="relative w-full max-w-md aspect-[4/5] rounded-[28px] overflow-hidden border-[6px] border-[var(--bg-1)] shadow-[0_20px_50px_rgba(0,0,0,0.5),0_0_40px_var(--accent-glow)] bg-[var(--bg-0)] transform-gpu lg:rotate-y-[-5deg] lg:rotate-x-[5deg] transition-transform duration-700 hover:rotate-y-0 hover:rotate-x-0 z-20">
              {/* Inner metallic bezel */}
              <div className="absolute inset-0 border-[2px] border-[var(--border-strong)] rounded-[22px] pointer-events-none z-30" />
              {/* Glass glare */}
              <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/10 pointer-events-none z-30" />
              
              {/* Mock App UI Inside */}
              <div className="relative w-full h-full bg-[#0a0f18] p-4 flex flex-col justify-between">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-red-500/20 blur-[60px] rounded-full pointer-events-none" />
                <div className="absolute top-1/4 right-1/4 w-32 h-32 bg-cyan-500/20 blur-[40px] rounded-full pointer-events-none" />
                
                <div className="relative z-10 flex justify-between items-start">
                  <Chip variant="default" className="bg-black/50 backdrop-blur-md border border-white/10 shadow-lg text-white">
                    <span className="w-2 h-2 rounded-full bg-[var(--emerald)] mr-2 inline-block animate-pulse"/>
                    AQI: 142 (Moderate)
                  </Chip>
                </div>

                {/* Mock Fire dots */}
                <div className="absolute top-[40%] left-[30%] w-3 h-3 bg-red-500 rounded-full shadow-[0_0_10px_red]" />
                <div className="absolute top-[45%] left-[35%] w-2 h-2 bg-orange-500 rounded-full shadow-[0_0_8px_orange]" />
                {/* Wind arrow */}
                <LuWind className="absolute top-[45%] left-[45%] text-cyan-400 w-8 h-8 opacity-50 transform rotate-45" />

                <div className="relative z-10">
                  <GlassCard className="bg-black/40 border-white/10 backdrop-blur-xl p-4">
                    <div className="text-xs text-[var(--emerald)] font-medium mb-1">Best day to clear</div>
                    <div className="text-lg text-white font-semibold flex items-center justify-between">
                      Thursday, Oct 12
                      <LuArrowRight className="w-4 h-4 text-white/50" />
                    </div>
                  </GlassCard>
                </div>
              </div>
            </div>

            {/* Right Cards (Citizens) */}
            <div className="flex flex-col gap-6 w-full lg:w-64 z-10">
              <div className="hidden lg:block text-xs font-bold text-[var(--cyan)] tracking-widest uppercase mb-[-10px] pr-2 opacity-80 text-right">For Citizens</div>
              <GlassCard className="float-card group cursor-default" spotlight>
                <div className="flex items-center gap-3 mb-3 text-[var(--cyan)]">
                  <LuCloudSun className="w-5 h-5" />
                  <span className="text-sm font-medium text-[var(--text-hi)]">Today's air</span>
                </div>
                <p className="text-xs text-[var(--text-mid)] mb-3">Know if it is safe to go out.</p>
                <div className="flex items-center gap-2">
                  <Chip className="bg-[var(--cyan)]/20 text-[var(--cyan)] text-[10px] py-0 px-2 border-none">AQI 142</Chip>
                  <span className="text-[10px] text-[var(--text-mid)]">Wear a mask outside</span>
                </div>
              </GlassCard>

              <GlassCard className="float-card group cursor-default" spotlight>
                <div className="flex items-center gap-3 mb-3 text-[var(--red)]">
                  <LuCamera className="w-5 h-5" />
                  <span className="text-sm font-medium text-[var(--text-hi)] line-clamp-1">Report burning</span>
                </div>
                <p className="text-xs text-[var(--text-mid)] mb-3">Photo in, map updated.</p>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[var(--red)] animate-pulse" />
                  <span className="text-[10px] text-[var(--text-hi)]">Status: Received</span>
                </div>
              </GlassCard>
            </div>
            
          </div>
          
          <div className="flex flex-wrap justify-center gap-8 mt-16 text-[var(--text-mid)] text-sm">
            <div className="flex items-center gap-2"><LuCircleCheck className="text-[var(--green)]" /> Free to use</div>
            <div className="flex items-center gap-2"><LuLanguages className="text-[var(--cyan)]" /> Hindi, Punjabi, English</div>
            <div className="flex items-center gap-2"><LuCloud className="text-[#FF9900]" /> Built on AWS</div>
          </div>
        </section>

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
                <Link href="/signup?role=farmer">
                  <PillButton variant="glass" icon={<LuArrowRight />} iconPosition="right">Get Started</PillButton>
                </Link>
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
                <Link href="/signup?role=citizen">
                  <PillButton variant="glass" icon={<LuArrowRight />} iconPosition="right">Get Started</PillButton>
                </Link>
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
          <GlassCard className="aspect-video p-0 overflow-hidden relative group">
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
                <Link href="/map" className="pointer-events-auto">
                  <PillButton variant="glass" size="md">Open full map</PillButton>
                </Link>
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

        {/* AWS STRIP */}
        <section className="reveal-section py-16 border-y border-[var(--border)] mt-16 bg-[var(--bg-1)] overflow-hidden">
          <div className="flex items-center justify-center gap-12 opacity-50 w-max animate-[marquee_30s_linear_infinite] px-8">
            {/* Simple text for AWS services, ideally logos */}
            <span className="text-xl font-bold font-sans tracking-widest text-[#FF9900]">AWS</span>
            <span className="text-lg font-medium">Lambda</span>
            <span className="text-lg font-medium">Bedrock</span>
            <span className="text-lg font-medium">DynamoDB</span>
            <span className="text-lg font-medium">API Gateway</span>
            <span className="text-lg font-medium">Amplify</span>
            <span className="text-lg font-medium">CloudWatch</span>
            <span className="text-xl font-bold font-sans tracking-widest text-[#FF9900] ml-12">AWS</span>
            <span className="text-lg font-medium">Lambda</span>
            <span className="text-lg font-medium">Bedrock</span>
            <span className="text-lg font-medium">DynamoDB</span>
            <span className="text-lg font-medium">API Gateway</span>
            <span className="text-lg font-medium">Amplify</span>
            <span className="text-lg font-medium">CloudWatch</span>
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
      
      <style jsx global>{`
        @keyframes dash {
          to {
            stroke-dashoffset: -100;
          }
        }
        @keyframes marquee {
          to {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </div>
  );
}
