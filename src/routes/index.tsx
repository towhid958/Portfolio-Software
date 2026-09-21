import { createFileRoute } from '@tanstack/react-router';

import { Hero } from '@/components/home/Hero';
import { TechStrip } from '@/components/home/TechStrip';
import { ServicesGrid } from '@/components/home/ServicesGrid';
import { FeaturedCaseStudy } from '@/components/home/FeaturedCaseStudy';
import { Expertise } from '@/components/home/Expertise';
import { HomeCtaBanner, ClosingCta } from '@/components/home/CtaBanner';

export const Route = createFileRoute('/')({
  component: Index,
});

/**
 * Composition only. Each section owns its own data and state:
 * - Hero holds the image-fallback stage (it fires on most loads)
 * - ServicesGrid and FeaturedCaseStudy each run their own query
 *
 * Keeping them separate means one section's state change re-renders that
 * section rather than the whole page.
 */
function Index() {
  return (
    <div className="flex w-full flex-col overflow-hidden bg-royal-canvas font-sans-body text-royal-ink">
      <Hero />
      <TechStrip />
      <ServicesGrid />
      <FeaturedCaseStudy />
      <Expertise />
      <HomeCtaBanner />
      <ClosingCta />
    </div>
  );
}
