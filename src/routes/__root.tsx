import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { RBACProvider } from "@/hooks/useRBAC";
import { Navigation } from "@/components/layout/Navigation";
import { Footer } from "@/components/layout/Footer";
import { useLocation } from "@tanstack/react-router";
import { Wrench } from "lucide-react";
import { getPublicMaintenanceStatus } from "@/lib/system-status.functions";

import appCss from "../styles.css?url";

// Staff-facing areas must stay reachable during maintenance so an admin can
// turn the flag back off, and auth/api routes must keep working to get them there.
const MAINTENANCE_EXEMPT_PREFIXES = ['/admin', '/dashboard', '/auth', '/api'];

function MaintenanceNotice({ message }: { message: string | null }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center space-y-4">
        <div className="flex justify-center">
          <div className="rounded-full bg-primary/10 p-6">
            <Wrench className="h-12 w-12 text-primary" />
          </div>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">We'll be right back</h1>
        <p className="text-muted-foreground leading-relaxed">
          {message || "We're performing scheduled maintenance. Please check back shortly."}
        </p>
      </div>
    </div>
  );
}


function NotFoundComponent() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <h1 className="text-9xl font-bold tracking-tighter text-muted-foreground/20">404</h1>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold tracking-tight text-foreground uppercase">Lost in Space</span>
            </div>
          </div>
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Oops! Page not found.</h2>
        <p className="mt-4 text-muted-foreground leading-relaxed">
          It looks like the project or page you're searching for has moved to a new destination or never existed in the first place.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/"
            className="w-full sm:w-auto inline-flex items-center justify-center rounded-full bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:scale-105 hover:bg-primary/90 active:scale-95"
          >
            Back to Home
          </Link>
          <Link
            to="/gigs"
            search={{ page: 1 }}
            className="w-full sm:w-auto inline-flex items-center justify-center rounded-full border border-input bg-background px-8 py-3 text-sm font-semibold text-foreground transition-all hover:bg-accent active:scale-95"
          >
            View Services
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-8 flex justify-center">
          <div className="rounded-full bg-destructive/10 p-6">
            <svg 
              className="h-12 w-12 text-destructive" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Something went wrong</h1>
        <p className="mt-4 text-muted-foreground leading-relaxed">
          We encountered an unexpected error while loading this page. Our team has been notified, and we're working to fix it.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="w-full sm:w-auto inline-flex items-center justify-center rounded-full bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:scale-105 hover:bg-primary/90 active:scale-95"
          >
            Try Again
          </button>
          <Link
            to="/"
            className="w-full sm:w-auto inline-flex items-center justify-center rounded-full border border-input bg-background px-8 py-3 text-sm font-semibold text-foreground transition-all hover:bg-accent active:scale-95"
          >
            Go Home
          </Link>
        </div>
        {process.env['NODE_ENV'] === 'development' && (
          <div className="mt-8 rounded-lg bg-muted p-4 text-left overflow-auto max-h-40">
            <p className="text-xs font-mono text-muted-foreground break-all">
              {error.message}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  loader: async () => {
    try {
      return await getPublicMaintenanceStatus();
    } catch {
      // A failed check must never itself take the site down.
      return { enabled: false, message: null };
    }
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Hasan Kamrul | Full-Stack Portfolio & Service Platform" },
      { name: "description", content: "Professional portfolio and service marketplace for Hasan Kamrul. Digital Marketing, Web Development, and Business Consulting." },
      { name: "author", content: "Hasan Kamrul" },
      { property: "og:title", content: "Hasan Kamrul | Full-Stack Portfolio & Service Platform" },
      { property: "og:description", content: "Professional portfolio and service marketplace for Hasan Kamrul. Digital Marketing, Web Development, and Business Consulting." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Hasan Kamrul | Full-Stack Portfolio & Service Platform" },
      { name: "twitter:description", content: "Professional portfolio and service marketplace for Hasan Kamrul. Digital Marketing, Web Development, and Business Consulting." },
      // og:image / twitter:image intentionally omitted for now - the previous
      // ones pointed at a Lovable-hosted preview screenshot. Add real ones
      // (e.g. a logo or site screenshot) once you have something to host yourself.
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const maintenance = Route.useLoaderData();
  const location = useLocation();

  const isExempt = MAINTENANCE_EXEMPT_PREFIXES.some((prefix) => location.pathname.startsWith(prefix));

  return (
    <QueryClientProvider client={queryClient}>
      <RBACProvider>
        {maintenance.enabled && !isExempt ? (
          <MaintenanceNotice message={maintenance.message} />
        ) : (
          <>
            <Navigation />
            <Outlet />
            <Footer />
          </>
        )}
        <Toaster />
      </RBACProvider>
    </QueryClientProvider>
  );
}
