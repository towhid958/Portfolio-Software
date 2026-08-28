import { listWidgets } from '@/lib/builder/registry';
import { useDragDrop } from '@/components/builder/dnd/DragDropContext';

export function Toolbox() {
  const { startDrag } = useDragDrop();
  // 'root' represents the page body itself, not a widget an admin drags in.
  const widgets = listWidgets().filter((w) => w.type !== 'root');

  return (
    <div className="p-3 grid grid-cols-2 gap-2">
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
