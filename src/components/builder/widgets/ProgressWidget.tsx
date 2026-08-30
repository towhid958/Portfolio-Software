import { useEffect, useState } from 'react';
import { registerWidget, type WidgetComponentProps } from '@/lib/builder/registry';
import { BarChart3 } from 'lucide-react';
import type { FieldDef } from '@/lib/builder/fields';
import { literalColor, length, type ColorValue } from '@/lib/builder/valueTypes';
import { literal } from '@/lib/builder/styleValue';
import { resolveColorCss } from '@/lib/builder/cssVars';
import { cn } from '@/lib/utils';

export type ProgressAnimationStyle = 'fill' | 'stripes' | 'pulse';

export interface ProgressContent {
  label: string;
  /** 0-100 */
  value: number;
  showPercentage: boolean;
  barColor: ColorValue;
  trackColor: ColorValue;
  animated: boolean;
  animationStyle: ProgressAnimationStyle;
}

// "fill" starts the bar at 0% and transitions to the real value right after
// mount (a plain render-time width would have nothing to animate FROM) -
// same reasoning as Countdown's null-until-mounted state, though here a
// same-render mismatch is harmless (it's just a width, not hydration-
// sensitive text), so this can start from a real, non-null default.
function ProgressComponent({ content, wiring }: WidgetComponentProps<ProgressContent>) {
  const value = Math.max(0, Math.min(100, content.value ?? 0));
  const barColor = resolveColorCss(content.barColor) ?? '#111827';
  const trackColor = resolveColorCss(content.trackColor) ?? '#e5e7eb';
  const animated = content.animated ?? true;
  const style = content.animationStyle || 'fill';

  const [fillWidth, setFillWidth] = useState(animated && style === 'fill' ? 0 : value);
  useEffect(() => {
    if (!animated || style !== 'fill') {
      setFillWidth(value);
      return;
    }
    setFillWidth(0);
    const id = requestAnimationFrame(() => setFillWidth(value));
    return () => cancelAnimationFrame(id);
  }, [animated, style, value]);

  return (
    <div {...(wiring as any)} className={cn('builder-el builder-progress', wiring.className)}>
      {(content.label || content.showPercentage) && (
        <div className="builder-el-text mb-1.5 flex items-center justify-between text-sm">
          <span>{content.label}</span>
          {content.showPercentage && <span>{value}%</span>}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-3 w-full overflow-hidden rounded-full"
        style={{ backgroundColor: trackColor }}
      >
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-1000 ease-out',
            animated && style === 'pulse' && 'animate-pulse',
            animated && style === 'stripes' && 'builder-progress-stripes',
          )}
          style={{
            width: `${fillWidth}%`,
            backgroundColor: barColor,
            ...(animated && style === 'stripes'
              ? {
                  backgroundImage:
                    'repeating-linear-gradient(45deg, rgba(255,255,255,0.25) 0 10px, transparent 10px 20px)',
                  backgroundSize: '28px 28px',
                }
              : {}),
          }}
        />
      </div>
      {animated && style === 'stripes' && (
        <style>{`
          .builder-progress-stripes { animation: builder-progress-stripes-move 1s linear infinite; }
          @keyframes builder-progress-stripes-move {
            from { background-position: 0 0; }
            to { background-position: 28px 0; }
          }
        `}</style>
      )}
    </div>
  );
}

const contentFields: FieldDef[] = [
  { key: 'label', label: 'Label', control: 'text', placeholder: 'e.g. JavaScript' },
  { key: 'value', label: 'Value (%)', control: 'slider', min: 0, max: 100, step: 1 },
  { key: 'showPercentage', label: 'Show Percentage', control: 'toggle' },
  { key: 'barColor', label: 'Bar Color', control: 'color' },
  { key: 'trackColor', label: 'Track Color', control: 'color' },
  { key: 'animated', label: 'Animated', control: 'toggle' },
  {
    key: 'animationStyle',
    label: 'Animation Style',
    control: 'select',
    options: [
      { label: 'Fill In', value: 'fill' },
      { label: 'Stripes', value: 'stripes' },
      { label: 'Pulse', value: 'pulse' },
    ],
  },
];

registerWidget({
  type: 'progress',
  label: 'Progress Bar',
  icon: BarChart3,
  category: 'basic',
  keywords: ['progress', 'bar', 'skill', 'percentage', 'meter'],
  isContainer: false,
  defaultContent: {
    label: 'Skill name',
    value: 75,
    showPercentage: true,
    barColor: literalColor('#111827'),
    trackColor: literalColor('#e5e7eb'),
    animated: true,
    animationStyle: 'fill',
  } satisfies ProgressContent,
  defaultAdvanced: { width: literal(length(100, '%')), overflowX: literal('hidden') },
  contentFields,
  // The label is the only real text, and it already has its own inline
  // flex layout above - Typography's textAlign/whiteSpace don't map onto
  // anything meaningful here the way they do for a plain text block.
  excludeStyleFields: ['textAlign', 'whiteSpace'],
  Component: ProgressComponent,
});
