import { useEffect, useState } from 'react';
import { registerWidget, type WidgetComponentProps } from '@/lib/builder/registry';
import { Timer } from 'lucide-react';
import type { FieldDef } from '@/lib/builder/fields';
import { length } from '@/lib/builder/valueTypes';
import { literal } from '@/lib/builder/styleValue';
import { cn } from '@/lib/utils';

export interface CountdownContent {
  /** datetime-local string, e.g. "2026-12-31T23:59" - interpreted in whoever's browser evaluates it, same simplification a basic countdown widget commonly makes rather than pinning a single timezone. */
  targetDate: string;
  expiredMessage: string;
}

interface Remaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function computeRemaining(targetDate: string): Remaining | null {
  const target = new Date(targetDate).getTime();
  if (Number.isNaN(target)) return null;
  const diff = Math.max(0, target - Date.now());
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff / 3_600_000) % 24),
    minutes: Math.floor((diff / 60_000) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

const UNITS: Array<[keyof Remaining, string]> = [
  ['days', 'Days'],
  ['hours', 'Hours'],
  ['minutes', 'Min'],
  ['seconds', 'Sec'],
];

// `remaining` starts null and is only ever computed inside useEffect (never
// during the initial render, server or client) - a live "now"-based value
// computed straight in the render body would differ between the server's
// render time and the client's a moment later, which React flags as a
// hydration mismatch. Starting both at the same "not computed yet" null
// keeps the very first paint identical everywhere; the real countdown
// appears a tick after mount.
function CountdownComponent({ content, wiring }: WidgetComponentProps<CountdownContent>) {
  const [remaining, setRemaining] = useState<Remaining | null>(null);

  useEffect(() => {
    if (!content.targetDate) return;
    const tick = () => setRemaining(computeRemaining(content.targetDate));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [content.targetDate]);

  const isExpired = remaining !== null && remaining.days === 0 && remaining.hours === 0 && remaining.minutes === 0 && remaining.seconds === 0;

  return (
    <div {...(wiring as any)} className={cn('builder-el builder-countdown', wiring.className)}>
      {!content.targetDate ? (
        <span className="builder-el-text text-sm opacity-60">Set a target date in the Content panel</span>
      ) : isExpired ? (
        <span className="builder-el-text">{content.expiredMessage}</span>
      ) : (
        <div className="flex gap-3">
          {UNITS.map(([key, label]) => (
            <div key={key} className="flex flex-col items-center">
              <span className="builder-el-text text-3xl font-bold tabular-nums leading-none">
                {String(remaining?.[key] ?? 0).padStart(2, '0')}
              </span>
              <span className="mt-1 text-xs uppercase tracking-wide opacity-60">{label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const contentFields: FieldDef[] = [
  { key: 'targetDate', label: 'Target Date & Time', control: 'datetime' },
  { key: 'expiredMessage', label: 'Expired Message', control: 'text', placeholder: "Offer's ended" },
];

registerWidget({
  type: 'countdown',
  label: 'Countdown',
  icon: Timer,
  category: 'basic',
  keywords: ['countdown', 'timer', 'deadline', 'launch', 'sale'],
  isContainer: false,
  defaultContent: {
    targetDate: '',
    expiredMessage: "Offer's ended",
  } satisfies CountdownContent,
  defaultAdvanced: { width: literal(length(100, '%')), overflowX: literal('hidden') },
  contentFields,
  Component: CountdownComponent,
});
