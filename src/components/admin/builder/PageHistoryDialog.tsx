import { useQuery } from '@tanstack/react-query';
import { Loader2, History as HistoryIcon, RotateCcw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { fetchPageVersions, pageVersionsQueryKey } from '@/lib/builder/pageVersions';

// Controlled, no trigger of its own - opened imperatively from the editor
// toolbar's "History" button, matching ThemeSettingsDialog/ShortcutsDialog's
// shape. Only fetches while open (`enabled`), and only for a page that's
// actually been saved at least once - an unsaved page has no id and no
// published versions yet.
export function PageHistoryDialog({
  pageId,
  open,
  onOpenChange,
  onRestore,
}: {
  pageId: string | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRestore: (sections: unknown) => void;
}) {
  const { data: versions, isLoading } = useQuery({
    queryKey: pageVersionsQueryKey(pageId ?? ''),
    queryFn: () => fetchPageVersions(pageId!),
    enabled: open && !!pageId,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Publish History</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="flex items-center justify-center p-6 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : !versions || versions.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-6 text-center text-muted-foreground">
            <HistoryIcon className="h-8 w-8 opacity-30" />
            <p className="text-xs">No published versions yet - publishing this page creates the first one.</p>
          </div>
        ) : (
          <div className="max-h-80 space-y-1 overflow-y-auto">
            {versions.map((version, i) => (
              <div key={version.id} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm">
                <div className="min-w-0">
                  <div className="truncate font-medium">{new Date(version.createdAt).toLocaleString()}</div>
                  {i === 0 && <div className="text-xs text-muted-foreground">Currently live</div>}
                </div>
                {i > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="shrink-0 gap-1.5"
                    title="Load this version into the draft - review it, then Publish to make it live again"
                    onClick={() => onRestore(version.sections)}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Restore
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
