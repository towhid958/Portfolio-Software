import type { ElementId, PageDocument } from '@/lib/builder/document';
import { getWidget } from '@/lib/builder/registry';
import { hasAnyBackground } from '@/lib/builder/valueTypes';
import { resolveValue } from '@/lib/builder/styleValue';
import { useBuilderRuntime } from './runtime/BuilderRuntimeContext';
import { BackgroundOverlay, BackgroundVideo } from './BackgroundLayers';

interface ElementRendererProps {
  doc: PageDocument;
  id: ElementId;
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
  if (!node) return null;

  const widget = getWidget(node.type);
  if (!widget) return null;

  // id/className come from AdvancedProperties (CSS ID / CSS Classes), added
  // here rather than by getElementProps since they're plain node data, not
  // editor-vs-published runtime behaviour.
  const wiring = {
    ...runtime.getElementProps(id),
    id: node.advanced.htmlId || undefined,
    className: node.advanced.htmlClasses || undefined,
  };

  // Kept separate from `children` (rather than prepended into it) so a
  // widget's own "am I empty" check - e.g. Container's placeholder/dashed
  // border - still reflects real content only, not decorative layers.
  // Every widget renders {backgroundLayers} itself, before {children}.
  const children = node.children.length > 0
    ? node.children.map((childId) => <ElementRenderer key={childId} doc={doc} id={childId} />)
    : undefined;

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
    <widget.Component id={id} content={node.content} wiring={wiring} backgroundLayers={backgroundLayers}>
      {children}
    </widget.Component>
  );
}
