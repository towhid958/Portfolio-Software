import { Link, useLocation, useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { LayoutDashboard, LogOut, Menu } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Session } from "@supabase/supabase-js";
import { useRBAC } from "@/hooks/useRBAC";

export function Navigation() {
  const location = useLocation();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { hasRole } = useRBAC();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.navigate({ to: "/auth" });
  };

  const isAuthPage = location.pathname === "/auth";

  if (isAuthPage) return null;

  const portalLink = hasRole(['super_admin', 'admin', 'editor', 'staff'])
    ? { to: '/admin' as const, label: 'Admin Panel' }
    : { to: '/dashboard' as const, label: 'Dashboard' };

  const activeProps = {
    className: "text-base font-semibold text-primary transition-colors",
  };

  const inactiveProps = {
    className: "text-base font-medium text-muted-foreground hover:text-primary transition-colors",
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-20 items-center justify-between px-4">
        <Link to="/" className="text-2xl font-bold tracking-tight">HASAN KAMRUL</Link>
        <div className="hidden space-x-9 md:flex">
          <Link 
            to="/" 
            activeProps={activeProps}
            inactiveProps={inactiveProps}
          >
            Home
          </Link>
          <Link 

            to="/services" 
            activeProps={activeProps}
            inactiveProps={inactiveProps}
          >
            Services
          </Link>
          <Link 
            to="/gigs" 
            search={{ page: 1 }} 
            activeProps={activeProps}
            inactiveProps={inactiveProps}
          >
            Gigs
          </Link>
          <Link 
            to="/projects" 
            activeProps={activeProps}
            inactiveProps={inactiveProps}
          >
            Portfolio
          </Link>
          <Link 
            to="/partners" 
            activeProps={activeProps}
            inactiveProps={inactiveProps}
          >
            Partners
          </Link>
          <Link 
            to="/blog" 
            activeProps={activeProps}
            inactiveProps={inactiveProps}
          >
            Blog
          </Link>
          <Link 
            to="/" 
            hash="expertise" 
            activeProps={activeProps}
            inactiveProps={inactiveProps}
          >
            Expertise
          </Link>
          <Link 
            to="/" 
            hash="about" 
            activeProps={activeProps}
            inactiveProps={inactiveProps}
          >
            About
          </Link>

        </div>
        <div className="hidden items-center gap-4 md:flex">
          {session ? (
            <>
              <Link to={portalLink.to}>
                <Button variant="outline" className="flex items-center gap-2">
                  <LayoutDashboard className="h-4 w-4" />
                  {portalLink.label}
                </Button>
              </Link>
              <Button
                variant="ghost"
                className="flex items-center gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </>
          ) : (
            <Link to="/auth">
              <Button variant="ghost">Sign In</Button>
            </Link>
          )}
          <Button size="lg" asChild>
            <Link to="/services/request-quote">Hire Me</Link>
          </Button>
        </div>
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-11 w-11 md:hidden" aria-label="Open menu">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="flex w-72 flex-col">
            <SheetHeader>
              <SheetTitle className="text-left">Menu</SheetTitle>
            </SheetHeader>
            <div className="mt-6 flex flex-1 flex-col gap-1">
              <SheetClose asChild>
                <Link to="/" className="rounded-md px-3 py-2.5 text-base font-medium hover:bg-muted" activeProps={activeProps} inactiveProps={inactiveProps}>
                  Home
                </Link>
              </SheetClose>
              <SheetClose asChild>
                <Link to="/services" className="rounded-md px-3 py-2.5 text-base font-medium hover:bg-muted" activeProps={activeProps} inactiveProps={inactiveProps}>
                  Services
                </Link>
              </SheetClose>
              <SheetClose asChild>
                <Link to="/gigs" search={{ page: 1 }} className="rounded-md px-3 py-2.5 text-base font-medium hover:bg-muted" activeProps={activeProps} inactiveProps={inactiveProps}>
                  Gigs
                </Link>
              </SheetClose>
              <SheetClose asChild>
                <Link to="/projects" className="rounded-md px-3 py-2.5 text-base font-medium hover:bg-muted" activeProps={activeProps} inactiveProps={inactiveProps}>
                  Portfolio
                </Link>
              </SheetClose>
              <SheetClose asChild>
                <Link to="/partners" className="rounded-md px-3 py-2.5 text-base font-medium hover:bg-muted" activeProps={activeProps} inactiveProps={inactiveProps}>
                  Partners
                </Link>
              </SheetClose>
              <SheetClose asChild>
                <Link to="/blog" className="rounded-md px-3 py-2.5 text-base font-medium hover:bg-muted" activeProps={activeProps} inactiveProps={inactiveProps}>
                  Blog
                </Link>
              </SheetClose>
              <SheetClose asChild>
                <Link to="/" hash="expertise" className="rounded-md px-3 py-2.5 text-base font-medium hover:bg-muted" activeProps={activeProps} inactiveProps={inactiveProps}>
                  Expertise
                </Link>
              </SheetClose>
              <SheetClose asChild>
                <Link to="/" hash="about" className="rounded-md px-3 py-2.5 text-base font-medium hover:bg-muted" activeProps={activeProps} inactiveProps={inactiveProps}>
                  About
                </Link>
              </SheetClose>
            </div>
            <div className="flex flex-col gap-3 border-t pt-4">
              {session ? (
                <>
                  <SheetClose asChild>
                    <Link to={portalLink.to}>
                      <Button variant="outline" className="w-full justify-center gap-2">
                        <LayoutDashboard className="h-4 w-4" />
                        {portalLink.label}
                      </Button>
                    </Link>
                  </SheetClose>
                  <Button
                    variant="ghost"
                    className="w-full justify-center gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      setMobileOpen(false);
                      handleLogout();
                    }}
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </Button>
                </>
              ) : (
                <SheetClose asChild>
                  <Link to="/auth">
                    <Button variant="ghost" className="w-full justify-center">Sign In</Button>
                  </Link>
                </SheetClose>
              )}
              <SheetClose asChild>
                <Link to="/services/request-quote">
                  <Button size="lg" className="w-full justify-center">Hire Me</Button>
                </Link>
              </SheetClose>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
