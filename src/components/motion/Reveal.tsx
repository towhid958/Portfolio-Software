import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';

// useLayoutEffect warns during SSR, and these effects are client-only anyway.
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function canAnimate() {
  return (
    typeof window !== 'undefined' && 'IntersectionObserver' in window && !prefersReducedMotion()
  );
}

export type RevealVariant = 'up' | 'left' | 'right' | 'scale';

type RevealProps = {
  children: ReactNode;
  className?: string;
  /** Direction the element travels from. */
  variant?: RevealVariant;
  /** Stagger offset in ms. */
  delay?: number;
  style?: CSSProperties;
};

/**
 * Fades and slides its children in the first time they scroll into view.
 *
 * The hidden state is applied by JS inside a layout effect - i.e. after
 * hydration but before the browser paints - rather than by a CSS rule. That
 * ordering matters twice over: there is no flash of the visible state on load,
 * and if JS is disabled, fails, or IntersectionObserver is missing, the content
 * is simply never hidden in the first place. CSS alone never hides anything
 * here, so a broken script can't leave the page blank.
 *
 * Renders a plain <div>, so pass the element's own classes straight through -
 * no extra wrapper node is introduced and grid/flex layouts are unaffected.
 */
export function Reveal({ children, className, variant = 'up', delay = 0, style }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el || !canAnimate()) return;

    el.dataset['reveal'] = 'hidden';

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        // The stagger is a delayed attribute flip, NOT a CSS transition-delay.
        // An inline transition-delay would stick around after the reveal and
        // then lag every later transition on the same element - a card with a
        // 270ms stagger would take 270ms to react to hover.
        if (delay > 0) {
          timerRef.current = setTimeout(() => {
            el.dataset['reveal'] = 'shown';
          }, delay);
        } else {
          el.dataset['reveal'] = 'shown';
        }
      },
      // Fire a little before the element is fully on screen so the motion
      // reads as "arriving with the scroll" rather than catching up to it.
      { rootMargin: '0px 0px -8% 0px', threshold: 0.05 },
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      clearTimeout(timerRef.current);
    };
  }, [delay]);

  return (
    <div ref={ref} data-reveal-variant={variant} className={className} style={style}>
      {children}
    </div>
  );
}

type CountUpProps = {
  /** The number to land on. */
  value: number;
  /** Rendered straight after the number, e.g. "+". */
  suffix?: string;
  durationMs?: number;
  className?: string;
};

/**
 * Counts from 0 up to `value` the first time it scrolls into view.
 *
 * Server-renders the final number so crawlers and no-JS visitors see "120+",
 * never "0+"; the reset to 0 happens in a layout effect before first paint.
 */
export function CountUp({ value, suffix = '', durationMs = 1400, className }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const frameRef = useRef(0);
  const [display, setDisplay] = useState(value);

  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el || !canAnimate()) return;

    setDisplay(0);

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        observer.disconnect();

        const start = performance.now();
        const tick = (now: number) => {
          const progress = Math.min(1, (now - start) / durationMs);
          // easeOutCubic - fast off the mark, gentle landing.
          const eased = 1 - Math.pow(1 - progress, 3);
          setDisplay(Math.round(value * eased));
          if (progress < 1) frameRef.current = requestAnimationFrame(tick);
        };
        frameRef.current = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frameRef.current);
    };
  }, [value, durationMs]);

  return (
    <span ref={ref} className={className}>
      {display}
      {suffix}
    </span>
  );
}
