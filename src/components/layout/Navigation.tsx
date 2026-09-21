import { Link, useLocation, useRouter } from '@tanstack/react-router';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet';
import { LayoutDashboard, LogOut, Menu, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import { useRBAC } from '@/hooks/useRBAC';
import { useSession } from '@/hooks/useSession';

// "/" appears twice below (Home, About). Without exact +
// includeHash matching, TanStack marks a bare to="/" link active on every
// route, so all three pills would light up at once on the homepage - and
// Home would stay lit on /services, /blog and everywhere else.
type NavItem =
  | { label: string; kind: 'gigs' }
  | {
      label: string;
      kind: 'link';
      to: '/' | '/services' | '/projects' | '/partners' | '/blog';
      hash?: string;
    };

const NAV_ITEMS: NavItem[] = [
  { label: 'Home', kind: 'link', to: '/' },
  { label: 'Services', kind: 'link', to: '/services' },
  { label: 'Gigs', kind: 'gigs' },
  { label: 'Portfolio', kind: 'link', to: '/projects' },
  { label: 'Partners', kind: 'link', to: '/partners' },
  { label: 'Blog', kind: 'link', to: '/blog' },
];

// exactOptionalPropertyTypes forbids passing activeOptions={undefined}, so
// every branch hands Link a concrete object.
const HOME_ACTIVE_OPTIONS = { exact: true, includeHash: true } as const;
const DEFAULT_ACTIVE_OPTIONS = { exact: false, includeHash: false } as const;
// Gigs stays highlighted across ?page=2, ?page=3, ...
const GIGS_ACTIVE_OPTIONS = { exact: false, includeHash: false, includeSearch: false } as const;

type NavLinkProps = {
  item: NavItem;
  className: string;
  activeProps: { className: string };
  inactiveProps: { className: string };
};

function NavLink({ item, className, activeProps, inactiveProps }: NavLinkProps) {
  if (item.kind === 'gigs') {
    return (
      <Link
        to="/gigs"
        search={{ page: 1 }}
        className={className}
        activeProps={activeProps}
        inactiveProps={inactiveProps}
        activeOptions={GIGS_ACTIVE_OPTIONS}
      >
        {item.label}
      </Link>
    );
  }

  const activeOptions = item.to === '/' ? HOME_ACTIVE_OPTIONS : DEFAULT_ACTIVE_OPTIONS;

  if (item.hash) {
    return (
      <Link
        to={item.to}
        hash={item.hash}
        className={className}
        activeProps={activeProps}
        inactiveProps={inactiveProps}
        activeOptions={activeOptions}
      >
        {item.label}
      </Link>
    );
  }

  return (
    <Link
      to={item.to}
      className={className}
      activeProps={activeProps}
      inactiveProps={inactiveProps}
      activeOptions={activeOptions}
    >
      {item.label}
    </Link>
  );
}

export function Navigation() {
  const location = useLocation();
  const router = useRouter();
  const { session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { hasRole } = useRBAC();

  // Condenses the bar once the page leaves the top, so the hero gets the full
  // height and every other scroll position gets a tighter, more solid bar.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.navigate({ to: '/auth' });
  };

  const isAuthPage = location.pathname === '/auth';

  if (isAuthPage) return null;

  const portalLink = hasRole(['super_admin', 'admin', 'editor', 'staff'])
    ? { to: '/admin' as const, label: 'Admin Panel' }
    : { to: '/dashboard' as const, label: 'Dashboard' };

  // Desktop pill nav
  const pillBase = 'rounded-full px-3.5 py-1.5 text-xs font-semibold tracking-wide transition-all';
  const pillActive = { className: 'bg-white text-royal-deep font-bold shadow-sm' };
  const pillInactive = {
    className: 'text-slate-600 hover:bg-white/70 hover:text-royal-deep',
  };

  // Mobile sheet nav
  const sheetBase = 'rounded-lg px-3 py-2.5 text-base transition-colors';
  const sheetActive = { className: 'bg-royal-deep/5 font-bold text-royal-deep' };
  const sheetInactive = {
    className: 'font-medium text-slate-600 hover:bg-royal-deep/5 hover:text-royal-deep',
  };

  return (
    <nav
      className={`sticky top-0 z-50 w-full border-b font-sans-body backdrop-blur-xl transition-[background-color,border-color,box-shadow] duration-300 ${
        scrolled
          ? 'border-royal-deep/15 bg-royal-canvas/95 shadow-[0_6px_28px_rgba(12,27,51,0.10)]'
          : 'border-royal-deep/10 bg-royal-canvas/90 shadow-[0_4px_24px_rgba(12,27,51,0.04)]'
      }`}
    >
      <div
        className={`mx-auto flex max-w-[1280px] items-center justify-between gap-4 px-6 transition-[height] duration-300 lg:px-12 ${
          scrolled ? 'h-16' : 'h-20'
        }`}
      >
        {/* Brand */}
        <Link to="/" className="group flex flex-col">
          HASAN KAMRUL
        </Link>

        {/* Desktop pill nav */}
        <div className="hidden items-center gap-1 rounded-full border border-royal-deep/10 bg-royal-pill/80 p-1.5 shadow-inner xl:flex">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.label}
              item={item}
              className={pillBase}
              activeProps={pillActive}
              inactiveProps={pillInactive}
            />
          ))}
        </div>

        {/* Right-hand actions */}
        <div className="flex items-center gap-3">
          {session ? (
            <>
              <Link
                to={portalLink.to}
                className="hidden items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold text-royal-deep transition-all hover:bg-royal-rule hover:text-royal-sapphire sm:inline-flex"
              >
                <LayoutDashboard className="h-4 w-4" />
                {portalLink.label}
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="hidden items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-slate-500 transition-colors hover:bg-destructive/10 hover:text-destructive sm:inline-flex"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </>
          ) : (
            <Link
              to="/auth"
              className="hidden items-center justify-center rounded-lg px-4 py-2 text-xs font-semibold text-royal-deep transition-all hover:bg-royal-rule hover:text-royal-sapphire sm:inline-flex"
            >
              Sign In
            </Link>
          )}

          <Link
            to="/services/request-quote"
            className="inline-flex items-center justify-center rounded-lg border border-royal-gold/30 bg-gradient-to-r from-royal-deep via-royal-sapphire to-royal-deep px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-royal-gold-light shadow-[0_4px_16px_rgba(12,27,51,0.25)] transition-all hover:-translate-y-0.5 hover:shadow-[0_6px_22px_rgba(12,27,51,0.4)]"
          >
            Request a Quote
          </Link>

          <Link
            to={session ? portalLink.to : '/auth'}
            aria-label={session ? portalLink.label : 'Sign in'}
            className="hidden h-9 w-9 items-center justify-center rounded-full border border-royal-deep/15 bg-white text-royal-deep shadow-sm transition-colors hover:bg-royal-canvas-alt xl:flex"
          >
            <User className="h-[19px] w-[19px]" />
          </Link>

          {/* Mobile / tablet menu - the pill nav only fits from xl up */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label="Open menu"
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-royal-deep/15 bg-white text-royal-deep shadow-sm transition-colors hover:bg-royal-canvas-alt xl:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="flex w-72 flex-col border-royal-deep/10 bg-royal-canvas font-sans-body"
            >
              <SheetHeader>
                <SheetTitle className="text-left font-sans-body font-extrabold tracking-tight text-royal-ink">
                  Menu
                </SheetTitle>
              </SheetHeader>

              <div className="mt-6 flex flex-1 flex-col gap-1">
                {NAV_ITEMS.map((item) => (
                  <SheetClose asChild key={item.label}>
                    <NavLink
                      item={item}
                      className={sheetBase}
                      activeProps={sheetActive}
                      inactiveProps={sheetInactive}
                    />
                  </SheetClose>
                ))}
              </div>

              <div className="flex flex-col gap-3 border-t border-royal-deep/10 pt-4">
                {session ? (
                  <>
                    <SheetClose asChild>
                      <Link
                        to={portalLink.to}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-royal-deep/20 bg-white px-4 py-2.5 text-sm font-semibold text-royal-deep shadow-sm transition-colors hover:bg-royal-canvas-alt"
                      >
                        <LayoutDashboard className="h-4 w-4" />
                        {portalLink.label}
                      </Link>
                    </SheetClose>
                    <button
                      type="button"
                      onClick={() => {
                        setMobileOpen(false);
                        handleLogout();
                      }}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-500 transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </>
                ) : (
                  <SheetClose asChild>
                    <Link
                      to="/auth"
                      className="inline-flex w-full items-center justify-center rounded-lg border border-royal-deep/20 bg-white px-4 py-2.5 text-sm font-semibold text-royal-deep shadow-sm transition-colors hover:bg-royal-canvas-alt"
                    >
                      Sign In
                    </Link>
                  </SheetClose>
                )}
                <SheetClose asChild>
                  <Link
                    to="/services/request-quote"
                    className="inline-flex w-full items-center justify-center rounded-lg border border-royal-gold/30 bg-gradient-to-r from-royal-deep via-royal-sapphire to-royal-deep px-5 py-3 text-xs font-bold uppercase tracking-wider text-royal-gold-light shadow-[0_4px_16px_rgba(12,27,51,0.25)]"
                  >
                    Request a Quote
                  </Link>
                </SheetClose>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}
