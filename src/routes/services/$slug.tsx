import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowRight, Globe, Layers, MessageSquare, Ruler, ShieldCheck, Zap } from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { getServiceBySlug } from '@/lib/services.functions';
import { cycle } from '@/lib/utils';
import { Reveal } from '@/components/motion/Reveal';
import { SectionHeading } from '@/components/shared/SectionHeading';
import { CardSkeleton, EmptyState } from '@/components/shared/ListingChrome';

export const Route = createFileRoute('/services/$slug')({
  loader: ({ params }) => getServiceBySlug({ data: params.slug }),
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: 'Service Not Found | Hasan Kamrul' }] };

    const title =
      loaderData.meta_title || `${loaderData.title} | Professional Services | Hasan Kamrul`;
    const description = loaderData.meta_description || loaderData.short_description || '';
    const image = loaderData.og_image || loaderData.hero_image || '';

    const meta: Array<Record<string, string>> = [
      { title },
      { name: 'description', content: description },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description },
    ];

    if (image) {
      meta.push({ property: 'og:image', content: image });
      meta.push({ name: 'twitter:image', content: image });
    }

    return { meta };
  },
  component: ServiceDetailPage,
});

type Feature = { title: string; description: string };
type ProcessStep = { step?: string | number; title: string; description: string };
// Mirrors the real `gigs` columns. The previous markup read gig.description,
// gig.featured_image and gig.starting_price - none of which exist on that
// table - so every package card rendered an empty paragraph and a literal
// "$undefined" next to a stock photo.
type PackageLink = {
  gig?: {
    id: string;
    slug: string;
    title: string;
    short_description: string | null;
    thumbnail: string | null;
  } | null;
};

const ACCENTS: readonly [string, ...string[]] = [
  'bg-royal-deep/5 border-royal-deep/10 text-royal-deep',
  'bg-royal-sapphire/10 border-royal-sapphire/15 text-royal-sapphire',
  'bg-emerald-50 border-emerald-200 text-emerald-700',
  'bg-amber-50 border-amber-200 text-royal-gold-deep',
];

// Claims that can actually be backed up. The previous row promised "5-Star
// Quality" and "24/7 Support" - neither is verifiable, and the footer states
// GMT+6 availability, which contradicts round-the-clock support.
const TRUST_BADGES = [
  { icon: ShieldCheck, label: 'Secure Payments' },
  { icon: Globe, label: 'Remote Worldwide' },
  { icon: Ruler, label: 'Fixed Scope' },
  { icon: MessageSquare, label: 'Direct Contact' },
];

