import { useEffect, useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Layers } from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { Reveal } from '@/components/motion/Reveal';

type ProjectMetric = { label: string; value: string };

const METRIC_TONES = ['text-royal-gold-light', 'text-emerald-400', 'text-sky-300'] as const;

/**
 * Driven entirely by the featured project row in Supabase - no hard-coded
 * client names or result figures. Mark a project as "featured" + published in
 * the admin panel to fill this in.
 */
export function FeaturedCaseStudy() {
  const {
    data: project,
    isError,
    error,
  } = useQuery({
    queryKey: ['home-featured-project'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('title, slug, description, featured_image, metrics, client, industry')
        .eq('status', 'published')
        .eq('is_featured', true)
        .order('completion_date', { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  // Visitors get nothing rather than an error banner on a marketing page, but
  // the failure should not be silent to us: without this, a broken query and
  // "no project is featured" look identical from the outside.
  useEffect(() => {
    if (isError) {
      console.error('[home] featured case study failed to load:', error);
    }
  }, [isError, error]);

  const metrics: ProjectMetric[] = useMemo(() => {
    if (!Array.isArray(project?.metrics)) return [];
    return (project.metrics as ProjectMetric[])
      .filter(
        (metric) => metric && typeof metric.label === 'string' && typeof metric.value === 'string',
      )
      .slice(0, 3);
  }, [project]);

  if (!project) return null;

  const metricColumns =
    metrics.length === 1 ? 'grid-cols-1' : metrics.length === 2 ? 'grid-cols-2' : 'grid-cols-3';

  return (
    <section
      id="portfolio"
      className="relative w-full scroll-mt-24 overflow-hidden bg-royal-navy py-24 text-white"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 right-10 h-[600px] w-[600px] rounded-full bg-royal-sapphire/30 blur-[130px]" />
        <div className="absolute -bottom-32 -left-10 h-[500px] w-[500px] rounded-full bg-royal-gold/10 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-[1280px] px-6 lg:px-12">
        {/* Deliberately a plain div, not a Reveal: the two column Reveals below
            carry the motion. Nesting them inside a third would compound the
            fades and fire the inner staggers while the outer was invisible. */}
        <div className="rounded-3xl border border-royal-gold/25 bg-gradient-to-br from-royal-deep to-[#060D1A] p-8 shadow-[0_24px_60px_rgba(0,0,0,0.5)] lg:p-14">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-14">
            <Reveal variant="left" delay={120} className="space-y-6 lg:col-span-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-royal-gold/40 bg-royal-gold/15 px-3.5 py-1.5 font-mono-code text-[11px] font-bold uppercase tracking-wider text-royal-gold-light">
                Featured Engagement
              </div>
              <h3 className="font-sans-body text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl">
                {project.title}
              </h3>
              {project.description && (
                <p className="text-sm font-normal leading-relaxed text-slate-300 sm:text-base">
                  {project.description}
                </p>
              )}

              {metrics.length > 0 && (
                <div className={`grid gap-3 pt-2 ${metricColumns}`}>
                  {metrics.map((metric, idx) => (
                    <div
                      key={metric.label}
                      className="rounded-2xl border border-white/10 bg-white/5 p-4 transition-colors duration-300 hover:border-royal-gold/40 hover:bg-white/10"
                    >
                      <div
                        className={`text-2xl font-extrabold sm:text-3xl ${METRIC_TONES[idx % METRIC_TONES.length]}`}
                      >
                        {metric.value}
                      </div>
                      <div className="mt-1 font-mono-code text-[10px] uppercase text-slate-400">
                        {metric.label}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <Link
                to="/projects/$slug"
                params={{ slug: project.slug }}
                className="group inline-flex items-center gap-2 rounded-xl border border-royal-gold/35 bg-royal-gold-light px-6 py-3 text-xs font-bold uppercase tracking-wider text-royal-deep shadow-lg transition-all duration-300 hover:scale-105 hover:bg-white"
              >
                Read the case study
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </Reveal>

            <Reveal variant="right" delay={200} className="relative lg:col-span-7">
              <div className="group relative overflow-hidden rounded-2xl border border-royal-gold/30 bg-black shadow-2xl">
                {project.featured_image ? (
                  <img
                    src={project.featured_image}
                    alt={project.title}
                    className="h-[336px] w-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-[336px] w-full items-center justify-center bg-royal-deep">
                    <Layers className="h-20 w-20 text-white/15" />
                  </div>
                )}
                <div
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"
                />
                <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-royal-gold/30 bg-royal-deep/90 p-3.5 shadow-lg backdrop-blur-md">
                  <div className="flex items-center gap-2.5">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                    </span>
                    <span className="font-mono-code text-xs font-semibold tracking-wide text-slate-200">
                      {project.client || project.industry || 'Client Engagement'}
                    </span>
                  </div>
                  <span className="font-mono-code text-[11px] font-bold uppercase tracking-wider text-royal-gold-light">
                    Case Study Released
                  </span>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
