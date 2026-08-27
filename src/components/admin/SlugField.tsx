import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ensureUniqueSlug, isSlugAvailable, slugify, type SluggedTable } from '@/lib/slug';

type SlugStatus = 'idle' | 'checking' | 'available' | 'taken' | 'error';

interface SlugFieldProps {
  table: SluggedTable;
  /** Current title - the slug auto-derives from this until the admin edits it directly. */
  title: string;
  value: string;
  onChange: (slug: string) => void;
  /** The row's own id when editing, so its own slug doesn't flag itself as taken. */
  excludeId?: string;
  /** Reports the live validation state up to the parent, to gate the Save button. */
  onStatusChange?: (status: SlugStatus) => void;
  label?: string;
  /** Visual prefix, e.g. "/gigs/" - purely cosmetic. */
  basePath?: string;
}

export function SlugField({
  table,
  title,
  value,
  onChange,
  excludeId,
  onStatusChange,
  label = 'Link',
  basePath,
}: SlugFieldProps) {
  // If a slug already exists when this mounts (editing an existing item),
  // treat it as already "touched" so the auto-derive effect below never
  // silently overwrites it just because the title happens to differ from
  // a fresh slugification of it. Only a brand-new, empty slug auto-derives.
  const [touched, setTouched] = useState(() => Boolean(value));
  const [status, setStatus] = useState<SlugStatus>('idle');
  const requestIdRef = useRef(0);

  // Auto-derive from the title and quietly resolve any collision by
  // appending -2, -3, ... - the admin never chose this exact value, so
  // there's nothing to ask them about.
  useEffect(() => {
    if (touched) return;

    const base = slugify(title || '');
    if (!base) {
      onChange('');
      setStatus('idle');
      return;
    }

    setStatus('checking');
    const requestId = ++requestIdRef.current;

    const timer = setTimeout(async () => {
      try {
        const resolved = await ensureUniqueSlug(table, base, excludeId);
        if (requestIdRef.current !== requestId) return; // a newer check superseded this one
        onChange(resolved);
        setStatus('available');
      } catch {
        if (requestIdRef.current !== requestId) return;
        setStatus('error');
      }
    }, 400);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, touched, table, excludeId]);

  useEffect(() => {
    onStatusChange?.(status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // Once the admin has edited the slug directly, respect exactly what they
  // typed - just flag a conflict instead of silently rewriting their choice.
  useEffect(() => {
    if (!touched) return;

    if (!value) {
      setStatus('idle');
      return;
    }

    setStatus('checking');
    const requestId = ++requestIdRef.current;

    const timer = setTimeout(async () => {
      try {
        const available = await isSlugAvailable(table, value, excludeId);
        if (requestIdRef.current !== requestId) return; // a newer check superseded this one
        setStatus(available ? 'available' : 'taken');
      } catch {
        if (requestIdRef.current !== requestId) return;
        setStatus('error');
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [value, touched, table, excludeId]);

  return (
    <div className="space-y-2">
      <Label htmlFor={`slug-${table}`}>{label}</Label>
      <div className="flex items-center gap-2">
        {basePath && (
          <span className="text-sm text-muted-foreground whitespace-nowrap">{basePath}</span>
        )}
        <div className="relative flex-1">
          <Input
            id={`slug-${table}`}
            value={value}
            onChange={(e) => {
              const next = slugify(e.target.value);
              // Clearing the field entirely falls back to auto-deriving from
              // the title again, rather than leaving it (and staying) empty.
              setTouched(next !== '');
              onChange(next);
            }}
            className={cn('pr-9', status === 'taken' && 'border-destructive focus-visible:ring-destructive')}
            placeholder="auto-generated-from-title"
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
            {status === 'checking' && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            {status === 'available' && <Check className="h-4 w-4 text-green-600" />}
            {status === 'taken' && <X className="h-4 w-4 text-destructive" />}
          </div>
        </div>
      </div>
      {status === 'taken' && (
        <p className="text-xs text-destructive">This link is already in use.</p>
      )}
      {status === 'error' && (
        <p className="text-xs text-muted-foreground">Couldn't check availability - try again.</p>
      )}
    </div>
  );
}
