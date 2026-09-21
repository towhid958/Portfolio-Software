import { ArrowRight, BarChart3, Boxes, Handshake, Target } from 'lucide-react';

import { Reveal } from '@/components/motion/Reveal';
import { HomeLink, type HomeTarget } from './HomeLink';
import { SectionHeading } from '@/components/shared/SectionHeading';

type Pillar = {
  title: string;
  desc: string;
  cta: string;
  icon: typeof BarChart3;
  iconClass: string;
  titleClass: string;
  linkClass: string;
  /** Each pillar carries its own destination, so reordering this array can no
   *  longer silently reassign the links the way an index-based branch did. */
  target: HomeTarget;
};

const PILLARS: Pillar[] = [
  {
    title: 'Data-Driven Strategy',
    desc: 'I leverage advanced analytics to understand user behavior, ensuring every design and marketing decision is backed by solid evidence.',
    cta: 'View Strategy',
    icon: BarChart3,
    iconClass: 'bg-royal-deep/5 border-royal-deep/10 text-royal-deep',
    titleClass: 'group-hover:text-royal-sapphire',
    linkClass: 'text-royal-deep hover:text-royal-gold-deep',
    target: { kind: 'hash', hash: 'services' },
  },
  {
    title: 'Scalable Architecture',
    desc: 'Using industry-leading technologies like React and Supabase, I build platforms designed for high performance and seamless growth.',
    cta: 'Explore Tech',
    icon: Boxes,
    iconClass: 'bg-royal-sapphire/10 border-royal-sapphire/15 text-royal-sapphire',
    titleClass: 'group-hover:text-royal-sapphire',
    linkClass: 'text-royal-sapphire hover:text-royal-gold-deep',
    target: { kind: 'route', to: '/projects' },
  },
  {
    title: 'High Conversion Focus',
    desc: 'Conversion rate optimization (CRO) is at the heart of everything I do, turning visitors into loyal customers through intuitive UI/UX.',
    cta: 'Learn How',
    icon: Target,
    iconClass: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    titleClass: 'group-hover:text-emerald-700',
    linkClass: 'text-emerald-800 hover:text-royal-gold-deep',
    target: { kind: 'gigs' },
  },
  {
    title: 'Dedicated Partnership',
    desc: 'I believe in long-term success. I provide continuous support and strategic consulting to help your business evolve in the digital landscape.',
    cta: 'Partner With Me',
    icon: Handshake,
    iconClass: 'bg-amber-50 border-amber-200 text-royal-gold-deep',
    titleClass: 'group-hover:text-royal-gold-deep',
    linkClass: 'text-royal-gold-deep hover:text-royal-deep',
    target: { kind: 'route', to: '/partners' },
  },
];

export function Expertise() {
  return (
    <section id="expertise" className="w-full scroll-mt-24 bg-royal-canvas py-24">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-12">
        <SectionHeading
          eyebrow="Why Work With Me"
          title="Expertise That Delivers Results"
          description="I combine deep technical knowledge with strategic marketing insights to build digital solutions that don't just look great, but perform exceptionally."
          eyebrowClassName="border-royal-deep/15 bg-royal-deep/5"
        />

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((pillar, idx) => {
            const Icon = pillar.icon;
            return (
              <Reveal
                key={pillar.title}
                delay={idx * 90}
                className="group flex flex-col justify-between rounded-3xl border border-royal-deep/12 bg-white p-7 shadow-sm transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1.5 hover:border-royal-sapphire hover:shadow-[0_16px_36px_rgba(12,27,51,0.08)]"
              >
                <div className="space-y-4">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl border shadow-sm transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110 ${pillar.iconClass}`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="space-y-2">
                    <h3
                      className={`font-sans-body text-lg font-bold text-royal-ink transition-colors duration-300 ${pillar.titleClass}`}
                    >
                      {pillar.title}
                    </h3>
                    <p className="text-xs font-normal leading-relaxed text-slate-600">
                      {pillar.desc}
                    </p>
                  </div>
                </div>
                <div className="mt-4 border-t border-slate-100 pt-6">
                  <HomeLink
                    target={pillar.target}
                    className={`group/cta inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider transition-colors duration-300 ${pillar.linkClass}`}
                  >
                    {pillar.cta}
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/cta:translate-x-1" />
                  </HomeLink>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
