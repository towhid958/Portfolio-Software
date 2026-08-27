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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { MediaPicker } from '@/components/admin/media/MediaPicker';
import { Save, X, Plus, Pencil, Trash2, Tag } from 'lucide-react';
import { partnerSchema, type PartnerValues, offerSchema, type OfferValues } from '@/lib/validations';
import { useState } from 'react';

const emptyOfferForm: OfferValues = {
  title: '',
  description: '',
  benefit: '',
  cta_text: 'Claim Offer',
  destination_url: '',
  expiry_date: '',
  is_active: true,
};

function PartnerOffers({ partnerId }: { partnerId: string }) {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOfferId, setEditingOfferId] = useState<string | null>(null);

  const { data: offers, isLoading } = useQuery({
    queryKey: ['admin-partner-offers', partnerId],
    queryFn: async () => {
      const { data, error } = await supabase.from('offers').select('*').eq('partner_id', partnerId).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<OfferValues>({
    resolver: zodResolver(offerSchema),
    defaultValues: emptyOfferForm,
  });

  const isActive = watch('is_active');

  const saveMutation = useMutation({
    mutationFn: async (values: OfferValues) => {
      const dbValues = {
        partner_id: partnerId,
        title: values.title,
        description: values.description || null,
        benefit: values.benefit || null,
        cta_text: values.cta_text || 'Claim Offer',
        destination_url: values.destination_url,
        expiry_date: values.expiry_date || null,
        is_active: values.is_active ?? true,
      };

      if (editingOfferId) {
        const { error } = await supabase.from('offers').update(dbValues).eq('id', editingOfferId);
        if (error) throw error;
        await logActivity('partners', 'update_offer', { id: editingOfferId, title: values.title });
      } else {
        const { data, error } = await supabase.from('offers').insert(dbValues).select().single();
        if (error) throw error;
        await logActivity('partners', 'create_offer', { id: data.id, title: values.title });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-partner-offers', partnerId] });
      queryClient.invalidateQueries({ queryKey: ['admin-partners'] });
      toast.success(editingOfferId ? 'Offer updated' : 'Offer added');
      setIsDialogOpen(false);
    },
    onError: (error: any) => toast.error(error.message || 'Failed to save offer'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('offers').delete().eq('id', id);
      if (error) throw error;
      await logActivity('partners', 'delete_offer', { id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-partner-offers', partnerId] });
      queryClient.invalidateQueries({ queryKey: ['admin-partners'] });
      toast.success('Offer deleted');
    },
    onError: (error: any) => toast.error(error.message || 'Failed to delete offer'),
  });

  const openNewOffer = () => {
    setEditingOfferId(null);
    reset(emptyOfferForm);
    setIsDialogOpen(true);
  };

  const openEditOffer = (offer: any) => {
    setEditingOfferId(offer.id);
    reset({
      title: offer.title || '',
      description: offer.description || '',
      benefit: offer.benefit || '',
      cta_text: offer.cta_text || 'Claim Offer',
      destination_url: offer.destination_url || '',
      expiry_date: offer.expiry_date ? offer.expiry_date.slice(0, 10) : '',
      is_active: offer.is_active ?? true,
    });
    setIsDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <Tag className="h-4 w-4" /> Offers
        </CardTitle>
        <Button type="button" size="sm" onClick={openNewOffer}>
          <Plus className="h-4 w-4 mr-2" /> Add Offer
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading offers...</p>
        ) : offers?.length === 0 ? (
          <p className="text-sm text-muted-foreground">No offers yet for this partner.</p>
        ) : (
          offers?.map((offer) => (
            <div key={offer.id} className="flex items-center justify-between gap-4 border rounded-lg p-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">{offer.title}</p>
                  <Badge variant={offer.is_active ? 'default' : 'secondary'}>
                    {offer.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                {offer.benefit && <p className="text-xs text-muted-foreground">{offer.benefit}</p>}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditOffer(offer)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => {
                    if (confirm('Delete this offer?')) deleteMutation.mutate(offer.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingOfferId ? 'Edit Offer' : 'Add Offer'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="offer-title">Title</Label>
              <Input id="offer-title" {...register('title')} placeholder="e.g. 20% off first project" />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="offer-description">Description</Label>
              <Textarea id="offer-description" {...register('description')} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="offer-benefit">Benefit</Label>
                <Input id="offer-benefit" {...register('benefit')} placeholder="e.g. Save $200" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="offer-cta">Button Text</Label>
                <Input id="offer-cta" {...register('cta_text')} placeholder="Claim Offer" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="offer-url">Destination URL</Label>
              <Input id="offer-url" {...register('destination_url')} placeholder="https://..." />
              {errors.destination_url && <p className="text-xs text-destructive">{errors.destination_url.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4 items-end">
              <div className="space-y-2">
                <Label htmlFor="offer-expiry">Expiry Date</Label>
                <Input id="offer-expiry" type="date" {...register('expiry_date')} />
              </div>
              <div className="flex items-center justify-between py-2">
                <Label htmlFor="offer-active">Active</Label>
                <Switch id="offer-active" checked={isActive ?? true} onCheckedChange={(checked) => setValue('is_active', checked)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button type="button" onClick={handleSubmit((data) => saveMutation.mutate(data))} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : editingOfferId ? 'Save Changes' : 'Add Offer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export function PartnerForm({ partner }: { partner?: any }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { 
    register, 
    handleSubmit, 
    setValue, 
    watch,
    formState: { errors, isSubmitting } 
  } = useForm<PartnerValues>({
    resolver: zodResolver(partnerSchema),
    defaultValues: {
      name: partner?.name || '',
      description: partner?.description || '',
      website_url: partner?.website_url || '',
      partnership_type: partner?.partnership_type || '',
      logo: partner?.logo || '',
    },
  });

  const logo = watch('logo');

  const mutation = useMutation({
    mutationFn: async (values: PartnerValues) => {
      const dbValues = {
        name: values.name,
        description: values.description ?? null,
        website_url: values.website_url ?? null,
        partnership_type: values.partnership_type ?? null,
        logo: values.logo ?? null,
      };

      if (partner?.id) {
        const { error } = await supabase
          .from('partners')
          .update(dbValues)
          .eq('id', partner.id);
        if (error) throw error;
        await logActivity('partners', 'update_partner', { id: partner.id, name: values.name });
      } else {
        const { data, error } = await supabase
          .from('partners')
          .insert(dbValues)
          .select()
          .single();
        if (error) throw error;
        await logActivity('partners', 'create_partner', { id: data.id, name: values.name });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-partners'] });
      toast.success(`Partner ${partner?.id ? 'updated' : 'created'} successfully`);
      navigate({ to: '/admin/partners' });
    },
    onError: (error: any) => {
      toast.error(`Operation failed: ${error.message}`);
    }
  });

  return (
    <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">
          {partner?.id ? 'Edit Partner' : 'New Partner'}
        </h2>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => navigate({ to: '/admin/partners' })}>
            <X className="h-4 w-4 mr-2" /> Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            <Save className="h-4 w-4 mr-2" /> {isSubmitting ? 'Saving...' : 'Save Partner'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Partner Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Partner Name</Label>
                <Input id="name" {...register('name')} />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" {...register('description')} />
                {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="website_url">Website URL</Label>
                  <Input id="website_url" {...register('website_url')} />
                  {errors.website_url && <p className="text-xs text-destructive">{errors.website_url.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="partnership_type">Partnership Type</Label>
                  <Input id="partnership_type" {...register('partnership_type')} placeholder="e.g. Affiliate, Technology" />
                  {errors.partnership_type && <p className="text-xs text-destructive">{errors.partnership_type.message}</p>}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Brand Assets</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Logo</Label>
                <MediaPicker value={logo ?? null} onChange={(url) => setValue('logo', url)} />
                {errors.logo && <p className="text-xs text-destructive">{errors.logo.message}</p>}
              </div>
            </CardContent>
          </Card>

          {partner?.id ? (
            <PartnerOffers partnerId={partner.id} />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="h-4 w-4" /> Offers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Save this partner first to add offers.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </form>
  );
}
