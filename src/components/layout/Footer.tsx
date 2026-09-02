import { Link } from "@tanstack/react-router";
import {
  Briefcase,
  MessageSquare,
  Settings,
  Shield,
  Twitter,
  Linkedin,
  Github,
  Mail,
  MapPin,
  Phone,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Session } from "@supabase/supabase-js";
import { getPublicSiteConfig } from "@/lib/public-site-config.functions";

interface SocialLinks {
  twitter?: string;
  linkedin?: string;
  github?: string;
}

export function Footer() {
  const currentYear = new Date().getFullYear();
  const [session, setSession] = useState<Session | null>(null);
  const fetchSiteConfig = useServerFn(getPublicSiteConfig);

  // Settings > General's Public Email / Contact Phone / Business Address
  // and Settings > Account's Privacy Policy URL - previously saved but
  // never actually shown anywhere, while this footer hardcoded a fixed
  // email/location and pointed "Privacy Policy" at the homepage.
  const { data: siteConfig } = useQuery({
    queryKey: ['public-site-config'],
    queryFn: () => fetchSiteConfig(),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const { data: socialLinks } = useQuery({
    queryKey: ['public-profile-social-links'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('social_links').limit(1).single();
      if (error) throw error;
      return (data?.social_links as SocialLinks) || {};
    },
    staleTime: 5 * 60 * 1000,
  });

  const socialIcons = [
    { icon: <Twitter className="h-5 w-5" />, href: socialLinks?.twitter, label: "Twitter" },
    { icon: <Linkedin className="h-5 w-5" />, href: socialLinks?.linkedin, label: "LinkedIn" },
    { icon: <Github className="h-5 w-5" />, href: socialLinks?.github, label: "GitHub" },
  ].filter((social) => !!social.href);

  return (
    <footer className="bg-card border-t relative overflow-hidden">
      {/* Decorative gradient blur */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="container mx-auto px-4 pt-16 pb-8 relative z-10">
        <div className={`grid grid-cols-1 md:grid-cols-2 ${session ? "lg:grid-cols-3" : "lg:grid-cols-4"} gap-12 mb-16`}>
          {/* Brand Column */}
          <div className="space-y-6">
            <Link to="/" className="text-2xl font-black tracking-tighter">
              HASAN<span className="text-primary">KAMRUL</span>
            </Link>
            <p className="text-muted-foreground leading-relaxed">
              Empowering brands through data-driven marketing strategies and high-performance digital solutions. 
              Let's build something remarkable together.
            </p>
            {socialIcons.length > 0 && (
              <div className="flex items-center gap-4">
                {socialIcons.map((social, i) => (
                  <a
                    key={i}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    className="h-10 w-10 flex items-center justify-center rounded-full bg-muted/50 text-muted-foreground hover:bg-primary hover:text-white transition-all duration-300"
                  >
                    {social.icon}
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div className="space-y-6">
            <h4 className="text-lg font-bold">Quick Links</h4>
            <ul className="space-y-4">
              {[
                { label: "Our Services", to: "/services" },
                { label: "Gig Marketplace", to: "/gigs", search: { page: 1 } },
                { label: "Project Portfolio", to: "/projects" },
                { label: "Partners Directory", to: "/partners" },
                { label: "Insights & Blog", to: "/blog" },
              ].map((link, i) => (
                <li key={i}>
                  <Link 
                    to={link.to as any} 
                    search={link.search as any}
                    className="text-muted-foreground hover:text-primary transition-colors flex items-center group"
                  >
                    <ArrowRightIcon />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div className="space-y-6">
            <h4 className="text-lg font-bold">Get In Touch</h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3 text-muted-foreground">
                <Mail className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <span>{siteConfig?.publicEmail || 'contact@hasankamrul.com'}</span>
              </li>
              {siteConfig?.contactPhone && (
                <li className="flex items-start gap-3 text-muted-foreground">
                  <Phone className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span>{siteConfig.contactPhone}</span>
                </li>
              )}
              <li className="flex items-start gap-3 text-muted-foreground">
                <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <span>
                  {siteConfig?.businessAddress || (
                    <>
                      Available Globally <br /> (GMT+6)
                    </>
                  )}
                </span>
              </li>
              <li>
                <Button size="sm" className="w-full mt-2 font-bold shadow-lg shadow-primary/20" asChild>
                  <Link to="/services/request-quote">Request a Quote</Link>
                </Button>
              </li>
            </ul>
          </div>

          {/* Management / Admin - only shown to signed-out visitors */}
          {!session && (
            <div className="space-y-6">
              <h4 className="text-lg font-bold">Platform Access</h4>
              <ul className="space-y-4">
                <li>
                  <Link
                    to="/admin"
                    className="flex items-center gap-3 p-3 rounded-xl border bg-muted/30 hover:bg-primary/5 hover:border-primary/50 transition-all group"
                  >
                    <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                      <Shield className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="block text-sm font-bold">Admin Portal</span>
                      <span className="block text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Management only</span>
                    </div>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/dashboard"
                    className="flex items-center gap-3 p-3 rounded-xl border bg-muted/30 hover:bg-primary/5 hover:border-primary/50 transition-all group"
                  >
                    <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-blue-500/10 text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                      <Settings className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="block text-sm font-bold">Client Dashboard</span>
                      <span className="block text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Project tracking</span>
                    </div>
                  </Link>
                </li>
              </ul>
            </div>
          )}
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© {currentYear} Hasan Kamrul. All rights reserved.</p>
          <div className="flex items-center gap-8">
            {siteConfig?.privacyPolicyUrl ? (
              <a
                href={siteConfig.privacyPolicyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary transition-colors"
              >
                Privacy Policy
              </a>
            ) : (
              <Link to="/" className="hover:text-primary transition-colors">Privacy Policy</Link>
            )}
            <Link to="/" className="hover:text-primary transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function ArrowRightIcon() {
  return (
    <svg 
      className="mr-2 h-3 w-3 text-primary opacity-0 -ml-5 group-hover:opacity-100 group-hover:ml-0 transition-all duration-300" 
      fill="none" 
      viewBox="0 0 24 24" 
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
    </svg>
  );
}
