import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, ArrowUp, ArrowDown, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface PackageData {
  id?: string;
  name: string;
  price: number;
  delivery_time: string;
  revisions: number;
  features: string[];
  cta_text: string;
}

interface PackageTierEditorProps {
  packages: Record<string, PackageData>;
  onChange: (tier: string, data: PackageData) => void;
  onRemove: (tier: string) => void;
}


const emptyPackage = (tier: string): PackageData => ({
  name: tier,
  price: 0,
  delivery_time: '',
  revisions: 0,
  features: [],
  cta_text: 'Order Now',
});


export function PackageTierEditor({ packages, onChange, onRemove }: PackageTierEditorProps) {
  const [tierToDelete, setTierToDelete] = React.useState<string | null>(null);

  const getPkg = (tier: string): PackageData => {
    const pkg = packages[tier];
    const base = emptyPackage(tier);
    if (!pkg) return base;
    
    const p = pkg as any;
    return {
      ...base,
      ...pkg,
      name: String(p['name'] || tier),
      delivery_time: String(p['delivery_time'] || ''),
      cta_text: String(p['cta_text'] || 'Order Now'),
      features: Array.isArray(p['features']) ? p['features'].map((f: any) => String(f || '')) : [],
      price: typeof p['price'] === 'number' ? p['price'] : parseFloat(String(p['price'])) || 0,
      revisions: typeof p['revisions'] === 'number' ? p['revisions'] : parseInt(String(p['revisions'])) || 0
    };
  };


  const getErrors = (tier: string) => {
    const pkg = getPkg(tier) as any;
    const errors: { price?: string; delivery_time?: string; revisions?: string; features?: string } = {};

    if (pkg['price'] < 0) errors.price = 'Price cannot be negative';
    if (!String(pkg['delivery_time'] || '').trim()) errors.delivery_time = 'Delivery time is required';
    if (pkg['revisions'] < 0) errors.revisions = 'Revisions cannot be negative';
    if (!pkg['features'] || pkg['features'].length === 0) errors.features = 'At least one feature is required';
    if (pkg['features'] && pkg['features'].some((f: any) => !String(f || '').trim())) errors.features = 'Features cannot be empty';

    return errors;
  };

  const handleFeatureChange = (tier: string, index: number, value: string) => {
    const pkg = getPkg(tier);
    const newFeatures = [...pkg.features];
    newFeatures[index] = value;
    onChange(tier, { ...pkg, features: newFeatures });
  };

  const addFeature = (tier: string) => {
    const pkg = getPkg(tier);
    onChange(tier, { ...pkg, features: [...pkg.features, ''] });
  };

  const removeFeature = (tier: string, index: number) => {
    const pkg = getPkg(tier);
    const newFeatures = pkg.features.filter((_, i) => i !== index);
    onChange(tier, { ...pkg, features: newFeatures });
  };

  const moveFeature = (tier: string, index: number, direction: 'up' | 'down') => {
    const pkg = getPkg(tier);
    const newFeatures = [...pkg.features];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex >= 0 && targetIndex < newFeatures.length) {
      [newFeatures[index], newFeatures[targetIndex]] = [newFeatures[targetIndex] ?? '', newFeatures[index] ?? ''];
      onChange(tier, { ...pkg, features: newFeatures });
    }
  };

  const removeTier = (tier: string) => {
    setTierToDelete(tier);
  };

  const confirmDelete = () => {
    if (tierToDelete) {
      onRemove(tierToDelete);
      setTierToDelete(null);
    }
  };


  const ErrorMessage = ({ message }: { message?: string | undefined }) => {
    if (!message) return null;
    return (
      <p className="text-xs font-medium text-destructive flex items-center gap-1 mt-1">
        <AlertCircle className="h-3 w-3" />
        {message}
      </p>
    );
  };

  return (
    <div className="space-y-6">
      <AlertDialog open={!!tierToDelete} onOpenChange={(open) => !open && setTierToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the <strong>{tierToDelete}</strong> pricing tier from this gig. 
              If you have already saved this gig, the package will be permanently deleted from the database upon clicking "Save Gig".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove Tier
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {Object.keys(packages).sort((a, b) => {
        const order = ['Basic', 'Standard', 'Premium'];
        return order.indexOf(a) - order.indexOf(b);
      }).map((tier) => (
        <Card key={tier} className="relative group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>{tier} Package</CardTitle>
            <Button 
              type="button" 
              variant="ghost" 
              size="icon" 
              onClick={() => removeTier(tier)}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:bg-destructive/10"
              title="Delete this pricing tier"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {!packages[tier] ? (
              <div className="py-6 flex flex-col items-center justify-center text-center space-y-2 border-2 border-dashed rounded-lg">
                <AlertCircle className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium text-muted-foreground">This tier is currently empty or has been removed.</p>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => onChange(tier, emptyPackage(tier))}
                >
                  <Plus className="h-4 w-4 mr-1" /> Restore {tier} Tier
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Package Name</Label>
                  <Input 
                    value={(getPkg(tier) as any)['name'] || ''} 
                    onChange={(e) => onChange(tier, { ...getPkg(tier), name: e.target.value || '' })}
                    placeholder="e.g. Bronze, Silver, Gold"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className={cn(getErrors(tier).price && "text-destructive")}>Price ($)</Label>
                  <Input 
                    type="number"
                    value={(getPkg(tier) as any)['price'] || 0} 
                    onChange={(e) => onChange(tier, { ...getPkg(tier), price: parseFloat(e.target.value) || 0 })}
                    className={cn(getErrors(tier).price && "border-destructive focus-visible:ring-destructive")}
                  />
                  <ErrorMessage message={getErrors(tier).price} />
                </div>

                <div className="space-y-2">
                  <Label className={cn(getErrors(tier).delivery_time && "text-destructive")}>Delivery Time</Label>
                  <Input 
                    value={(getPkg(tier) as any)['delivery_time'] || ''} 
                    onChange={(e) => onChange(tier, { ...getPkg(tier), delivery_time: e.target.value })}
                    placeholder="e.g. 3 Days Delivery"
                    className={cn(getErrors(tier).delivery_time && "border-destructive focus-visible:ring-destructive")}
                  />
                  <ErrorMessage message={getErrors(tier).delivery_time} />
                </div>

                <div className="space-y-2">
                  <Label className={cn(getErrors(tier).revisions && "text-destructive")}>Revisions</Label>
                  <Input 
                    type="number"
                    value={(getPkg(tier) as any)['revisions'] || 0} 
                    onChange={(e) => onChange(tier, { ...getPkg(tier), revisions: parseInt(e.target.value) || 0 })}
                    className={cn(getErrors(tier).revisions && "border-destructive focus-visible:ring-destructive")}
                  />
                  <ErrorMessage message={getErrors(tier).revisions} />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className={cn(getErrors(tier).features && "text-destructive")}>Features</Label>
                    <Button type="button" variant="ghost" size="sm" onClick={() => addFeature(tier)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {((getPkg(tier) as any)['features'] as string[] || []).map((feature, index) => (
                      <div key={index} className="flex flex-col gap-1">
                        <div className="flex gap-2">
                          <Input 
                            value={feature} 
                            onChange={(e) => handleFeatureChange(tier, index, e.target.value)}
                            placeholder="Include source code..."
                            className={cn(!feature.trim() && getErrors(tier).features && "border-destructive focus-visible:ring-destructive")}
                          />
                          <div className="flex gap-1 shrink-0">
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="icon" 
                              className="h-9 w-9"
                              onClick={() => moveFeature(tier, index, 'up')}
                              disabled={index === 0}
                            >
                              <ArrowUp className="h-4 w-4" />
                            </Button>
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="icon" 
                              className="h-9 w-9"
                              onClick={() => moveFeature(tier, index, 'down')}
                              disabled={index === ((getPkg(tier) as any)['features'] as string[] || []).length - 1}
                            >
                              <ArrowDown className="h-4 w-4" />
                            </Button>
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="icon" 
                              className="h-9 w-9"
                              onClick={() => removeFeature(tier, index)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                    <ErrorMessage message={getErrors(tier).features} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>CTA Text</Label>
                  <Input 
                    value={(getPkg(tier) as any)['cta_text'] || ''} 
                    onChange={(e) => onChange(tier, { ...getPkg(tier), cta_text: e.target.value })}
                    placeholder="e.g. Order Now"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
