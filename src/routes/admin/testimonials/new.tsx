import { createFileRoute } from '@tanstack/react-router';
import { TestimonialForm } from '@/components/admin/TestimonialForm';

export const Route = createFileRoute('/admin/testimonials/new')({
  component: () => <TestimonialForm />,
});
