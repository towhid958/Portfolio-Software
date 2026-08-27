import { MediaPicker } from '@/components/admin/media/MediaPicker';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';

interface GalleryFieldProps {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
}

// MediaPicker only handles a single image; this wraps it in "always empty, add
// on select" mode plus a thumbnail grid to build up the gallery JSONB arrays
// (projects.gallery, gigs.gallery) that had no UI despite already being columns.
export function GalleryField({ label, value, onChange }: GalleryFieldProps) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {value.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {value.map((url, index) => (
            <div key={`${url}-${index}`} className="relative group aspect-video rounded-lg border overflow-hidden bg-muted">
              <img src={url} alt="" className="h-full w-full object-cover" />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => onChange(value.filter((_, i) => i !== index))}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
      <MediaPicker
        value={null}
        onChange={(url) => {
          if (url) onChange([...value, url]);
        }}
      />
    </div>
  );
}
