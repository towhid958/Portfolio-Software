import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowRight, 

  Code, 
  Briefcase, 
  TrendingUp, 
  Target, 
  Layers, 
  Users,
  Search,
  Zap,
  ShieldCheck,
  Globe,
  Smartphone,
  Layout,
  BarChart,
  Palette
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/services")({
  component: ServicesPage,
});

function ServicesPage() {
  const { data: dbServices } = useQuery({
    queryKey: ['public-services'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select(`
          *,
          category:service_categories(*)
        `)
        .eq('status', 'published')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: faqs } = useQuery({
    queryKey: ['service-faqs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_faqs')
        .select('*')
        .eq('is_published', true)
        .order('display_order', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const serviceCategories = [
    {
      title: "Web Design & Development",
      icon: <Layout className="h-6 w-6" />,
      description: "High-performance websites and custom web applications tailored to your business needs.",
      capabilities: ["Business & Corporate Websites", "Landing Pages", "eCommerce Websites", "Custom Web Apps", "CMS Development", "Performance Optimization"],
      color: "bg-blue-500/10 text-blue-500"
    },
    {
      title: "Digital Marketing",
      icon: <TrendingUp className="h-6 w-6" />,
      description: "Data-driven marketing strategies to scale your brand and reach your target audience.",
      capabilities: ["Meta Ads (Facebook/Instagram)", "Google Ads", "TikTok Ads", "Performance Marketing", "Lead Generation", "Conversion Optimization"],
      color: "bg-purple-500/10 text-purple-500"
    },
    {
      title: "SEO",
      icon: <Search className="h-6 w-6" />,
      description: "Improve your search engine visibility and drive organic traffic to your platform.",
      capabilities: ["Technical & On-Page SEO", "Local SEO", "Keyword Strategy", "Content Optimization", "SEO Audits", "Performance Tracking"],
      color: "bg-green-500/10 text-green-500"
    },
    {
      title: "eCommerce Solutions",
      icon: <Smartphone className="h-6 w-6" />,
      description: "End-to-end eCommerce development and optimization to maximize your sales.",
      capabilities: ["Shopify Development", "Custom Shopify Themes", "Product Page Optimization", "Store Design", "Checkout Optimization", "eCommerce Marketing"],
      color: "bg-orange-500/10 text-orange-500"
    },
    {
      title: "Branding & Creative",
      icon: <Palette className="h-6 w-6" />,
      description: "Visual identity and creative assets that make your brand stand out from the competition.",
      capabilities: ["Brand Identity & Logo Design", "Social Media Creative", "Marketing Design", "Creative Strategy", "Presentation Design"],
      color: "bg-pink-500/10 text-pink-500"
    },
    {
      title: "Business Automation",
      icon: <Zap className="h-6 w-6" />,
      description: "Streamline your operations with custom internal tools and digital infrastructure.",
      capabilities: ["CRM/Management Systems", "Business Automation", "Custom Internal Tools", "Digital Transformation", "Workflow Optimization"],
      color: "bg-yellow-500/10 text-yellow-500"
    }
  ];

  const workflow = [
    { step: "01", title: "Discovery", desc: "We understand your business, objectives, audience, and requirements." },
    { step: "02", title: "Strategy", desc: "We define the right approach, scope, technology, and execution strategy." },
    { step: "03", title: "Proposal", desc: "We provide the recommended solution, timeline, scope, and quotation." },
    { step: "04", title: "Design & Dev", desc: "We execute the approved project according to the agreed scope." },
    { step: "05", title: "Testing", desc: "We test, refine, optimize, and prepare for the final delivery." },
    { step: "06", title: "Launch", desc: "We launch the project and provide ongoing support as needed." },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-16 md:pt-32 md:pb-24 border-b">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl space-y-8">
            <div className="inline-block rounded-lg bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
              Custom Solutions & Professional Services
            </div>
            <h1 className="text-5xl font-bold tracking-tight sm:text-7xl">
              Your Vision. <span className="text-primary">Our Expertise.</span> Built to Perform.
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              From strategy and design to development and digital growth, we provide tailored solutions built around your business goals.
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              <Button size="lg" className="h-14 px-8 text-base font-bold shadow-lg" asChild>
                <Link to="/services/request-quote">Request a Quote</Link>
              </Button>
              <Button size="lg" variant="outline" className="h-14 px-8 text-base font-bold" asChild>
                <Link to="/projects">View Our Work</Link>
              </Button>
            </div>
          </div>
        </div>
        {/* Decorative background element */}
        <div className="absolute right-0 top-0 -z-10 h-full w-1/3 bg-gradient-to-l from-primary/5 to-transparent blur-3xl"></div>
      </section>

      {/* Dynamic Services Overview */}
      {dbServices && dbServices.length > 0 && (
        <section className="py-24 bg-muted/20 border-b">
          <div className="container mx-auto px-4">
            <div className="mb-16 max-w-2xl">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Featured Services</h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Specialized digital solutions designed to help your business scale.
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {dbServices.map((service, idx) => (
                <Card key={service.id} className="group hover:shadow-xl transition-all border-none bg-card shadow-sm overflow-hidden flex flex-col">
                  {service.hero_image && (
                    <div className="aspect-video relative overflow-hidden">
                      <img 
                        src={service.hero_image} 
                        alt={service.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  )}
                  <CardContent className="p-8 space-y-6 flex-1 flex flex-col">
                    <div className="space-y-3">
                      <Badge variant="secondary" className="bg-primary/5 text-primary border-primary/10">
                        {service.category?.name || 'Service'}
                      </Badge>
                      <h3 className="text-2xl font-bold group-hover:text-primary transition-colors">
                        {service.title}
                      </h3>
                      <p className="text-muted-foreground leading-relaxed line-clamp-3">
                        {service.short_description}
                      </p>
                    </div>
                    
                    <div className="mt-auto pt-6 flex items-center justify-between border-t border-border/50">
                      <div>
                        {(service.starting_price ?? 0) > 0 && (
                          <p className="text-sm font-bold">
                            <span className="text-muted-foreground font-normal text-xs uppercase tracking-wider block mb-0.5">Starting at</span>
                            ${service.starting_price}
                          </p>
                        )}
                      </div>
                      <Button variant="ghost" className="p-0 h-auto font-bold group-hover:translate-x-1 transition-transform" asChild>
                        <Link to="/services/$slug" params={{ slug: service.slug || service.id }}>
                          View Details <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Legacy Services Overview */}
      <section className="py-24 bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="mb-16 max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Comprehensive Solutions</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              We specialize in delivering high-impact digital products and marketing strategies.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {serviceCategories.map((category, idx) => (
              <Card key={idx} className="group hover:shadow-xl transition-all border-none bg-card shadow-sm">
                <CardContent className="p-8 space-y-6">
                  <div className={`inline-flex p-3 rounded-xl ${category.color}`}>
                    {category.icon}
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-2xl font-bold">{category.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {category.description}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70">Key Capabilities</p>
                    <ul className="grid grid-cols-1 gap-2">
                      {category.capabilities.map((cap, i) => (
                        <li key={i} className="flex items-center text-sm">
                          <ShieldCheck className="mr-2 h-4 w-4 text-primary" />
                          {cap}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Button variant="ghost" className="p-0 h-auto font-bold group-hover:text-primary" asChild>
                    <Link to="/services/request-quote">Explore Service <ArrowRight className="ml-2 h-4 w-4" /></Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How We Work */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Our Process</h2>
            <p className="mt-4 text-lg text-muted-foreground">A clear, strategic approach to every project.</p>
          </div>

          <div className="grid gap-8 md:grid-cols-3 lg:grid-cols-6">
            {workflow.map((item, idx) => (
              <div key={idx} className="relative space-y-4">
                <div className="text-5xl font-black text-primary/10">{item.step}</div>
                <h3 className="text-xl font-bold">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {item.desc}
                </p>
                {idx < workflow.length - 1 && (
                  <div className="hidden lg:block absolute top-6 -right-4 w-8 h-px bg-border"></div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quote Request Section */}
      <section id="quote" className="py-24 bg-primary text-primary-foreground overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
            <div className="space-y-8">
              <h2 className="text-4xl font-bold sm:text-5xl">Ready to Start a Project?</h2>
              <p className="text-xl text-primary-foreground/80 leading-relaxed">
                Tell us about your business and goals. We'll help identify the right digital solution and provide a custom quotation.
              </p>
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="rounded-full bg-white/10 p-2"><ShieldCheck className="h-6 w-6" /></div>
                  <div>
                    <p className="font-bold text-lg">Detailed Proposal</p>
                    <p className="text-sm text-primary-foreground/70">Receive a comprehensive scope and timeline.</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="rounded-full bg-white/10 p-2"><Layers className="h-6 w-6" /></div>
                  <div>
                    <p className="font-bold text-lg">Strategic Alignment</p>
                    <p className="text-sm text-primary-foreground/70">Every project is built around your business objectives.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-background p-8 text-foreground shadow-2xl">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold">Request a Custom Quote</h3>
                <p className="text-muted-foreground mt-2">Fill out the form below to get started.</p>
              </div>
              
              <div className="space-y-4">
                <Button size="lg" className="w-full h-14 text-base font-bold" asChild>
                  <Link to="/services/request-quote" className="w-full">Get Started with Quote Request</Link>
                </Button>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t"></span></div>
                  <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Or</span></div>
                </div>
                <Button size="lg" variant="outline" className="w-full h-14 text-base font-bold" asChild>
                  <Link to="/auth">Contact via Client Dashboard</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 bg-muted/10">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold">Frequently Asked Questions</h2>
          </div>
          <Accordion type="single" collapsible className="w-full">
            {faqs?.map((faq: any, idx: number) => (
              <AccordionItem key={idx} value={`item-${idx}`}>
                <AccordionTrigger className="text-left font-bold py-6 text-lg">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed pb-6">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 border-t">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto space-y-8">
            <h2 className="text-4xl font-bold">Not Sure What You Need? Let's Talk.</h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Tell us about your business and we'll help identify the right digital solution for your goals.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button size="lg" className="px-12 h-14 text-base" asChild>
                <a href="mailto:contact@hasankamrul.com">Book a Consultation</a>
              </Button>
              <Button size="lg" variant="outline" className="px-12 h-14 text-base" asChild>
                <Link to="/projects">View Case Studies</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
