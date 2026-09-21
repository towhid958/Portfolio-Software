import { Braces, Code2, Database, MousePointerClick, ShoppingBag } from 'lucide-react';

import { Reveal } from '@/components/motion/Reveal';

const TECH_STACK = [
  { label: 'React / Next.js', icon: Code2, tone: 'text-royal-deep hover:border-royal-sapphire' },
  { label: 'TypeScript', icon: Braces, tone: 'text-royal-sapphire hover:border-royal-sapphire' },
  { label: 'Supabase / SQL', icon: Database, tone: 'text-emerald-700 hover:border-emerald-700' },
  { label: 'Shopify Plus', icon: ShoppingBag, tone: 'text-royal-gold-deep hover:border-amber-700' },
  {
    label: 'Meta & Google Ads',
    icon: MousePointerClick,
    tone: 'text-royal-sapphire hover:border-royal-sapphire',
  },
];

export function TechStrip() {
  return (
    <section className="w-full border-y border-royal-deep/10 bg-royal-band py-10">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-12">
        <Reveal className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="flex items-center gap-2.5 font-mono-code text-xs font-bold uppercase tracking-[0.16em] text-royal-deep">
            <span className="h-2.5 w-2.5 rounded-full bg-royal-gold shadow-[0_0_8px_rgba(212,175,55,0.7)]" />
            Core Technical &amp; Growth Engine Stack
          </div>
          <span className="text-xs font-medium text-slate-600">
            Enterprise-tested architecture &amp; omnichannel ad networks
          </span>
        </Reveal>

        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-5">
          {TECH_STACK.map((tech, idx) => {
            const Icon = tech.icon;
            return (
              <Reveal
                key={tech.label}
                delay={idx * 70}
                className={`group flex items-center gap-3 rounded-xl border border-royal-deep/12 bg-white p-3.5 transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${tech.tone}`}
              >
                <Icon className="h-5 w-5 shrink-0 transition-transform duration-300 group-hover:scale-110" />
                <span className="text-sm font-bold text-royal-ink">{tech.label}</span>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
