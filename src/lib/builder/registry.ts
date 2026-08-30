import type { ComponentType } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { AdvancedProperties, DesignProperties, ElementId } from './document';
import type { ElementWiring } from '@/components/builder/runtime/BuilderRuntimeContext';
import type { FieldDef } from './fields';

export type WidgetCategory = 'layout' | 'basic';

export interface WidgetComponentProps<TContent = Record<string, any>> {
  id: string;
  content: TContent;
  /** Spread onto the widget's own root DOM element - real behaviour in the editor, inert in the renderer. */
  wiring: ElementWiring;
  /** Present only on container widgets - the already-rendered child tree. */
  children?: React.ReactNode;
  /** The overlay/video background layers (if any are set) - render this first, before children, on the widget's own root. Kept separate from `children` so a widget's own "am I empty" check reflects real content only. */
  backgroundLayers?: React.ReactNode;
  /**
   * Raw ordered child element ids (container widgets with children only) -
   * same order as `children`. Exists for a widget like Tabs/Accordion that
   * needs to correlate each rendered child with metadata about that specific
   * child (e.g. a per-tab label stored in the child's own content) - the
   * opaque, already-rendered `children` ReactNode alone can't expose that.
   */
  childIds?: ElementId[] | undefined;
  /**
   * Looks up a child's raw content object by id - the narrow slice of the
   * document such a widget actually needs (its own children's `content`),
   * rather than handing every widget the entire PageDocument.
   */
  getChildContent?: ((id: ElementId) => Record<string, any> | undefined) | undefined;
}

export interface WidgetDefinition<TContent = Record<string, any>> {
  type: string;
  label: string;
  icon: LucideIcon;
  category: WidgetCategory;
  keywords: string[];
  isContainer: boolean;
  defaultContent: TContent;
  defaultDesign?: DesignProperties;
  defaultAdvanced?: AdvancedProperties;
  /** Content-tab schema for the settings panel - widget-specific, plain (non-responsive) values. */
  contentFields?: FieldDef[];
  /** Individual STYLE_FIELDS keys to hide for this widget - prefer excludeStyleGroups when hiding a whole accordion section (e.g. all of Typography), since listing every key in a group goes stale the moment a new field is added to it. */
  excludeStyleFields?: string[];
  /** Whole STYLE_FIELDS groups (by `group` name, e.g. 'Typography') to hide for this widget - robust against new fields being added to that group later, unlike excludeStyleFields. */
  excludeStyleGroups?: string[];
  /** Style-tab fields specific to this widget (e.g. Icon/Icon List's Icon group) - appended after the shared STYLE_FIELDS. Unlike contentFields these are responsive/stateful (StyleValue-backed, read/write DesignProperties or AdvancedProperties), so they get the same breakpoint + hover/focus/active machinery as every shared field. */
  extraStyleFields?: FieldDef[];
  Component: ComponentType<WidgetComponentProps<TContent>>;
}

const registry = new Map<string, WidgetDefinition<any>>();

export function registerWidget(def: WidgetDefinition<any>): void {
  registry.set(def.type, def);
}

export function getWidget(type: string): WidgetDefinition<any> | undefined {
  return registry.get(type);
}

export function listWidgets(): WidgetDefinition<any>[] {
  return Array.from(registry.values());
}
