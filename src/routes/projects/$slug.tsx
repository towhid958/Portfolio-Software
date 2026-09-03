import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ArrowLeft, 
  ExternalLink, 
  Calendar, 
  User, 
  Tag, 
  CheckCircle2, 
  ChevronRight,
  Monitor,
  Rocket,
  Lightbulb,
  Target,
  Code
} from 'lucide-react';
import { cn } from '@/lib/utils';
import DOMPurify from 'isomorphic-dompurify';

export const Route = createFileRoute('/projects/$slug')({
  component: ProjectDetail,
});

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
      return data as any;
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pt-24 pb-20">
        <div className="container mx-auto px-4">
          <Skeleton className="h-8 w-32 mb-8" />
          <Skeleton className="h-16 w-3/4 mb-4" />
          <Skeleton className="h-6 w-1/2 mb-12" />
          <Skeleton className="aspect-video w-full rounded-2xl mb-12" />
          <div className="grid lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2 space-y-8">
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold">Project not found</h2>
          <Button asChild>
            <Link to="/projects">Back to Portfolio</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Hero Header */}
      <div className="relative pt-32 pb-16 lg:pt-48 lg:pb-32 overflow-hidden bg-muted/30">
        <div className="container mx-auto px-4 relative z-10">
          <Button variant="ghost" asChild className="mb-8 -ml-4">
            <Link to="/projects" className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Back to Portfolio
            </Link>
          </Button>
          
          <div className="max-w-4xl space-y-6">
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-primary/10 text-primary border-none text-sm px-3 py-1">
                {project.project_categories?.name}
              </Badge>
              {project.industry && (
                <Badge variant="outline" className="text-sm px-3 py-1">
                  {project.industry}
                </Badge>
              )}
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">{project.title}</h1>
            <div
              className="text-xl text-muted-foreground leading-relaxed max-w-3xl prose prose-stone dark:prose-invert prose-p:text-muted-foreground prose-p:leading-relaxed"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(project.description || '') }}
            />
            
            <div className="flex flex-wrap gap-8 pt-4">
              {project.client && (
                <div className="space-y-1">
                  <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <User className="h-3 w-3" /> Client
                  </div>
                  <div className="font-semibold">{project.client}</div>
                </div>
              )}
              {project.completion_date && (
                <div className="space-y-1">
                  <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-3 w-3" /> Date
                  </div>
                  <div className="font-semibold">
                    {new Date(project.completion_date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </div>
                </div>
              )}
              {project.project_url && (
                <div className="space-y-1">
                  <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <ExternalLink className="h-3 w-3" /> Live Link
                  </div>
                  <a 
                    href={project.project_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="font-semibold text-primary hover:underline flex items-center gap-1"
                  >
                    Visit Website <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Background decorative elements */}
        <div className="absolute top-0 right-0 w-1/3 h-full bg-primary/5 -skew-x-12 translate-x-1/2" />
      </div>

      <div className="container mx-auto px-4 -mt-12 lg:-mt-24 relative z-20">
        <div className="rounded-2xl overflow-hidden shadow-2xl border bg-card">
          <img 
            src={project.featured_image || 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1600&auto=format&fit=crop&q=80'} 
            alt={project.title}
            className="w-full aspect-video object-cover"
          />
        </div>

        <div className="mt-16 grid lg:grid-cols-3 gap-16">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-16">
            {/* The Challenge */}
            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500">
                  <Lightbulb className="h-6 w-6" />
                </div>
                <h2 className="text-3xl font-bold">The Challenge</h2>
              </div>
              <div className="text-lg text-muted-foreground leading-relaxed prose prose-stone dark:prose-invert max-w-none">
                {project.challenge || "No challenge described for this project yet."}
              </div>
            </section>

            {/* Strategy & Approach */}
            {project.strategy && (
              <section className="space-y-6 p-8 rounded-2xl bg-muted/30 border border-primary/10">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500">
                    <Target className="h-6 w-6" />
                  </div>
                  <h2 className="text-3xl font-bold">Strategy & Approach</h2>
                </div>
                <div className="text-lg text-muted-foreground leading-relaxed prose prose-stone dark:prose-invert max-w-none">
                  {project.strategy}
                </div>
              </section>
            )}

            {/* The Solution */}
            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                  <Rocket className="h-6 w-6" />
                </div>
                <h2 className="text-3xl font-bold">The Solution</h2>
              </div>
              <div className="text-lg text-muted-foreground leading-relaxed prose prose-stone dark:prose-invert max-w-none">
                {project.solution || "No solution described for this project yet."}
              </div>
            </section>

            {/* Implementation */}
            {project.implementation && (
              <section className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
                    <Code className="h-6 w-6" />
                  </div>
                  <h2 className="text-3xl font-bold">Implementation</h2>
                </div>
                <div className="text-lg text-muted-foreground leading-relaxed prose prose-stone dark:prose-invert max-w-none">
                  {project.implementation}
                </div>
              </section>
            )}

            {/* Results */}
            <section className="space-y-8">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10 text-green-500">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h2 className="text-3xl font-bold">Key Results</h2>
              </div>

              {/* Metrics Display */}
              {project.metrics && Array.isArray(project.metrics) && project.metrics.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {(project.metrics as {label: string, value: string}[]).map((metric, idx) => (
                    <div key={idx} className="p-6 rounded-2xl bg-card border shadow-sm text-center space-y-2">
                      <div className="text-3xl font-black text-primary">{metric.value}</div>
                      <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider">{metric.label}</div>
                    </div>
                  ))}
                </div>
              )}

              <div className="text-lg text-muted-foreground leading-relaxed prose prose-stone dark:prose-invert max-w-none pt-4">
                {project.results || "Results for this project will be shared soon."}
              </div>
            </section>
            
            {/* Gallery / Screenshots if any */}
            {project.gallery && Array.isArray(project.gallery) && project.gallery.length > 0 && (
              <section className="space-y-8">
                <h2 className="text-3xl font-bold">Project Gallery</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {(project.gallery as string[]).map((img, idx) => (
                    <div key={idx} className="rounded-xl overflow-hidden border shadow-sm">
                      <img src={img} alt={`${project.title} screenshot ${idx + 1}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar Info */}
          <div className="space-y-8">
            <div className="sticky top-24 space-y-8">
              {/* Technologies */}
              <div className="p-8 rounded-2xl bg-card border shadow-sm space-y-6">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Monitor className="h-5 w-5 text-primary" /> Technologies
                </h3>
                <div className="flex flex-wrap gap-2">
                  {(project.technologies as string[] || []).map((tech) => (
                    <Badge key={tech} variant="secondary" className="px-3 py-1">
                      {tech}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Services Provided */}
              <div className="p-8 rounded-2xl bg-card border shadow-sm space-y-6">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-primary" /> Services Provided
                </h3>
                <ul className="space-y-3">
                  {(project.services_provided as string[] || []).map((service) => (
                    <li key={service} className="flex items-center gap-3 text-muted-foreground">
                      <ChevronRight className="h-4 w-4 text-primary" />
                      {service}
                    </li>
                  ))}
                </ul>
              </div>

              {/* CTA */}
              <div className="p-8 rounded-2xl bg-primary text-primary-foreground space-y-6">
                <h3 className="text-xl font-bold">Have a similar project?</h3>
                <p className="text-primary-foreground/80">
                  Let's collaborate to bring your vision to life with data-driven strategies and premium execution.
                </p>
                <Button variant="secondary" className="w-full" asChild>
                  <Link to="/services">Start a Project</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const Briefcase = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <rect width="20" height="14" x="2" y="7" rx="2" ry="2"/>
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
  </svg>
);
