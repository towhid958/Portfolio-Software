import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// Static reference for the handlers wired up in EditorShell's own keydown
// listener - kept here as plain data rather than trying to introspect that
// listener, since it's the one place a user would think to look for "what
// can I press", not something that needs to stay byte-for-byte in sync with
// the handler's own key checks.
const SHORTCUT_GROUPS: Array<{ title: string; items: Array<{ keys: string; description: string }> }> = [
  {
    title: 'Editing',
    items: [
      { keys: 'Ctrl+Z', description: 'Undo' },
      { keys: 'Ctrl+Shift+Z / Ctrl+Y', description: 'Redo' },
      { keys: 'Ctrl+C', description: 'Copy selected element' },
      { keys: 'Ctrl+X', description: 'Cut selected element' },
      { keys: 'Ctrl+V', description: 'Paste at cursor' },
      { keys: 'Ctrl+D', description: 'Duplicate selection' },
      { keys: 'Delete / Backspace', description: 'Delete selection' },
    ],
  },
  {
    title: 'Style',
    items: [
      { keys: 'Ctrl+Alt+C', description: 'Copy style' },
      { keys: 'Ctrl+Alt+V', description: 'Paste style' },
    ],
  },
  {
    title: 'Selection & positioning',
    items: [
      { keys: 'Escape', description: 'Clear selection' },
      { keys: 'Arrow keys', description: 'Nudge a positioned element by 1px' },
      { keys: 'Shift+Arrow keys', description: 'Nudge a positioned element by 10px' },
    ],
  },
];

// Controlled, no trigger of its own - opened imperatively from the editor
// toolbar's "?" button, matching ThemeSettingsDialog/SaveTemplateDialog's shape.
export function ShortcutsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.title}>
              <h3 className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">{group.title}</h3>
              <dl className="space-y-1">
                {group.items.map((item) => (
                  <div key={item.keys} className="flex items-center justify-between gap-3 text-sm">
                    <dt className="text-muted-foreground">{item.description}</dt>
                    <dd className="shrink-0 rounded border bg-muted px-1.5 py-0.5 font-mono text-xs">{item.keys}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
