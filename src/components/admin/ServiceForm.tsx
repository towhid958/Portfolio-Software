import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { logActivity } from '@/utils/audit';
import { serviceSchema, type ServiceValues } from '@/lib/validations';
import { isSlugConflictError } from '@/lib/slug';
import { MediaPicker } from '@/components/admin/media/MediaPicker';
import { RichTextEditor } from '@/components/admin/RichTextEditor';
import { SlugField } from '@/components/admin/SlugField';
import { StringListField } from '@/components/admin/StringListField';
import { Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { useSavedState } from '@/hooks/useSavedState';
import { useState } from 'react';

interface ServiceFormProps {
  initialData?: any;
  onSuccess?: () => void;
}

export function ServiceForm({ initialData, onSuccess }: ServiceFormProps) {
  const queryClient = useQueryClient();
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'error'>('idle');
  const form = useForm<any>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      title: initialData?.title || '',
      slug: initialData?.slug || '',
      short_description: initialData?.short_description || '',
      full_description: initialData?.full_description || '',
      starting_price: initialData?.starting_price || 0,
      status: (initialData?.status as any) || 'draft',
      category_id: initialData?.category_id || '',
      hero_image: initialData?.hero_image || '',
      icon_image: initialData?.icon_image || '',
      show_packages: initialData?.show_packages ?? false,
      show_portfolio: initialData?.show_portfolio ?? true,
      show_case_studies: initialData?.show_case_studies ?? true,
      show_testimonials: initialData?.show_testimonials ?? true,
      show_faq: initialData?.show_faq ?? true,
      enable_quote_request: initialData?.enable_quote_request ?? true,
      meta_title: initialData?.meta_title || '',
      meta_description: initialData?.meta_description || '',
      og_image: initialData?.og_image || '',
      features: (initialData?.features as any) || [],
      benefits: (initialData?.benefits as any) || [],
      technologies: (initialData?.technologies as any) || [],
      process: (initialData?.process as any) || [],
      budget_options: (initialData?.budget_options as any) || [],
      timeline_options: (initialData?.timeline_options || []) as any,
      keywords: (initialData?.keywords as any) || [],
      package_ids: (initialData?.package_ids as any) || [],
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    reset,
    formState: { errors, isSubmitting, isDirty }
  } = form;

  const { fields: featureFields, append: appendFeature, remove: removeFeature } = useFieldArray({
    control,
    name: "features"
  });

  const { fields: processFields, append: appendProcess, remove: removeProcess, move: moveProcess } = useFieldArray({
    control,
    name: "process"
  });

  const status = watch('status');
  const category_id = watch('category_id');
  const hero_image = watch('hero_image');
  const icon_image = watch('icon_image');
  const og_image = watch('og_image');
  const show_packages = watch('show_packages');
  const full_description = watch('full_description');
  const title = watch('title');
  const slug = watch('slug');
  const [justSaved, setJustSaved] = useSavedState(isDirty);

  const { data: categories } = useQuery({
    queryKey: ['service-categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('service_categories').select('*');
      if (error) throw error;
      return data;
    },
  });

  const { data: allGigs } = useQuery({
    queryKey: ['admin-gigs-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('gigs').select('id, title').eq('status', 'published');
      if (error) throw error;
      return data;
    }
  });

  const mutation = useMutation({
    mutationFn: async (values: ServiceValues) => {
      const dbValues = {
        title: values.title,
        slug: values.slug,
        short_description: values.short_description ?? null,
        full_description: values.full_description ?? null,
        starting_price: values.starting_price,
        status: values.status,
        category_id: values.category_id,
        hero_image: values.hero_image,
        icon_image: values.icon_image,
        features: values.features as any,
        benefits: values.benefits as any,
        technologies: values.technologies as any,
        process: values.process as any,
        show_packages: values.show_packages,
        show_portfolio: values.show_portfolio,
        show_case_studies: values.show_case_studies,
        show_testimonials: values.show_testimonials,
        show_faq: values.show_faq,
        enable_quote_request: values.enable_quote_request,
        budget_options: values.budget_options as any,
        timeline_options: values.timeline_options as any,
        meta_title: values.meta_title,
        meta_description: values.meta_description,
        og_image: values.og_image,
        keywords: values.keywords as any,
      };

      let serviceId = initialData?.id;

      if (serviceId) {
        const { error } = await supabase
          .from('services')
          .update(dbValues)
          .eq('id', serviceId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('services')
          .insert(dbValues)
          .select()
          .single();
        if (error) throw error;
        serviceId = data.id;
      }

      // Handle package associations
      if (serviceId) {
        // Delete existing links
        await supabase.from('service_packages_link').delete().eq('service_id', serviceId);
        
        // Insert new links if any
        if (values.package_ids && values.package_ids.length > 0) {
          const links = values.package_ids.map((gig_id, idx) => ({
            service_id: serviceId,
            gig_id,
            display_order: idx
          }));
          const { error: linkError } = await supabase.from('service_packages_link').insert(links);
          if (linkError) throw linkError;
        }
      }

      await logActivity('services', initialData?.id ? 'update_service' : 'create_service', { id: serviceId, title: values.title, slug: values.slug });
    },
    onSuccess: (_data, values) => {
      queryClient.invalidateQueries({ queryKey: ['admin-services'] });
      if (initialData?.id) {
        queryClient.invalidateQueries({ queryKey: ['admin-service', initialData.slug] });
        toast.success('Service updated successfully');
        reset(values);
        setJustSaved(true);
      } else {
        toast.success('Service created successfully');
        onSuccess?.();
      }
    },
    onError: (error: any) => {
      if (isSlugConflictError(error)) {
        toast.error('A service with that slug already exists. Please try again.');
        return;
      }
      toast.error(error.message);
    },
  });

  return (
    <form onSubmit={handleSubmit((data: any) => mutation.mutate(data))} className="space-y-6">
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="display">Display Settings</TabsTrigger>
          <TabsTrigger value="content">Content Sections</TabsTrigger>
          <TabsTrigger value="packages">Packages</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Core Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input id="title" {...register('title')} />
                  {errors['title'] && <p className="text-xs text-destructive">{(errors['title'] as any)?.message}</p>}
                </div>
                <div className="space-y-1">
                  <SlugField
                    table="services"
                    title={title}
                    value={slug || ''}
                    onChange={(v) => setValue('slug', v, { shouldValidate: true, shouldDirty: true })}
                    excludeId={initialData?.id}
                    onStatusChange={setSlugStatus}
                    basePath="/services/"
                  />
                  {errors['slug'] && <p className="text-xs text-destructive">{(errors['slug'] as any)?.message}</p>}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="category_id">Category</Label>
                  <Select value={category_id} onValueChange={(v) => setValue('category_id', v, { shouldDirty: true })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="starting_price">Starting Price ($)</Label>
                  <Input id="starting_price" type="number" {...register('starting_price', { valueAsNumber: true })} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={(v) => setValue('status', v as any, { shouldDirty: true })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="short_description">Short Description</Label>
                <Textarea id="short_description" {...register('short_description')} className="h-20" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="full_description">Full Description</Label>
                <RichTextEditor
                  value={full_description}
                  onChange={(html) => setValue('full_description', html, { shouldValidate: true, shouldDirty: true })}
                  placeholder="Describe this service in detail..."
                />
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Hero Banner</CardTitle>
              </CardHeader>
              <CardContent>
                <MediaPicker value={hero_image} onChange={(url) => setValue('hero_image', url, { shouldDirty: true })} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Service Icon</CardTitle>
              </CardHeader>
              <CardContent>
                <MediaPicker value={icon_image} onChange={(url) => setValue('icon_image', url, { shouldDirty: true })} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="display" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Section Visibility</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { id: 'show_packages', label: 'Show Packages' },
                { id: 'show_portfolio', label: 'Show Portfolio' },
                { id: 'show_case_studies', label: 'Show Case Studies' },
                { id: 'show_testimonials', label: 'Show Testimonials' },
                { id: 'show_faq', label: 'Show FAQ' },
                { id: 'enable_quote_request', label: 'Enable Quote Requests' },
              ].map((item) => (
                <div key={item.id} className="flex items-center justify-between py-2">
                  <Label htmlFor={item.id}>{item.label}</Label>
                  <Switch
                    id={item.id}
                    checked={watch(item.id as any)}
                    onCheckedChange={(checked) => setValue(item.id as any, checked, { shouldDirty: true })}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Benefits & Technologies</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <StringListField
                label="Benefits"
                value={watch('benefits') || []}
                onChange={(v) => setValue('benefits', v, { shouldDirty: true })}
                placeholder="e.g. Faster time to market"
              />
              <StringListField
                label="Technologies"
                value={watch('technologies') || []}
                onChange={(v) => setValue('technologies', v, { shouldDirty: true })}
                placeholder="e.g. React"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quote Request Options</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <StringListField
                label="Budget Options"
                value={watch('budget_options') || []}
                onChange={(v) => setValue('budget_options', v, { shouldDirty: true })}
                placeholder="e.g. $5,000 - $10,000"
              />
              <StringListField
                label="Timeline Options"
                value={watch('timeline_options') || []}
                onChange={(v) => setValue('timeline_options', v, { shouldDirty: true })}
                placeholder="e.g. 1-2 months"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Features & Capabilities</CardTitle>
              <Button type="button" size="sm" onClick={() => appendFeature({ title: '', description: '' })}>
                <Plus className="h-4 w-4 mr-2" /> Add
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {featureFields.map((field, index) => (
                <div key={field.id} className="grid gap-4 items-start border p-4 rounded-lg relative">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-2 right-2 text-destructive"
                    onClick={() => removeFeature(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input {...register(`features.${index}.title` as const)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea {...register(`features.${index}.description` as const)} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Service Process</CardTitle>
              <Button type="button" size="sm" onClick={() => appendProcess({ step: `${processFields.length + 1}`, title: '', description: '' })}>
                <Plus className="h-4 w-4 mr-2" /> Add Step
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {processFields.map((field, index) => (
                <div key={field.id} className="grid gap-4 items-start border p-4 rounded-lg relative">
                  <div className="absolute top-2 right-2 flex gap-1">
                    <Button type="button" variant="ghost" size="icon" disabled={index === 0} onClick={() => moveProcess(index, index - 1)}>
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" disabled={index === processFields.length - 1} onClick={() => moveProcess(index, index + 1)}>
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => removeProcess(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="space-y-2">
                      <Label>Step #</Label>
                      <Input {...register(`process.${index}.step` as const)} />
                    </div>
                    <div className="md:col-span-3 space-y-2">
                      <Label>Title</Label>
                      <Input {...register(`process.${index}.title` as const)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea {...register(`process.${index}.description` as const)} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="packages" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Associated Gigs/Packages</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between py-2 border-b">
                <div className="space-y-0.5">
                  <Label>Show Packages on Page</Label>
                  <p className="text-sm text-muted-foreground">If enabled, selected packages will appear below service info.</p>
                </div>
                <Switch
                  checked={show_packages}
                  onCheckedChange={(checked) => setValue('show_packages', checked, { shouldDirty: true })}
                />
              </div>

              {show_packages && (
                <div className="space-y-4">
                  <Label>Select Packages to Display</Label>
                  <div className="grid gap-2">
                    {allGigs?.map((gig) => (
                      <div key={gig.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                        <input 
                          type="checkbox"
                          id={`gig-${gig.id}`}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                          checked={(watch('package_ids') || []).includes(gig.id)}
                            onChange={(e) => {
                            const current = (watch('package_ids') || []) as string[];
                            if (e.target.checked) {
                              setValue('package_ids', [...current, gig.id], { shouldDirty: true });
                            } else {
                              setValue('package_ids', current.filter((id: string) => id !== gig.id), { shouldDirty: true });
                            }
                          }}
                        />
                        <Label htmlFor={`gig-${gig.id}`} className="flex-1 cursor-pointer font-medium">
                          {gig.title}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seo" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Search Engine Optimization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="meta_title">Meta Title</Label>
                <Input id="meta_title" {...register('meta_title')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="meta_description">Meta Description</Label>
                <Textarea id="meta_description" {...register('meta_description')} />
              </div>
              <div className="space-y-2">
                <Label>OG Image</Label>
                <MediaPicker value={og_image} onChange={(url) => setValue('og_image', url, { shouldDirty: true })} />
              </div>
              <StringListField
                label="Keywords"
                value={watch('keywords') || []}
                onChange={(v) => setValue('keywords', v, { shouldDirty: true })}
                placeholder="e.g. web development"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-4 border-t pt-6">
        <Button type="submit" size="lg" disabled={isSubmitting || slugStatus === 'checking' || slugStatus === 'taken'} className="px-8">
          {isSubmitting ? 'Saving...' : justSaved ? 'Service Saved' : initialData?.id ? 'Update Service' : 'Create Service'}
        </Button>
      </div>
    </form>
  );
}
