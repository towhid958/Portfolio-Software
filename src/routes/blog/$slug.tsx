import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Calendar, User, Clock, Share2, Facebook, Twitter, Linkedin } from 'lucide-react';
import { format } from 'date-fns';
import DOMPurify from 'isomorphic-dompurify';

export const Route = createFileRoute('/blog/$slug')({
  component: BlogPostPage,
});

function BlogPostPage() {
  const { slug } = Route.useParams();

  const { data: post, isLoading } = useQuery({
    queryKey: ['blog-post', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*, blog_categories(id, name, slug)')
        .eq('slug', slug)
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
      <div className="min-h-screen bg-background pt-32 pb-20">
        <div className="container mx-auto px-4 max-w-4xl space-y-8">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-[400px] w-full rounded-3xl" />
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold">Article not found</h2>
          <Button asChild>
            <Link to="/blog">Back to Blog</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Article Header */}
      <header className="pt-32 pb-16 bg-muted/30 border-b">
        <div className="container mx-auto px-4 max-w-4xl">
          <Button variant="ghost" asChild className="mb-8 -ml-4">
            <Link to="/blog" className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Back to Blog
            </Link>
          </Button>
          
          <div className="space-y-6">
            <Badge className="bg-primary/10 text-primary border-none text-sm px-4 py-1">
              {post.blog_categories?.name || 'Uncategorized'}
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
              {post.title}
            </h1>
            
            <div className="flex flex-wrap items-center gap-6 pt-4 text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  HK
                </div>
                <div>
                  <div className="text-sm font-bold text-foreground">Hasan Kamrul</div>
                  <div className="text-xs">Lead Strategist</div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4" />
                {post.published_at ? format(new Date(post.published_at), 'MMMM dd, yyyy') : 'Recently Published'}
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4" />
                5 min read
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 max-w-4xl mt-12">
        {/* Featured Image */}
        <div className="rounded-3xl overflow-hidden shadow-2xl mb-16 border bg-muted aspect-video">
          <img 
            src={post.featured_image || 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=1200&auto=format&fit=crop&q=80'} 
            alt={post.title}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Content */}
        <article
          className="prose prose-stone lg:prose-xl dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content || '') }}
        />

        {/* Tags & Share */}
        <div className="mt-16 pt-8 border-t flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="flex flex-wrap gap-2">
            {Array.isArray(post.tags) && (post.tags as string[]).map(tag => (
              <Badge key={tag} variant="secondary" className="px-3 py-1">#{tag}</Badge>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Share</span>
            <div className="flex gap-2">
              <Button size="icon" variant="outline" className="rounded-full"><Facebook className="h-4 w-4" /></Button>
              <Button size="icon" variant="outline" className="rounded-full"><Twitter className="h-4 w-4" /></Button>
              <Button size="icon" variant="outline" className="rounded-full"><Linkedin className="h-4 w-4" /></Button>
              <Button size="icon" variant="outline" className="rounded-full"><Share2 className="h-4 w-4" /></Button>
            </div>
          </div>
        </div>

        {/* Related Posts */}
        {relatedPosts && relatedPosts.length > 0 && (
          <div className="mt-32">
            <h3 className="text-3xl font-bold mb-12">Related Articles</h3>
            <div className="grid md:grid-cols-3 gap-8">
              {relatedPosts.map((rp) => (
                <Link key={rp.slug} to="/blog/$slug" params={{ slug: rp.slug }} className="group space-y-4">
                  <div className="aspect-[16/10] rounded-2xl overflow-hidden border bg-muted">
                    <img 
                      src={rp.featured_image || 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=400&auto=format&fit=crop&q=60'} 
                      alt={rp.title}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                  </div>
                  <h4 className="font-bold group-hover:text-primary transition-colors line-clamp-2">{rp.title}</h4>
                  <p className="text-xs text-muted-foreground">
                    {rp.published_at ? format(new Date(rp.published_at), 'MMM dd, yyyy') : 'Recently'}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
