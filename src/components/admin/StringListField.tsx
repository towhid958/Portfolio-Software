import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Plus, X } from 'lucide-react';

interface StringListFieldProps {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
}

// Reusable chip editor for the several JSONB string-array columns (technologies,
// keywords, benefits, budget/timeline options, tags, ...) that already round-trip
// through their form's schema and mutation but had no input rendering them.
export function StringListField({ label, value, onChange, placeholder }: StringListFieldProps) {
  const [draft, setDraft] = useState('');

  const addEntry = () => {
    const trimmed = draft.trim();
    if (!trimmed || value.includes(trimmed)) return;
    onChange([...value, trimmed]);
    setDraft('');
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addEntry();
            }
          }}
          placeholder={placeholder}
        />
        <Button type="button" variant="outline" size="icon" onClick={addEntry}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {value.map((item, index) => (
            <Badge key={`${item}-${index}`} variant="secondary" className="gap-1.5 pr-1">
              {item}
              <button
                type="button"
                onClick={() => onChange(value.filter((_, i) => i !== index))}
                className="rounded-full hover:bg-muted-foreground/20"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