function ServiceDetailPage() {
  const { slug } = Route.useParams();
  const loaderData = Route.useLoaderData();

  const { data: service, isLoading } = useSuspenseQuery({
    queryKey: ['service', slug],
    queryFn: async () => {
      if (loaderData) return loaderData;

      const { data, error } = await supabase
        .from('services')
        .select('*, category:service_categories(*), packages:service_packages_link(gig:gigs(*))')
        .eq('slug', slug)
        .eq('status', 'published')
        .single();

      if (error) throw error;
      return data;
    },
    initialData: loaderData,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-royal-canvas py-20 font-sans-body">
        <div className="mx-auto max-w-[1280px] space-y-8 px-6 lg:px-12">
          <CardSkeleton className="h-14 w-1/3" />
          <CardSkeleton className="h-[360px]" />
          <div className="grid gap-6 md:grid-cols-3">
            {Array.from({ length: 3 }, (_, i) => (
              <CardSkeleton key={i} className="h-56" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-royal-canvas px-6 font-sans-body">
        <div className="w-full max-w-md">
          <EmptyState
            title="Service not found"
            description="This service doesn't exist or has been moved."
            icon={<Layers className="h-6 w-6" />}
          />
          <div className="mt-6 text-center">
            <Link
              to="/services"
              className="inline-flex items-center gap-2 rounded-xl border border-royal-gold/35 bg-royal-deep px-6 py-3 text-xs font-bold uppercase tracking-wider text-royal-gold-light shadow-md transition-all duration-300 hover:-translate-y-0.5"
            >
              Back to Services
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const features = (service.features ?? []) as Feature[];
  const process = (service.process ?? []) as ProcessStep[];
  const packages = (service.packages ?? []) as unknown as PackageLink[];

  return (
    <div className="flex w-full flex-col bg-royal-canvas font-sans-body text-royal-ink">
      {/* Hero */}
      <section className="relative w-full overflow-hidden border-b border-royal-deep/10 bg-gradient-to-b from-[#F2F4F8] via-royal-canvas to-royal-canvas py-16 lg:py-20">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 left-1/2 h-[420px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-royal-deep/12 via-royal-sapphire/10 to-royal-gold/15 blur-[120px]" />
          <div className="absolute -right-24 top-40 h-[360px] w-[360px] rounded-full bg-royal-gold/10 blur-[110px]" />
        </div>

        <div className="relative mx-auto max-w-[1280px] px-6 lg:px-12">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
            <Reveal variant="left" className="space-y-5">
              <span className="inline-flex rounded-full border border-royal-deep/15 bg-white px-4 py-1.5 font-mono-code text-[11px] font-bold uppercase tracking-wider text-royal-deep shadow-sm">
                {service.category?.name || 'Professional Service'}
              </span>
              <h1 className="font-sans-body text-4xl font-extrabold leading-[1.12] tracking-[-0.03em] text-royal-ink md:text-5xl">
                {service.title}
              </h1>
              <p className="text-lg leading-relaxed text-slate-600">{service.short_description}</p>
              <div className="flex flex-wrap items-center gap-5 pt-2">
                <Link
                  to="/services/request-quote"
                  search={{ serviceId: service.id }}
                  className="group inline-flex items-center justify-center gap-2.5 rounded-xl border border-royal-gold/35 bg-royal-deep px-7 py-3.5 text-sm font-bold uppercase tracking-wide text-royal-gold-light shadow-lg shadow-royal-deep/25 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl"
                >
                  Get Started
                  <ArrowRight className="h-[18px] w-[18px] transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
                {(service.starting_price ?? 0) > 0 && (
                  <div>
                    <span className="block font-mono-code text-[10px] uppercase tracking-wider text-slate-500">
                      Starting from
                    </span>
                    <span className="font-sans-body text-2xl font-extrabold text-royal-deep">
                      ${service.starting_price}
                    </span>
                  </div>
                )}
              </div>
            </Reveal>

            <Reveal
              variant="right"
              delay={140}
              className="relative aspect-video overflow-hidden rounded-3xl border border-royal-deep/15 bg-royal-deep shadow-[0_16px_40px_rgba(12,27,51,0.12)]"
            >
              {service.hero_image ? (
                <img
                  src={service.hero_image}
                  alt={service.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Layers className="h-20 w-20 text-white/15" />
                </div>
              )}
            </Reveal>
          </div>
        </div>
      </section>

      {/* Features */}
      {features.length > 0 && (
        <section className="w-full border-b border-royal-deep/10 bg-royal-canvas-alt py-24">
          <div className="mx-auto max-w-[1280px] px-6 lg:px-12">
            <SectionHeading
              eyebrow="What You Get"
              title="Why choose this service?"
              description="I combine strategy, design, and technology to deliver results that matter for your business."
            />

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {features.map((feature, idx) => (
                <Reveal
                  key={feature.title}
                  delay={(idx % 3) * 90}
                  className="group rounded-3xl border border-royal-deep/12 bg-white p-7 shadow-sm transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1.5 hover:border-royal-gold hover:shadow-[0_16px_36px_rgba(12,27,51,0.08)]"
                >
                  <div
                    className={`mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border shadow-sm transition-transform duration-300 group-hover:scale-110 ${cycle(ACCENTS, idx)}`}
                  >
                    <Zap className="h-6 w-6" />
                  </div>
                  <h3 className="font-sans-body text-lg font-bold text-royal-ink">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {feature.description}
                  </p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Process */}
      {process.length > 0 && (
        <section className="w-full border-b border-royal-deep/10 bg-royal-canvas py-24">
          <div className="mx-auto max-w-[1280px] px-6 lg:px-12">
            <SectionHeading
              eyebrow="How It Runs"
              title="The Process"
              description="A structured, transparent approach to bringing your vision to life."
              eyebrowClassName="border-royal-deep/15 bg-royal-deep/5"
            />

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {process.map((step, idx) => (
                <Reveal
                  key={step.title}
                  delay={idx * 80}
                  className="group relative rounded-3xl border border-royal-deep/12 bg-white p-7 pt-9 text-center shadow-sm transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1.5 hover:border-royal-gold hover:shadow-[0_16px_36px_rgba(12,27,51,0.08)]"
                >
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border border-royal-gold/35 bg-royal-deep px-3 py-1 font-mono-code text-[10px] font-bold uppercase tracking-wider text-royal-gold-light">
                    Step {step.step || idx + 1}
                  </span>
                  <h3 className="font-sans-body text-lg font-bold text-royal-ink">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.description}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Packages */}
      {service.show_packages && packages.length > 0 && (
        <section className="w-full border-b border-royal-deep/10 bg-royal-canvas-alt py-24">
          <div className="mx-auto max-w-[1280px] px-6 lg:px-12">
            <SectionHeading
              eyebrow="Fixed Scope"
              title="Available Packages"
              description="Standardised solutions for specific needs, priced up front."
            />

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {packages.map((item, idx) => {
                const gig = item.gig;
                if (!gig) return null;
                return (
                  <Reveal
                    key={gig.id}
                    delay={(idx % 3) * 90}
                    className="group flex flex-col overflow-hidden rounded-3xl border border-royal-deep/12 bg-white shadow-sm transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1.5 hover:border-royal-gold hover:shadow-[0_16px_36px_rgba(12,27,51,0.08)]"
                  >
                    <div className="relative aspect-video overflow-hidden bg-royal-deep">
                      {gig.thumbnail ? (
                        <img
                          src={gig.thumbnail}
                          alt={gig.title}
                          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Zap className="h-12 w-12 text-white/15" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col p-6">
                      <h3 className="font-sans-body text-lg font-bold text-royal-ink transition-colors duration-300 group-hover:text-royal-sapphire">
                        {gig.title}
                      </h3>
                      <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-slate-600">
                        {gig.short_description}
                      </p>
                      <div className="mt-5 border-t border-slate-100 pt-5">
                        <Link
                          to="/gigs/$slug"
                          params={{ slug: gig.slug }}
                          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-royal-deep transition-all duration-300 hover:text-royal-gold-deep group-hover:translate-x-1"
                        >
                          View package &amp; pricing
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="w-full bg-royal-canvas py-10">
        <div className="mx-auto max-w-[1280px] px-6 lg:px-12">
          <Reveal
            variant="scale"
            className="relative overflow-hidden rounded-3xl border border-royal-gold/30 bg-gradient-to-r from-royal-navy via-royal-deep to-royal-sapphire p-8 text-center text-white shadow-2xl lg:p-14"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-20 -right-20 h-96 w-96 animate-pulse rounded-full bg-royal-gold/15 blur-3xl"
            />
            <div className="relative z-10">
              <h2 className="font-sans-body text-3xl font-extrabold tracking-tight lg:text-4xl">
                Ready to start your project?
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-base text-slate-300">
                Get in touch for a free consultation and a personalised quote based on your specific
                requirements.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
                <Link
                  to="/services/request-quote"
                  search={{ serviceId: service.id }}
                  className="group inline-flex items-center justify-center gap-2 rounded-xl bg-royal-gold-light px-7 py-3.5 text-xs font-bold uppercase tracking-wider text-royal-deep shadow-xl transition-all duration-300 hover:scale-105 hover:bg-white"
                >
                  Request a Custom Quote
                  <ArrowRight className="h-[18px] w-[18px] transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
                <Link
                  to="/services"
                  className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/10 px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-white backdrop-blur-md transition-all duration-300 hover:scale-105 hover:bg-white/20"
                >
                  Browse All Services
                </Link>
              </div>

              <div className="mt-12 grid grid-cols-2 gap-6 border-t border-white/10 pt-8 md:grid-cols-4">
                {TRUST_BADGES.map((badge) => {
                  const Icon = badge.icon;
                  return (
                    <div
                      key={badge.label}
                      className="flex items-center justify-center gap-2 text-slate-300"
                    >
                      <Icon className="h-4 w-4 text-royal-gold" />
                      <span className="font-mono-code text-[11px] font-bold uppercase tracking-wider">
                        {badge.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
