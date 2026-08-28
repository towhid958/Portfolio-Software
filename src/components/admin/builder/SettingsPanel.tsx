import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { getElement, type ElementId, type PageDocument } from '@/lib/builder/document';
import { getWidget } from '@/lib/builder/registry';
import { STYLE_FIELDS, ADVANCED_FIELDS, type FieldDef } from '@/lib/builder/fields';
import type { BreakpointId } from '@/lib/builder/breakpoints';
import type { StateId } from '@/lib/builder/styleValue';
import { FieldRenderer } from '@/components/builder/controls/FieldRenderer';
import { VisibilityControl } from '@/components/builder/controls/VisibilityControl';

interface SettingsPanelProps {
  doc: PageDocument;
  selectedId: ElementId;
  breakpoint: BreakpointId;
  onUpdate: (id: ElementId, patch: Record<string, any>) => void;
  onDelete: (id: ElementId) => void;
  onDeselect: () => void;
}

export function SettingsPanel({ doc, selectedId, breakpoint, onUpdate, onDelete, onDeselect }: SettingsPanelProps) {
  const [state, setState] = useState<StateId>('normal');
  const [activeTab, setActiveTab] = useState('content');
  const node = getElement(doc, selectedId);
  const widget = getWidget(node.type);
  const styleFields = STYLE_FIELDS.filter(
    (f) => !widget?.excludeStyleFields?.includes(f.key) && !(f.group && widget?.excludeStyleGroups?.includes(f.group))
  );
  const styleGroups = useMemo(() => {
    const groups = new Map<string, FieldDef[]>();
    for (const field of styleFields) {
      const key = field.group ?? field.label;
      groups.set(key, [...(groups.get(key) ?? []), field]);
    }
    return Array.from(groups.entries());
  }, [styleFields]);

  // Forces the real CSS :hover rule's alternative selector (see
  // stateSelector in styleGenerator.ts) so a Hover-state edit is visible
  // without physically hovering the canvas element - your cursor is on this
  // panel while you're changing the value, not over the element itself.
  useEffect(() => {
    const el = document.querySelector(`[data-el-id="${selectedId}"]`);
    if (!el || state === 'normal') return;
    const className = `builder-preview-${state}`;
    el.classList.add(className);
    return () => el.classList.remove(className);
  }, [selectedId, state]);

  const setContentField = (key: string, value: any) => onUpdate(selectedId, { content: { ...node.content, [key]: value } });
  const setDesignField = (key: string, value: any) => onUpdate(selectedId, { design: { ...node.design, [key]: value } });
  const setAdvancedField = (key: string, value: any) => onUpdate(selectedId, { advanced: { ...node.advanced, [key]: value } });

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b px-3 py-2.5">
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onDeselect}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{widget?.label ?? node.type}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive"
          title="Delete"
          onClick={() => onDelete(selectedId)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-1 flex-col min-h-0">
        <TabsList className="mx-3 mt-2 grid grid-cols-3">
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="style">Style</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        {activeTab === 'style' && (
          <div className="flex items-center justify-end gap-1 px-3 pt-2">
            <span className="text-[11px] text-muted-foreground">State:</span>
            {(['normal', 'hover'] as StateId[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setState(s)}
                className={`rounded px-2 py-0.5 text-[11px] capitalize ${
                  state === s ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <TabsContent value="content" className="flex-1 space-y-4 overflow-y-auto px-3 py-3">
          {widget?.contentFields?.length ? (
            widget.contentFields.map((field: FieldDef) => (
              <FieldRenderer
                key={field.key}
                field={field}
                rawValue={node.content[field.key]}
                onChange={(v) => setContentField(field.key, v)}
                breakpoint={breakpoint}
                state={state}
              />
            ))
          ) : (
            <p className="text-xs text-muted-foreground">This widget has no content settings yet.</p>
          )}
        </TabsContent>

        <TabsContent value="style" className="flex-1 overflow-y-auto px-3 py-1">
          <Accordion type="multiple" defaultValue={[styleGroups[0]?.[0] ?? '']}>
            {styleGroups.map(([group, fields]) => (
              <AccordionItem key={group} value={group}>
                <AccordionTrigger className="text-sm">{group}</AccordionTrigger>
                <AccordionContent className="space-y-4">
                  {fields.map((field) => {
                    const source = node[field.source === 'advanced' ? 'advanced' : 'design'];
                    const setField = field.source === 'advanced' ? setAdvancedField : setDesignField;
                    return (
                      <FieldRenderer
                        key={field.key}
                        field={field}
                        rawValue={(source as any)[field.key]}
                        onChange={(v) => setField(field.key, v)}
                        breakpoint={breakpoint}
                        state={state}
                      />
                    );
                  })}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </TabsContent>

        <TabsContent value="advanced" className="flex-1 space-y-4 overflow-y-auto px-3 py-3">
          {ADVANCED_FIELDS.map((field) => (
            <FieldRenderer
              key={field.key}
              field={field}
              rawValue={(node.advanced as any)[field.key]}
              onChange={(v) => setAdvancedField(field.key, v)}
              breakpoint={breakpoint}
              // Always 'normal' here, deliberately ignoring the Style tab's
              // state toggle - the Advanced tab has no state UI of its own
              // (per the "State is style-only" request), so its fields
              // should never silently write to a leftover Hover state.
              state="normal"
            />
          ))}

          <VisibilityControl value={node.advanced.hidden} onChange={(hidden) => setAdvancedField('hidden', hidden)} />

          <div className="space-y-1.5">
            <label className="text-xs font-medium">Element Name</label>
            <Input
              value={node.advanced.name ?? ''}
              placeholder={widget?.label}
              onChange={(e) => setAdvancedField('name', e.target.value)}
              className="h-8 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium">CSS ID</label>
            <Input
              value={node.advanced.htmlId ?? ''}
              placeholder="my-element"
              onChange={(e) => setAdvancedField('htmlId', e.target.value)}
              className="h-8 text-sm font-mono"
            />
            <p className="text-[11px] text-muted-foreground">A stable hook for external CSS or JS to target this element.</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium">CSS Classes</label>
            <Input
              value={node.advanced.htmlClasses ?? ''}
              placeholder="my-class another-class"
              onChange={(e) => setAdvancedField('htmlClasses', e.target.value)}
              className="h-8 text-sm font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium">Custom CSS</label>
            <Textarea
              value={node.advanced.customCss ?? ''}
              placeholder={'SELECTOR { color: red; }'}
              onChange={(e) => setAdvancedField('customCss', e.target.value)}
              className="min-h-20 text-sm font-mono"
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
