import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, ExternalLink, ShieldCheck, Tag, Zap } from 'lucide-react';
import { toast } from 'sonner';

import { supabase } from '@/integrations/supabase/client';
import type { OfferClickDetails } from '@/lib/offer-tracking';
import { Reveal } from '@/components/motion/Reveal';
import { PageHero } from '@/components/shared/PageHero';
import { CtaBanner, DefaultCtaActions } from '@/components/shared/CtaBanner';
import { CardSkeleton, EmptyState } from '@/components/shared/ListingChrome';

export const Route = createFileRoute('/partners/')({
  component: PartnersPage,
});

type Offer = {
  id: string;
  title: string;
  benefit: string | null;
  cta_text: string | null;
  destination_url: string;
  is_active: boolean | null;
};

function PartnersPage() {
  const { data: partners, isLoading } = useQuery({
    queryKey: ['partners-with-offers'],
    queryFn: async () => {
      const { data, error } = await supabase.from('partners').select('*, offers(*)');

      if (error) throw error;
      return data;
    },
  });

  const handleClaimOffer = async (offer: Offer, partnerName: string) => {
    // Analytics-ready event tracking logic
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const trackingDetails: OfferClickDetails = {
        offer_id: offer.id,
        offer_title: offer.title,
        partner_name: partnerName,
        destination: offer.destination_url,
        timestamp: new Date().toISOString(),
        referrer: document.referrer || 'direct',
        utm_source: urlParams.get('utm_source'),
        utm_medium: urlParams.get('utm_medium'),
        utm_campaign: urlParams.get('utm_campaign'),
        utm_term: urlParams.get('utm_term'),
        utm_content: urlParams.get('utm_content'),
      };

      // Log the click - the one real, honest signal this app can actually
      // observe. There used to be simulated signup_offer/convert_offer
      // events here too (Math.random() coin-flips), which Partner
      // Analytics then charted as if they were real conversion data.
      // Genuinely tracking a signup/conversion after a visitor leaves for
      // an external partner's site would need a real integration (a
      // postback URL, tracking pixel, or affiliate API) that doesn't
      // exist here - there's no dormant/unused mechanism to wire this up
      // to, so it's removed rather than left faked. See Partner Analytics
      // for how the dependent widgets were adjusted.
      await supabase.from('activity_logs').insert({
        action: 'click_offer',
        module: 'partners',
        details: trackingDetails,
      });
    } catch (err) {
      console.error('Failed to log offer interaction:', err);
    }

    toast.success(`Redirecting to ${partnerName}...`, {
      description: `Claiming: ${offer.title}`,
    });

    // Small delay to ensure analytics can fire
    setTimeout(() => {
      window.open(offer.destination_url, '_blank', 'noopener,noreferrer');
    }, 150);
  };

  return (
    <div className="flex w-full flex-col bg-royal-canvas font-sans-body text-royal-ink">
      <PageHero
        eyebrow="Exclusive Benefits"
        title="Partners & Offers"
        description="I've partnered with the best tools and services in the industry to bring you exclusive discounts and premium resources."
      />

      <section className="w-full bg-royal-canvas-alt py-20">
        <div className="mx-auto max-w-[1280px] px-6 lg:px-12">
          {isLoading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }, (_, i) => (
                <CardSkeleton key={i} className="h-[420px]" />
              ))}
            </div>
          ) : !partners || partners.length === 0 ? (
            <EmptyState
              title="No partners listed yet"
              description="Partner offers will appear here once they're published."
              icon={<ShieldCheck className="h-6 w-6" />}
            />
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {partners.map((partner, idx) => {
                const offers = ((partner.offers ?? []) as Offer[]).filter((o) => o.is_active);
                return (
                  <Reveal
                    key={partner.id}
                    delay={(idx % 3) * 90}
                    className="group flex flex-col overflow-hidden rounded-3xl border border-royal-deep/12 bg-white shadow-sm transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1.5 hover:border-royal-gold hover:shadow-[0_16px_36px_rgba(12,27,51,0.08)]"
                  >
                    <div className="space-y-4 p-7 pb-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-royal-deep/10 bg-royal-deep/5 p-2">
                          {partner.logo ? (
                            <img
                              src={partner.logo}
                              alt={partner.name}
                              className="h-full w-full object-contain"
                            />
                          ) : (
                            <ShieldCheck className="h-7 w-7 text-royal-deep" />
                          )}
                        </div>
                        <span className="rounded-full border border-royal-deep/15 bg-royal-deep/5 px-3 py-1 font-mono-code text-[10px] font-bold uppercase tracking-wider text-royal-deep">
                          {partner.partnership_type || 'Technology Partner'}
                        </span>
                      </div>
                      <div>
                        <h2 className="font-sans-body text-xl font-bold text-royal-ink transition-colors duration-300 group-hover:text-royal-sapphire">
                          {partner.name}
                        </h2>
                        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-600">
                          {partner.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex-1 space-y-3 p-7">
                      <div className="flex items-center gap-2 font-mono-code text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        <Tag className="h-3 w-3" /> Available Offers
                      </div>

                      {offers.map((offer) => (
                        <button
                          key={offer.id}
                          type="button"
                          onClick={() => handleClaimOffer(offer, partner.name)}
                          className="group/offer w-full rounded-2xl border border-royal-deep/12 bg-royal-canvas-alt p-4 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-royal-gold/50 hover:bg-white hover:shadow-md"
                        >
                          <div className="mb-2 flex items-start justify-between gap-2">
                            <h3 className="text-sm font-bold text-royal-ink transition-colors duration-300 group-hover/offer:text-royal-sapphire">
                              {offer.title}
                            </h3>
                            <Zap className="h-4 w-4 shrink-0 fill-royal-gold text-royal-gold" />
                          </div>
                          <p className="mb-3 text-xs leading-relaxed text-slate-600">
                            {offer.benefit}
                          </p>
                          <div className="flex items-center justify-between gap-2">
                            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 font-mono-code text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                              Verified Offer
                            </span>
                            <span className="inline-flex items-center gap-1 font-mono-code text-[10px] font-bold uppercase tracking-wider text-royal-deep transition-transform duration-300 group-hover/offer:translate-x-1">
                              {offer.cta_text || 'Claim Offer'}
                              <ArrowRight className="h-3 w-3" />
                            </span>
                          </div>
                        </button>
                      ))}

                      {offers.length === 0 && (
                        <p className="py-4 text-center text-xs italic text-slate-500">
                          No active offers at the moment.
                        </p>
                      )}
                    </div>

                    {partner.website_url && (
                      <a
                        href={partner.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between border-t border-slate-100 px-7 py-5 text-xs font-bold uppercase tracking-wider text-royal-deep transition-colors duration-300 hover:bg-royal-canvas-alt hover:text-royal-gold-deep"
                      >
                        Visit Website
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </Reveal>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* The previous banner here claimed "Trusted by Thousands" with nothing
          behind it. The honest version of that message is the sentence that
          was already underneath it. */}
      <CtaBanner
        eyebrow="Why These Tools"
        title="Only tools I actually use"
        description="Every partner listed here is something I run in real client work. If you want the stack assembled and configured for you rather than picked à la carte, that's what I do."
        actions={<DefaultCtaActions />}
      />
    </div>
  );
}
