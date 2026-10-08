import { Navbar } from '@/components/landing/Navbar';
import { Hero } from '@/components/landing/Hero';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { Footer } from '@/components/landing/Footer';

export default function LandingPage() {
  return (
    <main className="flex-1 flex flex-col">
      <Navbar />
      <Hero />
      <HowItWorks />
      <div className="flex-grow bg-[var(--color-sand-200)]"></div>
      <Footer />
    </main>
  );
}
