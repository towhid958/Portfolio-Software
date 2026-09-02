import { supabase } from '@/integrations/supabase/client';
import type { ClipboardSubtree } from './document';

/**
 * Saved sections/templates ("Save as Section" in the editor's context menu),
 * backed by the shared `builder_templates` table (see
 * 20260904100000_add_builder_templates.sql) - visible to every admin/editor,
 * not just the one browser that saved it. Callers read/write through React
 * Query using TEMPLATES_QUERY_KEY, same pattern as every other admin list in
 * this app (see admin/pages/index.tsx's 'admin-pages' key).
 */
export interface SavedTemplate {
  id: string;
  name: string;
  subtree: ClipboardSubtree;
  createdAt: string;
}

export const TEMPLATES_QUERY_KEY = ['builder-templates'] as const;

export async function fetchTemplates(): Promise<SavedTemplate[]> {
  const { data, error } = await supabase
    .from('builder_templates')
    .select('id, name, subtree, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    subtree: row.subtree as unknown as ClipboardSubtree,
    createdAt: row.created_at ?? new Date().toISOString(),
  }));
}

export async function createTemplate(name: string, subtree: ClipboardSubtree): Promise<SavedTemplate> {
  const { data: auth } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('builder_templates')
    .insert({ name, subtree: subtree as any, created_by: auth.user?.id ?? null })
    .select('id, name, subtree, created_at')
    .single();
  if (error) throw error;
  return {
    id: data.id,
    name: data.name,
    subtree: data.subtree as unknown as ClipboardSubtree,
    createdAt: data.created_at ?? new Date().toISOString(),
  };
}

export async function deleteTemplate(id: string): Promise<void> {
  const { error } = await supabase.from('builder_templates').delete().eq('id', id);
  if (error) throw error;
}
