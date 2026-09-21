import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  Compass,
  Layers,
  LineChart,
  ShoppingCart,
  Terminal,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { Reveal } from '@/components/motion/Reveal';
import { cycle } from '@/lib/utils';
import { HomeLink, type HomeTarget } from './HomeLink';
import { SectionHeading } from '@/components/shared/SectionHeading';

// Accent rotation for the bento. Services come from Supabase and carry no
// colour of their own, so the grid cycles these by position to keep the same
// visual rhythm however many are published.
type ServiceAccent = { icon: string; badge: string; title: string; link: string };

const SERVICE_ACCENTS: readonly [ServiceAccent, ...ServiceAccent[]] = [
  {
    icon: 'bg-royal-deep/5 border-royal-deep/10 text-royal-deep',
    badge: 'bg-amber-50 text-amber-900 border-amber-200',
    title: 'group-hover:text-royal-sapphire',
    link: 'text-royal-deep hover:text-royal-gold-deep',
  },
  {
    icon: 'bg-royal-sapphire/10 border-royal-sapphire/15 text-royal-sapphire',
    badge: 'bg-blue-50 text-royal-sapphire border-blue-200',
    title: 'group-hover:text-royal-sapphire',
    link: 'text-royal-sapphire hover:text-royal-gold-deep',
  },
  {
    icon: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    title: 'group-hover:text-emerald-700',
    link: 'text-emerald-800 hover:text-royal-gold-deep',
  },
  {
    icon: 'bg-royal-deep/5 border-royal-deep/10 text-royal-deep',
    badge: 'bg-slate-100 text-slate-800 border-slate-200',
    title: 'group-hover:text-royal-sapphire',
    link: 'text-royal-deep hover:text-royal-gold-deep',
  },
  {
    icon: 'bg-amber-50 border-amber-200 text-royal-gold-deep',
    badge: 'bg-amber-50 text-amber-900 border-amber-200',
    title: 'group-hover:text-royal-gold-deep',
    link: 'text-royal-gold-deep hover:text-royal-deep',
  },
  {
    icon: 'bg-royal-deep/5 border-royal-deep/10 text-royal-deep',
    badge: 'bg-slate-100 text-slate-800 border-slate-200',
    title: 'group-hover:text-royal-deep',
    link: 'text-royal-deep hover:text-royal-gold-deep',
  },
];

const SERVICE_FALLBACK_ICONS: readonly [LucideIcon, ...LucideIcon[]] = [
  TrendingUp,
  ShoppingCart,
  Terminal,
  Compass,
  LineChart,
  Layers,
];

// Shown only until real services are published in the admin panel.
const STATIC_SERVICES = [
  {
    title: 'Performance Marketing',
    short_description:
      'Paid media that compounds revenue, not just clicks. Targeted Meta & Google campaigns, deep funnel attribution, and full-funnel CRO.',
    badge: 'Growth',
    tag: 'Meta CAPI • GA4',
  },
  {
    title: 'Shopify Development',
    short_description:
      'High-converting Shopify storefronts built for lightning speed, custom liquid sections, and seamless checkout integrations.',
    badge: 'E-Commerce',
    tag: 'Liquid • Hydrogen',
  },
  {
    title: 'Web Application Development',
    short_description:
      'Modern web apps with real-time dashboards, scalable serverless architecture, secure authentication, and automated payment flows.',
    badge: 'Full-Stack',
    tag: 'React • Next.js',
  },
  {
    title: 'Growth Consulting',
    short_description:
      'Strategy sprints that unblock your next growth stage, identifying friction in user journeys and optimizing unit economics.',
    badge: 'Strategy',
    tag: 'Audits • Roadmaps',
  },
  {
    title: 'SEO & Content Marketing',
    short_description:
      'Ongoing SEO and technical content strategy to grow organic traffic month over month with compound domain authority.',
    badge: 'Organic Reach',
    tag: 'Tech SEO • Schema',
  },
  {
    title: 'Brand Strategy Sprint',
    short_description:
      'A focused two-week sprint to define positioning, messaging, visual direction, and cohesive go-to-market execution.',
    badge: 'Branding',
    tag: '2-Week Sprint',
  },
];

type ServiceCard = {
  title: string;
  short_description: string | null;
  icon_image: string | null;
  badge: string | null;
  tag: string | null;
  target: HomeTarget;
};

export function ServicesGrid() {
  const { data: services } = useQuery({
    queryKey: ['public-services'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select(
          'id, slug, title, short_description, icon_image, delivery_time, technologies, is_featured',
        )
        .eq('status', 'published')
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true })
        .limit(6);

      if (error) throw error;
      return data;
    },
  });

  const cards: ServiceCard[] = useMemo(() => {
    if (!services || services.length === 0) {
      return STATIC_SERVICES.map((service) => ({
        title: service.title,
        short_description: service.short_description,
        icon_image: null,
        badge: service.badge,
        tag: service.tag,
        target: { kind: 'route', to: '/services' } as const,
      }));
    }

    return services.map((service) => {
      const technologies = Array.isArray(service.technologies)
        ? (service.technologies as unknown[]).filter(
            (tech): tech is string => typeof tech === 'string',
          )
        : [];
      return {
        title: service.title,
        short_description: service.short_description,
        icon_image: service.icon_image,
        badge: service.is_featured ? 'Featured' : service.delivery_time,
        tag: technologies.slice(0, 2).join(' • ') || service.delivery_time,
        target: { kind: 'service', slug: service.slug } as const,
      };
    });
  }, [services]);

  return (
    <section
      id="services"
      className="w-full scroll-mt-24 border-b border-royal-deep/10 bg-royal-canvas-alt py-24"
    >
      <div className="mx-auto max-w-[1280px] px-6 lg:px-12">
        <SectionHeading
          eyebrow="What I Deliver"
          title="Premium Services"
          description="Specialized solutions engineered for aggressive business growth, flawless stability, and rapid deployment cycles."
        />

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {cards.map((service, idx) => {
            const accent = cycle(SERVICE_ACCENTS, idx);
            const FallbackIcon = cycle(SERVICE_FALLBACK_ICONS, idx);
            const linkClass = `inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider transition-all duration-300 group-hover:translate-x-1 ${accent.link}`;
            return (
              <Reveal
                key={service.title}
                delay={(idx % 3) * 90}
                className="group relative flex flex-col justify-between rounded-3xl border border-royal-deep/12 bg-white p-7 shadow-sm transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1.5 hover:border-royal-gold hover:shadow-[0_16px_36px_rgba(12,27,51,0.08)]"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border shadow-sm transition-transform duration-300 group-hover:scale-110 ${accent.icon}`}
                    >
                      {service.icon_image ? (
                        <img
                          src={service.icon_image}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <FallbackIcon className="h-6 w-6" />
                      )}
                    </div>
                    {service.badge && (
                      <span
                        className={`rounded-full border px-3 py-1 font-mono-code text-[10px] font-bold uppercase tracking-wider ${accent.badge}`}
                      >
                        {service.badge}
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    <h3
                      className={`font-sans-body text-xl font-bold text-royal-ink transition-colors duration-300 ${accent.title}`}
                    >
                      {service.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-slate-600">
                      {service.short_description}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-6">
                  <HomeLink target={service.target} className={linkClass}>
                    Learn more
                    <ArrowRight className="h-4 w-4" />
                  </HomeLink>
                  {service.tag && (
                    <span className="font-mono-code text-[11px] text-slate-400">{service.tag}</span>
                  )}
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
