import { useEffect, useState } from 'react';
import type { ElementId, PageDocument } from '@/lib/builder/document';
import { getWidget } from '@/lib/builder/registry';
import { hasAnyBackground } from '@/lib/builder/valueTypes';
import { resolveValue } from '@/lib/builder/styleValue';
import { useBuilderRuntime } from './runtime/BuilderRuntimeContext';
import { BackgroundOverlay, BackgroundVideo } from './BackgroundLayers';
import { cn } from '@/lib/utils';

interface ElementRendererProps {
  doc: PageDocument;
  id: ElementId;
}

/**
 * Tracks whether an entrance-animated element has scrolled into view yet.
 * Deliberately real React state (not an imperative el.classList.add) - an
 * unrelated re-render of this same element (e.g. editing its own content
 * after it's already been revealed) would have React recompute className
 * from scratch and silently erase an imperatively-added class, leaving the
 * element stuck invisible forever with no observer left to re-fire. Baking
 * "revealed" into the className computation itself means every render is
 * self-consistent regardless of what triggered it.
 *
 * `enabled` is false for the overwhelming majority of elements (no
 * animation set), in which case this is just an inert hook call - the
 * effect returns immediately and the constant `true` never causes a
 * second render.
 */
function useEntranceReveal(id: ElementId, enabled: boolean): boolean {
  const [revealed, setRevealed] = useState(!enabled);

  useEffect(() => {
    if (!enabled) return;
    const el = document.querySelector(`[data-el-id="${id}"]`);
    if (!el) return;

    // A user who's told their OS they prefer reduced motion never gets the
    // hidden starting state in the first place (see the CSS's
    // prefers-reduced-motion guard), so there's nothing to reveal - this
    // just keeps the JS side consistent with that.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setRevealed(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [id, enabled]);

  return revealed;
}

/**
 * Walks the tree, maps each element to its widget component, renders
 * children recursively, and passes properties straight through. Used
 * unchanged by both the editor canvas and the published-page renderer -
 * only the BuilderRuntime it reads from context differs.
 */
export function ElementRenderer({ doc, id }: ElementRendererProps) {
  const runtime = useBuilderRuntime();
  const node = doc.nodes[id];
  // Called unconditionally, before the early returns below, so this hook
  // never gets conditionally skipped depending on whether node/widget exist
  // (the Rules of Hooks require the same hooks in the same order on every
  // render of this component).
  const animationType = node?.advanced.entranceAnimation;
  const hasAnimation = !!animationType && animationType !== 'none';
  const revealed = useEntranceReveal(id, hasAnimation);
  if (!node) return null;

  const widget = getWidget(node.type);
  if (!widget) return null;

  // id/className come from AdvancedProperties (CSS ID / CSS Classes), added
  // here rather than by getElementProps since they're plain node data, not
  // editor-vs-published runtime behaviour.
  const wiring = {
    ...runtime.getElementProps(id),
    id: node.advanced.htmlId || undefined,
    className: cn(
      node.advanced.htmlClasses || undefined,
      hasAnimation && `builder-anim-${animationType}`,
      hasAnimation && revealed && 'builder-anim-in',
    ) || undefined,
  };

  // Kept separate from `children` (rather than prepended into it) so a
  // widget's own "am I empty" check - e.g. Container's placeholder/dashed
  // border - still reflects real content only, not decorative layers.
  // Every widget renders {backgroundLayers} itself, before {children}.
  const children = node.children.length > 0
    ? node.children.map((childId) => <ElementRenderer key={childId} doc={doc} id={childId} />)
    : undefined;
  const childIds = node.children.length > 0 ? node.children : undefined;
  const getChildContent = node.children.length > 0 ? (childId: ElementId) => doc.nodes[childId]?.content : undefined;

  // Resolved once at desktop/normal purely to decide WHETHER to render a
  // <video> at all - see BackgroundVideo for why its src itself isn't
  // responsive the way the rest of this system is.
  const desktopBg = resolveValue(node.design.background, 'desktop', 'normal');
  const hasVideo = desktopBg?.type === 'video' && !!desktopBg.video?.url;
  const hasOverlay = hasAnyBackground(node.design.backgroundOverlay);

  const backgroundLayers = hasVideo || hasOverlay ? (
    <>
      {hasVideo && desktopBg?.video && (
        // Keyed on the url so a new/changed link gets a genuinely fresh
        // BackgroundVideo instance - its error state is a useState inside
        // that component, so only remounting the component (not just the
        // <video> tag within it) actually clears a previous load failure.
        <BackgroundVideo
          key={desktopBg.video.url}
          url={desktopBg.video.url}
          posterUrl={desktopBg.video.posterUrl}
          fit={desktopBg.video.fit}
          position={desktopBg.video.position}
        />
      )}
      {hasOverlay && <BackgroundOverlay />}
    </>
  ) : undefined;

  return (
    <widget.Component
      id={id}
      content={node.content}
      wiring={wiring}
      backgroundLayers={backgroundLayers}
      childIds={childIds}
      getChildContent={getChildContent}
    >
      {children}
    </widget.Component>
  );
}
