import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/integrations/supabase/client';
import { logActivity } from '@/utils/audit';
import { useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { MediaPicker } from '@/components/admin/media/MediaPicker';
import { RichTextEditor } from '@/components/admin/RichTextEditor';
import { SlugField } from '@/components/admin/SlugField';
import { StringListField } from '@/components/admin/StringListField';
import { GalleryField } from '@/components/admin/GalleryField';
import { Save, X, Plus, Trash2 } from 'lucide-react';
import { useFieldArray } from 'react-hook-form';
import { projectSchema, type ProjectValues } from '@/lib/validations';
import { isSlugConflictError } from '@/lib/slug';
import { useState } from 'react';

export function ProjectForm({ project }: { project?: any }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'error'>('idle');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors, isSubmitting }
  } = useForm<ProjectValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      title: project?.title || '',
      slug: project?.slug || '',
      description: project?.description || '',
      category_id: project?.category_id || '',
      client: project?.client || '',
      industry: project?.industry || '',
      project_url: project?.project_url || '',
      completion_date: project?.completion_date || '',
      status: project?.status || 'draft',
      featured_image: project?.featured_image || '',
      gallery: Array.isArray(project?.gallery) ? project.gallery : [],
      challenge: project?.challenge || '',
      strategy: project?.strategy || '',
      solution: project?.solution || '',
      implementation: project?.implementation || '',
      results: project?.results || '',
      metrics: Array.isArray(project?.metrics) ? project.metrics : [],
      timeline: project?.timeline || '',
      technologies: Array.isArray(project?.technologies) ? project.technologies : [],
      services_provided: Array.isArray(project?.services_provided) ? project.services_provided : [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "metrics"
  });

  const featuredImage = watch('featured_image');
  const categoryId = watch('category_id');
  const status = watch('status');
  const description = watch('description');
  const title = watch('title');
  const slug = watch('slug');
  const gallery = watch('gallery');
  const technologies = watch('technologies');
  const servicesProvided = watch('services_provided');

  const { data: categories } = useQuery({
    queryKey: ['admin-project-categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('project_categories').select('*').order('name');
      if (error) throw error;
      return data;
    }
  });

  const mutation = useMutation({
    mutationFn: async (values: ProjectValues) => {
      const dbValues = {
        title: values.title,
        slug: values.slug,
        description: values.description ?? null,
        category_id: values.category_id,
        client: values.client ?? null,
        industry: values.industry ?? null,
        project_url: values.project_url ?? null,
        completion_date: values.completion_date ?? null,
        status: values.status,
        featured_image: values.featured_image ?? null,
        gallery: values.gallery ?? [],
        challenge: values.challenge ?? null,
        strategy: values.strategy ?? null,
        solution: values.solution ?? null,
        implementation: values.implementation ?? null,
        results: values.results ?? null,
        metrics: values.metrics ?? [],
        timeline: values.timeline ?? null,
        technologies: values.technologies ?? [],
        services_provided: values.services_provided ?? [],
      };

      if (project?.id) {
        const { error } = await supabase
          .from('projects')
          .update(dbValues)
          .eq('id', project.id);
        if (error) throw error;
        await logActivity('projects', 'update_project', { id: project.id, title: values.title });
      } else {
        const { data, error } = await supabase
          .from('projects')
          .insert(dbValues)
          .select()
          .single();
        if (error) throw error;
        await logActivity('projects', 'create_project', { id: data.id, title: values.title });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-projects'] });
      toast.success(`Project ${project?.id ? 'updated' : 'created'} successfully`);
      navigate({ to: '/admin/projects' });
    },
    onError: (error: any) => {
      if (isSlugConflictError(error)) {
        toast.error('A project with that title already exists. Please try again.');
        return;
      }
      toast.error(`Operation failed: ${error.message}`);
    }
  });

  return (
    <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">
          {project?.id ? 'Edit Project' : 'New Project'}
        </h2>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => navigate({ to: '/admin/projects' })}>
            <X className="h-4 w-4 mr-2" /> Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || slugStatus === 'checking' || slugStatus === 'taken'}>
            <Save className="h-4 w-4 mr-2" /> {isSubmitting ? 'Saving...' : 'Save Project'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Project Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Project Title</Label>
                <Input id="title" {...register('title')} />
                {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
              </div>
              <div className="space-y-1">
                <SlugField
                  table="projects"
                  title={title}
                  value={slug || ''}
                  onChange={(v) => setValue('slug', v, { shouldValidate: true, shouldDirty: true })}
                  excludeId={project?.id}
                  onStatusChange={setSlugStatus}
                  basePath="/projects/"
                />
                {errors.slug && <p className="text-xs text-destructive">{errors.slug.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <RichTextEditor
                  value={description ?? ''}
                  onChange={(html) => setValue('description', html, { shouldValidate: true, shouldDirty: true })}
                  placeholder="Describe this project..."
                />
                {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Meta Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="client">Client Name</Label>
                <Input id="client" {...register('client')} />
                {errors.client && <p className="text-xs text-destructive">{errors.client.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Input id="industry" {...register('industry')} placeholder="e.g. Fintech" />
                {errors.industry && <p className="text-xs text-destructive">{errors.industry.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="project_url">Project URL</Label>
                <Input id="project_url" {...register('project_url')} placeholder="https://..." />
                {errors.project_url && <p className="text-xs text-destructive">{errors.project_url.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="completion_date">Completion Date</Label>
                <Input id="completion_date" {...register('completion_date')} type="date" />
                {errors.completion_date && <p className="text-xs text-destructive">{errors.completion_date.message}</p>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Case Study Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="challenge">The Challenge</Label>
                <Textarea id="challenge" {...register('challenge')} placeholder="What problem were we solving?" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="strategy">Strategy & Approach</Label>
                <Textarea id="strategy" {...register('strategy')} placeholder="How did we plan to solve it?" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="solution">Solution</Label>
                <Textarea id="solution" {...register('solution')} placeholder="What did we build to solve it?" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="implementation">Implementation Details</Label>
                <Textarea id="implementation" {...register('implementation')} placeholder="How did we build it?" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="results">Project Results</Label>
                <Textarea id="results" {...register('results')} placeholder="What was the final outcome?" />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <StringListField
                  label="Technologies Used"
                  value={technologies || []}
                  onChange={(v) => setValue('technologies', v)}
                  placeholder="e.g. Next.js"
                />
                <StringListField
                  label="Services Provided"
                  value={servicesProvided || []}
                  onChange={(v) => setValue('services_provided', v)}
                  placeholder="e.g. UI/UX Design"
                />
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Key Metrics</Label>
                  <Button type="button" variant="outline" size="sm" onClick={() => append({ label: '', value: '' })}>
                    <Plus className="h-4 w-4 mr-2" /> Add Metric
                  </Button>
                </div>
                {fields.map((field, index) => (
                  <div key={field.id} className="flex gap-4 items-end">
                    <div className="flex-1 space-y-2">
                      <Label>Label (e.g. Sales Increase)</Label>
                      <Input {...register(`metrics.${index}.label` as const)} />
                    </div>
                    <div className="flex-1 space-y-2">
                      <Label>Value (e.g. +40%)</Label>
                      <Input {...register(`metrics.${index}.value` as const)} />
                    </div>
                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <Label htmlFor="timeline">Project Timeline (Text)</Label>
                <Input id="timeline" {...register('timeline')} placeholder="e.g. 4 Weeks" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Visuals & Organization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Featured Image</Label>
                <MediaPicker value={featuredImage ?? null} onChange={(url) => setValue('featured_image', url)} />
              </div>

              <GalleryField
                label="Gallery"
                value={gallery || []}
                onChange={(v) => setValue('gallery', v)}
              />

              <div className="space-y-2">
                <Label htmlFor="category_id">Category</Label>
                <Select value={categoryId} onValueChange={(v) => setValue('category_id', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category_id && <p className="text-xs text-destructive">{errors.category_id.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={(v) => setValue('status', v as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
