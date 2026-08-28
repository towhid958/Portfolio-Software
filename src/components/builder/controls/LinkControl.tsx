import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

export interface LinkValue {
  url: string;
  newTab?: boolean;
}

export function LinkControl({ value, onChange }: { value: LinkValue | undefined; onChange: (v: LinkValue) => void }) {
  const v = value ?? { url: '' };
  return (
    <div className="space-y-2">
      <Input
        value={v.url}
        placeholder="https:// or /page-slug"
        onChange={(e) => onChange({ ...v, url: e.target.value })}
        className="h-8 text-sm"
      />
      <label className="flex items-center justify-between text-xs text-muted-foreground">
        Open in new tab
        <Switch checked={!!v.newTab} onCheckedChange={(newTab) => onChange({ ...v, newTab })} />
      </label>
    </div>
  );
}
