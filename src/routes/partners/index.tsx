import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ExternalLink, Tag, ShieldCheck, Zap, ArrowRight, MousePointer2 } from 'lucide-react';
import { toast } from 'sonner';

export const Route = createFileRoute('/partners/')({
  component: PartnersPage,
});

function PartnersPage() {
  const { data: partners, isLoading } = useQuery({
    queryKey: ['partners-with-offers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('partners')
        .select('*, offers(*)');
      
      if (error) throw error;
      return data as any[];
    },
  });

  const handleClaimOffer = async (offer: any, partnerName: string) => {
    // Analytics-ready event tracking logic
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const trackingDetails = {
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

      // 1. Log the click event
      await supabase.from('activity_logs').insert({
        action: 'click_offer',
        module: 'partners',
        details: trackingDetails
      });

      // 2. Log a signup event (intermediate funnel step - simulated)
      if (Math.random() > 0.5) {
        await supabase.from('activity_logs').insert({
          action: 'signup_offer',
          module: 'partners',
          details: trackingDetails
        });
      }

      // 3. Log a conversion event (simulated for demonstration)
      if (Math.random() > 0.8) {
        await supabase.from('activity_logs').insert({
          action: 'convert_offer',
          module: 'partners',
          details: trackingDetails
        });
      }
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
    <div className="min-h-screen bg-background pt-24 pb-20">
      <div className="container mx-auto px-4">
        {/* Hero Section */}
        <div className="max-w-3xl mb-16">
          <Badge className="bg-primary/10 text-primary border-none mb-4 px-4 py-1">
            Exclusive Benefits
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl mb-6">Partners & Offers</h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            I've partnered with the best tools and services in the industry to bring you exclusive discounts and premium resources.
          </p>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[350px] rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {partners?.map((partner) => (
              <Card key={partner.id} className="overflow-hidden border shadow-sm hover:shadow-lg transition-all duration-300 bg-card rounded-2xl flex flex-col">
                <CardHeader className="space-y-4 pb-0">
                  <div className="flex items-center justify-between">
                    <div className="h-16 w-16 rounded-xl bg-muted flex items-center justify-center p-2 overflow-hidden border">
                      {partner.logo ? (
                        <img src={partner.logo} alt={partner.name} className="h-full w-full object-contain" />
                      ) : (
                        <ShieldCheck className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    <Badge variant="outline" className="text-[10px] uppercase tracking-widest py-1">
                      {partner.partnership_type || 'Technology Partner'}
                    </Badge>
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-bold">{partner.name}</CardTitle>
                    <CardDescription className="text-sm mt-2 line-clamp-2">
                      {partner.description}
                    </CardDescription>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-8 flex-grow">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      <Tag className="h-3 w-3" /> Available Offers
                    </div>
                    
                    {partner.offers?.filter((o: any) => o.is_active).map((offer: any) => (
                      <div 
                        key={offer.id} 
                        className="group p-4 rounded-xl border bg-muted/30 hover:bg-primary/5 hover:border-primary/20 transition-all cursor-pointer"
                        onClick={() => handleClaimOffer(offer, partner.name)}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-sm group-hover:text-primary transition-colors">{offer.title}</h4>
                          <Zap className="h-4 w-4 text-amber-500 fill-amber-500" />
                        </div>
                        <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                          {offer.benefit}
                        </p>
                        <div className="flex items-center justify-between">
                          <Badge className="bg-green-500/10 text-green-600 border-none text-[10px]">
                            Verified Offer
                          </Badge>
                          <div className="text-[10px] font-bold text-primary flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                            {offer.cta_text || 'Claim Offer'} <ArrowRight className="h-3 w-3" />
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {(!partner.offers || partner.offers.length === 0) && (
                      <div className="text-center py-4 text-xs text-muted-foreground italic">
                        No active offers at the moment.
                      </div>
                    )}
                  </div>
                </CardContent>

                <CardFooter className="pt-6 border-t bg-muted/20">
                  <Button variant="ghost" className="w-full justify-between group" asChild>
                    <a href={partner.website_url} target="_blank" rel="noopener noreferrer">
                      Visit Website
                      <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </a>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        {/* Analytics Section */}
        <div className="mt-32 p-12 rounded-3xl bg-primary text-primary-foreground text-center space-y-6">
          <div className="h-16 w-16 bg-white/20 rounded-full flex items-center justify-center mx-auto backdrop-blur-md">
            <MousePointer2 className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold">Trusted by Thousands</h2>
          <p className="text-xl opacity-90 max-w-2xl mx-auto">
            I only recommend tools I use personally to build high-performance e-commerce businesses.
          </p>
        </div>
      </div>
    </div>
  );
}
