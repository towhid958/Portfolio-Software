import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  Layers,
  Layout,
  Palette,
  Search,
  ShieldCheck,
  Smartphone,
  TrendingUp,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

import { supabase } from '@/integrations/supabase/client';
import { cycle } from '@/lib/utils';
import { Reveal } from '@/components/motion/Reveal';
import { PageHero } from '@/components/shared/PageHero';
import { CtaBanner, ctaPrimaryClass, ctaSecondaryClass } from '@/components/shared/CtaBanner';
import { SectionHeading } from '@/components/shared/SectionHeading';

export const Route = createFileRoute('/services/')({
  component: ServicesPage,
});

type Accent = { icon: string; title: string; link: string };

const ACCENTS: readonly [Accent, ...Accent[]] = [
  {
    icon: 'bg-royal-deep/5 border-royal-deep/10 text-royal-deep',
    title: 'group-hover:text-royal-sapphire',
    link: 'text-royal-deep hover:text-royal-gold-deep',
  },
  {
    icon: 'bg-royal-sapphire/10 border-royal-sapphire/15 text-royal-sapphire',
    title: 'group-hover:text-royal-sapphire',
    link: 'text-royal-sapphire hover:text-royal-gold-deep',
  },
  {
    icon: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    title: 'group-hover:text-emerald-700',
    link: 'text-emerald-800 hover:text-royal-gold-deep',
  },
  {
    icon: 'bg-amber-50 border-amber-200 text-royal-gold-deep',
    title: 'group-hover:text-royal-gold-deep',
    link: 'text-royal-gold-deep hover:text-royal-deep',
  },
];

type Capability = {
  title: string;
  icon: LucideIcon;
  description: string;
  capabilities: string[];
};

const SERVICE_CATEGORIES: Capability[] = [
  {
    title: 'Web Design & Development',
    icon: Layout,
    description:
      'High-performance websites and custom web applications tailored to your business needs.',
    capabilities: [
      'Business & Corporate Websites',
      'Landing Pages',
      'eCommerce Websites',
      'Custom Web Apps',
      'CMS Development',
      'Performance Optimization',
    ],
  },
  {
    title: 'Digital Marketing',
    icon: TrendingUp,
    description:
      'Data-driven marketing strategies to scale your brand and reach your target audience.',
    capabilities: [
      'Meta Ads (Facebook/Instagram)',
      'Google Ads',
      'TikTok Ads',
      'Performance Marketing',
      'Lead Generation',
      'Conversion Optimization',
    ],
  },
  {
    title: 'SEO',
    icon: Search,
    description:
      'Improve your search engine visibility and drive organic traffic to your platform.',
    capabilities: [
      'Technical & On-Page SEO',
      'Local SEO',
      'Keyword Strategy',
      'Content Optimization',
      'SEO Audits',
      'Performance Tracking',
    ],
  },
  {
    title: 'eCommerce Solutions',
    icon: Smartphone,
    description: 'End-to-end eCommerce development and optimization to maximize your sales.',
    capabilities: [
      'Shopify Development',
      'Custom Shopify Themes',
      'Product Page Optimization',
      'Store Design',
      'Checkout Optimization',
      'eCommerce Marketing',
    ],
  },
  {
    title: 'Branding & Creative',
    icon: Palette,
    description:
      'Visual identity and creative assets that make your brand stand out from the competition.',
    capabilities: [
      'Brand Identity & Logo Design',
      'Social Media Creative',
      'Marketing Design',
      'Creative Strategy',
      'Presentation Design',
    ],
  },
  {
    title: 'Business Automation',
    icon: Zap,
    description:
      'Streamline your operations with custom internal tools and digital infrastructure.',
    capabilities: [
      'CRM/Management Systems',
      'Business Automation',
      'Custom Internal Tools',
      'Digital Transformation',
      'Workflow Optimization',
    ],
  },
];

