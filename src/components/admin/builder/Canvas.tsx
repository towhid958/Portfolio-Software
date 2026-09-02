import { useMemo } from 'react';
import { flattenOrder, type PageDocument } from '@/lib/builder/document';
import { generateDocumentCss } from '@/lib/builder/styleGenerator';
import { BASE_ELEMENT_CSS } from '@/lib/builder/cssVars';
import { buildGoogleFontsHref, collectUsedGoogleFontQueries } from '@/lib/builder/fonts';
import type { BreakpointId } from '@/lib/builder/breakpoints';
import { ElementRenderer } from '@/components/builder/ElementRenderer';
import { BuilderRuntimeProvider, type BuilderRuntime } from '@/components/builder/runtime/BuilderRuntimeContext';
import { useDropZone } from '@/components/builder/dnd/useDropZone';
import type { DragSource, DropTarget } from '@/components/builder/dnd/DragDropContext';
import { useSelection } from '@/components/builder/selection/SelectionContext';
import { useHoverTracking } from '@/components/builder/selection/useHoverTracking';
import { useThemeTokens } from '@/components/builder/theme/ThemeTokensContext';

interface CanvasProps {
  doc: PageDocument;
  width: string;
  enabledBreakpoints: BreakpointId[];
  onDrop: (source: DragSource, target: DropTarget) => void;
}

export function Canvas({ doc, width, enabledBreakpoints, onDrop }: CanvasProps) {
  useDropZone(doc, onDrop);
  useHoverTracking();
  const { select, toggleSelect } = useSelection();
  const { theme, colorMap, fontMap } = useThemeTokens();

  // Hover is handled separately (useHoverTracking, a single window-level
  // listener) - onClick still goes through wiring since click bubbling with
  // stopPropagation is exactly what picks the innermost clicked widget.
  // Shift-click adds/removes this element from the current multi-selection
  // instead of replacing it - the standard canvas-tool convention (Figma,
  // Photoshop) for building up a selection one click at a time.
  const editorRuntime: BuilderRuntime = useMemo(
    () => ({
      isEditable: true,
      getElementProps: (id) => ({
        ref: () => {},
        'data-el-id': id,
        onClick: (e) => {
          e.stopPropagation();
          if (id === doc.rootId) {
            select(null);
            return;
          }
          if (e.shiftKey) toggleSelect(id);
          else select(id);
        },
      }),
    }),
    [select, toggleSelect, doc.rootId]
  );

  // 'container', not the default 'media' - see generateDocumentCss's own
  // queryType param doc comment. This div's own width (the `width` prop
  // below, exactly what the device toggle controls) becomes the thing
  // breakpoint rules actually check, instead of the real - and here,
  // irrelevant - browser viewport.
  const css = useMemo(() => {
    const order = flattenOrder(doc);
    return `${BASE_ELEMENT_CSS}\n\n${generateDocumentCss(doc.nodes, order, enabledBreakpoints, { colors: colorMap, fonts: fontMap }, 'container')}`;
  }, [doc, enabledBreakpoints, colorMap, fontMap]);

  // Only the fonts this specific document actually uses. Deliberately no
  // `precedence` prop here: that turns the tag into a React 19 "Resource",
  // and Resources SUSPEND the tree until a newly-seen stylesheet finishes
  // loading over the network - fine for the SSR'd public page (avoids
  // FOUC once, at initial load) but in the editor it means picking a new
  // font mid-session suspends the whole canvas until Google Fonts responds,
  // which reads as the page randomly resetting. A plain <link> still loads
  // and applies the stylesheet the moment it arrives, just without
  // blocking render for it - the right tradeoff for something changing
  // interactively.
  const fontsHref = useMemo(
    () => buildGoogleFontsHref(collectUsedGoogleFontQueries(doc.nodes, theme.fonts)),
    [doc, theme.fonts]
  );

  return (
    <div
      // flex column so the root element (below) can be stretched to fill
      // this wrapper's full height via flex-1 - see RootWidget's comment
      // for why plain height/min-height classes on the root itself can't
      // do this on their own.
      style={{
        width,
        minHeight: '100%',
        background: 'white',
        transition: 'width 200ms ease-out',
        display: 'flex',
        flexDirection: 'column',
        // Establishes this div as the nearest container for every unnamed
        // @container rule in `css` above - inline-size only (not the full
        // 'size'), so containment is scoped to width and this div's height
        // still grows with its actual content instead of collapsing to 0.
        containerType: 'inline-size',
        // A visible glow around the whole edge, not just a bottom drop
        // shadow (shadow-sm's usual shape) - the point is marking where the
        // simulated viewport actually ends against the surrounding
        // bg-muted/40 editor background, which a one-sided shadow doesn't
        // make obvious at a glance, especially at the narrower Tablet/Mobile widths.
        boxShadow: '0 0 8px rgba(0, 0, 0, 0.45)',
      }}
    >
      {fontsHref && <link rel="stylesheet" href={fontsHref} />}
      <style>{css}</style>
      <BuilderRuntimeProvider runtime={editorRuntime}>
        <ElementRenderer doc={doc} id={doc.rootId} />
      </BuilderRuntimeProvider>
    </div>
  );
}
