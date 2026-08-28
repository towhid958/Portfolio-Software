import { Switch } from '@/components/ui/switch';

export function ToggleControl({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return <Switch checked={!!value} onCheckedChange={onChange} />;
}
