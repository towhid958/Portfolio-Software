import { Link, useLocation, useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Layers, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Session } from "@supabase/supabase-js";
import { useRBAC } from "@/hooks/useRBAC";

export function Navigation() {
  const location = useLocation();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
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
        <Button variant="ghost" size="icon" className="h-11 w-11 md:hidden">
          <Layers className="h-6 w-6" />
        </Button>
      </div>
    </nav>
  );
}
