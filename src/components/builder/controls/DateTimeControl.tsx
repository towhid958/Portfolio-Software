import { Input } from '@/components/ui/input';

export function DateTimeControl({ value, onChange }: { value: string | undefined; onChange: (v: string) => void }) {
  return (
    <Input
      type="datetime-local"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 text-sm"
    />
  );
}
