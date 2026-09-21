/**
 * Class strings shared by the listing pages. Kept out of ListingChrome.tsx
 * because exporting a plain function beside components disables Fast Refresh
 * for that module.
 */
export function filterPillClass(active: boolean) {
  const base =
    'inline-flex items-center rounded-full border px-4 py-2 font-mono-code text-[11px] font-bold uppercase tracking-wider transition-all duration-300';
  return active
    ? `${base} border-royal-gold/35 bg-royal-deep text-royal-gold-light shadow-md`
    : `${base} border-royal-deep/15 bg-white text-slate-600 shadow-sm hover:-translate-y-0.5 hover:border-royal-deep/30 hover:text-royal-deep`;
}
