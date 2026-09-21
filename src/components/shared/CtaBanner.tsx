import { Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';

import { Reveal } from '@/components/motion/Reveal';

type CtaBannerProps = {
  eyebrow?: string;
  title: string;
  description: string;
  /**
   * Rendered as-is. Actions are passed in rather than described as data
   * because TanStack types every route's params/search differently, and a
   * prop union covering all of them would be worse than just passing JSX.
   */
  actions: ReactNode;
};

/** The dark jewel-tone banner the homepage uses before its closing CTA. */
export function CtaBanner({ eyebrow, title, description, actions }: CtaBannerProps) {
  return (
    <section id="quote" className="w-full scroll-mt-24 bg-royal-canvas py-10">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-12">
        <Reveal
          variant="scale"
          className="relative overflow-hidden rounded-3xl border border-royal-gold/30 bg-gradient-to-r from-royal-navy via-royal-deep to-royal-sapphire p-8 text-white shadow-2xl lg:p-14"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-20 -right-20 h-96 w-96 animate-pulse rounded-full bg-royal-gold/15 blur-3xl"
          />
          <div className="relative z-10 flex flex-col items-center justify-between gap-8 lg:flex-row">
            {/* Plain divs - the banner itself is the Reveal. */}
            <div className="max-w-2xl space-y-3.5 text-center lg:text-left">
              {eyebrow && (
                <div className="inline-flex items-center gap-2 rounded-full border border-royal-gold/40 bg-white/10 px-3.5 py-1 font-mono-code text-[11px] font-bold uppercase tracking-wider text-royal-gold-light">
                  {eyebrow}
                </div>
              )}
              <h2 className="font-sans-body text-3xl font-extrabold tracking-tight text-white lg:text-4xl">
                {title}
              </h2>
              <p className="max-w-xl text-base text-slate-300">{description}</p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center justify-center gap-4">
              {actions}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/** Shared button styles so every page's CTAs match the homepage exactly. */
export const ctaPrimaryClass =
  'group inline-flex items-center justify-center gap-2 rounded-xl bg-royal-gold-light px-7 py-3.5 text-xs font-bold uppercase tracking-wider text-royal-deep shadow-xl transition-all duration-300 hover:scale-105 hover:bg-white';

export const ctaSecondaryClass =
  'inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/10 px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-white backdrop-blur-md transition-all duration-300 hover:scale-105 hover:bg-white/20';

/** The light closing CTA that ends the homepage. */
export function ClosingCta() {
  return (
    <section className="w-full bg-royal-canvas py-16 text-center">
      <Reveal className="mx-auto max-w-xl space-y-4 px-6">
        <h3 className="font-sans-body text-2xl font-extrabold tracking-tight text-royal-ink sm:text-3xl">
          Ready to take your business to the next level?
        </h3>
        <p className="text-sm text-slate-600">
          Let's discuss your project and see how I can help you achieve your goals.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <Link
            to="/services/request-quote"
            className="inline-flex items-center justify-center rounded-xl border border-royal-gold/35 bg-royal-deep px-6 py-3 text-xs font-bold uppercase tracking-wider text-royal-gold-light shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
          >
            Start a Project
          </Link>
          <Link
            to="/projects"
            className="inline-flex items-center justify-center rounded-xl border border-royal-deep/20 bg-white px-6 py-3 text-xs font-semibold uppercase tracking-wider text-royal-ink shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md"
          >
            Browse Portfolio
          </Link>
        </div>
      </Reveal>
    </section>
  );
}

/** The standard "request a quote / view pricing" pair used across pages. */
export function DefaultCtaActions() {
  return (
    <>
      <Link to="/services/request-quote" className={ctaPrimaryClass}>
        Request a Quote
        <ArrowRight className="h-[18px] w-[18px] transition-transform duration-300 group-hover:translate-x-1" />
      </Link>
      <Link to="/gigs" search={{ page: 1 }} className={ctaSecondaryClass}>
        View Pricing
      </Link>
    </>
  );
}
