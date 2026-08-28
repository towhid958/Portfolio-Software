import type { LucideIcon } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

export interface IconOption {
  label: string;
  value: string;
  icon: LucideIcon;
}

export function IconButtonGroupControl({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: IconOption[];
}) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(v) => v && onChange(v)}
      className="justify-start rounded-md border p-0.5"
    >
      {options.map((opt) => (
        <ToggleGroupItem key={opt.value} value={opt.value} title={opt.label} className="h-7 w-7 p-0">
          <opt.icon className="h-3.5 w-3.5" />
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
