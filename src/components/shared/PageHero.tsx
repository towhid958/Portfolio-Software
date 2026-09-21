import type { ReactNode } from 'react';

import { Reveal } from '@/components/motion/Reveal';

type PageHeroProps = {
  /** Small mono pill above the title. */
  eyebrow?: string;
  title: ReactNode;
  description?: string;
  /** Buttons or links rendered under the description. */
  actions?: ReactNode;
  /** Anything extra below the actions - stat strips, filters, search. */
  children?: ReactNode;
  /** Set when the page's own <h1> lives elsewhere, to avoid two h1s. */
  as?: 'h1' | 'h2';
};

/**
 * The top-of-page header for every inner public page.
 *
 * Deliberately echoes the homepage hero - same ambient glow, same canvas
 * gradient, same eyebrow/gradient-rule rhythm - so a visitor moving from the
 * homepage to /services or /blog stays in the same world. It is a narrower,
 * centred variant rather than the homepage's two-column split, because inner
 * pages lead with their content rather than a portrait.
 */
export function PageHero({
  eyebrow,
  title,
  description,
  actions,
  children,
  as: Heading = 'h1',
}: PageHeroProps) {
  return (
    <section className="relative w-full overflow-hidden border-b border-royal-deep/10 bg-gradient-to-b from-[#F2F4F8] via-royal-canvas to-royal-canvas">
      {/* Ambient glow - same recipe as the homepage hero */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[420px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-royal-deep/12 via-royal-sapphire/10 to-royal-gold/15 blur-[120px]" />
        <div className="absolute -right-24 top-40 h-[360px] w-[360px] rounded-full bg-royal-gold/10 blur-[110px]" />
      </div>

      <div className="relative mx-auto w-full max-w-[1280px] px-6 pb-16 pt-16 lg:px-12 lg:pt-20">
        <Reveal className="mx-auto flex max-w-3xl flex-col items-center space-y-4 text-center">
          {eyebrow && (
            <div className="inline-flex items-center gap-2 rounded-full border border-royal-deep/15 bg-white px-4 py-1.5 font-mono-code text-[11px] font-bold uppercase tracking-wider text-royal-deep shadow-sm">
              {eyebrow}
            </div>
          )}
          <Heading className="font-sans-body text-4xl font-extrabold leading-[1.12] tracking-[-0.03em] text-royal-ink sm:text-5xl">
            {title}
          </Heading>
          <div className="h-1 w-16 rounded-full bg-gradient-to-r from-royal-deep via-royal-gold to-royal-sapphire" />
          {description && (
            <p className="max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
              {description}
            </p>
          )}
          {actions && (
            <div className="flex flex-wrap items-center justify-center gap-4 pt-2">{actions}</div>
          )}
        </Reveal>

        {children && <div className="relative mt-10">{children}</div>}
      </div>
    </section>
  );
}
