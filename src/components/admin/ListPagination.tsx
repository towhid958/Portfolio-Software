import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ListPaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

// Drop-in pagination footer paired with usePagination(), used the same way
// across every admin list page rather than each hand-rolling its own.
export function ListPagination({ page, totalPages, total, pageSize, onPageChange }: ListPaginationProps) {
  if (total <= pageSize) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between pt-4">
      <p className="text-sm text-muted-foreground">
        Showing {start}-{end} of {total}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" /> Previous
        </Button>
        <span className="text-sm text-muted-foreground px-2">
          Page {page} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
