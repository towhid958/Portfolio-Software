import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Save, Plus, Trash2, Settings, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  discount: number;
  total: number;
}

export function InvoiceBrandingSettings() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useQuery({
    queryKey: ['invoice-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('invoice_settings').select('*').single();
      if (error) throw error;
      return data;
    }
  });

  const mutation = useMutation({
    mutationFn: async (updatedSettings: any) => {
      const { error } = await supabase
        .from('invoice_settings')
        .update(updatedSettings)
        .eq('id', settings?.id || '');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice-settings'] });
      toast.success('Invoice settings updated');
    },
    onError: (err: any) => toast.error('Failed to update: ' + err.message)
  });

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Branding & Rules
        </CardTitle>
        <CardDescription>Configure your company details and invoice numbering.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Company Name</Label>
            <Input 
              defaultValue={settings?.company_name} 
              onBlur={(e) => mutation.mutate({ company_name: e.target.value })} 
            />
          </div>
          <div className="space-y-2">
            <Label>Company Email</Label>
            <Input 
              defaultValue={settings?.company_email} 
              onBlur={(e) => mutation.mutate({ company_email: e.target.value })} 
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Company Address</Label>
          <Textarea 
            defaultValue={settings?.company_address} 
            onBlur={(e) => mutation.mutate({ company_address: e.target.value })} 
          />
        </div>
        <div className="grid grid-cols-2 gap-4 border-t pt-4">
          <div className="space-y-2">
            <Label>Invoice Prefix</Label>
            <Input 
              defaultValue={settings?.invoice_prefix} 
              onBlur={(e) => mutation.mutate({ invoice_prefix: e.target.value })} 
            />
          </div>
          <div className="space-y-2">
            <Label>Next Invoice Number</Label>
            <Input 
              type="number"
              defaultValue={settings?.next_invoice_number} 
              onBlur={(e) => mutation.mutate({ next_invoice_number: parseInt(e.target.value) })} 
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function InvoiceItemEditor({ invoice, onSave }: { invoice: any, onSave: () => void }) {
  const [items, setItems] = useState<InvoiceItem[]>(
    invoice.items?.map((item: any) => ({
      ...item,
      tax_rate: item.tax_rate || 0,
      discount: item.discount || 0
    })) || []
  );
  const [isSaving, setIsSaving] = useState(false);

  const addItem = () => {
    setItems([...items, { description: '', quantity: 1, unit_price: 0, tax_rate: 0, discount: 0, total: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...items];
    const item = { ...newItems[index], [field]: value } as InvoiceItem;
    
    if (['quantity', 'unit_price', 'tax_rate', 'discount'].includes(field)) {
      const subtotal = (item.quantity || 0) * (item.unit_price || 0);
      const afterDiscount = subtotal - (item.discount || 0);
      const taxAmount = afterDiscount * ((item.tax_rate || 0) / 100);
      item.total = afterDiscount + taxAmount;
    }
    
    newItems[index] = item;
    setItems(newItems);
  };


  const handleSave = async () => {
    setIsSaving(true);
    const totalAmount = items.reduce((sum, item) => sum + (item.total || 0), 0);
    
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ 
          items: items as any,
          total_amount: totalAmount
        })
        .eq('id', invoice.id);


      if (error) throw error;
      toast.success('Invoice items updated');
      onSave();
    } catch (err: any) {
      toast.error('Failed to update: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        {items.map((item, index) => (
          <div key={index} className="grid grid-cols-12 gap-2 items-end border-b pb-4">
            <div className="col-span-4 space-y-1">
              <Label className="text-xs">Description</Label>
              <Input 
                value={item.description} 
                onChange={(e) => updateItem(index, 'description', e.target.value)}
              />
            </div>
            <div className="col-span-1 space-y-1">
              <Label className="text-xs">Qty</Label>
              <Input 
                type="number" 
                value={item.quantity} 
                onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value))}
              />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Price</Label>
              <Input 
                type="number" 
                value={item.unit_price} 
                onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value))}
              />
            </div>
            <div className="col-span-1 space-y-1">
              <Label className="text-xs">Disc ($)</Label>
              <Input 
                type="number" 
                value={item.discount} 
                onChange={(e) => updateItem(index, 'discount', parseFloat(e.target.value))}
              />
            </div>
            <div className="col-span-1 space-y-1">
              <Label className="text-xs">Tax (%)</Label>
              <Input 
                type="number" 
                value={item.tax_rate} 
                onChange={(e) => updateItem(index, 'tax_rate', parseFloat(e.target.value))}
              />
            </div>
            <div className="col-span-3 flex items-center justify-end gap-2">
              <span className="text-sm font-bold">${item.total.toFixed(2)}</span>
              <Button variant="ghost" size="icon" className="text-destructive" onClick={() => removeItem(index)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between items-center pt-2">
        <Button variant="outline" size="sm" onClick={addItem} className="gap-2">
          <Plus className="h-4 w-4" /> Add Item
        </Button>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Total Amount</p>
          <p className="text-xl font-bold">${items.reduce((sum, item) => sum + (item.total || 0), 0).toFixed(2)}</p>
        </div>
      </div>
      <Button className="w-full gap-2" onClick={handleSave} disabled={isSaving}>
        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Save Changes
      </Button>
    </div>
  );
}
