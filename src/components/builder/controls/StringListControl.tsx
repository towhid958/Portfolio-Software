import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// A plain list of labels (Tabs' tab names, Accordion's item titles) - the
// actual per-item CONTENT lives in the widget's children (see childIds/
// getChildContent on WidgetComponentProps), correlated to this list purely
// by position: label[i] names child[i]. That pairing is recomputed fresh
// from the live document on every render, so reordering children via the
// Navigator's drag-and-drop never desyncs it - there's no stored id
// reference to go stale.
export function StringListControl({
  value,
  onChange,
  itemLabel = 'item',
}: {
  value: string[] | undefined;
  onChange: (v: string[]) => void;
  /** Singular noun used in the "Add ___" button and placeholder, e.g. "tab" or "item". */
  itemLabel?: string | undefined;
}) {
  const items = value ?? [];

  const setItem = (index: number, text: string) => {
    onChange(items.map((item, i) => (i === index ? text : item)));
  };

  const addItem = () => onChange([...items, `${itemLabel[0]!.toUpperCase()}${itemLabel.slice(1)} ${items.length + 1}`]);

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <div className="flex-1">
            <Input
              value={item}
              onChange={(e) => setItem(index, e.target.value)}
              placeholder={`${itemLabel} ${index + 1}`}
              className="h-8 text-sm"
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            disabled={items.length <= 1}
            onClick={() => removeItem(index)}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={addItem}>
        <Plus className="h-3 w-3" /> Add {itemLabel}
      </Button>
    </div>
  );
}
