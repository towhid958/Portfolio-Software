import { createContext, useContext } from 'react';
import type { ElementId } from '@/lib/builder/document';

export interface ElementWiring {
  ref: (el: HTMLElement | null) => void;
  'data-el-id': string;
  /** From AdvancedProperties.htmlId - a real id attribute for external CSS/JS/analytics to hook into. Set by ElementRenderer, not by getElementProps. */
  id?: string | undefined;
  /** From AdvancedProperties.htmlClasses - each widget merges this with its own hardcoded classes, e.g. `className={cn('builder-el ...', wiring.className)}`, rather than the wiring spread being clobbered by an explicit className written after it. */
  className?: string | undefined;
  onMouseEnter?: (e: React.MouseEvent) => void;
  onMouseLeave?: (e: React.MouseEvent) => void;
  onClick?: (e: React.MouseEvent) => void;
}

/**
 * The one decision point for "widgets need drag handles and selection
 * wiring inside the editor and none of it outside": every widget calls
 * useElementWiring(id) and gets back either real editor behaviour or an
 * inert no-op, decided once here rather than checked per-widget.
 */
export interface BuilderRuntime {
  isEditable: boolean;
  getElementProps: (id: ElementId) => ElementWiring;
}

const noopRuntime: BuilderRuntime = {
  isEditable: false,
  getElementProps: (id) => ({
    ref: () => {},
    'data-el-id': id,
  }),
};

const BuilderRuntimeContext = createContext<BuilderRuntime>(noopRuntime);

export function BuilderRuntimeProvider({
  runtime,
  children,
}: {
  runtime: BuilderRuntime;
  children: React.ReactNode;
}) {
  return <BuilderRuntimeContext.Provider value={runtime}>{children}</BuilderRuntimeContext.Provider>;
}

export function useBuilderRuntime(): BuilderRuntime {
  return useContext(BuilderRuntimeContext);
}
