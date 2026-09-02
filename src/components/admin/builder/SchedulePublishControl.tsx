import { useState } from 'react';
import { Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

// datetime-local wants "YYYY-MM-DDTHH:mm" in LOCAL time, no seconds/timezone.
function toLocalInputValue(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatShort(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

// A future-dated Publish - saves the current draft and sets
// scheduled_publish_at; a pg_cron job (run_scheduled_publishes, once a
// minute - see its migration) does the actual publish once that time
// passes. Not rendered at all for a page that's never been saved (see
// EditorShell's pageId-gated usage) - there's nothing to schedule yet.
export function SchedulePublishControl({
  scheduledPublishAt,
  onSchedule,
  isPending,
  disabled,
}: {
  scheduledPublishAt: string | null;
  onSchedule: (at: string | null) => void;
  isPending: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => toLocalInputValue(scheduledPublishAt));

  const handleSchedule = () => {
    if (!draft) return;
    const date = new Date(draft); // datetime-local's value parses as local time
    if (Number.isNaN(date.getTime())) return;
    onSchedule(date.toISOString());
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setDraft(toLocalInputValue(scheduledPublishAt));
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant={scheduledPublishAt ? 'secondary' : 'outline'}
          size="sm"
          className="gap-2"
          disabled={disabled}
          title={scheduledPublishAt ? `Scheduled for ${formatShort(scheduledPublishAt)}` : 'Schedule a future publish'}
        >
          <Clock className="h-4 w-4" />
          {scheduledPublishAt ? formatShort(scheduledPublishAt) : 'Schedule'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 space-y-3" align="end">
        <div className="space-y-1">
          <p className="text-sm font-medium">{scheduledPublishAt ? 'Reschedule publish' : 'Schedule publish'}</p>
          <p className="text-xs text-muted-foreground">
            Saves your current draft now and publishes it automatically at this time.
          </p>
        </div>
        <Input
          type="datetime-local"
          value={draft}
          min={toLocalInputValue(new Date().toISOString())}
          onChange={(e) => setDraft(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          {scheduledPublishAt && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isPending}
              onClick={() => {
                onSchedule(null);
                setOpen(false);
              }}
            >
              Cancel schedule
            </Button>
          )}
          <Button type="button" size="sm" disabled={isPending || !draft} onClick={handleSchedule}>
            {scheduledPublishAt ? 'Reschedule' : 'Schedule'}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
