import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ElementId } from '@/lib/builder/document';

interface SelectionApi {
  selectedId: ElementId | null;
  hoveredId: ElementId | null;
  select: (id: ElementId | null) => void;
  setHovered: (id: ElementId | null) => void;
}

const SelectionCtx = createContext<SelectionApi | null>(null);

export function SelectionProvider({ children }: { children: React.ReactNode }) {
  const [selectedId, setSelectedId] = useState<ElementId | null>(null);
  const [hoveredId, setHoveredId] = useState<ElementId | null>(null);

  const select = useCallback((id: ElementId | null) => setSelectedId(id), []);
  const setHovered = useCallback((id: ElementId | null) => setHoveredId(id), []);

  const api = useMemo(
    () => ({ selectedId, hoveredId, select, setHovered }),
    [selectedId, hoveredId, select, setHovered]
  );

  return <SelectionCtx.Provider value={api}>{children}</SelectionCtx.Provider>;
}

export function useSelection(): SelectionApi {
  const ctx = useContext(SelectionCtx);
  if (!ctx) throw new Error('useSelection must be used within SelectionProvider');
  return ctx;
}
