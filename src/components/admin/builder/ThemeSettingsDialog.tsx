import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ColorControl } from '@/components/builder/controls/ColorControl';
import { SelectControl } from '@/components/builder/controls/SelectControl';
import { literalColor } from '@/lib/builder/valueTypes';
import { FONT_OPTIONS } from '@/lib/builder/fonts';
import { useThemeTokens } from '@/components/builder/theme/ThemeTokensContext';
import type { ThemeFontToken, ThemeSettings } from '@/lib/builder/theme';

const FONT_SELECT_OPTIONS = FONT_OPTIONS.map((f) => ({ label: f.label, value: f.value }));

function newId(): string {
  return crypto.randomUUID();
}

// exactOptionalPropertyTypes forbids `googleFontQuery: undefined` - omit the
// key entirely instead of assigning it when the chosen font doesn't need one.
function fontToken(id: string, name: string, value: string, googleFontQuery: string | undefined): ThemeFontToken {
  return googleFontQuery ? { id, name, value, googleFontQuery } : { id, name, value };
}

// Controlled, no trigger of its own - opened imperatively from the editor
// toolbar's "Site Theme" button, matching SaveTemplateDialog's shape.
// Edits are staged in local state and only pushed to the theme (and saved to
// the database) when "Save" is clicked, so closing without saving discards
// changes - same expectation as any settings dialog.
export function ThemeSettingsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { theme, colorMap, save, isSaving } = useThemeTokens();
  const [draft, setDraft] = useState<ThemeSettings>(theme);

  useEffect(() => {
    if (open) setDraft(theme);
  }, [open, theme]);

  const handleSave = () => {
    save(draft);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Site Theme</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="colors">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="colors">Colors</TabsTrigger>
            <TabsTrigger value="fonts">Fonts</TabsTrigger>
          </TabsList>

          <TabsContent value="colors" className="space-y-2 pt-2">
            <p className="text-[11px] text-muted-foreground">
              Global colors show up as swatches in every color picker across the site. Editing one here updates every
              element linked to it.
            </p>
            {draft.colors.map((token) => (
              <div key={token.id} className="flex items-center gap-2 rounded-md border p-2">
                <ColorControl
                  value={literalColor(token.value)}
                  onChange={(next) => {
                    // Always resolve to a literal string here - a theme
                    // token's own definition is never itself a token
                    // reference (see theme.ts), even though ColorControl's
                    // swatch row lets you click one for convenience.
                    const resolved = next.type === 'token' ? colorMap[next.value] ?? next.value : next.value;
                    setDraft((d) => ({
                      ...d,
                      colors: d.colors.map((c) => (c.id === token.id ? { ...c, value: resolved } : c)),
                    }));
                  }}
                />
                <Input
                  value={token.name}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      colors: d.colors.map((c) => (c.id === token.id ? { ...c, name: e.target.value } : c)),
                    }))
                  }
                  placeholder="Name"
                  className="h-8 flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => setDraft((d) => ({ ...d, colors: d.colors.filter((c) => c.id !== token.id) }))}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() =>
                setDraft((d) => ({
                  ...d,
                  colors: [...d.colors, { id: newId(), name: `Color ${d.colors.length + 1}`, value: '#6366f1' }],
                }))
              }
            >
              <Plus className="h-3.5 w-3.5" />
              Add color
            </Button>
          </TabsContent>

          <TabsContent value="fonts" className="space-y-2 pt-2">
            <p className="text-[11px] text-muted-foreground">
              Global fonts show up at the top of every font picker across the site. Editing one here updates every
              element linked to it.
            </p>
            {draft.fonts.map((token) => (
              <div key={token.id} className="flex items-center gap-2 rounded-md border p-2">
                <Input
                  value={token.name}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      fonts: d.fonts.map((f) => (f.id === token.id ? { ...f, name: e.target.value } : f)),
                    }))
                  }
                  placeholder="Name"
                  className="h-8 w-28 shrink-0"
                />
                <div className="flex-1">
                  <SelectControl
                    value={token.value}
                    onChange={(value) => {
                      const option = FONT_OPTIONS.find((f) => f.value === value);
                      setDraft((d) => ({
                        ...d,
                        fonts: d.fonts.map((f) =>
                          f.id === token.id ? fontToken(f.id, f.name, value, option?.googleFontQuery) : f
                        ),
                      }));
                    }}
                    options={FONT_SELECT_OPTIONS}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => setDraft((d) => ({ ...d, fonts: d.fonts.filter((f) => f.id !== token.id) }))}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() =>
                setDraft((d) => ({
                  ...d,
                  fonts: [
                    ...d.fonts,
                    fontToken(newId(), `Font ${d.fonts.length + 1}`, FONT_OPTIONS[0]!.value, FONT_OPTIONS[0]!.googleFontQuery),
                  ],
                }))
              }
            >
              <Plus className="h-3.5 w-3.5" />
              Add font
            </Button>
          </TabsContent>
        </Tabs>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={isSaving} onClick={handleSave}>
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
