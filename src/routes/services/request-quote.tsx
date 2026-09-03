import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';
import { QuoteRequestForm } from '@/components/services/QuoteRequestForm';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { z } from 'zod';

const quoteSearchSchema = z.object({
  serviceId: z.string().uuid().optional(),
});

export const Route = createFileRoute('/services/request-quote')({
  component: RequestQuotePage,
  validateSearch: (search) => quoteSearchSchema.parse(search),
});

function RequestQuotePage() {
  const search = Route.useSearch();
  const serviceId = (search as any).serviceId;

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
    <div className="min-h-screen bg-muted/30 py-20 px-4">
      <div className="container max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <Badge variant="outline" className="mb-4">Consultation</Badge>
          <h1 className="text-4xl font-bold mb-4">Start Your Next Project</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Tell us about your needs and vision. We'll review your requirements and provide a detailed proposal and quote.
          </p>
        </div>

        {serviceId && isLoading ? (
          <Skeleton className="h-[600px] w-full max-w-2xl mx-auto rounded-2xl" />
        ) : (
          <QuoteRequestForm
            serviceId={serviceId}
            serviceTitle={service?.title || 'Custom Service'}
          />
        )}
      </div>
    </div>
  );
}
