import { Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Layers } from 'lucide-react';
import { useEffect, useState } from 'react';

import { supabase } from '@/integrations/supabase/client';
import { Reveal } from '@/components/motion/Reveal';
import { PageHero } from '@/components/shared/PageHero';
import { CtaBanner, DefaultCtaActions } from '@/components/shared/CtaBanner';
import {
  CardSkeleton,
  EmptyState,
  FilterBar,
  RoyalPagination,
} from '@/components/shared/ListingChrome';
import { filterPillClass } from '@/components/shared/listingStyles';

const ITEMS_PER_PAGE = 6;

export function ProjectsListing({ categorySlug }: { categorySlug?: string }) {
  const [page, setPage] = useState(1);

  // Previously fetched and rendered every published project with no limit
  // at all - fine for a handful of case studies, but would only get slower
  // and heavier as the portfolio grows, unlike GigsListing which already
  // paginates.
  useEffect(() => {
    setPage(1);
  }, [categorySlug]);

  const { data: categories } = useQuery({
    queryKey: ['project-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_categories')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['projects', categorySlug, page],
    queryFn: async () => {
      const from = (page - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      const query = categorySlug
        ? supabase
            .from('projects')
            .select('*, project_categories!inner(name, slug)', { count: 'exact' })
            .eq('status', 'published')
            .eq('project_categories.slug', categorySlug)
        : supabase
            .from('projects')
            .select('*, project_categories(name, slug)', { count: 'exact' })
            .eq('status', 'published');

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      return {
        projects: data,
        totalPages: Math.max(1, Math.ceil((count ?? 0) / ITEMS_PER_PAGE)),
      };
    },
  });

  const projects = data?.projects;
  const activeCategory = categories?.find((cat) => cat.slug === categorySlug);

  return (
    <div className="flex w-full flex-col bg-royal-canvas font-sans-body text-royal-ink">
      <PageHero
        eyebrow="Selected Work"
        title={activeCategory ? activeCategory.name : 'Portfolio'}
        description="A collection of my recent work across digital marketing, web development, and brand strategy - each one a real engagement with real numbers behind it."
      />

      <section className="w-full bg-royal-canvas-alt py-20">
        <div className="mx-auto max-w-[1280px] px-6 lg:px-12">
          <FilterBar>
            <Link to="/projects" className={filterPillClass(!categorySlug)}>
              All Projects
            </Link>
            {categories?.map((cat) => (
              <Link
                key={cat.id}
                to="/projects/category/$slug"
                params={{ slug: cat.slug }}
                className={filterPillClass(categorySlug === cat.slug)}
              >
                {cat.name}
              </Link>
            ))}
          </FilterBar>

          {isLoading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => (
                <CardSkeleton key={i} className="h-96" />
              ))}
            </div>
          ) : projects?.length === 0 ? (
            <EmptyState
              title="No projects found"
              description="Nothing published in this category yet. Try another filter."
            />
          ) : (
            <>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {projects?.map((project, idx) => (
                  <Reveal
                    key={project.id}
                    delay={(idx % 3) * 90}
                    className="group flex flex-col overflow-hidden rounded-3xl border border-royal-deep/12 bg-white shadow-sm transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1.5 hover:border-royal-gold hover:shadow-[0_16px_36px_rgba(12,27,51,0.08)]"
                  >
                    <Link
                      to="/projects/$slug"
                      params={{ slug: project.slug }}
                      className="block overflow-hidden"
                    >
                      <div className="relative aspect-[4/3] overflow-hidden bg-royal-deep">
                        {project.featured_image ? (
                          <img
                            src={project.featured_image}
                            alt={project.title}
                            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Layers className="h-14 w-14 text-white/15" />
                          </div>
                        )}
                        <div
                          aria-hidden
                          className="absolute inset-0 bg-gradient-to-t from-royal-navy/85 via-royal-navy/10 to-transparent"
                        />
                        {project.project_categories?.name && (
                          <span className="absolute left-4 top-4 rounded-full border border-royal-gold/40 bg-royal-deep/90 px-3 py-1 font-mono-code text-[10px] font-bold uppercase tracking-wider text-royal-gold-light backdrop-blur-md">
                            {project.project_categories.name}
                          </span>
                        )}
                      </div>
                    </Link>

                    <div className="flex flex-1 flex-col p-6">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <span className="font-mono-code text-[11px] font-bold uppercase tracking-wider text-royal-sapphire">
                          {project.client || 'Internal Project'}
                        </span>
                        {project.completion_date && (
                          <span className="font-mono-code text-[11px] text-slate-400">
                            {new Date(project.completion_date).getFullYear()}
                          </span>
                        )}
                      </div>
                      <h3 className="font-sans-body text-lg font-bold text-royal-ink transition-colors duration-300 group-hover:text-royal-sapphire">
                        {project.title}
                      </h3>
                      <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-slate-600">
                        {project.description}
                      </p>
                      <Link
                        to="/projects/$slug"
                        params={{ slug: project.slug }}
                        className="mt-5 inline-flex items-center gap-1.5 border-t border-slate-100 pt-5 text-xs font-bold uppercase tracking-wider text-royal-deep transition-all duration-300 hover:text-royal-gold-deep group-hover:translate-x-1"
                      >
                        View case study
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </Reveal>
                ))}
              </div>

              <RoyalPagination page={page} totalPages={data?.totalPages ?? 1} onChange={setPage} />
            </>
          )}
        </div>
      </section>

      <CtaBanner
        eyebrow="Start a Project"
        title="Want results like these?"
        description="Every case study here started as a conversation. Tell me what you're building and I'll tell you how I'd approach it."
        actions={<DefaultCtaActions />}
      />
    </div>
  );
}
