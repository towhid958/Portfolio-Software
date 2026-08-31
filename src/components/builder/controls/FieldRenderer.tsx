import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { FieldDef } from '@/lib/builder/fields';
import type { BreakpointId } from '@/lib/builder/breakpoints';
import { clearValue, hasOwnValue, resolveValue, setValue, type StateId, type StyleValue } from '@/lib/builder/styleValue';
import { TextControl } from './TextControl';
import { TextareaControl } from './TextareaControl';
import { RichTextControl } from './RichTextControl';
import { NumberControl } from './NumberControl';
import { SliderControl } from './SliderControl';
import { DimensionsControl } from './DimensionsControl';
import { LengthControl } from './LengthControl';
import { SelectControl } from './SelectControl';
import { IconButtonGroupControl, type IconOption } from './IconButtonGroupControl';
import { ToggleControl } from './ToggleControl';
import { ColorControl } from './ColorControl';
import { TextFillControl } from './TextFillControl';
import { LinkControl } from './LinkControl';
import { MediaControl } from './MediaControl';
import { IconControl } from './IconControl';
import { IconListItemsControl } from './IconListItemsControl';
import { StringListControl } from './StringListControl';
import { TableDataControl } from './TableDataControl';
import { DateTimeControl } from './DateTimeControl';
import { GalleryItemsControl } from './GalleryItemsControl';
import { NavItemsControl } from './NavItemsControl';
import { VideoUrlControl } from './VideoUrlControl';
import { BackgroundControl } from './BackgroundControl';
import { DisplayControl } from './DisplayControl';
import { PositionControl } from './PositionControl';
import { TypographyControl } from './TypographyControl';
import { TextShadowControl } from './TextShadowControl';
import { BorderControl } from './BorderControl';
import { ShadowControl } from './ShadowControl';
import { TransformControl } from './TransformControl';
import { FilterControl } from './FilterControl';
import { TransitionControl } from './TransitionControl';

function Control({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: any;
  // The extra `meta` param only ever gets passed by the 'media' control
  // (see FieldDef.dimensionKeys) - every other control ignores it.
  onChange: (v: any, meta?: any) => void;
}) {
  switch (field.control) {
    case 'text':
      return <TextControl value={value} onChange={onChange} placeholder={field.placeholder} />;
    case 'textarea':
      return <TextareaControl value={value} onChange={onChange} placeholder={field.placeholder} />;
    case 'richtext':
      return <RichTextControl value={value} onChange={onChange} />;
    case 'number':
      return <NumberControl value={value} onChange={onChange} min={field.min} max={field.max} step={field.step} />;
    case 'slider':
      return <SliderControl value={value} onChange={onChange} min={field.min} max={field.max} step={field.step} />;
    case 'dimensions':
      return <DimensionsControl value={value} onChange={onChange} units={field.units} />;
    case 'length':
      return <LengthControl value={value} onChange={onChange} units={field.units} />;
    case 'select':
      return <SelectControl value={value} onChange={onChange} options={field.options as any} placeholder={field.placeholder} />;
    case 'iconButtons':
      return <IconButtonGroupControl value={value} onChange={onChange} options={field.options as IconOption[]} />;
    case 'toggle':
      return <ToggleControl value={value} onChange={onChange} />;
    case 'color':
      return <ColorControl value={value} onChange={onChange} />;
    case 'textFill':
      return <TextFillControl value={value} onChange={onChange} />;
    case 'link':
      return <LinkControl value={value} onChange={onChange} />;
    case 'media':
      return <MediaControl value={value} onChange={onChange} />;
    case 'icon':
      return <IconControl value={value} onChange={onChange} />;
    case 'iconListItems':
      return <IconListItemsControl value={value} onChange={onChange} />;
    case 'stringList':
      return <StringListControl value={value} onChange={onChange} itemLabel={field.placeholder} />;
    case 'tableData':
      return <TableDataControl value={value} onChange={onChange} />;
    case 'datetime':
      return <DateTimeControl value={value} onChange={onChange} />;
    case 'galleryItems':
      return <GalleryItemsControl value={value} onChange={onChange} />;
    case 'navItems':
      return <NavItemsControl value={value} onChange={onChange} />;
    case 'videoUrl':
      return <VideoUrlControl value={value} onChange={onChange} />;
    case 'display':
      return <DisplayControl value={value} onChange={onChange} />;
    case 'position':
      return <PositionControl value={value} onChange={onChange} />;
    case 'background':
      return <BackgroundControl value={value} onChange={onChange} allowVideo allowOpacity={false} />;
    case 'backgroundOverlay':
      return <BackgroundControl value={value} onChange={onChange} allowVideo={false} allowOpacity />;
    case 'typography':
      return <TypographyControl value={value} onChange={onChange} />;
    case 'textShadow':
      return <TextShadowControl value={value} onChange={onChange} />;
    case 'border':
      return <BorderControl value={value} onChange={onChange} />;
    case 'shadow':
      return <ShadowControl value={value} onChange={onChange} />;
    case 'transform':
      return <TransformControl value={value} onChange={onChange} />;
    case 'filter':
      return <FilterControl value={value} onChange={onChange} />;
    case 'transition':
      return <TransitionControl value={value} onChange={onChange} />;
    default:
      return null;
  }
}

/**
 * Renders one field's label + control. Non-responsive fields (Content tab)
 * pass the plain value straight through. Responsive fields (Style/Advanced
 * tabs) receive the whole StyleValue<T> as `rawValue`, resolve it for the
 * active breakpoint+state, and write back through setValue - the control
 * components themselves never know StyleValue exists.
 */
export function FieldRenderer({
  field,
  rawValue,
  onChange,
  breakpoint,
  state,
}: {
  field: FieldDef;
  rawValue: any;
  onChange: (v: any, meta?: any) => void;
  breakpoint: BreakpointId;
  state: StateId;
}) {
  if (!field.responsive) {
    return (
      <div className="space-y-1.5">
        <label className="text-xs font-medium">{field.label}</label>
        <Control field={field} value={rawValue} onChange={onChange} />
      </div>
    );
  }

  const styleValue: StyleValue<any> | undefined = rawValue;
  const resolved = resolveValue(styleValue, breakpoint, state);
  const isOwn = hasOwnValue(styleValue, breakpoint, state);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium">{field.label}</label>
        {isOwn && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            title={`Reset ${breakpoint}/${state} override`}
            onClick={() => onChange(clearValue(styleValue, breakpoint, state))}
          >
            <RotateCcw className="h-3 w-3" />
          </Button>
        )}
      </div>
      <Control
        field={field}
        value={resolved}
        onChange={(v) => onChange(setValue(styleValue, breakpoint, state, v))}
      />
    </div>
  );
}
