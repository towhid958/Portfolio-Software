import { Link } from '@tanstack/react-router';
import { Twitter, Linkedin, Github, LayoutDashboard, Send, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { getPublicSiteConfig } from '@/lib/public-site-config.functions';
import { useSession } from '@/hooks/useSession';

interface SocialLinks {
  twitter?: string;
  linkedin?: string;
  github?: string;
}

export function Footer() {
  const currentYear = new Date().getFullYear();
  const { session } = useSession();
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

  const { data: socialLinks } = useQuery({
    queryKey: ['public-profile-social-links'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('social_links')
        .limit(1)
        .single();
      if (error) throw error;
      return (data?.social_links as SocialLinks) || {};
    },
    staleTime: 5 * 60 * 1000,
  });

  const socialIcons = [
    { icon: Twitter, href: socialLinks?.twitter, label: 'Twitter' },
    { icon: Linkedin, href: socialLinks?.linkedin, label: 'LinkedIn' },
    { icon: Github, href: socialLinks?.github, label: 'GitHub' },
  ].filter((social): social is { icon: typeof Twitter; href: string; label: string } =>
    Boolean(social.href),
  );

  // Services and Gigs are rendered separately above these - /gigs needs a
  // search param, so it cannot share the plain-link loop.
  const quickLinks = [
    { label: 'Project Portfolio', to: '/projects' as const },
    { label: 'Partners Directory', to: '/partners' as const },
    { label: 'Insights & Blog', to: '/blog' as const },
  ];

  return (
    <footer className="w-full border-t border-royal-gold/25 bg-royal-navy font-sans-body text-slate-300">
      <div className="mx-auto max-w-[1280px] px-6 py-16 lg:px-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-12 lg:gap-10">
          {/* Brand */}
          <div className="space-y-4 lg:col-span-4">
            <Link to="/" className="flex items-center gap-2">
              <span className="text-xl font-extrabold tracking-tight text-white">HASAN KAMRUL</span>
              <span className="h-2 w-2 rounded-full bg-royal-gold shadow-[0_0_8px_rgba(212,175,55,0.7)]" />
            </Link>
            <p className="max-w-sm text-sm leading-relaxed text-slate-400">
              Empowering brands through data-driven marketing strategies and high-performance
              digital solutions.
            </p>
            <div className="inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="font-mono-code text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                Available for Select Engagements
              </span>
            </div>
            {socialIcons.length > 0 && (
              <div className="flex items-center gap-3 pt-1">
                {socialIcons.map((social) => {
                  const Icon = social.icon;
                  return (
                    <a
                      key={social.label}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={social.label}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-400 transition-all hover:border-royal-gold/50 hover:bg-white/10 hover:text-royal-gold-light"
                    >
                      <Icon className="h-4 w-4" />
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          {/* Platform navigation */}
          <div className="space-y-3 lg:col-span-2">
            <div className="font-mono-code text-[11px] font-bold uppercase tracking-wider text-royal-gold-light">
              Platform Navigation
            </div>
            <ul className="space-y-2 text-xs">
              <li>
                <Link
                  to="/services"
                  className="text-slate-400 transition-colors hover:text-royal-gold-light"
                >
                  Our Services
                </Link>
              </li>
              <li>
                <Link
                  to="/gigs"
                  search={{ page: 1 }}
                  className="text-slate-400 transition-colors hover:text-royal-gold-light"
                >
                  Gig Marketplace
                </Link>
              </li>
              {quickLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.to}
                    className="text-slate-400 transition-colors hover:text-royal-gold-light"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className={`space-y-3 ${session ? 'lg:col-span-6' : 'lg:col-span-3'}`}>
            <div className="font-mono-code text-[11px] font-bold uppercase tracking-wider text-royal-gold-light">
              Get In Touch
            </div>
            <p className="font-mono-code text-xs font-medium text-slate-200">
              {siteConfig?.publicEmail || 'contact@hasankamrul.com'}
            </p>
            {siteConfig?.contactPhone && (
              <p className="font-mono-code text-xs text-slate-200">{siteConfig.contactPhone}</p>
            )}
            <p className="text-xs text-slate-400">
              {siteConfig?.businessAddress || 'Available Globally (GMT+6 Standard Time)'}
            </p>
            <div className="pt-2">
              <Link
                to="/services/request-quote"
                className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:border-royal-gold/50 hover:bg-white/10"
              >
                <Send className="h-4 w-4 text-royal-gold" />
                Request a Quote
              </Link>
            </div>
          </div>

          {/* Platform portals - only shown to signed-out visitors */}
          {!session && (
            <div className="space-y-3 lg:col-span-3">
              <div className="font-mono-code text-[11px] font-bold uppercase tracking-wider text-royal-gold-light">
                Platform Portals
              </div>
              <div className="space-y-2">
                <Link
                  to="/admin"
                  className="group flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 p-3 shadow-sm transition-colors hover:border-royal-gold/40"
                >
                  <span className="flex items-center gap-2">
                    <Shield className="h-[18px] w-[18px] text-slate-400 transition-colors group-hover:text-royal-gold-light" />
                    <span className="text-xs font-semibold text-slate-200">Admin Portal</span>
                  </span>
                  <span className="rounded border border-white/10 bg-white/10 px-2 py-0.5 font-mono-code text-[10px] text-slate-300">
                    Management Only
                  </span>
                </Link>
                <Link
                  to="/dashboard"
                  className="group flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 p-3 shadow-sm transition-colors hover:border-royal-gold/40"
                >
                  <span className="flex items-center gap-2">
                    <LayoutDashboard className="h-[18px] w-[18px] text-slate-400 transition-colors group-hover:text-sky-400" />
                    <span className="text-xs font-semibold text-slate-200">Client Dashboard</span>
                  </span>
                  <span className="rounded border border-blue-800 bg-blue-950 px-2 py-0.5 font-mono-code text-[10px] text-sky-300">
                    Live Tracking
                  </span>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 text-xs text-slate-500 md:flex-row">
          <div>
            © {currentYear} Hasan Kamrul. All rights reserved. Technical Architecture &amp; Growth.
          </div>
          <div className="flex items-center gap-6">
            {siteConfig?.privacyPolicyUrl ? (
              <a
                href={siteConfig.privacyPolicyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-slate-300"
              >
                Privacy Policy
              </a>
            ) : (
              <Link to="/" className="transition-colors hover:text-slate-300">
                Privacy Policy
              </Link>
            )}
            <Link to="/" className="transition-colors hover:text-slate-300">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
