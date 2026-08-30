import { useCallback, useRef, useState } from 'react';
import type { PageDocument } from './document';

const MAX_HISTORY = 50;
/** Successive edits to the same thing (typing in a field, dragging a slider) within this window merge into one undo step instead of one per keystroke/tick - see `coalesceKey` below. */
const COALESCE_MS = 600;

interface HistoryState {
  past: PageDocument[];
  present: PageDocument;
  future: PageDocument[];
}

type DocUpdater = PageDocument | ((prev: PageDocument) => PageDocument);

/**
 * Undo/redo for the page document, with debounced coalescing so a text
 * field edit or a slider drag becomes one undo step rather than one per
 * keystroke/tick - a plain "push a snapshot on every setDoc call" history
 * would make undo nearly useless for anything typed. Discrete one-shot
 * actions (delete, duplicate, insert, move) always get their own step by
 * simply not passing a `coalesceKey`.
 */
export function useDocHistory(initialDoc: PageDocument) {
  const [state, setState] = useState<HistoryState>({ past: [], present: initialDoc, future: [] });
  const lastKeyRef = useRef<string | null>(null);
  const lastCommitAtRef = useRef(0);

  const setDoc = useCallback((updater: DocUpdater, opts?: { coalesceKey?: string }) => {
    setState((s) => {
      const nextPresent = typeof updater === 'function' ? (updater as (prev: PageDocument) => PageDocument)(s.present) : updater;
      if (nextPresent === s.present) return s;

      const now = Date.now();
      const key = opts?.coalesceKey;
      const continuesSameEdit = !!key && key === lastKeyRef.current && now - lastCommitAtRef.current < COALESCE_MS;
      lastKeyRef.current = key ?? null;
      lastCommitAtRef.current = now;

      if (continuesSameEdit) {
        // Same undo step as the previous call - update present in place,
        // don't push another entry onto past.
        return { ...s, present: nextPresent, future: [] };
      }
      return { past: [...s.past, s.present].slice(-MAX_HISTORY), present: nextPresent, future: [] };
    });
  }, []);

  const undo = useCallback(() => {
    lastKeyRef.current = null;
    setState((s) => {
      if (s.past.length === 0) return s;
      const previous = s.past[s.past.length - 1]!;
      return { past: s.past.slice(0, -1), present: previous, future: [s.present, ...s.future].slice(0, MAX_HISTORY) };
    });
  }, []);

  const redo = useCallback(() => {
    lastKeyRef.current = null;
    setState((s) => {
      if (s.future.length === 0) return s;
      const next = s.future[0]!;
      return { past: [...s.past, s.present].slice(-MAX_HISTORY), present: next, future: s.future.slice(1) };
    });
  }, []);

  return {
    doc: state.present,
    setDoc,
    undo,
    redo,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
  };
}
