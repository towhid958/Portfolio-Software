import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

// Controlled, no DialogTrigger of its own - opened imperatively from the
// canvas context menu's "Save as Section" item, not from a button it owns.
export function SaveTemplateDialog({
  open,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (name: string) => void;
}) {
  const [name, setName] = useState('');

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave(trimmed);
    setName('');
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setName('');
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Save as Section</DialogTitle>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label>Section Name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Pricing Table"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
            }}
          />
          <p className="text-[11px] text-muted-foreground">
            Saved to this browser - use it again from the Sections tab on the left when nothing's selected.
          </p>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={!name.trim()} onClick={handleSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
