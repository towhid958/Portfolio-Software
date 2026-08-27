import { Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, User, ArrowRight, BookOpen } from 'lucide-react';
import { format } from 'date-fns';

export function BlogListing({ categorySlug, q }: { categorySlug?: string; q?: string | undefined }) {
  const { data: posts, isLoading } = useQuery({
    queryKey: ['blog-posts', categorySlug, q],
    queryFn: async () => {
      let query = supabase
        .from('blog_posts')
        .select(categorySlug ? '*, blog_categories!inner(id, name, slug)' : '*, blog_categories(id, name, slug)')
        .eq('status', 'published')
        .order('published_at', { ascending: false });

      if (categorySlug) {
        query = query.eq('blog_categories.slug', categorySlug);
      }

      if (q) {
        query = query.ilike('title', `%${q}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

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

  return (
    <div className="min-h-screen bg-background pt-24 pb-20">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="max-w-3xl mb-16">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl mb-6">Insights & Articles</h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Thoughts, tutorials, and strategies on digital marketing, web development, and business growth.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-12">
          <Button
            variant={!categorySlug ? "default" : "outline"}
            size="sm"
            asChild
            className="rounded-full"
          >
            <Link to="/blog">All Posts</Link>
          </Button>
          {categories?.map((cat) => (
            <Button
              key={cat.id}
              variant={categorySlug === cat.slug ? "default" : "outline"}
              size="sm"
              asChild
              className="rounded-full"
            >
              <Link to="/blog/category/$slug" params={{ slug: cat.slug }}>
                {cat.name}
              </Link>
            </Button>
          ))}
        </div>

        {/* Listing */}
        {isLoading ? (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[450px] rounded-2xl" />
            ))}
          </div>
        ) : posts?.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed rounded-3xl">
            <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-bold">No articles found</h3>
            <p className="text-muted-foreground mt-2">Check back later or try a different filter.</p>
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {posts?.map((post) => (
              <Card key={post.id} className="group overflow-hidden border-none shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col rounded-2xl bg-card">
                <Link to="/blog/$slug" params={{ slug: post.slug }}>
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <img
                      src={post.featured_image || 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800&auto=format&fit=crop&q=60'}
                      alt={post.title}
                      className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute top-4 left-4">
                      <Badge className="bg-white/90 text-black hover:bg-white border-none backdrop-blur-sm font-bold">
                        {post.blog_categories?.name || 'Uncategorized'}
                      </Badge>
                    </div>
                  </div>
                </Link>
                <CardContent className="p-8 flex flex-col flex-grow space-y-4">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      {post.published_at ? format(new Date(post.published_at), 'MMM dd, yyyy') : 'Recently'}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5" />
                      Hasan Kamrul
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-2xl font-bold group-hover:text-primary transition-colors leading-tight">
                      <Link to="/blog/$slug" params={{ slug: post.slug }}>
                        {post.title}
                      </Link>
                    </h3>
                    <p className="text-muted-foreground line-clamp-3 leading-relaxed">
                      {post.excerpt}
                    </p>
                  </div>

                  <div className="pt-6 mt-auto border-t">
                    <Button variant="link" className="p-0 h-auto gap-2 group/btn text-primary font-bold" asChild>
                      <Link to="/blog/$slug" params={{ slug: post.slug }}>
                        Read Article <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
