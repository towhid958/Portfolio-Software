import { useEffect, useMemo, useRef, useState } from 'react';
import { Pipette } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { literalColor, type ColorValue } from '@/lib/builder/valueTypes';
import {
  COLOR_PRESETS,
  hsvToRgb,
  parseCssColor,
  rgbaToCss,
  rgbaToHex6,
  rgbToHsv,
  type Rgba,
} from '@/lib/builder/color';

const CHECKERBOARD_STYLE: React.CSSProperties = {
  backgroundImage:
    'linear-gradient(45deg, #d4d4d8 25%, transparent 25%), linear-gradient(-45deg, #d4d4d8 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #d4d4d8 75%), linear-gradient(-45deg, transparent 75%, #d4d4d8 75%)',
  backgroundSize: '10px 10px',
  backgroundPosition: '0 0, 0 5px, 5px -5px, -5px 0px',
};

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

interface Hsva {
  h: number;
  s: number;
  v: number;
  a: number;
}

function rgbaToHsva(v: Rgba): Hsva {
  const hsv = rgbToHsv(v.r, v.g, v.b);
  return { h: hsv.h, s: hsv.s, v: hsv.v, a: v.a };
}

function hsvaToRgba(v: Hsva): Rgba {
  const { r, g, b } = hsvToRgb(v.h, v.s, v.v);
  return { r, g, b, a: v.a };
}

