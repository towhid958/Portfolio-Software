import { createFileRoute, Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowRight,
  ExternalLink,
  Layers,
  Target,
  TrendingUp,
  Users,
  Code,
  Briefcase,
  UserCircle2
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { data: services } = useQuery({
    queryKey: ['public-services'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('status', 'published')
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const { data: profile } = useQuery({
    queryKey: ['public-profile'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('full_name, professional_title, avatar_url').limit(1).single();
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const staticServices = [
    { 
      title: "Digital Marketing", 
      short_description: "Meta Ads, Google Ads, and TikTok Ads strategies.",
      icon: <TrendingUp className="h-6 w-6" />,
      color: "bg-blue-500/10 text-blue-500"
    },
    { 
      title: "Web Development", 
      short_description: "High-performance Shopify, WordPress, and React apps.",
      icon: <Code className="h-6 w-6" />,
      color: "bg-purple-500/10 text-purple-500"
    },
    { 
      title: "Business Consulting", 
      short_description: "Company formation and growth strategy consulting.",
      icon: <Briefcase className="h-6 w-6" />,
      color: "bg-orange-500/10 text-orange-500"
    }
  ];

  const displayServices = services && services.length > 0 ? services : staticServices;
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation moved to __root for global visibility */}


      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-16 md:pt-32 md:pb-24">
        <div className="container mx-auto px-4">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <div className="inline-block rounded-lg bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                  Available for new projects
                </div>
                <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
                  {profile?.professional_title || (
                    <>Digital Strategist & <span className="text-primary">Full-Stack</span> Developer</>
                  )}
                </h1>
                <p className="max-w-[600px] text-lg text-muted-foreground sm:text-xl">
                  I help brands and businesses scale with data-driven digital marketing and high-performance full-stack applications. From Meta ads to React dashboards, I deliver results that matter.
                </p>
              </div>
              <div className="flex flex-wrap gap-4">
                <Button size="lg" className="gap-2" asChild>
                  <Link to="/projects">
                    View My Work <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/services">
                    Contact Me
                  </Link>
                </Button>
              </div>
              <div className="flex items-center gap-8 pt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">5+</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">Years Exp.</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">120+</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">Projects</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">50+</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">Happy Clients</div>
                </div>
              </div>
            </div>
            <div className="relative mx-auto max-w-[500px] lg:mx-0">
              <div className="aspect-square rounded-2xl bg-gradient-to-tr from-primary/20 to-primary/5 p-4">
                <div className="h-full w-full rounded-xl bg-card shadow-2xl overflow-hidden flex items-center justify-center">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.full_name || "Profile photo"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <UserCircle2 className="h-32 w-32 text-muted-foreground/30" />
                  )}
                </div>
              </div>
              {/* Floating badges for Ryancv aesthetic */}
              <Card className="absolute -bottom-6 -left-6 hidden w-48 shadow-xl md:block">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-green-500/10 p-2 text-green-500">
                      <Target className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Ads Performance</div>
                      <div className="text-sm font-bold">+450% ROI</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Services Preview */}
      <section id="services" className="bg-muted/30 py-24">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold tracking-tight">Premium Services</h2>
          <p className="mt-4 text-muted-foreground">Specialized solutions for your business growth.</p>
          
          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {displayServices.map((service: any, idx) => (
              <Card key={idx} className="group hover:shadow-lg transition-all">
                <CardContent className="p-8 text-left space-y-4">
                  <div className={`inline-block p-3 rounded-lg ${service.color || 'bg-primary/10 text-primary'}`}>
                    {service.icon || <Briefcase className="h-6 w-6" />}
                  </div>
                  <h3 className="text-xl font-bold">{service.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {service.short_description}
                  </p>
                  <Button variant="ghost" className="p-0 h-auto font-bold group-hover:text-primary" asChild>
                    <Link to="/services/$slug" params={{ slug: service.slug || service.id }}>
                      Learn more <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* More Section - Why Choose Me / Key Advantages */}
      <section id="expertise" className="py-24 border-t bg-card/50">
        <div className="container mx-auto px-4">
          <div className="mb-16 flex flex-col items-center text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Expertise That Delivers Results</h2>
            <div className="mt-4 h-1.5 w-24 rounded-full bg-primary/20 relative">
              <div className="absolute left-0 top-0 h-full w-1/2 rounded-full bg-primary"></div>
            </div>
            <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
              I combine deep technical knowledge with strategic marketing insights to build digital solutions that don't just look great, but perform exceptionally.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: "Data-Driven Strategy",
                desc: "I leverage advanced analytics to understand user behavior, ensuring every design and marketing decision is backed by solid evidence.",
                icon: <TrendingUp className="h-6 w-6" />,
                cta: "View Strategy",
                link: "#services"
              },
              {
                title: "Scalable Architecture",
                desc: "Using industry-leading technologies like React and Supabase, I build platforms designed for high performance and seamless growth.",
                icon: <Layers className="h-6 w-6" />,
                cta: "Explore Tech",
                link: "/projects"
              },
              {
                title: "High Conversion Focus",
                desc: "Conversion rate optimization (CRO) is at the heart of everything I do, turning visitors into loyal customers through intuitive UI/UX.",
                icon: <Target className="h-6 w-6" />,
                cta: "Learn How",
                link: "/gigs"
              },
              {
                title: "Dedicated Partnership",
                desc: "I believe in long-term success. I provide continuous support and strategic consulting to help your business evolve in the digital landscape.",
                icon: <Users className="h-5 w-5" />,
                cta: "Partner With Me",
                link: "/partners"
              },
            ].map((item, idx) => (
              <Card key={idx} className="group flex flex-col border-none bg-background shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl">
                <CardContent className="flex flex-1 flex-col p-8">
                  <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    {item.icon}
                  </div>
                  <h3 className="mb-3 text-xl font-bold tracking-tight">{item.title}</h3>
                  <p className="mb-8 flex-1 text-sm leading-relaxed text-muted-foreground">
                    {item.desc}
                  </p>
                  <Button variant="link" className="h-auto w-fit p-0 font-semibold text-primary" asChild>
                    {item.link.startsWith('#') ? (
                      <a href={item.link}>
                        {item.cta} <ArrowRight className="ml-2 h-4 w-4" />
                      </a>
                    ) : item.link === '/gigs' ? (
                      <Link to="/gigs" search={{ page: 1 }}>
                        {item.cta} <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    ) : (
                      <Link to={item.link as any}>
                        {item.cta} <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-16 overflow-hidden rounded-3xl bg-primary text-primary-foreground shadow-2xl">
            <div className="relative flex flex-col items-center gap-8 p-8 md:flex-row md:justify-between md:p-16">
              <div className="relative z-10 max-w-2xl text-center md:text-left">
                <h3 className="text-3xl font-bold md:text-4xl">Ready to scale your business?</h3>
                <p className="mt-4 text-lg text-primary-foreground/90">
                  Whether you need a high-converting web app or a comprehensive digital marketing strategy, I'm here to help you dominate your market.
                </p>
              </div>
              <div className="relative z-10 flex flex-shrink-0 flex-col gap-4 sm:flex-row">
                <Button size="lg" variant="secondary" className="h-14 px-8 text-base font-bold shadow-lg transition-transform hover:scale-105" asChild>
                  <a href="mailto:contact@hasankamrul.com">Start Your Journey</a>
                </Button>
                <Button size="lg" variant="outline" className="h-14 border-primary-foreground/20 bg-transparent px-8 text-base font-bold text-primary-foreground hover:bg-primary-foreground hover:text-primary" asChild>
                  <Link to="/gigs" search={{ page: 1 }}>View Pricing</Link>
                </Button>
              </div>
              {/* Abstract decorative elements */}
              <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl"></div>
              <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-black/10 blur-3xl"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer / Contact CTA */}
      <section className="py-24 border-t">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-2xl mx-auto space-y-8">
            <h2 className="text-4xl font-bold">Ready to take your business to the next level?</h2>
            <p className="text-muted-foreground text-lg">
              Let's discuss your project and see how I can help you achieve your goals.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button size="lg" className="px-12" asChild>
                <Link to="/services">Start a Project</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/projects">Browse Portfolio</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}