const WORKFLOW = [
  {
    step: '01',
    title: 'Discovery',
    desc: 'I understand your business, objectives, audience, and requirements.',
  },
  {
    step: '02',
    title: 'Strategy',
    desc: 'I define the right approach, scope, technology, and execution strategy.',
  },
  {
    step: '03',
    title: 'Proposal',
    desc: 'I provide the recommended solution, timeline, scope, and quotation.',
  },
  {
    step: '04',
    title: 'Design & Dev',
    desc: 'I execute the approved project according to the agreed scope.',
  },
  {
    step: '05',
    title: 'Testing',
    desc: 'I test, refine, optimize, and prepare for the final delivery.',
  },
  {
    step: '06',
    title: 'Launch',
    desc: 'I launch the project and provide ongoing support as needed.',
  },
];

const heroPrimary =
  'group inline-flex items-center justify-center gap-2.5 rounded-xl border border-royal-gold/35 bg-royal-deep px-7 py-3.5 text-sm font-bold uppercase tracking-wide text-royal-gold-light shadow-lg shadow-royal-deep/25 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-royal-deep/40';

const heroSecondary =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-royal-deep/20 bg-white px-6 py-3.5 text-sm font-semibold text-royal-ink shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-royal-deep/40 hover:bg-[#F6F5F0] hover:shadow-md';

function ServicesPage() {
  const { data: dbServices } = useQuery({
    queryKey: ['public-services-full'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('*, category:service_categories(*)')
        .eq('status', 'published')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: faqs } = useQuery({
    queryKey: ['service-faqs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_faqs')
        .select('*')
        .eq('is_published', true)
        .order('display_order', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="flex w-full flex-col bg-royal-canvas font-sans-body text-royal-ink">
      <PageHero
        eyebrow="Custom Solutions & Professional Services"
        title={
          <>
            Your Vision.{' '}
            <span className="animate-gradient-drift bg-gradient-to-r from-royal-deep via-royal-sapphire to-[#B8860B] bg-clip-text font-serif-display font-medium italic text-transparent">
              My Expertise.
            </span>{' '}
            Built to Perform.
          </>
        }
        description="From strategy and design to development and digital growth, I provide tailored solutions built around your business goals."
        actions={
          <>
            <Link to="/services/request-quote" className={heroPrimary}>
              Request a Quote
              <ArrowRight className="h-[18px] w-[18px] transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
            <Link to="/projects" className={heroSecondary}>
              View My Work
            </Link>
          </>
        }
      />

      {/* Services published from the admin panel */}
      {dbServices && dbServices.length > 0 && (
        <section className="w-full border-b border-royal-deep/10 bg-royal-canvas-alt py-24">
          <div className="mx-auto max-w-[1280px] px-6 lg:px-12">
            <SectionHeading
              eyebrow="What I Deliver"
              title="Featured Services"
              description="Specialized digital solutions designed to help your business scale."
            />

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {dbServices.map((service, idx) => {
                const accent = cycle(ACCENTS, idx);
                return (
                  <Reveal
                    key={service.id}
                    delay={(idx % 3) * 90}
                    className="group flex flex-col overflow-hidden rounded-3xl border border-royal-deep/12 bg-white shadow-sm transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1.5 hover:border-royal-gold hover:shadow-[0_16px_36px_rgba(12,27,51,0.08)]"
                  >
                    {service.hero_image && (
                      <div className="relative aspect-video overflow-hidden bg-royal-deep">
                        <img
                          src={service.hero_image}
                          alt={service.title}
                          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                        />
                      </div>
                    )}
                    <div className="flex flex-1 flex-col p-7">
                      <span className="mb-3 w-fit rounded-full border border-royal-deep/15 bg-royal-deep/5 px-3 py-1 font-mono-code text-[10px] font-bold uppercase tracking-wider text-royal-deep">
                        {service.category?.name || 'Service'}
                      </span>
                      <h3
                        className={`font-sans-body text-xl font-bold text-royal-ink transition-colors duration-300 ${accent.title}`}
                      >
                        {service.title}
                      </h3>
                      <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-slate-600">
                        {service.short_description}
                      </p>

                      <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-5">
                        {(service.starting_price ?? 0) > 0 ? (
                          <div>
                            <span className="block font-mono-code text-[10px] uppercase tracking-wider text-slate-400">
                              Starting at
                            </span>
                            <span className="font-sans-body text-lg font-extrabold text-royal-deep">
                              ${service.starting_price}
                            </span>
                          </div>
                        ) : (
                          <span />
                        )}
                        <Link
                          to="/services/$slug"
                          params={{ slug: service.slug }}
                          className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider transition-all duration-300 group-hover:translate-x-1 ${accent.link}`}
                        >
                          View details
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

      {/* Capability overview */}
      <section className="w-full border-b border-royal-deep/10 bg-royal-canvas py-24">
        <div className="mx-auto max-w-[1280px] px-6 lg:px-12">
          <SectionHeading
            eyebrow="Full Capability"
            title="Comprehensive Solutions"
            description="I specialize in delivering high-impact digital products and marketing strategies."
            eyebrowClassName="border-royal-deep/15 bg-royal-deep/5"
          />

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {SERVICE_CATEGORIES.map((category, idx) => {
              const accent = cycle(ACCENTS, idx);
              const Icon = category.icon;
              return (
                <Reveal
                  key={category.title}
                  delay={(idx % 3) * 90}
                  className="group flex flex-col rounded-3xl border border-royal-deep/12 bg-white p-7 shadow-sm transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1.5 hover:border-royal-gold hover:shadow-[0_16px_36px_rgba(12,27,51,0.08)]"
                >
                  <div
                    className={`mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border shadow-sm transition-transform duration-300 group-hover:scale-110 ${accent.icon}`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3
                    className={`font-sans-body text-xl font-bold text-royal-ink transition-colors duration-300 ${accent.title}`}
                  >
                    {category.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {category.description}
                  </p>

                  <p className="mt-6 font-mono-code text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Key Capabilities
                  </p>
                  <ul className="mt-3 flex-1 space-y-2">
                    {category.capabilities.map((cap) => (
                      <li key={cap} className="flex items-start gap-2 text-sm text-slate-600">
                        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-royal-gold" />
                        {cap}
                      </li>
                    ))}
                  </ul>

                  <Link
                    to="/services/request-quote"
                    className={`mt-6 inline-flex items-center gap-1.5 border-t border-slate-100 pt-5 text-xs font-bold uppercase tracking-wider transition-all duration-300 group-hover:translate-x-1 ${accent.link}`}
                  >
                    Explore service
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="w-full border-b border-royal-deep/10 bg-royal-band py-24">
        <div className="mx-auto max-w-[1280px] px-6 lg:px-12">
          <SectionHeading
            eyebrow="How I Work"
            title="My Process"
            description="A clear, strategic approach to every project."
          />

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {WORKFLOW.map((item, idx) => (
              <Reveal
                key={item.step}
                delay={idx * 70}
                className="group rounded-3xl border border-royal-deep/12 bg-white p-6 shadow-sm transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1.5 hover:border-royal-gold hover:shadow-[0_16px_36px_rgba(12,27,51,0.08)]"
              >
                <div className="font-mono-code text-3xl font-extrabold text-royal-deep/15 transition-colors duration-300 group-hover:text-royal-gold/50">
                  {item.step}
                </div>
                <h3 className="mt-3 font-sans-body text-lg font-bold text-royal-ink">
                  {item.title}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">{item.desc}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Quote request */}
      <section id="quote" className="w-full scroll-mt-24 bg-royal-canvas py-24">
        <div className="mx-auto max-w-[1280px] px-6 lg:px-12">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-14">
            <Reveal variant="left" className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-royal-deep/15 bg-royal-deep/5 px-4 py-1.5 font-mono-code text-[11px] font-bold uppercase tracking-wider text-royal-deep">
                Start Here
              </div>
              <h2 className="font-sans-body text-3xl font-extrabold tracking-tight text-royal-ink lg:text-4xl">
                Ready to start a project?
              </h2>
              <p className="text-base leading-relaxed text-slate-600">
                Tell me about your business and goals. I'll help identify the right digital solution
                and provide a custom quotation.
              </p>
              <div className="space-y-4">
                {[
                  {
                    icon: ShieldCheck,
                    title: 'Detailed Proposal',
                    desc: 'Receive a comprehensive scope and timeline.',
                  },
                  {
                    icon: Layers,
                    title: 'Strategic Alignment',
                    desc: 'Every project is built around your business objectives.',
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.title}
                      className="flex items-start gap-4 rounded-2xl border border-royal-deep/12 bg-white p-4 shadow-sm"
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-royal-deep/10 bg-royal-deep/5 text-royal-deep">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-sans-body font-bold text-royal-ink">{item.title}</p>
                        <p className="text-sm text-slate-600">{item.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Reveal>

            <Reveal
              variant="right"
              delay={120}
              className="rounded-3xl border border-royal-deep/15 bg-white p-8 shadow-[0_16px_40px_rgba(12,27,51,0.12)]"
            >
              <div className="mb-7 text-center">
                <h3 className="font-sans-body text-2xl font-extrabold text-royal-ink">
                  Request a Custom Quote
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  Fill out the form to get started - it takes about two minutes.
                </p>
              </div>

              <div className="space-y-4">
                <Link
                  to="/services/request-quote"
                  className="group flex w-full items-center justify-center gap-2 rounded-xl border border-royal-gold/35 bg-royal-deep px-6 py-4 text-sm font-bold uppercase tracking-wider text-royal-gold-light shadow-lg shadow-royal-deep/25 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl"
                >
                  Get started with quote request
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
                <div className="relative py-1">
                  <div aria-hidden className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-royal-deep/10" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-white px-3 font-mono-code text-[10px] uppercase tracking-wider text-slate-400">
                      Or
                    </span>
                  </div>
                </div>
                <Link
                  to="/auth"
                  className="flex w-full items-center justify-center rounded-xl border border-royal-deep/20 bg-white px-6 py-4 text-sm font-semibold text-royal-ink shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-royal-canvas-alt hover:shadow-md"
                >
                  Contact via Client Dashboard
                </Link>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* FAQ */}
      {faqs && faqs.length > 0 && (
        <section className="w-full border-t border-royal-deep/10 bg-royal-canvas-alt py-24">
          <div className="mx-auto max-w-3xl px-6 lg:px-12">
            <SectionHeading eyebrow="Good to Know" title="Frequently Asked Questions" />
            <Reveal>
              <Accordion type="single" collapsible className="w-full space-y-3">
                {faqs.map((faq, idx) => (
                  <AccordionItem
                    key={faq.id ?? idx}
                    value={`item-${idx}`}
                    className="overflow-hidden rounded-2xl border border-royal-deep/12 bg-white px-6 shadow-sm transition-colors duration-300 hover:border-royal-deep/25"
                  >
                    <AccordionTrigger className="py-5 text-left font-sans-body text-base font-bold text-royal-ink hover:no-underline">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="pb-5 text-sm leading-relaxed text-slate-600">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </Reveal>
          </div>
        </section>
      )}

      <CtaBanner
        eyebrow="No Pressure"
        title="Not sure what you need? Let's talk."
        description="Tell me about your business and I'll help identify the right digital solution for your goals - even if that turns out not to be me."
        actions={
          <>
            <Link to="/services/request-quote" className={ctaPrimaryClass}>
              Book a Consultation
              <ArrowRight className="h-[18px] w-[18px] transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
            <Link to="/projects" className={ctaSecondaryClass}>
              View Case Studies
            </Link>
          </>
        }
      />
    </div>
  );
}
