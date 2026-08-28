import { Input } from '@/components/ui/input';

export function TextControl({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string | undefined;
}) {
  return (
    <Input
      value={value ?? ''}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 text-sm"
    />
  );
}
