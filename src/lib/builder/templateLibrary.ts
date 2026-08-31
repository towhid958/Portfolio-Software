import type { ClipboardSubtree } from './document';

/**
 * Saved sections/templates, kept in the browser's own localStorage rather
 * than a database table - this is a deliberate v1 scope: it works today,
 * for one admin building pages in one browser, with zero new backend
 * surface. A real cross-device/shared team library would need a proper DB
 * table (its own migration, RLS policy, and probably a thumbnail pipeline)
 * - a bigger, harder-to-reverse infrastructure change than anything else in
 * this pass, so it's flagged here rather than done silently.
 */
export interface SavedTemplate {
  id: string;
  name: string;
  subtree: ClipboardSubtree;
  createdAt: string;
}

const STORAGE_KEY = 'builder-templates-v1';

function readAll(): SavedTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // Corrupt or inaccessible storage (private browsing, quota, manual
    // tampering) - treat as an empty library rather than crashing the
    // editor over what's ultimately optional, recreatable data.
    return [];
  }
}

function writeAll(templates: SavedTemplate[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  } catch {
    // Same reasoning as readAll - a failed save shouldn't crash the editor.
    // The caller's optimistic UI update (if any) simply won't persist
    // across a reload, same as any other localStorage quota/access failure.
  }
}

export function getTemplates(): SavedTemplate[] {
  return readAll();
}

export function saveTemplate(name: string, subtree: ClipboardSubtree): SavedTemplate {
  const template: SavedTemplate = { id: crypto.randomUUID(), name, subtree, createdAt: new Date().toISOString() };
  writeAll([...readAll(), template]);
  return template;
}

export function deleteTemplate(id: string): void {
  writeAll(readAll().filter((t) => t.id !== id));
}

export function renameTemplate(id: string, name: string): void {
  writeAll(readAll().map((t) => (t.id === id ? { ...t, name } : t)));
}

export function getTemplate(id: string): SavedTemplate | undefined {
  return readAll().find((t) => t.id === id);
}
