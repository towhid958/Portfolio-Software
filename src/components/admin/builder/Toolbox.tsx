import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { X, LayoutTemplate, Loader2 } from 'lucide-react';
import { listWidgets } from '@/lib/builder/registry';
import { useDragDrop } from '@/components/builder/dnd/DragDropContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { fetchTemplates, deleteTemplate, TEMPLATES_QUERY_KEY } from '@/lib/builder/templateLibrary';

function WidgetsTab() {
  const { startDrag } = useDragDrop();
  // 'root' represents the page body itself, not a widget an admin drags in.
  const widgets = listWidgets().filter((w) => w.type !== 'root');

  return (
    <div className="grid grid-cols-2 gap-2 p-3">
      {widgets.map((widget) => (
        <div
          key={widget.type}
          onPointerDown={(e) => {
            e.preventDefault();
            startDrag({ kind: 'new-widget', widgetType: widget.type, label: widget.label }, e.clientX, e.clientY);
          }}
          className="flex flex-col items-center gap-1.5 rounded-lg border bg-card px-2 py-3 text-center cursor-grab active:cursor-grabbing hover:border-primary/50 hover:bg-muted/50 transition-colors select-none"
        >
          <widget.icon className="h-5 w-5 text-muted-foreground" />
          <span className="text-xs font-medium leading-tight">{widget.label}</span>
        </div>
      ))}
    </div>
  );
}

function SectionsTab() {
  const { startDrag } = useDragDrop();
  const queryClient = useQueryClient();
  // Shared with EditorShell's own copy of this same query (TEMPLATES_QUERY_KEY)
  // via the React Query cache - saving a new section there invalidates this
  // one too, no prop-drilling needed. Backed by the builder_templates table
  // (see its migration), so this list is shared across every admin/editor,
  // not just whoever saved it.
  const { data: templates = [], isLoading } = useQuery({ queryKey: TEMPLATES_QUERY_KEY, queryFn: fetchTemplates });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTemplate(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TEMPLATES_QUERY_KEY }),
    onError: (error: any) => toast.error(`Failed to delete section: ${error.message}`),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-6 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 p-6 text-center text-muted-foreground">
        <LayoutTemplate className="h-8 w-8 opacity-30" />
        <p className="text-xs">
          No saved sections yet. Right-click any element on the canvas and choose "Save as Section" to build a reusable
          library.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 p-3">
      {templates.map((template) => (
        <div
          key={template.id}
          onPointerDown={(e) => {
            e.preventDefault();
            startDrag({ kind: 'template', templateId: template.id, label: template.name }, e.clientX, e.clientY);
          }}
          className="group relative flex flex-col items-center gap-1.5 rounded-lg border bg-card px-2 py-3 text-center cursor-grab active:cursor-grabbing hover:border-primary/50 hover:bg-muted/50 transition-colors select-none"
        >
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1 h-5 w-5 opacity-0 group-hover:opacity-100"
            title="Delete section"
            onClick={(e) => {
              e.stopPropagation();
              deleteMutation.mutate(template.id);
            }}
          >
            <X className="h-3 w-3" />
          </Button>
          <LayoutTemplate className="h-5 w-5 text-muted-foreground" />
          <span className="text-xs font-medium leading-tight wrap-break-word">{template.name}</span>
        </div>
      ))}
    </div>
  );
}

export function Toolbox() {
  return (
    <Tabs defaultValue="widgets" className="flex h-full flex-col">
      <TabsList className="mx-3 mt-3">
        <TabsTrigger value="widgets" className="flex-1">
          Widgets
        </TabsTrigger>
        <TabsTrigger value="sections" className="flex-1">
          Sections
        </TabsTrigger>
      </TabsList>
      <TabsContent value="widgets" className="mt-0 flex-1 overflow-y-auto">
        <WidgetsTab />
      </TabsContent>
      <TabsContent value="sections" className="mt-0 flex-1 overflow-y-auto">
        <SectionsTab />
      </TabsContent>
    </Tabs>
  );
}
