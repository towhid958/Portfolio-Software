import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { toast } from 'sonner';
import { MediaPicker } from '@/components/admin/media/MediaPicker';
import { RichTextEditor } from '@/components/admin/RichTextEditor';
import { Save, X, Plus, Trash2 } from 'lucide-react';
import { PackageTierEditor, PackageData } from './PackageTierEditor';
import { SlugField } from '@/components/admin/SlugField';
import { StringListField } from '@/components/admin/StringListField';
import { GalleryField } from '@/components/admin/GalleryField';
import { Switch } from '@/components/ui/switch';
import { isSlugConflictError } from '@/lib/slug';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, RefreshCcw, Check, ArrowRight } from 'lucide-react';

function GigPricingPreview({ packages }: { packages: PackageData[] }) {
  if (packages.length === 0) return null;

  return (
    <Tabs defaultValue={packages[0]?.name || ''} className="w-full">
      <TabsList className="grid w-full grid-cols-3 h-12">
        {packages.map((pkg, idx) => (
          <TabsTrigger key={idx} value={pkg.name} className="text-xs font-bold">
            {pkg.name}
          </TabsTrigger>
        ))}
      </TabsList>
      {packages.map((pkg, idx) => (
        <TabsContent key={idx} value={pkg.name}>
          <Card className="border-t-0 rounded-t-none shadow-xl bg-card">
            <CardHeader className="space-y-1">
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl">${pkg.price}</CardTitle>
              </div>
              <CardDescription className="text-base font-medium text-foreground">
                {pkg.name} Package
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-wrap gap-4 text-sm font-medium">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-muted-foreground" /> {pkg.delivery_time} Delivery
                </div>
                <div className="flex items-center gap-1.5">
                  <RefreshCcw className="h-4 w-4 text-muted-foreground" /> {pkg.revisions} Revisions
                </div>
              </div>
              <ul className="space-y-3">
                {(pkg.features || []).map((feature, fIdx) => (
                  <li key={fIdx} className="flex items-start gap-2.5 text-sm">
                    <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button className="w-full h-12 text-base font-bold group pointer-events-none">
                {pkg.cta_text || 'Select Package'} 
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      ))}
    </Tabs>
  );
}

export function GigForm({ gig }: { gig?: any }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [thumbnail, setThumbnail] = useState(gig?.thumbnail || '');
  const [gallery, setGallery] = useState<string[]>(Array.isArray(gig?.gallery) ? gig.gallery : []);
  const [tags, setTags] = useState<string[]>(Array.isArray(gig?.tags) ? gig.tags : []);
  const [isFeatured, setIsFeatured] = useState(gig?.is_featured ?? false);
  const [fullDescription, setFullDescription] = useState(gig?.full_description || '');
  const [titleInput, setTitleInput] = useState(gig?.title || '');
  const [slug, setSlug] = useState(gig?.slug || '');
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'error'>('idle');
  const [packages, setPackages] = useState<Record<string, PackageData>>({
    'Basic': { name: 'Basic', price: 0, delivery_time: '', revisions: 0, features: [], cta_text: 'Order Now' },
    'Standard': { name: 'Standard', price: 0, delivery_time: '', revisions: 0, features: [], cta_text: 'Order Now' },
    'Premium': { name: 'Premium', price: 0, delivery_time: '', revisions: 0, features: [], cta_text: 'Order Now' }
  });

  const { data: categories } = useQuery({
    queryKey: ['admin-gig-categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('service_categories').select('*').order('name');
      if (error) throw error;
      return data;
    }
  });

  // Fetch packages if editing
  useEffect(() => {
    if (gig?.id) {
      const fetchPackages = async () => {
        const { data, error } = await supabase
          .from('gig_packages')
          .select('*')
          .eq('gig_id', gig.id);
        
        if (data && data.length > 0) {
          const newPackages: Record<string, PackageData> = { ...packages };
          data.forEach(pkg => {
            // Find which tier this package belongs to based on name (or index if we had a tier column)
            // For now we'll match by name or assume order: Basic, Standard, Premium
            const tier = pkg.name.includes('Basic') ? 'Basic' : 
                         pkg.name.includes('Standard') ? 'Standard' : 
                         pkg.name.includes('Premium') ? 'Premium' : null;
            
            if (tier) {
              newPackages[tier] = {
                id: pkg.id,
                name: pkg.name,
                price: pkg.price,
                delivery_time: pkg.delivery_time || '',
                revisions: pkg.revisions || 0,
                features: (pkg.features as string[]) || [],
                cta_text: pkg.cta_text || 'Order Now'
              };
            }
          });
          setPackages(newPackages);
        }
      };
      fetchPackages();
    }
  }, [gig?.id]);

  const mutation = useMutation({
    mutationFn: async ({ gigValues, packageValues }: { gigValues: any, packageValues: PackageData[] }) => {
      let gigId = gig?.id;

      if (gigId) {
        const { error } = await supabase
          .from('gigs')
          .update(gigValues)
          .eq('id', gigId);
        if (error) throw error;
        await logActivity('gigs', 'update_gig', { id: gigId, title: gigValues.title });
      } else {
        const { data, error } = await supabase
          .from('gigs')
          .insert(gigValues)
          .select()
          .single();
        if (error) throw error;
        gigId = data.id;
        await logActivity('gigs', 'create_gig', { id: gigId, title: gigValues.title });
      }

      // Delete packages that are no longer in the list
      const packageIdsToKeep = packageValues.map(p => p.id).filter(Boolean);
      if (gigId && packageIdsToKeep.length > 0) {
        const { error: deleteError } = await supabase
          .from('gig_packages')
          .delete()
          .eq('gig_id', gigId)
          .not('id', 'in', `(${packageIdsToKeep.join(',')})`);
        if (deleteError) throw deleteError;
      } else if (gigId) {
         // If no packages left, delete all for this gig
         const { error: deleteError } = await supabase
          .from('gig_packages')
          .delete()
          .eq('gig_id', gigId);
        if (deleteError) throw deleteError;
      }

      // Upsert packages
      for (const pkg of packageValues) {

        const pkgData = {
          gig_id: gigId,
          name: pkg.name || '',
          price: pkg.price || 0,
          delivery_time: pkg.delivery_time || '',
          revisions: pkg.revisions || 0,
          features: (pkg.features || []) as any,
          cta_text: pkg.cta_text || 'Order Now'
        };


        if (pkg.id) {
          const { error } = await supabase
            .from('gig_packages')
            .update(pkgData)
            .eq('id', pkg.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('gig_packages')
            .insert(pkgData);
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-gigs'] });
      toast.success(`Gig ${gig?.id ? 'updated' : 'created'} successfully`);
      navigate({ to: '/admin/gigs' });
    },
    onError: (error: any) => {
      if (isSlugConflictError(error)) {
        toast.error('A gig with that title already exists. Please try again.');
        return;
      }
      toast.error(`Operation failed: ${error.message}`);
    }
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const title = titleInput;
    const short_description = formData.get('short_description') as string;
    const problem_statement = formData.get('problem_statement') as string;
    const solution = formData.get('solution') as string;
    const requirements = formData.get('requirements') as string;
    const deliverablesStr = formData.get('deliverables') as string;
    const category_id = formData.get('category_id') as string;
    const status = formData.get('status') as string;

    if (slugStatus === 'taken') {
      toast.error('This link is already in use. Please choose a different one.');
      return;
    }

    const gigValues = {
      title: title || '',
      slug: slug || '',
      short_description: short_description || '',
      full_description: fullDescription || '',
      problem_statement: problem_statement || '',
      solution: solution || '',
      requirements: requirements || '',
      deliverables: deliverablesStr ? deliverablesStr.split('\n').filter(l => l.trim()) : [],
      category_id: category_id || null,
      thumbnail: thumbnail || '',
      gallery,
      tags,
      is_featured: isFeatured,
      status: status || 'draft',
    };

    
    // Validation for tiered packages
    const packageList = Object.values(packages).map(pkg => ({
      ...pkg,
      name: String(pkg.name || ''),
      price: Number(pkg.price || 0),
      delivery_time: String(pkg.delivery_time || ''),
      revisions: Number(pkg.revisions || 0),
      features: Array.isArray(pkg.features) ? pkg.features.map(f => String(f || '')) : [],
      cta_text: String(pkg.cta_text || 'Order Now')
    }));
    
    const invalidPackage = packageList.find(pkg => !pkg.name.trim() || pkg.price < 0 || !pkg.delivery_time.trim());
    
    if (invalidPackage) {
      toast.error(`Please complete all fields for the ${invalidPackage.name || 'selected'} package (Name, Price, and Delivery Time are required)`);
      return;
    }

    const hasEmptyPackages = packageList.length === 0;
    if (hasEmptyPackages) {
      toast.error("Please add at least one pricing package (Basic, Standard, or Premium)");
      return;
    }

    mutation.mutate({ 
      gigValues, 
      packageValues: packageList 
    });
  };

  const handlePackageChange = (tier: string, data: PackageData) => {
    setPackages(prev => ({ ...prev, [tier]: data }));
  };

  const handlePackageRemove = (tier: string) => {
    setPackages(prev => {
      const next = { ...prev };
      delete next[tier];
      return next;
    });
  };


  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">
          {gig?.id ? 'Edit Gig' : 'New Gig'}
        </h2>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => navigate({ to: '/admin/gigs' })}>
            <X className="h-4 w-4 mr-2" /> Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending || slugStatus === 'checking' || slugStatus === 'taken'}>
            <Save className="h-4 w-4 mr-2" /> {mutation.isPending ? 'Saving...' : 'Save Gig'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Gig Title</Label>
                <Input
                  id="title"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <SlugField
                  table="gigs"
                  title={titleInput}
                  value={slug}
                  onChange={setSlug}
                  excludeId={gig?.id}
                  onStatusChange={setSlugStatus}
                  basePath="/gigs/"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="short_description">Short Description</Label>
                <Textarea id="short_description" name="short_description" defaultValue={gig?.short_description} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="full_description">Full Description</Label>
                <RichTextEditor
                  value={fullDescription}
                  onChange={setFullDescription}
                  placeholder="Describe this gig in detail..."
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Detailed Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="problem_statement">Problem Statement</Label>
                <Textarea id="problem_statement" name="problem_statement" defaultValue={gig?.problem_statement} placeholder="What problem does this service solve?" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="solution">Solution</Label>
                <Textarea id="solution" name="solution" defaultValue={gig?.solution} placeholder="How does your service solve the problem?" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="requirements">Requirements</Label>
                <Textarea id="requirements" name="requirements" defaultValue={gig?.requirements} placeholder="What do you need from the client to get started?" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deliverables">Deliverables (one per line)</Label>
                <Textarea id="deliverables" name="deliverables" defaultValue={gig?.deliverables?.join('\n')} placeholder="List exactly what the client will receive..." />
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <h3 className="text-xl font-semibold">Pricing Packages</h3>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              <PackageTierEditor packages={packages} onChange={handlePackageChange} onRemove={handlePackageRemove} />
              <div className="space-y-6">
                <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  Live Preview
                </h4>
                <div className="border rounded-2xl p-6 bg-muted/30 flex items-center justify-center min-h-[500px]">
                  <div className="w-full max-w-md">
                    <GigPricingPreview packages={Object.values(packages).sort((a, b) => a.price - b.price)} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Assets & Category</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Thumbnail Image</Label>
                <MediaPicker value={thumbnail} onChange={setThumbnail} />
              </div>
              <GalleryField label="Gallery" value={gallery} onChange={setGallery} />
              <StringListField label="Tags" value={tags} onChange={setTags} placeholder="e.g. SEO" />
              <div className="flex items-center justify-between py-2">
                <Label htmlFor="is_featured">Featured Gig</Label>
                <Switch id="is_featured" checked={isFeatured} onCheckedChange={setIsFeatured} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category_id">Category</Label>
                <Select name="category_id" defaultValue={gig?.category_id || undefined}>
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
                <Label htmlFor="status">Status</Label>
                <Select name="status" defaultValue={gig?.status || 'draft'}>
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
