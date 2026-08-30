import { Children } from 'react';
import { registerWidget, type WidgetComponentProps } from '@/lib/builder/registry';
import { ChevronsUpDown } from 'lucide-react';
import type { FieldDef } from '@/lib/builder/fields';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { length } from '@/lib/builder/valueTypes';
import { literal } from '@/lib/builder/styleValue';
import { useBuilderRuntime } from '@/components/builder/runtime/BuilderRuntimeContext';
import { cn } from '@/lib/utils';

export interface AccordionWidgetContent {
  titles: string[];
  allowMultipleOpen: boolean;
}

// Same "child i is item i's content, purely by position" contract as Tabs -
// see TabsWidget's comment. Built on the existing shadcn/Radix Accordion
// (already used elsewhere in the admin UI) rather than a bespoke
// expand/collapse, so the animation and a11y (aria-expanded, keyboard nav)
// come for free.
function AccordionComponent({ content, wiring, children, childIds }: WidgetComponentProps<AccordionWidgetContent>) {
  const { isEditable } = useBuilderRuntime();
  const titles = content.titles?.length ? content.titles : ['Item 1'];
  const panels = Children.toArray(children);

  const items = titles.map((title, i) => (
    <AccordionItem key={childIds?.[i] ?? i} value={`item-${i}`}>
      <AccordionTrigger className="builder-el-text">{title}</AccordionTrigger>
      <AccordionContent>
        {panels[i] ?? (
          isEditable && (
            <div className="flex min-h-16 items-center justify-center border-2 border-dashed border-muted-foreground/30 bg-muted/20 text-xs text-muted-foreground">
              Drop a Container here for this item
            </div>
          )
        )}
      </AccordionContent>
    </AccordionItem>
  ));

  return (
    <div {...(wiring as any)} className={cn('builder-el builder-accordion', wiring.className)}>
      {content.allowMultipleOpen ? (
        <Accordion type="multiple" defaultValue={['item-0']}>
          {items}
        </Accordion>
      ) : (
        <Accordion type="single" collapsible defaultValue="item-0">
          {items}
        </Accordion>
      )}
    </div>
  );
}

const contentFields: FieldDef[] = [
  { key: 'titles', label: 'Items', control: 'stringList', placeholder: 'item' },
  { key: 'allowMultipleOpen', label: 'Allow Multiple Open', control: 'toggle' },
];

registerWidget({
  type: 'accordion',
  label: 'Accordion',
  icon: ChevronsUpDown,
  category: 'layout',
  keywords: ['accordion', 'faq', 'collapse', 'expand', 'toggle'],
  isContainer: true,
  defaultContent: { titles: ['Item 1', 'Item 2', 'Item 3'], allowMultipleOpen: false } satisfies AccordionWidgetContent,
  defaultAdvanced: { width: literal(length(100, '%')), overflowX: literal('hidden') },
  contentFields,
  Component: AccordionComponent,
});
