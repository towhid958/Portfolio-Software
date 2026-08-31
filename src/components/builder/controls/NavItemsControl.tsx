import { useState } from 'react';
import { Link2, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TextControl } from './TextControl';
import { LinkControl, type LinkValue } from './LinkControl';
import { cn } from '@/lib/utils';

export interface NavItem {
  id: string;
  label: string;
  link: LinkValue;
}

export function newNavItem(): NavItem {
  return { id: crypto.randomUUID(), label: 'Link', link: { url: '' } };
}

// Same repeater shape as IconListItemsControl, minus the icon picker - a nav
// link doesn't need one, and forcing an icon field onto every menu item
// would just be a control nobody uses here.
export function NavItemsControl({ value, onChange }: { value: NavItem[] | undefined; onChange: (v: NavItem[]) => void }) {
  const items = value ?? [];
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(items.map((i) => i.id)));

  const setItem = (id: string, patch: Partial<NavItem>) => {
    onChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const addItem = () => onChange([...items, newNavItem()]);

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
        return (
          <div key={item.id} className="space-y-1.5 rounded-md border p-2">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <TextControl value={item.label} onChange={(label) => setItem(item.id, { label })} placeholder="Link label" />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                title="Link"
                className={cn('h-9 w-9 shrink-0', isExpanded && 'text-primary')}
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
        <Plus className="h-3 w-3" /> Add link
      </Button>
    </div>
  );
}
