import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  CheckCircle2, 
  ArrowRight, 
  Zap, 
  Layers, 
  Workflow, 
  MessageSquare,
  ShieldCheck,
  Globe,
  Star
} from 'lucide-react';
import { motion } from 'framer-motion';
import { getServiceBySlug } from '@/lib/services.functions';

export const Route = createFileRoute('/services/$slug')({
  loader: ({ params }) => getServiceBySlug({ data: params.slug }),
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: 'Service Not Found | Hasan Kamrul' }] };

    const title = loaderData.meta_title || `${loaderData.title} | Professional Services | Hasan Kamrul`;
    const description = loaderData.meta_description || loaderData.short_description || '';
    const image = loaderData.og_image || loaderData.hero_image || '';

    const meta: any[] = [
      { title },
      { name: 'description', content: description },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description },
    ];

    if (image) {
      meta.push({ property: 'og:image', content: image });
      meta.push({ name: 'twitter:image', content: image });
    }

    return { meta };
  },
  component: ServiceDetailPage,
});

function ServiceDetailPage() {
  const { slug } = Route.useParams();
  const loaderData = Route.useLoaderData();

  const { data: service, isLoading } = useSuspenseQuery({
    queryKey: ['service', slug],
    queryFn: async () => {
      if (loaderData) return loaderData;
      
      const { data, error } = await supabase
        .from('services')
        .select(`
          *,
          category:service_categories(*),
          packages:service_packages_link(
            gig:gigs(*)
          )
        `)
        .eq('slug', slug)
        .eq('status', 'published')
        .single();
      
      if (error) throw error;
      return data;
    },
    initialData: loaderData,
  });

  if (isLoading) {
    return (
      <div className="container py-20 space-y-8">
        <Skeleton className="h-12 w-1/3" />
        <Skeleton className="h-[400px] w-full" />
        <div className="grid md:grid-cols-3 gap-6">
          <Skeleton className="h-60" />
          <Skeleton className="h-60" />
          <Skeleton className="h-60" />
        </div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="container py-40 text-center">
        <h1 className="text-4xl font-bold mb-4">Service Not Found</h1>
        <p className="text-muted-foreground mb-8">The service you're looking for doesn't exist or has been moved.</p>
        <Button asChild>
          <Link to="/services">Back to Services</Link>
        </Button>
      </div>
    );
  }

  const features = (service.features as any[]) || [];
  const process = (service.process as any[]) || [];
  const benefits = (service.benefits as any[]) || [];
  const technologies = (service.technologies as any[]) || [];
  const packages = (service.packages as any[]) || [];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-20 md:py-32 overflow-hidden border-b">
        <div className="absolute inset-0 bg-linear-to-b from-primary/5 to-transparent -z-10" />
        <div className="container px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              <Badge variant="outline" className="px-3 py-1 text-sm font-medium border-primary/20 bg-primary/5 text-primary">
                {service.category?.name || 'Professional Service'}
              </Badge>
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
                {service.title}
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed">
                {service.short_description}
              </p>
              <div className="flex flex-wrap gap-4 pt-4">
                <Button size="lg" className="rounded-full px-8" asChild>
                  <Link to="/services/request-quote" search={{ serviceId: service.id }}>
                    Get Started <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                {(service.starting_price ?? 0) > 0 && (
                  <div className="flex flex-col justify-center px-6">
                    <span className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">Starting from</span>
                    <span className="text-2xl font-bold">${service.starting_price}</span>
                  </div>
                )}
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="relative aspect-video rounded-2xl overflow-hidden border shadow-2xl"
            >
              {service.hero_image ? (
                <img 
                  src={service.hero_image} 
                  alt={service.title} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <Layers className="h-20 w-20 text-muted-foreground/20" />
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Benefits / Features Grid */}
      <section className="py-20 bg-muted/30">
        <div className="container px-4">
          <div className="max-w-3xl mb-16">
            <h2 className="text-3xl font-bold mb-4">Why Choose This Service?</h2>
            <p className="text-lg text-muted-foreground">
              We combine strategy, design, and technology to deliver results that matter for your business.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="bg-card p-8 rounded-2xl border hover:shadow-lg transition-shadow"
              >
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-6">
                  <Zap className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="py-20 border-y">
        <div className="container px-4">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold mb-4">The Process</h2>
            <p className="text-muted-foreground">
              A structured, transparent approach to bringing your vision to life.
            </p>
          </div>

          <div className="relative">
            <div className="hidden lg:block absolute top-1/2 left-0 w-full h-0.5 bg-border -translate-y-1/2 -z-10" />
            <div className="grid lg:grid-cols-4 gap-8">
              {process.map((step, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-background p-6 rounded-xl border text-center relative"
                >
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full uppercase">
                    Step {step.step || idx + 1}
                  </div>
                  <h4 className="text-lg font-bold mt-4 mb-2">{step.title}</h4>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Packages Section */}
      {service.show_packages && packages.length > 0 && (
        <section className="py-20 bg-muted/30">
          <div className="container px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4">Available Packages</h2>
              <p className="text-muted-foreground">Standardized solutions for specific needs.</p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {packages.map((item: any, idx: number) => {
                const gig = item.gig;
                if (!gig) return null;
                return (
                  <motion.div 
                    key={gig.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.1 }}
                    className="bg-card rounded-2xl border overflow-hidden flex flex-col hover:shadow-xl transition-all"
                  >
                    <div className="aspect-video relative overflow-hidden">
                      <img 
                        src={gig.featured_image || 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80'} 
                        alt={gig.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-6 flex-1 flex flex-col">
                      <h3 className="text-xl font-bold mb-2">{gig.title}</h3>
                      <p className="text-muted-foreground text-sm line-clamp-2 mb-6">{gig.description}</p>
                      <div className="mt-auto flex items-center justify-between">
                        <span className="text-2xl font-bold">${gig.starting_price}</span>
                        <Button variant="outline" size="sm" asChild>
                          <Link to="/gigs/$slug" params={{ slug: gig.slug || gig.id }}>View Details</Link>
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Call to Action */}
      <section className="py-20 bg-primary text-primary-foreground overflow-hidden relative">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-white/5 skew-x-12 -translate-y-20" />
        <div className="container px-4 text-center relative z-10">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">Ready to start your project?</h2>
          <p className="text-xl text-primary-foreground/80 mb-10 max-w-2xl mx-auto">
            Contact us today for a free consultation and personalized quote based on your specific requirements.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" className="rounded-full px-10 h-14 text-lg font-bold" asChild>
              <Link to="/services/request-quote" search={{ serviceId: service.id }}>
                Request a Custom Quote
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="rounded-full px-10 h-14 text-lg font-bold border-white/20 hover:bg-white/10" asChild>
              <Link to="/">Contact Support</Link>
            </Button>
          </div>
          
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 opacity-60">
            <div className="flex items-center justify-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              <span className="text-sm font-medium">Secure Payments</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Globe className="h-5 w-5" />
              <span className="text-sm font-medium">Global Delivery</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Star className="h-5 w-5" />
              <span className="text-sm font-medium">5-Star Quality</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <MessageSquare className="h-5 w-5" />
              <span className="text-sm font-medium">24/7 Support</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
