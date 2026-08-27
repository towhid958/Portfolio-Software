import { TableHead } from '@/components/ui/table';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SortDirection = 'asc' | 'desc';

interface SortableTableHeadProps {
  label: string;
  sortKey: string;
  currentKey: string;
  direction: SortDirection;
  onSort: (key: string) => void;
  className?: string;
}

export function SortableTableHead({ label, sortKey, currentKey, direction, onSort, className }: SortableTableHeadProps) {
  const isActive = currentKey === sortKey;
  const Icon = isActive ? (direction === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;

  return (
    <TableHead className={className}>
      <button
        type="button"
        className="flex items-center gap-1 hover:text-foreground transition-colors"
        onClick={() => onSort(sortKey)}
      >
        {label}
        <Icon className={cn('h-3.5 w-3.5', isActive ? 'text-foreground' : 'text-muted-foreground/50')} />
      </button>
    </TableHead>
  );
}
