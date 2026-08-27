import { useState } from 'react';
import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logActivity } from '@/utils/audit';
import { toast } from 'sonner';
import { slugify } from '@/lib/slug';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Pencil, Trash2, X } from 'lucide-react';

type CategoryTable = 'blog_categories' | 'gig_categories' | 'project_categories' | 'service_categories';

interface Category {
  id: string;
  name: string;
}

interface ManageCategoriesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  table: CategoryTable;
  module: string;
  queryKey: QueryKey;
  invalidateKeys?: QueryKey[];
  title?: string;
  description?: string;
}

export function ManageCategoriesDialog({
  open,
  onOpenChange,
  table,
  module,
  queryKey,
  invalidateKeys = [],
  title = 'Manage Categories',
  description = 'Create, rename, or delete categories.',
}: ManageCategoriesDialogProps) {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const { data: categories } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase.from(table).select('*').order('sort_order', { ascending: true });
      if (error) throw error;
      return data as unknown as Category[];
    },
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey });
    invalidateKeys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
  };

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from(table).insert({ name, slug: slugify(name) } as never);
      if (error) throw error;
      await logActivity(module, 'create_category', { name });
    },
    onSuccess: () => {
      invalidateAll();
      toast.success('Category added');
      setNewName('');
    },
    onError: (error: any) => toast.error(error.message || 'Failed to add category'),
  });

  const renameMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from(table).update({ name, slug: slugify(name) } as never).eq('id', id);
      if (error) throw error;
      await logActivity(module, 'update_category', { id, name });
    },
    onSuccess: () => {
      invalidateAll();
      toast.success('Category updated');
      setEditingId(null);
    },
    onError: (error: any) => toast.error(error.message || 'Failed to update category'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      await logActivity(module, 'delete_category', { id });
    },
    onSuccess: () => {
      invalidateAll();
      toast.success('Category deleted');
    },
    onError: (error: any) => toast.error(error.message || 'Failed to delete category'),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="New category name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newName.trim()) {
                  createMutation.mutate(newName.trim());
                }
              }}
            />
            <Button
              onClick={() => createMutation.mutate(newName.trim())}
              disabled={!newName.trim() || createMutation.isPending}
            >
              Add
            </Button>
          </div>
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {(categories ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">No categories yet.</p>
            )}
            {categories?.map((cat) => (
              <div key={cat.id} className="flex items-center gap-2 rounded-md border px-3 py-2">
                {editingId === cat.id ? (
                  <>
                    <Input
                      autoFocus
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && editingName.trim()) {
                          renameMutation.mutate({ id: cat.id, name: editingName.trim() });
                        } else if (e.key === 'Escape') {
                          setEditingId(null);
                        }
                      }}
                      className="h-8"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => renameMutation.mutate({ id: cat.id, name: editingName.trim() })}
                      disabled={!editingName.trim() || renameMutation.isPending}
                    >
                      Save
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setEditingId(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm">{cat.name}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setEditingId(cat.id);
                        setEditingName(cat.name);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        if (confirm(`Delete category "${cat.name}"? Items using it will become uncategorized.`)) {
                          deleteMutation.mutate(cat.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
