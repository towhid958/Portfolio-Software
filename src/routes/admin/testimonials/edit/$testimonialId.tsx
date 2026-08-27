import { createFileRoute, redirect } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { TestimonialForm } from '@/components/admin/TestimonialForm';
import { supabase } from '@/integrations/supabase/client';

export const Route = createFileRoute('/admin/testimonials/edit/$testimonialId')({
  beforeLoad: async ({ context }) => {
    const allowed = context.roles.some((r) => ['super_admin', 'admin', 'editor'].includes(r));
    if (!allowed) {
      throw redirect({ to: '/admin/testimonials' });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { testimonialId } = Route.useParams();
  const { data: testimonial, isLoading } = useQuery({
    queryKey: ['admin-testimonial', testimonialId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('testimonials').select('*').eq('id', testimonialId).single();
      if (error) throw error;
      return data;
    }
  });

  if (isLoading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading testimonial details...</div>;
  if (!testimonial) return <div className="p-8 text-center">Testimonial not found.</div>;

  return <TestimonialForm testimonial={testimonial} />;
}
