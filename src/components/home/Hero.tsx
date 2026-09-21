import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowRight, Mail, UserCircle2 } from 'lucide-react';

import { usePublicProfile } from '@/hooks/usePublicProfile';
import { CountUp, Reveal } from '@/components/motion/Reveal';

// Drop your own hero shot at public/images/hero.jpg and it wins. If that file
// isn't there, the hero falls back to the Supabase profile avatar_url (editable
// from the admin panel), and finally to a neutral placeholder - so the hero
// never renders a broken image no matter which source is missing.
const HERO_IMAGE = '/images/hasan-kamrul.jpg';

const HERO_STATS = [
  { value: 5, suffix: '+', label: 'Years Exp.', tone: 'text-royal-deep' },
  { value: 120, suffix: '+', label: 'Projects Done', tone: 'text-royal-sapphire' },
  { value: 50, suffix: '+', label: 'Happy Clients', tone: 'text-emerald-700' },
];

/**
 * Also the nav's "About" anchor target - the only section on the page that
 * actually introduces who I am.
 *
 * heroStage lives here rather than on the route component on purpose: the
 * local hero.jpg is usually absent, so the fallback fires on nearly every
 * load. Held one level up it re-rendered all seven page sections.
 */
export function Hero() {
  const { data: profile } = usePublicProfile();

  // 0 = local file, 1 = Supabase avatar, 2 = placeholder icon.
  const [heroStage, setHeroStage] = useState<0 | 1 | 2>(0);
  const heroSrc =
    heroStage === 0 ? HERO_IMAGE : heroStage === 1 ? (profile?.avatar_url ?? null) : null;

  return (
    <section
      id="about"
      className="relative w-full scroll-mt-24 overflow-hidden border-b border-royal-deep/10 bg-gradient-to-b from-[#F2F4F8] via-royal-canvas to-royal-canvas"
    >
      {/* Ambient glow */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[550px] w-[1100px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-royal-deep/12 via-royal-sapphire/10 to-royal-gold/15 blur-[120px]" />
        <div className="absolute -left-20 top-72 h-[450px] w-[450px] rounded-full bg-royal-sapphire/8 blur-[100px]" />
        <div className="absolute -right-24 top-60 h-[480px] w-[480px] rounded-full bg-royal-gold/10 blur-[110px]" />
      </div>

      <div className="relative mx-auto w-full max-w-[1280px] px-6 pb-20 pt-14 lg:px-12">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">
          {/* Left: value proposition */}
          <div className="flex flex-col items-start gap-y-6 lg:col-span-7">
            <Reveal>
              <div className="inline-flex items-center gap-2.5 rounded-full border border-royal-deep/15 bg-white px-4 py-1.5 shadow-[0_2px_10px_rgba(12,27,51,0.06)]">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                </span>
                <span className="font-mono-code text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                  Available for new projects
                </span>
              </div>
            </Reveal>

            <Reveal className="space-y-4" delay={90}>
              <h1 className="font-sans-body text-4xl font-extrabold leading-[1.12] tracking-[-0.03em] text-royal-ink sm:text-5xl lg:text-[62px]">
                {profile?.professional_title || (
                  <>
                    Digital Strategist &amp;
                    <br />
                    <span className="animate-gradient-drift bg-gradient-to-r from-royal-deep via-royal-sapphire to-[#B8860B] bg-clip-text font-serif-display font-medium italic text-transparent">
                      Full-Stack Developer
                    </span>
                  </>
                )}
              </h1>
              <p className="max-w-xl pt-1 text-base font-normal leading-relaxed text-slate-600 sm:text-lg">
                I help brands and businesses scale with data-driven digital marketing and
                high-performance full-stack applications. From Meta ads to React dashboards, I
                deliver results that matter.
              </p>
            </Reveal>

            <Reveal className="flex flex-wrap items-center gap-4 pt-2" delay={190}>
              <Link
                to="/projects"
                className="group inline-flex items-center justify-center gap-2.5 rounded-xl border border-royal-gold/35 bg-royal-deep px-7 py-3.5 text-sm font-bold uppercase tracking-wide text-royal-gold-light shadow-lg shadow-royal-deep/25 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-royal-deep/40 active:translate-y-0"
              >
                View My Work
                <ArrowRight className="h-[18px] w-[18px] transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
              <Link
                to="/services/request-quote"
                className="group inline-flex items-center justify-center gap-2 rounded-xl border border-royal-deep/20 bg-white px-6 py-3.5 text-sm font-semibold text-royal-ink shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-royal-deep/40 hover:bg-[#F6F5F0] hover:shadow-md active:translate-y-0"
              >
                <Mail className="h-[18px] w-[18px] text-royal-sapphire transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110" />
                Contact Me
              </Link>
            </Reveal>

            {/* Metrics strip */}
            <Reveal className="mt-2 w-full pt-4" delay={280}>
              <div className="grid grid-cols-3 gap-4 rounded-2xl border border-royal-deep/15 bg-white/90 p-5 shadow-[0_8px_24px_rgba(12,27,51,0.06)] backdrop-blur-md">
                {HERO_STATS.map((stat) => (
                  <div key={stat.label} className="flex flex-col space-y-1">
                    <CountUp
                      value={stat.value}
                      suffix={stat.suffix}
                      className={`text-3xl font-extrabold tracking-tight lg:text-4xl ${stat.tone}`}
                    />
                    <span className="font-mono-code text-[11px] uppercase tracking-wider text-slate-500">
                      {stat.label}
                    </span>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>

          {/* Right: showcase card holding the hero image */}
          <Reveal className="relative mt-4 lg:col-span-5 lg:mt-0" variant="right" delay={140}>
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 -m-5 rounded-3xl bg-gradient-to-tr from-royal-deep/20 via-royal-sapphire/15 to-royal-gold/20 blur-2xl"
            />
            <div className="group relative flex flex-col gap-5 rounded-3xl border border-royal-deep/15 bg-white/95 p-6 shadow-[0_16px_40px_rgba(12,27,51,0.12)] backdrop-blur-xl transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_24px_56px_rgba(12,27,51,0.18)] lg:p-7">
              <div className="relative w-full overflow-hidden rounded-2xl">
                {heroSrc ? (
                  <img
                    src={heroSrc}
                    onError={() => setHeroStage((stage) => (stage === 0 ? 1 : 2))}
                    alt={
                      profile?.full_name
                        ? `${profile.full_name} - ${profile.professional_title || 'Digital Strategist & Full-Stack Developer'}`
                        : 'Hasan Kamrul - Digital Strategist & Full-Stack Developer'
                    }
                    className="max-h-[480px] w-full rounded-2xl border border-royal-deep/12 object-cover object-top shadow-xl transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="flex aspect-square w-full items-center justify-center rounded-2xl border border-royal-deep/12 bg-royal-canvas-alt">
                    <UserCircle2 className="h-32 w-32 text-royal-deep/20" />
                  </div>
                )}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
