import { Textarea } from '@/components/ui/textarea';

export function TextareaControl({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string | undefined;
}) {
  return (
    <Textarea
      value={value ?? ''}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="min-h-20 text-sm font-mono"
    />
  );
}
