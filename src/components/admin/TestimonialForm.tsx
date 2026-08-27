import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/integrations/supabase/client';
import { logActivity } from '@/utils/audit';
import { useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Save, X } from 'lucide-react';
import { testimonialSchema, type TestimonialValues } from '@/lib/validations';
import { useSavedState } from '@/hooks/useSavedState';

export function TestimonialForm({ testimonial }: { testimonial?: any }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty }
  } = useForm<TestimonialValues>({
    resolver: zodResolver(testimonialSchema),
    defaultValues: {
      name: testimonial?.name || '',
      role: testimonial?.role || '',
      company: testimonial?.company || '',
      content: testimonial?.content || '',
      rating: testimonial?.rating || 5,
      is_approved: testimonial?.is_approved ?? true,
    },
  });

  const [justSaved, setJustSaved] = useSavedState(isDirty);

  const mutation = useMutation({
    mutationFn: async (values: TestimonialValues) => {
      const dbValues = {
        name: values.name,
        role: values.role ?? null,
        company: values.company ?? null,
        content: values.content,
        rating: values.rating,
        is_approved: values.is_approved ?? true,
      };

      const db = supabase as any;
      if (testimonial?.id) {
        const { error } = await db.from('testimonials')
          .update(dbValues)
          .eq('id', testimonial.id);
        if (error) throw error;
        await logActivity('testimonials', 'update_testimonial', { id: testimonial.id, name: values.name });
      } else {
        const { data, error } = await db.from('testimonials')
          .insert(dbValues)
          .select()
          .single();
        if (error) throw error;
        await logActivity('testimonials', 'create_testimonial', { id: data.id, name: values.name });
      }
    },
    onSuccess: (_data, values) => {
      queryClient.invalidateQueries({ queryKey: ['admin-testimonials'] });
      if (testimonial?.id) {
        queryClient.invalidateQueries({ queryKey: ['admin-testimonial', testimonial.id] });
        toast.success('Testimonial updated successfully');
        reset(values);
        setJustSaved(true);
      } else {
        toast.success('Testimonial created successfully');
        navigate({ to: '/admin/testimonials' });
      }
    },
    onError: (error: any) => {
      toast.error(`Operation failed: ${error.message}`);
    }
  });

  return (
    <form onSubmit={handleSubmit((data: TestimonialValues) => mutation.mutate(data))} className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">
          {testimonial?.id ? 'Edit Testimonial' : 'New Testimonial'}
        </h2>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => navigate({ to: '/admin/testimonials' })}>
            <X className="h-4 w-4 mr-2" /> Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            <Save className="h-4 w-4 mr-2" /> {isSubmitting ? 'Saving...' : justSaved ? 'Saved' : 'Save'}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Client Feedback</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Client Name</Label>
              <Input id="name" {...register('name')} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role / Position</Label>
              <Input id="role" {...register('role')} placeholder="e.g. CEO" />
              {errors.role && <p className="text-xs text-destructive">{errors.role.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input id="company" {...register('company')} />
              {errors.company && <p className="text-xs text-destructive">{errors.company.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="rating">Rating (1-5)</Label>
              <Input id="rating" {...register('rating', { valueAsNumber: true })} type="number" min="1" max="5" />
              {errors.rating && <p className="text-xs text-destructive">{errors.rating.message}</p>}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="content">Testimonial Content</Label>
            <Textarea id="content" {...register('content')} className="min-h-[150px]" />
            {errors.content && <p className="text-xs text-destructive">{errors.content.message}</p>}
          </div>
          <div className="flex items-center space-x-2 pt-2">
            <input 
              type="checkbox" 
              id="is_approved" 
              {...register('is_approved')}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <Label htmlFor="is_approved">Approved for display</Label>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
