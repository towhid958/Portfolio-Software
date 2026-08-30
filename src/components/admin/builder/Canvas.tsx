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

interface CanvasProps {
  doc: PageDocument;
  width: string;
  enabledBreakpoints: BreakpointId[];
  onDrop: (source: DragSource, target: DropTarget) => void;
}

export function Canvas({ doc, width, enabledBreakpoints, onDrop }: CanvasProps) {
  useDropZone(doc, onDrop);
  useHoverTracking();
  const { select } = useSelection();

  // Hover is handled separately (useHoverTracking, a single window-level
  // listener) - onClick still goes through wiring since click bubbling with
  // stopPropagation is exactly what picks the innermost clicked widget.
  const editorRuntime: BuilderRuntime = useMemo(
    () => ({
      isEditable: true,
      getElementProps: (id) => ({
        ref: () => {},
        'data-el-id': id,
        onClick: (e) => {
          e.stopPropagation();
          select(id === doc.rootId ? null : id);
        },
      }),
    }),
    [select, doc.rootId]
  );

  const css = useMemo(() => {
    const order = flattenOrder(doc);
    return `${BASE_ELEMENT_CSS}\n\n${generateDocumentCss(doc.nodes, order, enabledBreakpoints)}`;
  }, [doc, enabledBreakpoints]);

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
  const fontsHref = useMemo(() => buildGoogleFontsHref(collectUsedGoogleFontQueries(doc.nodes)), [doc]);

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
      }}
      className="shadow-sm"
    >
      {fontsHref && <link rel="stylesheet" href={fontsHref} />}
      <style>{css}</style>
      <BuilderRuntimeProvider runtime={editorRuntime}>
        <ElementRenderer doc={doc} id={doc.rootId} />
      </BuilderRuntimeProvider>
    </div>
  );
}
