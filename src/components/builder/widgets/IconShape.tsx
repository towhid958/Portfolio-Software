import type { LucideIcon } from 'lucide-react';

/**
 * Shared by Icon and Icon List - a glyph wrapped in `.builder-icon-shape`,
 * which reads the icon-specific CSS vars (color/size/view/secondary color/
 * radius/padding, see cssVars.ts) set by ICON_STYLE_FIELDS. Pulled out once
 * so both widgets render an icon identically instead of drifting apart.
 */
export function IconShape({ icon: Icon, className }: { icon: LucideIcon; className?: string }) {
  return (
    <span className={className ? `builder-icon-shape ${className}` : 'builder-icon-shape'}>
      <Icon style={{ width: 'var(--el-icon-size, 32px)', height: 'var(--el-icon-size, 32px)', display: 'block' }} />
    </span>
  );
}
