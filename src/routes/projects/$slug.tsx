import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Briefcase,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Code,
  ExternalLink,
  Layers,
  Lightbulb,
  Monitor,
  Rocket,
  Target,
  User,
} from 'lucide-react';
import DOMPurify from 'isomorphic-dompurify';

import { supabase } from '@/integrations/supabase/client';
import { Reveal } from '@/components/motion/Reveal';
import { CtaBanner, DefaultCtaActions } from '@/components/shared/CtaBanner';
import { CardSkeleton, EmptyState } from '@/components/shared/ListingChrome';
import { proseRoyal } from '@/components/shared/prose';

export const Route = createFileRoute('/projects/$slug')({
  component: ProjectDetail,
});

type Metric = { label: string; value: string };

const SECTION_ACCENTS = {
  challenge: 'bg-amber-50 border-amber-200 text-royal-gold-deep',
  strategy: 'bg-royal-sapphire/10 border-royal-sapphire/15 text-royal-sapphire',
  solution: 'bg-royal-deep/5 border-royal-deep/10 text-royal-deep',
  implementation: 'bg-royal-sapphire/10 border-royal-sapphire/15 text-royal-sapphire',
  results: 'bg-emerald-50 border-emerald-200 text-emerald-700',
};

function SectionBlock({
  icon: Icon,
  accent,
  title,
  children,
  tinted = false,
  delay = 0,
}: {
  icon: typeof Lightbulb;
  accent: string;
  title: string;
  children: React.ReactNode;
  tinted?: boolean;
  delay?: number;
}) {
  return (
    <Reveal
      delay={delay}
      className={
        tinted
          ? 'space-y-5 rounded-3xl border border-royal-deep/12 bg-white p-8 shadow-sm'
          : 'space-y-5'
      }
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-2xl border shadow-sm ${accent}`}
        >
          <Icon className="h-5 w-5" />
        </div>
        <h2 className="font-sans-body text-2xl font-extrabold tracking-tight text-royal-ink">
          {title}
        </h2>
      </div>
      {children}
    </Reveal>
  );
}

function ProjectDetail() {
  const { slug } = Route.useParams();

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*, project_categories(name, slug)')
        .eq('slug', slug)
        .eq('status', 'published')
        .single();

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-royal-canvas pb-20 pt-24 font-sans-body">
        <div className="mx-auto max-w-[1280px] space-y-8 px-6 lg:px-12">
          <CardSkeleton className="h-10 w-40" />
          <CardSkeleton className="h-20" />
          <CardSkeleton className="h-[360px]" />
          <div className="grid gap-10 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <CardSkeleton className="h-56" />
              <CardSkeleton className="h-56" />
            </div>
            <CardSkeleton className="h-96" />
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-royal-canvas px-6 font-sans-body">
        <div className="w-full max-w-md">
          <EmptyState
            title="Project not found"
            description="This case study may have been unpublished or moved."
            icon={<Layers className="h-6 w-6" />}
          />
          <div className="mt-6 text-center">
            <Link
              to="/projects"
              className="inline-flex items-center gap-2 rounded-xl border border-royal-gold/35 bg-royal-deep px-6 py-3 text-xs font-bold uppercase tracking-wider text-royal-gold-light shadow-md transition-all duration-300 hover:-translate-y-0.5"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Portfolio
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const metrics: Metric[] = Array.isArray(project.metrics) ? (project.metrics as Metric[]) : [];
  const technologies = Array.isArray(project.technologies)
    ? (project.technologies as string[])
    : [];
  const servicesProvided = Array.isArray(project.services_provided)
    ? (project.services_provided as string[])
    : [];
  const gallery = Array.isArray(project.gallery) ? (project.gallery as string[]) : [];

  return (
    <div className="flex w-full flex-col bg-royal-canvas font-sans-body text-royal-ink">
      {/* Hero header */}
      <header className="relative w-full overflow-hidden border-b border-royal-deep/10 bg-gradient-to-b from-[#F2F4F8] via-royal-canvas to-royal-canvas pb-32 pt-16 lg:pb-40">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 left-1/2 h-[420px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-royal-deep/12 via-royal-sapphire/10 to-royal-gold/15 blur-[120px]" />
          <div className="absolute -right-24 top-40 h-[360px] w-[360px] rounded-full bg-royal-gold/10 blur-[110px]" />
        </div>

        <div className="relative mx-auto max-w-[1280px] px-6 lg:px-12">
          <Reveal className="max-w-4xl space-y-5">
            <Link
              to="/projects"
              className="inline-flex items-center gap-2 font-mono-code text-[11px] font-bold uppercase tracking-wider text-slate-500 transition-colors hover:text-royal-deep"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Portfolio
            </Link>

            <div className="flex flex-wrap gap-2">
              {project.project_categories?.name && (
                <span className="rounded-full border border-royal-deep/15 bg-white px-4 py-1.5 font-mono-code text-[11px] font-bold uppercase tracking-wider text-royal-deep shadow-sm">
                  {project.project_categories.name}
                </span>
              )}
              {project.industry && (
                <span className="rounded-full border border-royal-deep/15 bg-royal-deep/5 px-4 py-1.5 font-mono-code text-[11px] font-bold uppercase tracking-wider text-royal-deep">
                  {project.industry}
                </span>
              )}
            </div>

            <h1 className="font-sans-body text-4xl font-extrabold leading-[1.12] tracking-[-0.03em] text-royal-ink md:text-5xl">
              {project.title}
            </h1>

            <div
              className={`${proseRoyal} prose-p:text-lg`}
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(project.description || '') }}
            />

            <div className="flex flex-wrap gap-8 pt-2">
              {project.client && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-mono-code text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <User className="h-3 w-3" /> Client
                  </div>
                  <div className="font-semibold text-royal-ink">{project.client}</div>
                </div>
              )}
              {project.completion_date && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-mono-code text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <Calendar className="h-3 w-3" /> Date
                  </div>
                  <div className="font-semibold text-royal-ink">
                    {new Date(project.completion_date).toLocaleDateString('en-US', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </div>
                </div>
              )}
              {project.project_url && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-mono-code text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <ExternalLink className="h-3 w-3" /> Live Link
                  </div>
                  <a
                    href={project.project_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-royal-sapphire transition-colors hover:text-royal-gold-deep"
                  >
                    Visit Website <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </div>
          </Reveal>
        </div>
      </header>

      {/* Featured image overlapping the hero, as before */}
      <div className="relative z-10 mx-auto -mt-24 w-full max-w-[1280px] px-6 lg:-mt-28 lg:px-12">
        <Reveal
          variant="scale"
          className="overflow-hidden rounded-3xl border border-royal-deep/15 bg-royal-deep shadow-[0_24px_60px_rgba(12,27,51,0.18)]"
        >
          <div className="aspect-video">
            {project.featured_image ? (
              <img
                src={project.featured_image}
                alt={project.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Layers className="h-20 w-20 text-white/15" />
              </div>
            )}
          </div>
        </Reveal>
      </div>

      <div className="mx-auto w-full max-w-[1280px] px-6 py-16 lg:px-12">
        <div className="grid gap-12 lg:grid-cols-3 lg:gap-16">
          {/* Main content */}
          <div className="space-y-14 lg:col-span-2">
            <SectionBlock icon={Lightbulb} accent={SECTION_ACCENTS.challenge} title="The Challenge">
              <div className={proseRoyal}>
                {project.challenge || 'No challenge described for this project yet.'}
              </div>
            </SectionBlock>

            {project.strategy && (
              <SectionBlock
                icon={Target}
                accent={SECTION_ACCENTS.strategy}
                title="Strategy & Approach"
                tinted
              >
                <div className={proseRoyal}>{project.strategy}</div>
              </SectionBlock>
            )}

            <SectionBlock icon={Rocket} accent={SECTION_ACCENTS.solution} title="The Solution">
              <div className={proseRoyal}>
                {project.solution || 'No solution described for this project yet.'}
              </div>
            </SectionBlock>

            {project.implementation && (
              <SectionBlock
                icon={Code}
                accent={SECTION_ACCENTS.implementation}
                title="Implementation"
              >
                <div className={proseRoyal}>{project.implementation}</div>
              </SectionBlock>
            )}

            <SectionBlock icon={CheckCircle2} accent={SECTION_ACCENTS.results} title="Key Results">
              {metrics.length > 0 && (
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  {metrics.map((metric, idx) => (
                    <Reveal
                      key={metric.label}
                      delay={idx * 80}
                      className="rounded-2xl border border-royal-deep/12 bg-white p-5 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-royal-gold hover:shadow-md"
                    >
                      <div className="font-sans-body text-2xl font-extrabold text-royal-deep sm:text-3xl">
                        {metric.value}
                      </div>
                      <div className="mt-1 font-mono-code text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        {metric.label}
                      </div>
                    </Reveal>
                  ))}
                </div>
              )}
              <div className={proseRoyal}>
                {project.results || 'Results for this project will be shared soon.'}
              </div>
            </SectionBlock>

            {gallery.length > 0 && (
              <Reveal className="space-y-6">
                <h2 className="font-sans-body text-2xl font-extrabold tracking-tight text-royal-ink">
                  Project Gallery
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {gallery.map((img, idx) => (
                    <div
                      key={img}
                      className="group overflow-hidden rounded-2xl border border-royal-deep/12 bg-white shadow-sm"
                    >
                      <img
                        src={img}
                        alt={`${project.title} screenshot ${idx + 1}`}
                        className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                      />
                    </div>
                  ))}
                </div>
              </Reveal>
            )}
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            <div className="sticky top-24 space-y-6">
              {technologies.length > 0 && (
                <Reveal
                  variant="right"
                  className="space-y-5 rounded-3xl border border-royal-deep/12 bg-white p-7 shadow-sm"
                >
                  <h2 className="flex items-center gap-2 font-sans-body text-lg font-bold text-royal-ink">
                    <Monitor className="h-5 w-5 text-royal-sapphire" /> Technologies
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {technologies.map((tech) => (
                      <span
                        key={tech}
                        className="rounded-full border border-royal-deep/12 bg-royal-canvas-alt px-3 py-1 font-mono-code text-[11px] font-bold uppercase tracking-wider text-slate-600"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </Reveal>
              )}

              {servicesProvided.length > 0 && (
                <Reveal
                  variant="right"
                  delay={90}
                  className="space-y-5 rounded-3xl border border-royal-deep/12 bg-white p-7 shadow-sm"
                >
                  <h2 className="flex items-center gap-2 font-sans-body text-lg font-bold text-royal-ink">
                    <Briefcase className="h-5 w-5 text-royal-sapphire" /> Services Provided
                  </h2>
                  <ul className="space-y-2.5">
                    {servicesProvided.map((service) => (
                      <li key={service} className="flex items-start gap-2 text-sm text-slate-600">
                        <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-royal-gold" />
                        {service}
                      </li>
                    ))}
                  </ul>
                </Reveal>
              )}

              <Reveal
                variant="right"
                delay={180}
                className="space-y-4 rounded-3xl border border-royal-gold/30 bg-gradient-to-br from-royal-deep to-[#060D1A] p-7 text-white shadow-[0_16px_40px_rgba(12,27,51,0.2)]"
              >
                <h2 className="font-sans-body text-lg font-bold">Have a similar project?</h2>
                <p className="text-sm leading-relaxed text-slate-300">
                  Let's collaborate to bring your vision to life with data-driven strategies and
                  premium execution.
                </p>
                <Link
                  to="/services/request-quote"
                  className="inline-flex w-full items-center justify-center rounded-xl bg-royal-gold-light px-5 py-3 text-xs font-bold uppercase tracking-wider text-royal-deep shadow-lg transition-all duration-300 hover:scale-[1.02] hover:bg-white"
                >
                  Start a Project
                </Link>
              </Reveal>
            </div>
          </aside>
        </div>
      </div>

      <CtaBanner
        eyebrow="Your Turn"
        title="Want a case study like this one?"
        description="Every engagement here started with a scoped conversation about goals and constraints. Yours can too."
        actions={<DefaultCtaActions />}
      />
    </div>
  );
}
