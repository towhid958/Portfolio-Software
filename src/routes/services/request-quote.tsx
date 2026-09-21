import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import { supabase } from '@/integrations/supabase/client';
import { QuoteRequestForm } from '@/components/services/QuoteRequestForm';
import { PageHero } from '@/components/shared/PageHero';
import { CardSkeleton } from '@/components/shared/ListingChrome';

const quoteSearchSchema = z.object({
  serviceId: z.string().uuid().optional(),
});

export const Route = createFileRoute('/services/request-quote')({
  component: RequestQuotePage,
  validateSearch: (search) => quoteSearchSchema.parse(search),
});

function RequestQuotePage() {
  // useSearch is already typed by the zod schema above - the previous
  // `(search as any).serviceId` threw that away.
  const { serviceId } = Route.useSearch();

  const { data: service, isLoading } = useQuery({
    queryKey: ['service-basic', serviceId],
    queryFn: async () => {
      if (!serviceId) return null;
      const { data, error } = await supabase
        .from('services')
        .select('id, title, starting_price, icon_image')
        .eq('id', serviceId)
        .single();

      if (error) return null;
      return data;
    },
    enabled: !!serviceId,
  });

  return (
    <div className="flex w-full flex-col bg-royal-canvas font-sans-body text-royal-ink">
      <PageHero
        eyebrow="Consultation"
        title="Start Your Next Project"
        description="Tell me about your needs and vision. I'll review your requirements and come back with a detailed proposal and quote."
      />

      <section className="w-full bg-royal-canvas-alt py-16">
        <div className="mx-auto max-w-3xl px-6">
          {service && (
            <div className="mb-8 flex items-center gap-4 rounded-3xl border border-royal-deep/12 bg-white p-5 shadow-sm">
              {service.icon_image && (
                <img
                  src={service.icon_image}
                  alt=""
                  className="h-12 w-12 shrink-0 rounded-2xl border border-royal-deep/10 object-cover"
                />
              )}
              <div>
                <p className="font-mono-code text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Quoting for
                </p>
                <p className="font-sans-body font-bold text-royal-ink">{service.title}</p>
              </div>
              {(service.starting_price ?? 0) > 0 && (
                <span className="ml-auto text-right">
                  <span className="block font-mono-code text-[10px] uppercase tracking-wider text-slate-500">
                    From
                  </span>
                  <span className="font-sans-body text-lg font-extrabold text-royal-deep">
                    ${service.starting_price}
                  </span>
                </span>
              )}
            </div>
          )}

          {serviceId && isLoading ? (
            <CardSkeleton className="h-[600px] w-full" />
          ) : (
            <QuoteRequestForm
              serviceId={serviceId}
              serviceTitle={service?.title || 'Custom Service'}
            />
          )}
        </div>
      </section>
    </div>
  );
}