// A full HSV picker (saturation/value field + hue and alpha sliders) with hex
// entry, an eyedropper, and preset swatches including Transparent - the
// native <input type=color> this replaced had none of those and no way to
// express transparency at all.
export function ColorControl({
  value,
  onChange,
}: {
  value: ColorValue | undefined;
  onChange: (v: ColorValue) => void;
}) {
  const externalCss = value?.value ?? 'transparent';
  const [open, setOpen] = useState(false);
  const [hsva, setHsva] = useState<Hsva>(() => rgbaToHsva(parseCssColor(externalCss) ?? { r: 0, g: 0, b: 0, a: 0 }));
  const lastEmitted = useRef(externalCss);
  const svRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);
  const alphaRef = useRef<HTMLDivElement>(null);

  // Re-derive local HSVA only when the value changed from outside (a
  // different element selected, undo/redo) - not when it's simply our own
  // onChange echoing back, which would otherwise fight in-progress drags and
  // collapse a chosen hue back to 0 whenever saturation/value hit an edge.
  useEffect(() => {
    if (externalCss === lastEmitted.current) return;
    setHsva(rgbaToHsva(parseCssColor(externalCss) ?? { r: 0, g: 0, b: 0, a: 0 }));
    lastEmitted.current = externalCss;
  }, [externalCss]);

  const rgba = hsvaToRgba(hsva);
  const previewCss = rgbaToCss(rgba);
  const opaqueCss = rgbaToCss({ ...rgba, a: 1 });

  const [text, setText] = useState(previewCss);
  const [hexText, setHexText] = useState(rgbaToHex6(rgba));
  useEffect(() => {
    setText(previewCss);
    setHexText(rgbaToHex6(rgba));
  }, [previewCss]);

  function emit(next: Hsva) {
    setHsva(next);
    const css = rgbaToCss(hsvaToRgba(next));
    lastEmitted.current = css;
    onChange(literalColor(css));
  }

  function emitRgba(next: Rgba) {
    emit(rgbaToHsva(next));
  }

  function commitText() {
    const parsed = parseCssColor(text);
    if (parsed) emitRgba(parsed);
    else setText(previewCss);
  }

  function commitHex() {
    const parsed = parseCssColor(hexText.startsWith('#') ? hexText : `#${hexText}`);
    if (parsed) emitRgba({ ...parsed, a: hsva.a });
    else setHexText(rgbaToHex6(rgba));
  }

  function handleSvMove(e: { clientX: number; clientY: number }) {
    const el = svRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const s = rect.width ? clamp01((e.clientX - rect.left) / rect.width) : 0;
    const v = rect.height ? clamp01(1 - (e.clientY - rect.top) / rect.height) : 0;
    emit({ ...hsva, s, v });
  }

  function handleHueMove(e: { clientX: number }) {
    const el = hueRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const h = rect.width ? clamp01((e.clientX - rect.left) / rect.width) * 360 : 0;
    emit({ ...hsva, h });
  }

  function handleAlphaMove(e: { clientX: number }) {
    const el = alphaRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const a = rect.width ? clamp01((e.clientX - rect.left) / rect.width) : 0;
    emit({ ...hsva, a });
  }

  const presets = useMemo(
    () =>
      COLOR_PRESETS.map((preset) => {
        const parsed = parseCssColor(preset.css)!;
        return { ...preset, canonicalCss: rgbaToCss(parsed), parsed };
      }),
    []
  );

  const supportsEyedropper = typeof window !== 'undefined' && 'EyeDropper' in window;
  async function pickWithEyedropper() {
    try {
      // @ts-expect-error - EyeDropper isn't in the standard DOM lib types yet.
      const result = await new window.EyeDropper().open();
      const parsed = parseCssColor(result.sRGBHex);
      if (parsed) emitRgba({ ...parsed, a: hsva.a });
    } catch {
      // User cancelled the pick - nothing to do.
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Pick color"
            className="relative h-8 w-8 shrink-0 overflow-hidden rounded-md border shadow-sm transition-shadow hover:ring-2 hover:ring-ring/40"
          >
            <span className="absolute inset-0" style={CHECKERBOARD_STYLE} />
            <span className="absolute inset-0" style={{ backgroundColor: previewCss }} />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 space-y-3 p-3" align="start">
          <div
            ref={svRef}
            className="relative h-36 w-full cursor-crosshair rounded-md"
            style={{
              backgroundColor: `hsl(${hsva.h}, 100%, 50%)`,
              backgroundImage:
                'linear-gradient(to top, #000, rgba(0,0,0,0)), linear-gradient(to right, #fff, rgba(255,255,255,0))',
            }}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              handleSvMove(e);
            }}
            onPointerMove={(e) => e.buttons === 1 && handleSvMove(e)}
          >
            <span
              className="pointer-events-none absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
              style={{ left: `${hsva.s * 100}%`, top: `${(1 - hsva.v) * 100}%`, backgroundColor: opaqueCss }}
            />
          </div>

          <div
            ref={hueRef}
            className="relative h-3 w-full cursor-pointer rounded-full"
            style={{
              backgroundImage:
                'linear-gradient(to right, hsl(0,100%,50%), hsl(60,100%,50%), hsl(120,100%,50%), hsl(180,100%,50%), hsl(240,100%,50%), hsl(300,100%,50%), hsl(360,100%,50%))',
            }}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              handleHueMove(e);
            }}
            onPointerMove={(e) => e.buttons === 1 && handleHueMove(e)}
          >
            <span
              className="pointer-events-none absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
              style={{ left: `${(hsva.h / 360) * 100}%`, backgroundColor: `hsl(${hsva.h}, 100%, 50%)` }}
            />
          </div>

          <div
            ref={alphaRef}
            className="relative h-3 w-full cursor-pointer rounded-full"
            style={CHECKERBOARD_STYLE}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              handleAlphaMove(e);
            }}
            onPointerMove={(e) => e.buttons === 1 && handleAlphaMove(e)}
          >
            <span
              className="absolute inset-0 rounded-full"
              style={{ backgroundImage: `linear-gradient(to right, transparent, ${opaqueCss})` }}
            />
            <span
              className="pointer-events-none absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
              style={{ left: `${hsva.a * 100}%`, backgroundColor: previewCss }}
            />
          </div>

          <div className="flex items-center gap-2">
            <Input
              value={hexText}
              onChange={(e) => setHexText(e.target.value)}
              onBlur={commitHex}
              onKeyDown={(e) => e.key === 'Enter' && commitHex()}
              className="h-8 flex-1 font-mono text-sm"
              placeholder="rrggbb"
            />
            <div className="relative w-16 shrink-0">
              <Input
                type="number"
                min={0}
                max={100}
                value={Math.round(hsva.a * 100)}
                onChange={(e) => emit({ ...hsva, a: clamp01(Number(e.target.value) / 100) })}
                className="h-8 pr-5 text-sm"
              />
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
            </div>
            {supportsEyedropper && (
              <button
                type="button"
                aria-label="Pick color from screen"
                onClick={pickWithEyedropper}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              >
                <Pipette className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {presets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                title={preset.label}
                onClick={() => emitRgba(preset.parsed)}
                className={cn(
                  'relative h-6 w-6 overflow-hidden rounded-full border shadow-sm transition-transform hover:scale-110',
                  previewCss === preset.canonicalCss && 'ring-2 ring-ring ring-offset-1 ring-offset-popover'
                )}
              >
                <span className="absolute inset-0" style={CHECKERBOARD_STYLE} />
                <span className="absolute inset-0" style={{ backgroundColor: preset.css }} />
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commitText}
        onKeyDown={(e) => e.key === 'Enter' && commitText()}
        placeholder="transparent"
        className="h-8 font-mono text-sm"
      />
    </div>
  );
}
