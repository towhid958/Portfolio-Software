import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MediaControl } from './MediaControl';

export interface GalleryImage {
  id: string;
  url: string | null;
  alt: string;
}

export function newGalleryImage(): GalleryImage {
  return { id: crypto.randomUUID(), url: null, alt: '' };
}

export function GalleryItemsControl({
  value,
  onChange,
}: {
  value: GalleryImage[] | undefined;
  onChange: (v: GalleryImage[]) => void;
}) {
  const items = value ?? [];

  const setItem = (id: string, patch: Partial<GalleryImage>) => {
    onChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const addItem = () => onChange([...items, newGalleryImage()]);

  const removeItem = (id: string) => onChange(items.filter((item) => item.id !== id));

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.id} className="space-y-1.5 rounded-md border p-2">
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <MediaControl value={item.url} onChange={(url) => setItem(item.id, { url })} />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => removeItem(item.id)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
          <Input
            value={item.alt}
            onChange={(e) => setItem(item.id, { alt: e.target.value })}
            placeholder="Alt text"
            className="h-8 text-sm"
          />
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={addItem}>
        <Plus className="h-3 w-3" /> Add image
      </Button>
    </div>
  );
}
