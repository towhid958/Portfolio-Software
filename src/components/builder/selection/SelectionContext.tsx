import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ElementId } from '@/lib/builder/document';

interface SelectionApi {
  /** The "primary" selection - the most recently added id, or the only one when exactly one is selected. Every pre-multi-select consumer (SettingsPanel, single-element shortcuts) keeps working unchanged off this alone. */
  selectedId: ElementId | null;
  /** Every currently selected id, in the order they were added. Length 0 or 1 covers the original single-select behavior exactly; length 2+ is a real multi-selection. */
  selectedIds: ElementId[];
  hoveredId: ElementId | null;
  /** Replaces the whole selection with just this one id (or clears it, for null) - the plain click behavior, unchanged from before multi-select existed. */
  select: (id: ElementId | null) => void;
  /** Shift-click behavior: adds id if it isn't selected, removes it if it already is. */
  toggleSelect: (id: ElementId) => void;
  /** Replaces the whole selection with exactly this set, in this order - used after a bulk duplicate to select the newly created copies. */
  selectMany: (ids: ElementId[]) => void;
  clearSelection: () => void;
  setHovered: (id: ElementId | null) => void;
}

const SelectionCtx = createContext<SelectionApi | null>(null);

export function SelectionProvider({ children }: { children: React.ReactNode }) {
  const [selectedIds, setSelectedIds] = useState<ElementId[]>([]);
  const [hoveredId, setHoveredId] = useState<ElementId | null>(null);

  const select = useCallback((id: ElementId | null) => setSelectedIds(id ? [id] : []), []);
  const toggleSelect = useCallback((id: ElementId) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);
  const selectMany = useCallback((ids: ElementId[]) => setSelectedIds(ids), []);
  const clearSelection = useCallback(() => setSelectedIds([]), []);
  const setHovered = useCallback((id: ElementId | null) => setHoveredId(id), []);

  const selectedId = selectedIds.length > 0 ? selectedIds[selectedIds.length - 1]! : null;

  const api = useMemo(
    () => ({ selectedId, selectedIds, hoveredId, select, toggleSelect, selectMany, clearSelection, setHovered }),
    [selectedId, selectedIds, hoveredId, select, toggleSelect, selectMany, clearSelection, setHovered]
  );

  return <SelectionCtx.Provider value={api}>{children}</SelectionCtx.Provider>;
}

export function useSelection(): SelectionApi {
  const ctx = useContext(SelectionCtx);
  if (!ctx) throw new Error('useSelection must be used within SelectionProvider');
  return ctx;
}
