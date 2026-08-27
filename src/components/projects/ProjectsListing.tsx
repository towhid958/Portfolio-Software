import { Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight, Search } from 'lucide-react';

export function ProjectsListing({ categorySlug }: { categorySlug?: string }) {
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

  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects', categorySlug],
    queryFn: async () => {
      if (categorySlug) {
        const { data, error } = await supabase
          .from('projects')
          .select('*, project_categories!inner(name, slug)')
          .eq('status', 'published')
          .eq('project_categories.slug', categorySlug)
          .order('created_at', { ascending: false });
        if (error) throw error;
        return data as any[];
      }

      const { data, error } = await supabase
        .from('projects')
        .select('*, project_categories(name, slug)')
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as any[];
    },
  });

  return (
    <div className="min-h-screen bg-background pt-24 pb-20">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Portfolio</h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              A collection of my recent work across digital marketing, web development, and brand strategy.
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-12">
          <Button
            variant={!categorySlug ? "default" : "outline"}
            size="sm"
            asChild
            className="rounded-full"
          >
            <Link to="/projects">All Projects</Link>
          </Button>
          {categories?.map((cat) => (
            <Button
              key={cat.id}
              variant={categorySlug === cat.slug ? "default" : "outline"}
              size="sm"
              asChild
              className="rounded-full"
            >
              <Link to="/projects/category/$slug" params={{ slug: cat.slug }}>
                {cat.name}
              </Link>
            </Button>
          ))}
        </div>

        {/* Gallery */}
        {isLoading ? (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="aspect-[4/3] rounded-xl" />
            ))}
          </div>
        ) : projects?.length === 0 ? (
          <div className="text-center py-20 border rounded-xl bg-muted/30">
            <Search className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-medium">No projects found</h3>
            <p className="text-muted-foreground mt-2">Try adjusting your filters.</p>
          </div>
        ) : (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {projects?.map((project: any) => (
              <Card key={project.id} className="group overflow-hidden border-none shadow-md hover:shadow-xl transition-all duration-300">
                <Link to="/projects/$slug" params={{ slug: project.slug }}>
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <img
                      src={project.featured_image || 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=60'}
                      alt={project.title}
                      className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                      <div className="space-y-2 translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                        <Badge variant="secondary" className="bg-primary/90 text-primary-foreground border-none">
                          {project.project_categories?.name}
                        </Badge>
                        <h3 className="text-xl font-bold text-white">{project.title}</h3>
                        <div className="flex items-center text-white/80 text-sm font-medium">
                          View Case Study <ArrowRight className="ml-2 h-4 w-4" />
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
                <CardContent className="p-6 bg-card border-t group-hover:bg-accent/5 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                      {project.client || 'Internal Project'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {project.completion_date ? new Date(project.completion_date).getFullYear() : ''}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold line-clamp-1">{project.title}</h3>
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                    {project.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
