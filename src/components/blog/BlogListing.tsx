import { Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, BookOpen, Calendar, User } from 'lucide-react';
import { format } from 'date-fns';
import { useEffect, useState } from 'react';

import { supabase } from '@/integrations/supabase/client';
import { usePublicProfile } from '@/hooks/usePublicProfile';
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

const ITEMS_PER_PAGE = 9;

export function BlogListing({
  categorySlug,
  q,
}: {
  categorySlug?: string;
  q?: string | undefined;
}) {
  const { data: profile } = usePublicProfile();
  const [page, setPage] = useState(1);

  // Previously fetched and rendered every published post with no limit at
  // all - fine for a handful of posts, but would only get slower and
  // heavier as content grows, unlike GigsListing which already paginates.
  useEffect(() => {
    setPage(1);
  }, [categorySlug, q]);

  const { data, isLoading } = useQuery({
    queryKey: ['blog-posts', categorySlug, q, page],
    queryFn: async () => {
      let query = supabase
        .from('blog_posts')
        .select(
          categorySlug
            ? '*, blog_categories!inner(id, name, slug)'
            : '*, blog_categories(id, name, slug)',
          { count: 'exact' },
        )
        .eq('status', 'published')
        .order('published_at', { ascending: false });

      if (categorySlug) {
        query = query.eq('blog_categories.slug', categorySlug);
      }

      if (q) {
        query = query.ilike('title', `%${q}%`);
      }

      const from = (page - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      const { data, error, count } = await query.range(from, to);
      if (error) throw error;
      return {
        posts: data,
        totalPages: Math.max(1, Math.ceil((count ?? 0) / ITEMS_PER_PAGE)),
      };
    },
  });
  const posts = data?.posts;

  const { data: categories } = useQuery({
    queryKey: ['blog-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_categories')
        .select('id, name, slug')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const activeCategory = categories?.find((cat) => cat.slug === categorySlug);

  return (
    <div className="flex w-full flex-col bg-royal-canvas font-sans-body text-royal-ink">
      <PageHero
        eyebrow="Insights & Articles"
        title={activeCategory ? activeCategory.name : 'Insights & Articles'}
        description="Thoughts, tutorials, and strategies on digital marketing, web development, and business growth."
      />

      <section className="w-full bg-royal-canvas-alt py-20">
        <div className="mx-auto max-w-[1280px] px-6 lg:px-12">
          <FilterBar>
            <Link to="/blog" className={filterPillClass(!categorySlug)}>
              All Posts
            </Link>
            {categories?.map((cat) => (
              <Link
                key={cat.id}
                to="/blog/category/$slug"
                params={{ slug: cat.slug }}
                className={filterPillClass(categorySlug === cat.slug)}
              >
                {cat.name}
              </Link>
            ))}
          </FilterBar>

          {isLoading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => (
                <CardSkeleton key={i} className="h-[420px]" />
              ))}
            </div>
          ) : posts?.length === 0 ? (
            <EmptyState
              title="No articles found"
              description="Check back later or try a different filter."
              icon={<BookOpen className="h-6 w-6" />}
            />
          ) : (
            <>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {posts?.map((post, idx) => (
                  <Reveal
                    key={post.id}
                    delay={(idx % 3) * 90}
                    className="group flex flex-col overflow-hidden rounded-3xl border border-royal-deep/12 bg-white shadow-sm transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1.5 hover:border-royal-gold hover:shadow-[0_16px_36px_rgba(12,27,51,0.08)]"
                  >
                    <Link to="/blog/$slug" params={{ slug: post.slug }} className="block">
                      <div className="relative aspect-[16/10] overflow-hidden bg-royal-deep">
                        {post.featured_image ? (
                          <img
                            src={post.featured_image}
                            alt={post.title}
                            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <BookOpen className="h-12 w-12 text-white/15" />
                          </div>
                        )}
                        <span className="absolute left-4 top-4 rounded-full border border-royal-gold/40 bg-royal-deep/90 px-3 py-1 font-mono-code text-[10px] font-bold uppercase tracking-wider text-royal-gold-light backdrop-blur-md">
                          {post.blog_categories?.name || 'Uncategorized'}
                        </span>
                      </div>
                    </Link>

                    <div className="flex flex-1 flex-col p-6">
                      <div className="flex items-center gap-4 font-mono-code text-[11px] text-slate-500">
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          {post.published_at
                            ? format(new Date(post.published_at), 'MMM dd, yyyy')
                            : 'Recently'}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5" />
                          {profile?.full_name || 'Author'}
                        </span>
                      </div>

                      <h3 className="mt-3 font-sans-body text-xl font-bold leading-tight text-royal-ink transition-colors duration-300 group-hover:text-royal-sapphire">
                        <Link to="/blog/$slug" params={{ slug: post.slug }}>
                          {post.title}
                        </Link>
                      </h3>
                      <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-slate-600">
                        {post.excerpt}
                      </p>

                      <Link
                        to="/blog/$slug"
                        params={{ slug: post.slug }}
                        className="mt-5 inline-flex items-center gap-1.5 border-t border-slate-100 pt-5 text-xs font-bold uppercase tracking-wider text-royal-deep transition-all duration-300 hover:text-royal-gold-deep group-hover:translate-x-1"
                      >
                        Read article
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
        eyebrow="Work Together"
        title="Like what you're reading?"
        description="These are the same strategies I run for clients. If you'd rather have them executed than explained, let's talk."
        actions={<DefaultCtaActions />}
      />
    </div>
  );
}
