import { ChevronLeft, ChevronRight, SearchX } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * Shared furniture for the public listing pages (Projects, Gigs, Blog).
 *
 * Each listing previously grew its own filter buttons, empty state and
 * pagination out of the default shadcn variants, so the three pages drifted
 * apart visually. These keep them on the homepage's pill/card language.
 */

/** Category filter row. Pills echo the nav's pill group on the homepage. */
export function FilterBar({ children }: { children: ReactNode }) {
  return <div className="mb-12 flex flex-wrap items-center gap-2">{children}</div>;
}

export function EmptyState({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-royal-deep/12 bg-white py-20 text-center shadow-sm">
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-royal-deep/10 bg-royal-deep/5 text-royal-deep">
        {icon ?? <SearchX className="h-6 w-6" />}
      </div>
      <h3 className="font-sans-body text-xl font-bold text-royal-ink">{title}</h3>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
    </div>
  );
}

/** Skeleton card matching the royal card shape, for loading grids. */
export function CardSkeleton({ className = 'h-80' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-3xl border border-royal-deep/12 bg-white shadow-sm ${className}`}
    />
  );
}

type PaginationProps = {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
};

export function RoyalPagination({ page, totalPages, onChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const navClass =
    'inline-flex items-center gap-1 rounded-xl border border-royal-deep/15 bg-white px-4 py-2 text-xs font-bold uppercase tracking-wider text-royal-deep shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-sm';

  return (
    <nav aria-label="Pagination" className="mt-16 flex flex-wrap items-center justify-center gap-2">
      <button
        type="button"
        className={navClass}
        disabled={page <= 1}
        onClick={() => onChange(Math.max(1, page - 1))}
      >
        <ChevronLeft className="h-4 w-4" />
        Previous
      </button>

      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          aria-current={page === p ? 'page' : undefined}
          className={
            page === p
              ? 'h-10 w-10 rounded-xl border border-royal-gold/35 bg-royal-deep font-mono-code text-xs font-bold text-royal-gold-light shadow-md'
              : 'h-10 w-10 rounded-xl border border-royal-deep/15 bg-white font-mono-code text-xs font-bold text-slate-600 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:text-royal-deep hover:shadow-md'
          }
        >
          {p}
        </button>
      ))}

      <button
        type="button"
        className={navClass}
        disabled={page >= totalPages}
        onClick={() => onChange(Math.min(totalPages, page + 1))}
      >
        Next
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}
