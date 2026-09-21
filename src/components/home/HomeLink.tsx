import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';

/**
 * Homepage CTAs point at four shapes of destination: a hash anchor, a plain
 * route, /gigs (which requires a search param) and /services/$slug (which
 * requires a path param). TanStack types each differently, which is what
 * pushed the original markup into a positional
 * `idx === 0 ? ... : idx === 1 ? ...` chain - so reordering a content array
 * silently reassigned its links.
 *
 * Describing the destination as data next to the copy it belongs to removes
 * that coupling, and matches the discriminated-union approach NAV_ITEMS
 * already uses in components/layout/Navigation.tsx.
 */
export type HomeTarget =
  | { kind: 'hash'; hash: string }
  | { kind: 'gigs' }
  | { kind: 'service'; slug: string }
  | { kind: 'route'; to: '/projects' | '/partners' | '/services' | '/services/request-quote' };

type HomeLinkProps = {
  target: HomeTarget;
  className?: string;
  children: ReactNode;
};

export function HomeLink({ target, className, children }: HomeLinkProps) {
  switch (target.kind) {
    case 'hash':
      return (
        <a href={`#${target.hash}`} className={className}>
          {children}
        </a>
      );
    case 'gigs':
      return (
        <Link to="/gigs" search={{ page: 1 }} className={className}>
          {children}
        </Link>
      );
    case 'service':
      return (
        <Link to="/services/$slug" params={{ slug: target.slug }} className={className}>
          {children}
        </Link>
      );
    case 'route':
      return (
        <Link to={target.to} className={className}>
          {children}
        </Link>
      );
  }
}
