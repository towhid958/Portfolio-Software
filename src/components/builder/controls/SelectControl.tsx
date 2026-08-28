import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface SelectOption {
  label: string;
  value: string;
}

export function SelectControl({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  placeholder?: string | undefined;
}) {
  return (
    // Always pass `value` (even '') rather than conditionally omitting it -
    // `value` is typed as a plain string here, never undefined, so there's
    // no type reason to omit it, and omitting it while empty then supplying
    // it once something's selected flips the Select from uncontrolled to
    // controlled between renders, which is what was breaking the fields
    // that start unset (Font Family, Weight) - Transform/Style/Decoration
    // never hit this because they default to a non-empty value from the
    // first render, so they were controlled the whole time.
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-8 text-sm">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
