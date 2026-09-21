import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Calendar,
  Clock,
  Facebook,
  Linkedin,
  Share2,
  Twitter,
} from 'lucide-react';
import { format } from 'date-fns';
import DOMPurify from 'isomorphic-dompurify';
import { toast } from 'sonner';

import { supabase } from '@/integrations/supabase/client';
import { getInitials, usePublicProfile } from '@/hooks/usePublicProfile';
import { Reveal } from '@/components/motion/Reveal';
import { CtaBanner, DefaultCtaActions } from '@/components/shared/CtaBanner';
import { CardSkeleton, EmptyState } from '@/components/shared/ListingChrome';
import { proseRoyal } from '@/components/shared/prose';

export const Route = createFileRoute('/blog/$slug')({
  component: BlogPostPage,
});

// ~200 wpm, stripped of HTML tags - previously a hardcoded "5 min read" on
// every post regardless of actual length.
function estimateReadingMinutes(html: string | null): number {
  if (!html) return 1;
  const wordCount = html
    .replace(/<[^>]*>/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(wordCount / 200));
}

const shareButtonClass =
  'flex h-10 w-10 items-center justify-center rounded-full border border-royal-deep/15 bg-white text-royal-deep shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-royal-gold/50 hover:text-royal-gold-deep';

function BlogPostPage() {
  const { slug } = Route.useParams();
  const { data: profile } = usePublicProfile();

  const { data: post, isLoading } = useQuery({
    queryKey: ['blog-post', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*, blog_categories(id, name, slug)')
        .eq('slug', slug)
        .eq('status', 'published')
        .single();

      if (error) throw error;
      return data;
    },
  });

  const { data: relatedPosts } = useQuery({
    queryKey: ['related-posts', post?.category_id, slug],
    enabled: !!post?.category_id,
    queryFn: async () => {
      if (!post?.category_id) return [];
      const { data, error } = await supabase
        .from('blog_posts')
        .select('title, slug, featured_image, published_at')
        .eq('category_id', post.category_id)
        .eq('status', 'published')
        .neq('slug', slug)
        .limit(3);
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-royal-canvas pb-20 pt-24 font-sans-body">
        <div className="mx-auto max-w-4xl space-y-8 px-6">
          <CardSkeleton className="h-10 w-40" />
          <CardSkeleton className="h-20" />
          <CardSkeleton className="h-[360px]" />
          <CardSkeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-royal-canvas px-6 font-sans-body">
        <div className="w-full max-w-md">
          <EmptyState
            title="Article not found"
            description="This post may have been unpublished or moved."
            icon={<BookOpen className="h-6 w-6" />}
          />
          <div className="mt-6 text-center">
            <Link
              to="/blog"
              className="inline-flex items-center gap-2 rounded-xl border border-royal-gold/35 bg-royal-deep px-6 py-3 text-xs font-bold uppercase tracking-wider text-royal-gold-light shadow-md transition-all duration-300 hover:-translate-y-0.5"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Blog
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const readingMinutes = estimateReadingMinutes(post.content);
  const tags = Array.isArray(post.tags) ? (post.tags as string[]) : [];

  const shareUrl = () => (typeof window !== 'undefined' ? window.location.href : '');
  const openShareWindow = (url: string) =>
    window.open(url, '_blank', 'noopener,noreferrer,width=600,height=500');

  const shareToFacebook = () =>
    openShareWindow(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl())}`,
    );
  const shareToTwitter = () =>
    openShareWindow(
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl())}&text=${encodeURIComponent(post.title)}`,
    );
  const shareToLinkedIn = () =>
    openShareWindow(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl())}`,
    );
  const shareGeneric = async () => {
    const url = shareUrl();
    if (navigator.share) {
      try {
        await navigator.share({ title: post.title, url });
      } catch {
        // User cancelled the native share sheet - nothing to do.
      }
      return;
    }
    await navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard');
  };

  return (
    <div className="flex w-full flex-col bg-royal-canvas font-sans-body text-royal-ink">
      {/* Article header */}
      <header className="relative w-full overflow-hidden border-b border-royal-deep/10 bg-gradient-to-b from-[#F2F4F8] via-royal-canvas to-royal-canvas">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 left-1/2 h-[420px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-royal-deep/12 via-royal-sapphire/10 to-royal-gold/15 blur-[120px]" />
        </div>

        <div className="relative mx-auto max-w-4xl px-6 pb-14 pt-16">
          <Reveal className="space-y-6">
            <Link
              to="/blog"
              className="inline-flex items-center gap-2 font-mono-code text-[11px] font-bold uppercase tracking-wider text-slate-500 transition-colors hover:text-royal-deep"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Blog
            </Link>

            <div className="inline-flex w-fit items-center rounded-full border border-royal-deep/15 bg-white px-4 py-1.5 font-mono-code text-[11px] font-bold uppercase tracking-wider text-royal-deep shadow-sm">
              {post.blog_categories?.name || 'Uncategorized'}
            </div>

            <h1 className="font-sans-body text-4xl font-extrabold leading-[1.12] tracking-[-0.03em] text-royal-ink md:text-5xl">
              {post.title}
            </h1>

            <div className="flex flex-wrap items-center gap-6 pt-2">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-royal-deep/10 bg-royal-deep/5 font-mono-code text-xs font-bold text-royal-deep">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.full_name || ''}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    getInitials(profile?.full_name)
                  )}
                </div>
                <div>
                  <div className="text-sm font-bold text-royal-ink">
                    {profile?.full_name || 'Author'}
                  </div>
                  <div className="font-mono-code text-[11px] text-slate-500">
                    {profile?.professional_title || 'Writer'}
                  </div>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 font-mono-code text-[11px] text-slate-500">
                <Calendar className="h-3.5 w-3.5" />
                {post.published_at
                  ? format(new Date(post.published_at), 'MMMM dd, yyyy')
                  : 'Recently Published'}
              </span>
              <span className="inline-flex items-center gap-1.5 font-mono-code text-[11px] text-slate-500">
                <Clock className="h-3.5 w-3.5" />
                {readingMinutes} min read
              </span>
            </div>
          </Reveal>
        </div>
      </header>

      <div className="mx-auto w-full max-w-4xl px-6 py-16">
        {/* Featured image */}
        <Reveal
          variant="scale"
          className="mb-14 overflow-hidden rounded-3xl border border-royal-deep/15 bg-royal-deep shadow-[0_16px_40px_rgba(12,27,51,0.12)]"
        >
          <div className="aspect-video">
            {post.featured_image ? (
              <img
                src={post.featured_image}
                alt={post.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <BookOpen className="h-16 w-16 text-white/15" />
              </div>
            )}
          </div>
        </Reveal>

        {/* Content */}
        <Reveal>
          <article
            className={proseRoyal}
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content || '') }}
          />
        </Reveal>

        {/* Tags & share */}
        <div className="mt-14 flex flex-col items-start justify-between gap-6 border-t border-royal-deep/10 pt-8 md:flex-row md:items-center">
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-royal-deep/12 bg-white px-3 py-1 font-mono-code text-[11px] font-bold uppercase tracking-wider text-slate-600 shadow-sm"
              >
                #{tag}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono-code text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Share
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                className={shareButtonClass}
                onClick={shareToFacebook}
                aria-label="Share on Facebook"
              >
                <Facebook className="h-4 w-4" />
              </button>
              <button
                type="button"
                className={shareButtonClass}
                onClick={shareToTwitter}
                aria-label="Share on X"
              >
                <Twitter className="h-4 w-4" />
              </button>
              <button
                type="button"
                className={shareButtonClass}
                onClick={shareToLinkedIn}
                aria-label="Share on LinkedIn"
              >
                <Linkedin className="h-4 w-4" />
              </button>
              <button
                type="button"
                className={shareButtonClass}
                onClick={shareGeneric}
                aria-label="Copy link"
              >
                <Share2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Related */}
      {relatedPosts && relatedPosts.length > 0 && (
        <section className="w-full border-t border-royal-deep/10 bg-royal-canvas-alt py-20">
          <div className="mx-auto max-w-[1280px] px-6 lg:px-12">
            <h2 className="mb-10 font-sans-body text-2xl font-extrabold tracking-tight text-royal-ink">
              Related Articles
            </h2>
            <div className="grid gap-6 md:grid-cols-3">
              {relatedPosts.map((rp, idx) => (
                <Reveal key={rp.slug} delay={idx * 90}>
                  <Link
                    to="/blog/$slug"
                    params={{ slug: rp.slug }}
                    className="group flex h-full flex-col overflow-hidden rounded-3xl border border-royal-deep/12 bg-white shadow-sm transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1.5 hover:border-royal-gold hover:shadow-[0_16px_36px_rgba(12,27,51,0.08)]"
                  >
                    <div className="aspect-[16/10] overflow-hidden bg-royal-deep">
                      {rp.featured_image ? (
                        <img
                          src={rp.featured_image}
                          alt={rp.title}
                          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <BookOpen className="h-10 w-10 text-white/15" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col p-5">
                      <h3 className="line-clamp-2 font-sans-body text-base font-bold text-royal-ink transition-colors duration-300 group-hover:text-royal-sapphire">
                        {rp.title}
                      </h3>
                      <p className="mt-2 flex-1 font-mono-code text-[11px] text-slate-500">
                        {rp.published_at
                          ? format(new Date(rp.published_at), 'MMM dd, yyyy')
                          : 'Recently'}
                      </p>
                      <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-royal-deep transition-transform duration-300 group-hover:translate-x-1">
                        Read <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      <CtaBanner
        eyebrow="Work Together"
        title="Rather have this done for you?"
        description="I write about the work because I do the work. If you'd like it executed rather than explained, start here."
        actions={<DefaultCtaActions />}
      />
    </div>
  );
}
