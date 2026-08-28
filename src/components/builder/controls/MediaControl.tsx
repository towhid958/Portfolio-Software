import { MediaPicker } from '@/components/admin/media/MediaPicker';

export function MediaControl({
  value,
  onChange,
  accept = 'image',
}: {
  value: string | null | undefined;
  onChange: (v: string | null) => void;
  accept?: 'image' | 'video';
}) {
  return <MediaPicker value={value} onChange={onChange} accept={accept} />;
}
