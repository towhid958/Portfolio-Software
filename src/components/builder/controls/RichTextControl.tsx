import { RichTextEditor } from '@/components/admin/RichTextEditor';

export function RichTextControl({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <RichTextEditor value={value ?? ''} onChange={onChange} />;
}
