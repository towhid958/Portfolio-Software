import { useState } from 'react';
import { Link2, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IconControl } from './IconControl';
import { TextControl } from './TextControl';
import { LinkControl, type LinkValue } from './LinkControl';
import { cn } from '@/lib/utils';

export interface IconListItem {
  id: string;
  icon: string;
  text: string;
  link?: LinkValue;
}

export function newIconListItem(): IconListItem {
  return { id: crypto.randomUUID(), icon: 'Check', text: 'List item' };
}

// Add/remove only, no drag-reorder - same scope as GradientControl's stop
// list, which this is modeled after.
export function IconListItemsControl({
  value,
  onChange,
}: {
  value: IconListItem[] | undefined;
  onChange: (v: IconListItem[]) => void;
}) {
  const items = value ?? [];
  // The Link field is optional per item and most lists don't need it, so it
  // stays collapsed by default - only expanded for items that already have
  // one set (opening the panel shouldn't hide a link you already added).
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(items.filter((i) => i.link?.url).map((i) => i.id)));

  const setItem = (id: string, patch: Partial<IconListItem>) => {
    onChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const addItem = () => onChange([...items, newIconListItem()]);

  const removeItem = (id: string) => {
    if (items.length <= 1) return;
    onChange(items.filter((item) => item.id !== id));
  };

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const isExpanded = expanded.has(item.id);
        const hasLink = !!item.link?.url;
        return (
          <div key={item.id} className="space-y-1.5 rounded-md border p-2">
            <div className="flex items-center gap-2">
              <IconControl compact value={item.icon} onChange={(icon) => setItem(item.id, { icon })} />
              <div className="flex-1">
                <TextControl value={item.text} onChange={(text) => setItem(item.id, { text })} placeholder="List item" />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                title="Link"
                className={cn('h-9 w-9 shrink-0', (isExpanded || hasLink) && 'text-primary')}
                onClick={() => toggleExpanded(item.id)}
              >
                <Link2 className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0"
                disabled={items.length <= 1}
                onClick={() => removeItem(item.id)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
            {isExpanded && (
              <div className="pl-1">
                <LinkControl value={item.link} onChange={(link) => setItem(item.id, { link })} />
              </div>
            )}
          </div>
        );
      })}
      <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={addItem}>
        <Plus className="h-3 w-3" /> Add item
      </Button>
    </div>
  );
}
